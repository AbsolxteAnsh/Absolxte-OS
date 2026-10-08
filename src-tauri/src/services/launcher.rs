use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use crate::errors::{AppError, AppResult};
use crate::models::{LauncherEntry, LauncherInventory};

const LAUNCHER_FILE_VERSION: u32 = 1;
const MAX_LAUNCHERS: usize = 32;
const MAX_LAUNCHER_NAME_LENGTH: usize = 48;

pub struct LauncherState {
    next_id: AtomicU64,
    entries: Mutex<Vec<StoredLauncher>>,
    load_warning: Mutex<Option<String>>,
    file_path: PathBuf,
}

impl Default for LauncherState {
    fn default() -> Self {
        let file_path = launcher_file_path();
        let (entries, warning) = load_launcher_file(&file_path);
        Self {
            next_id: AtomicU64::new(1),
            entries: Mutex::new(entries),
            load_warning: Mutex::new(warning),
            file_path,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredLauncher {
    id: String,
    name: String,
    path: PathBuf,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherFile {
    version: u32,
    entries: Vec<StoredLauncher>,
}

pub fn list_launchers(state: &LauncherState) -> AppResult<LauncherInventory> {
    let entries = state
        .entries
        .lock()
        .map_err(|_| AppError::OperationFailed("Launcher store is unavailable.".into()))?
        .iter()
        .map(to_launcher_entry)
        .collect::<Vec<_>>();
    let warning = state
        .load_warning
        .lock()
        .map_err(|_| AppError::OperationFailed("Launcher warning state is unavailable.".into()))?
        .clone();
    Ok(LauncherInventory { entries, warning })
}

#[cfg(target_os = "windows")]
pub fn pick_launcher_app(
    state: &LauncherState,
    owner: windows::Win32::Foundation::HWND,
) -> AppResult<Option<LauncherEntry>> {
    let Some(path) = windows_picker::pick_executable(owner)? else {
        return Ok(None);
    };
    let path = validate_executable_path(&path)?;
    let name = path
        .file_stem()
        .and_then(|value| value.to_str())
        .map(normalize_launcher_name)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::InvalidInput("The selected app has no readable name.".into()))?;

    let mut entries = state
        .entries
        .lock()
        .map_err(|_| AppError::OperationFailed("Launcher store is unavailable.".into()))?;
    if entries.len() >= MAX_LAUNCHERS {
        return Err(AppError::OperationDenied(format!(
            "Fai1thful OS supports up to {MAX_LAUNCHERS} custom launchers."
        )));
    }
    if let Some(existing) = entries.iter().find(|entry| entry.path == path) {
        return Ok(Some(to_launcher_entry(existing)));
    }

    let id = format!(
        "launcher-{}-{}",
        std::process::id(),
        state.next_id.fetch_add(1, Ordering::Relaxed)
    );
    let entry = StoredLauncher { id, name, path };
    entries.push(entry.clone());
    persist_launchers(&state.file_path, &entries)?;
    clear_load_warning(state)?;
    Ok(Some(to_launcher_entry(&entry)))
}

#[cfg(not(target_os = "windows"))]
pub fn pick_launcher_app(state: &LauncherState, _owner: ()) -> AppResult<Option<LauncherEntry>> {
    let _ = state;
    Err(AppError::OperationFailed(
        "The application picker is available only on Windows.".into(),
    ))
}

pub fn rename_launcher(state: &LauncherState, id: String, name: String) -> AppResult<bool> {
    validate_launcher_id(&id)?;
    let name = normalize_launcher_name(&name);
    if name.is_empty() || name.chars().count() > MAX_LAUNCHER_NAME_LENGTH {
        return Err(AppError::InvalidInput(format!(
            "Launcher names must be between 1 and {MAX_LAUNCHER_NAME_LENGTH} characters."
        )));
    }

    let mut entries = state
        .entries
        .lock()
        .map_err(|_| AppError::OperationFailed("Launcher store is unavailable.".into()))?;
    let entry = entries
        .iter_mut()
        .find(|entry| entry.id == id)
        .ok_or_else(|| AppError::InvalidInput("Unknown launcher ID.".into()))?;
    entry.name = name;
    persist_launchers(&state.file_path, &entries)?;
    clear_load_warning(state)?;
    Ok(true)
}

pub fn remove_launcher(state: &LauncherState, id: String) -> AppResult<bool> {
    validate_launcher_id(&id)?;
    let mut entries = state
        .entries
        .lock()
        .map_err(|_| AppError::OperationFailed("Launcher store is unavailable.".into()))?;
    let original_len = entries.len();
    entries.retain(|entry| entry.id != id);
    if entries.len() == original_len {
        return Err(AppError::InvalidInput("Unknown launcher ID.".into()));
    }
    persist_launchers(&state.file_path, &entries)?;
    clear_load_warning(state)?;
    Ok(true)
}

pub fn launch_custom_app(state: &LauncherState, id: String) -> AppResult<bool> {
    validate_launcher_id(&id)?;
    let path = state
        .entries
        .lock()
        .map_err(|_| AppError::OperationFailed("Launcher store is unavailable.".into()))?
        .iter()
        .find(|entry| entry.id == id)
        .map(|entry| entry.path.clone())
        .ok_or_else(|| AppError::InvalidInput("Unknown launcher ID.".into()))?;
    let path = validate_executable_path(&path)?;
    Command::new(path)
        .spawn()
        .map_err(|error| AppError::OperationFailed(error.to_string()))?;
    Ok(true)
}

fn to_launcher_entry(entry: &StoredLauncher) -> LauncherEntry {
    LauncherEntry {
        id: entry.id.clone(),
        name: entry.name.clone(),
        path: entry.path.to_string_lossy().to_string(),
        icon_data_url: crate::services::apps::load_icon_data_url(&entry.path),
    }
}

fn launcher_file_path() -> PathBuf {
    let base = std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    base.join("Fai1thful OS").join("launchers.json")
}

fn load_launcher_file(path: &Path) -> (Vec<StoredLauncher>, Option<String>) {
    if !path.exists() {
        return (Vec::new(), None);
    }
    let loaded = fs::read(path)
        .map_err(|error| error.to_string())
        .and_then(|bytes| {
            serde_json::from_slice::<LauncherFile>(&bytes).map_err(|error| error.to_string())
        });
    let file = match loaded {
        Ok(file) => file,
        Err(error) => {
            return (
                Vec::new(),
                Some(format!("Saved launchers could not be loaded: {error}")),
            )
        }
    };
    if file.version != LAUNCHER_FILE_VERSION {
        return (
            Vec::new(),
            Some(format!(
                "Saved launchers use unsupported version {}.",
                file.version
            )),
        );
    }

    let mut valid = Vec::new();
    let mut rejected = 0;
    for entry in file.entries.into_iter().take(MAX_LAUNCHERS) {
        if validate_launcher_id(&entry.id).is_ok()
            && !entry.name.trim().is_empty()
            && entry.name.chars().count() <= MAX_LAUNCHER_NAME_LENGTH
            && validate_executable_path(&entry.path).is_ok()
        {
            valid.push(entry);
        } else {
            rejected += 1;
        }
    }
    let warning = (rejected > 0).then(|| {
        format!("{rejected} saved launcher entries were ignored because they are no longer valid.")
    });
    (valid, warning)
}

fn persist_launchers(path: &Path, entries: &[StoredLauncher]) -> AppResult<()> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::OperationFailed("Launcher data path is invalid.".into()))?;
    fs::create_dir_all(parent).map_err(|error| AppError::OperationFailed(error.to_string()))?;
    let payload = serde_json::to_vec_pretty(&LauncherFile {
        version: LAUNCHER_FILE_VERSION,
        entries: entries.to_vec(),
    })
    .map_err(|error| AppError::OperationFailed(error.to_string()))?;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(path)
        .map_err(|error| AppError::OperationFailed(error.to_string()))?;
    file.write_all(&payload)
        .and_then(|_| file.sync_all())
        .map_err(|error| AppError::OperationFailed(error.to_string()))
}

fn clear_load_warning(state: &LauncherState) -> AppResult<()> {
    *state.load_warning.lock().map_err(|_| {
        AppError::OperationFailed("Launcher warning state is unavailable.".into())
    })? = None;
    Ok(())
}

fn validate_executable_path(path: &Path) -> AppResult<PathBuf> {
    if !path.is_absolute()
        || !path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
    {
        return Err(AppError::InvalidInput(
            "Custom launchers must point to an absolute .exe file.".into(),
        ));
    }
    let canonical =
        fs::canonicalize(path).map_err(|error| AppError::OperationFailed(error.to_string()))?;
    if !canonical.is_file() {
        return Err(AppError::InvalidInput(
            "The selected launcher is not a file.".into(),
        ));
    }
    Ok(canonical)
}

fn validate_launcher_id(id: &str) -> AppResult<()> {
    if id.len() > 80
        || !id.starts_with("launcher-")
        || !id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
    {
        return Err(AppError::InvalidInput("Unknown launcher ID.".into()));
    }
    Ok(())
}

fn normalize_launcher_name(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(target_os = "windows")]
mod windows_picker {
    use std::mem::size_of;
    use std::path::PathBuf;

