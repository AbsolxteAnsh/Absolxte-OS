use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use sysinfo::System;

use crate::errors::{AppError, AppResult};
use crate::models::{BoostResult, CleanupCategory, CleanupPlan, CleanupResult};

const MINIMUM_TRIM_BYTES: u64 = 32 * 1024 * 1024;
const CLEANUP_PLAN_TTL_SECONDS: u64 = 15 * 60;
const USER_TEMP_MINIMUM_AGE: Duration = Duration::from_secs(24 * 60 * 60);
const PROTECTED_PROCESS_NAMES: [&str; 16] = [
    "system",
    "registry",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
    "lsass.exe",
    "winlogon.exe",
    "dwm.exe",
    "svchost.exe",
    "fontdrvhost.exe",
    "memory compression",
    "secure system",
    "msmpeng.exe",
    "fai1thful-os.exe",
    "fai1thful os portable.exe",
];

pub struct CleanupState {
    next_id: AtomicU64,
    plans: Mutex<HashMap<String, StoredCleanupPlan>>,
}

impl Default for CleanupState {
    fn default() -> Self {
        Self {
            next_id: AtomicU64::new(1),
            plans: Mutex::new(HashMap::new()),
        }
    }
}

struct StoredCleanupPlan {
    created_at_seconds: u64,
    categories: HashMap<String, StoredCleanupCategory>,
}

struct StoredCleanupCategory {
    root: PathBuf,
    files: Vec<PlannedFile>,
}

struct PlannedFile {
    path: PathBuf,
    size: u64,
}

pub fn is_memory_boost_eligible(
    pid: u32,
    current_pid: u32,
    process_name: &str,
    memory_bytes: u64,
) -> bool {
    if pid <= 4 || pid == current_pid || memory_bytes < MINIMUM_TRIM_BYTES {
        return false;
    }

    let normalized = process_name.trim().to_ascii_lowercase();
    !PROTECTED_PROCESS_NAMES
        .iter()
        .any(|protected| *protected == normalized)
}

pub fn released_bytes(before_bytes: u64, after_bytes: u64) -> u64 {
    before_bytes.saturating_sub(after_bytes)
}

pub fn is_path_within_root(root: &Path, child: &Path) -> bool {
    child != root && child.starts_with(root)
}

pub fn plan_is_expired(created_at: u64, now: u64, ttl_seconds: u64) -> bool {
    now.saturating_sub(created_at) >= ttl_seconds
}

pub fn boost_memory() -> AppResult<BoostResult> {
    let mut system = System::new_all();
    system.refresh_all();

    let before_bytes = system
        .total_memory()
        .saturating_sub(system.available_memory());
    let current_pid = std::process::id();
    let mut processes_trimmed = 0_u32;
    let mut processes_skipped = 0_u32;

    for process in system.processes().values() {
        let pid = process.pid().as_u32();
        let name = process.name().to_string_lossy();
        let eligible = process.exe().is_some()
            && is_memory_boost_eligible(pid, current_pid, &name, process.memory());

        if !eligible {
            processes_skipped = processes_skipped.saturating_add(1);
            continue;
        }

        if trim_process_working_set(pid) {
            processes_trimmed = processes_trimmed.saturating_add(1);
        } else {
            processes_skipped = processes_skipped.saturating_add(1);
        }
    }

    std::thread::sleep(Duration::from_millis(100));
    system.refresh_memory();
    let after_bytes = system
        .total_memory()
        .saturating_sub(system.available_memory());

    Ok(BoostResult {
        before_bytes,
        after_bytes,
        released_bytes: released_bytes(before_bytes, after_bytes),
        processes_trimmed,
        processes_skipped,
    })
}

pub fn scan_cleanup(state: &CleanupState) -> AppResult<CleanupPlan> {
    let now = unix_seconds()?;
    let local_app_data = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| AppError::OperationFailed("LOCALAPPDATA is unavailable.".into()))?;

    let specs = [
        CleanupSpec {
            id: "user-temp",
            label: "Temporary files",
            description: "Per-user temporary files not modified in the last 24 hours.",
            root: std::env::temp_dir(),
            minimum_age: Some(USER_TEMP_MINIMUM_AGE),
            matcher: MatchKind::AllFiles,
        },
        CleanupSpec {
            id: "thumbnail-cache",
            label: "Thumbnail cache",
            description: "Windows Explorer thumbnail database files.",
            root: local_app_data
                .join("Microsoft")
                .join("Windows")
                .join("Explorer"),
            minimum_age: None,
            matcher: MatchKind::PrefixAndExtension("thumbcache_", "db"),
        },
        CleanupSpec {
            id: "crash-dumps",
            label: "Crash dumps",
            description: "Application crash dump files used for diagnostics.",
            root: local_app_data.join("CrashDumps"),
            minimum_age: None,
            matcher: MatchKind::Extension("dmp"),
        },
    ];

    let mut stored_categories = HashMap::new();
    let mut categories = Vec::with_capacity(specs.len());

    for spec in specs {
        let (canonical_root, files) = scan_spec(&spec)?;
        let file_count = files.len() as u64;
        let total_bytes = files
            .iter()
            .fold(0_u64, |total, file| total.saturating_add(file.size));

        categories.push(CleanupCategory {
            id: spec.id.to_string(),
            label: spec.label.to_string(),
            description: spec.description.to_string(),
            file_count,
            total_bytes,
            requires_elevation: false,
        });
        stored_categories.insert(
            spec.id.to_string(),
            StoredCleanupCategory {
                root: canonical_root,
                files,
            },
        );
    }

    let sequence = state.next_id.fetch_add(1, Ordering::Relaxed);
    let id = format!("cleanup-{}-{now}-{sequence}", std::process::id());
    let stored = StoredCleanupPlan {
        created_at_seconds: now,
        categories: stored_categories,
    };

    let mut plans = state
        .plans
        .lock()
        .map_err(|_| AppError::OperationFailed("Cleanup plan store is unavailable.".into()))?;
    plans
        .retain(|_, plan| !plan_is_expired(plan.created_at_seconds, now, CLEANUP_PLAN_TTL_SECONDS));
    plans.insert(id.clone(), stored);

    Ok(CleanupPlan {
        id,
        created_at_seconds: now,
        expires_at_seconds: now.saturating_add(CLEANUP_PLAN_TTL_SECONDS),
        categories,
    })
}

pub fn execute_cleanup(
    state: &CleanupState,
    plan_id: String,
    category_ids: Vec<String>,
) -> AppResult<CleanupResult> {
    let selected = validate_category_ids(&category_ids)?;
    let plan = state
        .plans
        .lock()
        .map_err(|_| AppError::OperationFailed("Cleanup plan store is unavailable.".into()))?
        .remove(&plan_id)
        .ok_or_else(|| {
            AppError::InvalidInput("Cleanup plan is missing, expired, or already used.".into())
        })?;

    let now = unix_seconds()?;
    if plan_is_expired(plan.created_at_seconds, now, CLEANUP_PLAN_TTL_SECONDS) {
        return Err(AppError::InvalidInput(
            "Cleanup plan expired. Scan storage again before deleting.".into(),
        ));
    }

    if selected
        .iter()
        .any(|category_id| !plan.categories.contains_key(category_id))
    {
        return Err(AppError::InvalidInput(
            "Cleanup selection contains an unknown category.".into(),
        ));
    }

    let mut result = CleanupResult {
        deleted_files: 0,
        freed_bytes: 0,
        failed_files: 0,
    };

    for category_id in selected {
        let Some(category) = plan.categories.get(&category_id) else {
            continue;
        };
        let canonical_root = match fs::canonicalize(&category.root) {
            Ok(root) => root,
            Err(_) => {
                result.failed_files = result
                    .failed_files
                    .saturating_add(category.files.len() as u64);
                continue;
            }
        };

        for file in &category.files {
            if let Some(deleted_bytes) = delete_planned_file(&canonical_root, file) {
                result.deleted_files = result.deleted_files.saturating_add(1);
                result.freed_bytes = result.freed_bytes.saturating_add(deleted_bytes);
            } else {
                result.failed_files = result.failed_files.saturating_add(1);
            }
        }
    }

    Ok(result)
}

struct CleanupSpec {
    id: &'static str,
    label: &'static str,
    description: &'static str,
    root: PathBuf,
    minimum_age: Option<Duration>,
    matcher: MatchKind,
}

enum MatchKind {
    AllFiles,
    Extension(&'static str),
    PrefixAndExtension(&'static str, &'static str),
}

fn scan_spec(spec: &CleanupSpec) -> AppResult<(PathBuf, Vec<PlannedFile>)> {
    if !spec.root.exists() {
        return Ok((spec.root.clone(), Vec::new()));
    }

    let canonical_root = fs::canonicalize(&spec.root)
        .map_err(|error| AppError::OperationFailed(error.to_string()))?;
    let mut files = Vec::new();
    let mut pending = vec![canonical_root.clone()];

    while let Some(directory) = pending.pop() {
        let entries = match fs::read_dir(&directory) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) => metadata,
                Err(_) => continue,
            };
            if metadata.file_type().is_symlink() {
                continue;
            }
            if metadata.is_dir() {
                if let Ok(canonical) = fs::canonicalize(&path) {
                    if is_path_within_root(&canonical_root, &canonical) {
                        pending.push(canonical);
                    }
                }
                continue;
            }
            if !metadata.is_file() || !matches_cleanup_file(&path, &spec.matcher) {
                continue;
            }
            if let Some(minimum_age) = spec.minimum_age {
                let old_enough = metadata
                    .modified()
                    .ok()
                    .and_then(|modified| modified.elapsed().ok())
                    .map(|age| age >= minimum_age)
                    .unwrap_or(false);
                if !old_enough {
                    continue;
                }
            }
            let canonical = match fs::canonicalize(&path) {
                Ok(canonical) => canonical,
                Err(_) => continue,
            };
            if is_path_within_root(&canonical_root, &canonical) {
                files.push(PlannedFile {
                    path: canonical,
                    size: metadata.len(),
                });
            }
        }
    }

    Ok((canonical_root, files))
}