    use windows::core::{PCWSTR, PWSTR};
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Controls::Dialogs::{
        CommDlgExtendedError, GetOpenFileNameW, OFN_DONTADDTORECENT, OFN_FILEMUSTEXIST,
        OFN_NOCHANGEDIR, OFN_PATHMUSTEXIST, OPENFILENAMEW,
    };

    use super::{AppError, AppResult};

    pub fn pick_executable(owner: HWND) -> AppResult<Option<PathBuf>> {
        let mut file = vec![0_u16; 32_768];
        let filter = "Applications (*.exe)\0*.exe\0\0"
            .encode_utf16()
            .collect::<Vec<_>>();
        let title = "Choose an application"
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>();
        let mut dialog = OPENFILENAMEW {
            lStructSize: size_of::<OPENFILENAMEW>() as u32,
            hwndOwner: owner,
            lpstrFilter: PCWSTR(filter.as_ptr()),
            lpstrFile: PWSTR(file.as_mut_ptr()),
            nMaxFile: file.len() as u32,
            lpstrTitle: PCWSTR(title.as_ptr()),
            Flags: OFN_FILEMUSTEXIST | OFN_PATHMUSTEXIST | OFN_NOCHANGEDIR | OFN_DONTADDTORECENT,
            ..Default::default()
        };
        let selected = unsafe { GetOpenFileNameW(&mut dialog) }.as_bool();
        if !selected {
            let error = unsafe { CommDlgExtendedError() };
            if error.0 == 0 {
                return Ok(None);
            }
            return Err(AppError::OperationFailed(format!(
                "Windows application picker failed with code {}.",
                error.0
            )));
        }
        let length = file
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(file.len());
        Ok(Some(PathBuf::from(String::from_utf16_lossy(
            &file[..length],
        ))))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        load_launcher_file, normalize_launcher_name, persist_launchers, validate_executable_path,
        StoredLauncher,
    };
    use std::fs;