fn matches_cleanup_file(path: &Path, matcher: &MatchKind) -> bool {
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    match matcher {
        MatchKind::AllFiles => true,
        MatchKind::Extension(expected) => extension == *expected,
        MatchKind::PrefixAndExtension(prefix, expected) => {
            file_name.starts_with(prefix) && extension == *expected
        }
    }
}

fn validate_category_ids(category_ids: &[String]) -> AppResult<HashSet<String>> {
    if category_ids.is_empty() || category_ids.len() > 3 {
        return Err(AppError::InvalidInput(
            "Select at least one cleanup category.".into(),
        ));
    }

    let selected = category_ids.iter().cloned().collect::<HashSet<_>>();
    if selected.len() != category_ids.len() {
        return Err(AppError::InvalidInput(
            "Cleanup categories must be unique.".into(),
        ));
    }
    Ok(selected)
}

fn delete_planned_file(root: &Path, file: &PlannedFile) -> Option<u64> {
    let metadata = fs::symlink_metadata(&file.path).ok()?;
    if !metadata.is_file() || metadata.file_type().is_symlink() {
        return None;
    }

    let canonical = fs::canonicalize(&file.path).ok()?;
    if !is_path_within_root(root, &canonical) {
        return None;
    }

    fs::remove_file(canonical).ok().map(|_| metadata.len())
}

fn unix_seconds() -> AppResult<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .map_err(|error| AppError::OperationFailed(error.to_string()))
}

#[cfg(target_os = "windows")]
fn trim_process_working_set(pid: u32) -> bool {
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::System::ProcessStatus::K32EmptyWorkingSet;
    use windows::Win32::System::Threading::{
        OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA,
    };

    let handle =
        match unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA, false, pid) } {
            Ok(handle) => handle,
            Err(_) => return false,
        };

    let trimmed = unsafe { K32EmptyWorkingSet(handle).as_bool() };
    let closed = unsafe { CloseHandle(handle).is_ok() };
    trimmed && closed
}

#[cfg(not(target_os = "windows"))]
fn trim_process_working_set(_pid: u32) -> bool {
    false
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{
        is_memory_boost_eligible, is_path_within_root, plan_is_expired, released_bytes,
        validate_category_ids,
    };

    #[test]
    fn excludes_protected_current_and_small_processes_from_memory_boost() {
        assert!(!is_memory_boost_eligible(
            4,
            999,
            "System",
            512 * 1024 * 1024
        ));
        assert!(!is_memory_boost_eligible(
            999,
            999,
            "fai1thful-os.exe",
            128 * 1024 * 1024
        ));
        assert!(!is_memory_boost_eligible(
            120,
            999,
            "svchost.exe",
            128 * 1024 * 1024
        ));
        assert!(!is_memory_boost_eligible(
            800,
            999,
            "tiny.exe",
            8 * 1024 * 1024
        ));
        assert!(is_memory_boost_eligible(
            801,
            999,
            "editor.exe",
            128 * 1024 * 1024
        ));
    }

    #[test]
    fn released_memory_never_underflows() {
        assert_eq!(released_bytes(800, 300), 500);
        assert_eq!(released_bytes(300, 800), 0);
    }

    #[test]
    fn cleanup_paths_must_be_descendants_of_the_scanned_root() {
        let root = Path::new("root").join("temp");
        let child = root.join("old.tmp");
        let outside = Path::new("root").join("documents").join("important.txt");

        assert!(is_path_within_root(&root, &child));
        assert!(!is_path_within_root(&root, &root));
        assert!(!is_path_within_root(&root, &outside));
    }

    #[test]
    fn cleanup_plans_expire_at_the_configured_boundary() {
        assert!(!plan_is_expired(1_000, 1_899, 900));
        assert!(plan_is_expired(1_000, 1_900, 900));
    }

    #[test]
    fn cleanup_category_selection_rejects_empty_and_duplicate_values() {
        assert!(validate_category_ids(&[]).is_err());
        assert!(validate_category_ids(&["user-temp".into(), "user-temp".into()]).is_err());
        assert!(validate_category_ids(&["user-temp".into()]).is_ok());
    }
}