    #[test]
    fn normalizes_launcher_names_without_preserving_extra_whitespace() {
        assert_eq!(
            normalize_launcher_name("  Faith   Editor  "),
            "Faith Editor"
        );
    }

    #[test]
    fn executable_path_validation_rejects_non_executable_files() {
        let path =
            std::env::temp_dir().join(format!("fai1thful-launcher-{}.txt", std::process::id()));
        fs::write(&path, b"not an executable").expect("temporary fixture");
        assert!(validate_executable_path(&path).is_err());
        let _ = fs::remove_file(path);
    }
    #[test]
    fn launcher_file_round_trips_versioned_entries() {
        let directory =
            std::env::temp_dir().join(format!("fai1thful-launchers-{}", std::process::id()));
        let executable = directory.join("Faith.exe");
        let file = directory.join("launchers.json");
        fs::create_dir_all(&directory).expect("temporary launcher directory");
        fs::write(&executable, b"fixture").expect("temporary executable fixture");
        let entries = vec![StoredLauncher {
            id: "launcher-test-1".into(),
            name: "Faith".into(),
            path: executable,
        }];

        persist_launchers(&file, &entries).expect("launcher persistence");
        let (loaded, warning) = load_launcher_file(&file);
        assert_eq!(loaded.len(), 1);
        assert!(warning.is_none());
        let _ = fs::remove_dir_all(directory);
    }

    #[test]
    fn malformed_launcher_files_return_a_visible_warning() {
        let file = std::env::temp_dir().join(format!(
            "fai1thful-launchers-bad-{}.json",
            std::process::id()
        ));
        fs::write(&file, b"not json").expect("malformed launcher fixture");
        let (loaded, warning) = load_launcher_file(&file);
        assert!(loaded.is_empty());
        assert!(warning.is_some());
        let _ = fs::remove_file(file);
    }
}
