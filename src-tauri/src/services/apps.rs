use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use sysinfo::{ProcessRefreshKind, RefreshKind, System};

use crate::errors::{AppError, AppResult};
use crate::models::{InstalledApp, RunningApp, UninstallLaunchResult};

const INVENTORY_TTL_SECONDS: u64 = 15 * 60;
const MAX_ICON_CACHE_ENTRIES: usize = 512;

pub struct AppInventoryState {
    next_id: AtomicU64,
    uninstallers: Mutex<HashMap<String, RegisteredUninstaller>>,
    icon_cache: Mutex<HashMap<PathBuf, Option<String>>>,
}

impl Default for AppInventoryState {
    fn default() -> Self {
        Self {
            next_id: AtomicU64::new(1),
            uninstallers: Mutex::new(HashMap::new()),
            icon_cache: Mutex::new(HashMap::new()),
        }
    }
}

struct RegisteredUninstaller {
    command: String,
    created_at_seconds: u64,
}

struct RawInstalledApp {
    name: String,
    publisher: Option<String>,
    version: Option<String>,
    install_location: Option<String>,
    estimated_size_bytes: Option<u64>,
    display_icon: Option<String>,
    uninstall_command: Option<String>,
    may_require_elevation: bool,
}

struct ParsedCommand {
    executable: PathBuf,
    arguments: Vec<String>,
}

pub fn get_running_apps(state: &AppInventoryState) -> AppResult<Vec<RunningApp>> {
    let refresh_kind = RefreshKind::everything().with_processes(ProcessRefreshKind::everything());
    let mut system = System::new_with_specifics(refresh_kind);
    system.refresh_all();

    let mut apps = system
        .processes()
        .values()
        .filter_map(|process| {
            let path = process.exe()?.to_path_buf();
            if !path.is_absolute() {
                return None;
            }

            Some(RunningApp {
                name: process.name().to_string_lossy().to_string(),
                pid: process.pid().as_u32(),
                memory_bytes: process.memory(),
                path: path.to_string_lossy().to_string(),
                icon_data_url: cached_icon(state, &path),
            })
        })
        .collect::<Vec<_>>();

    apps.sort_by(|left, right| {
        right
            .memory_bytes
            .cmp(&left.memory_bytes)
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });
    Ok(apps)
}

pub fn close_running_app(pid: u32) -> AppResult<bool> {
    crate::services::process::kill_process(pid)
}

pub fn get_installed_apps(state: &AppInventoryState) -> AppResult<Vec<InstalledApp>> {
    #[cfg(target_os = "windows")]
    {
        let raw_apps = windows_registry::scan_installed_apps()?;
        let now = unix_seconds()?;
        let mut uninstallers = HashMap::new();
        let mut apps = Vec::with_capacity(raw_apps.len());

        for raw in raw_apps {
            let id = format!(
                "installed-{}",
                state.next_id.fetch_add(1, Ordering::Relaxed)
            );
            let parsed = raw
                .uninstall_command
                .as_deref()
                .and_then(|command| windows_actions::parse_registered_command(command).ok());
            let uninstall_available = parsed.is_some();

            if let Some(command) = raw.uninstall_command {
                if uninstall_available {
                    uninstallers.insert(
                        id.clone(),
                        RegisteredUninstaller {
                            command,
                            created_at_seconds: now,
                        },
                    );
                }
            }

            let icon_path = raw
                .display_icon
                .as_deref()
                .and_then(parse_display_icon_path)
                .or_else(|| parsed.as_ref().map(|command| command.executable.clone()));

            apps.push(InstalledApp {
                id,
                name: raw.name,
                publisher: raw.publisher,
                version: raw.version,
                install_location: raw.install_location,
                estimated_size_bytes: raw.estimated_size_bytes,
                icon_data_url: icon_path
                    .as_deref()
                    .and_then(|path| cached_icon(state, path)),
                uninstall_available,
                may_require_elevation: raw.may_require_elevation,
            });
        }

        apps.sort_by(|left, right| left.name.to_lowercase().cmp(&right.name.to_lowercase()));
        *state.uninstallers.lock().map_err(|_| {
            AppError::OperationFailed("Installed app action store is unavailable.".into())
        })? = uninstallers;
        Ok(apps)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = state;
        Err(AppError::OperationFailed(
            "Installed app inventory is available only on Windows.".into(),
        ))
    }
}

pub fn launch_uninstaller(
    state: &AppInventoryState,
    app_id: String,
    allow_elevation: bool,
) -> AppResult<UninstallLaunchResult> {
    if app_id.len() > 80 || !app_id.starts_with("installed-") {
        return Err(AppError::InvalidInput("Unknown installed app ID.".into()));
    }

    let now = unix_seconds()?;
    let command = {
        let mut uninstallers = state.uninstallers.lock().map_err(|_| {
            AppError::OperationFailed("Installed app action store is unavailable.".into())
        })?;
        uninstallers.retain(|_, entry| {
            now.saturating_sub(entry.created_at_seconds) < INVENTORY_TTL_SECONDS
        });
        uninstallers
            .get(&app_id)
            .map(|entry| entry.command.clone())
            .ok_or_else(|| {
                AppError::InvalidInput(
                    "This app inventory expired. Refresh installed apps before uninstalling."
                        .into(),
                )
            })?
    };

    #[cfg(target_os = "windows")]
    {
        let parsed = windows_actions::parse_registered_command(&command)?;
        if allow_elevation {
            windows_actions::launch_elevated(&parsed)?;
            return Ok(UninstallLaunchResult {
                launched: true,
                elevation_requested: true,
                needs_elevation: false,
            });
        }

        match Command::new(&parsed.executable)
            .args(&parsed.arguments)
            .spawn()
        {
            Ok(_) => Ok(UninstallLaunchResult {
                launched: true,
                elevation_requested: false,
                needs_elevation: false,
            }),
            Err(error) if error.raw_os_error() == Some(740) => Ok(UninstallLaunchResult {
                launched: false,
                elevation_requested: false,
                needs_elevation: true,
            }),
            Err(error) => Err(AppError::OperationFailed(error.to_string())),
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (command, allow_elevation);
        Err(AppError::OperationFailed(
            "Uninstall actions are available only on Windows.".into(),
        ))
    }
}

fn cached_icon(state: &AppInventoryState, path: &Path) -> Option<String> {
    let normalized = path.to_path_buf();
    if let Ok(cache) = state.icon_cache.lock() {
        if let Some(icon) = cache.get(&normalized) {
            return icon.clone();
        }
    }

    let icon = load_icon_data_url(path);
    if let Ok(mut cache) = state.icon_cache.lock() {
        if cache.len() >= MAX_ICON_CACHE_ENTRIES {
            cache.clear();
        }
        cache.insert(normalized, icon.clone());
    }
    icon
}

fn parse_display_icon_path(value: &str) -> Option<PathBuf> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_index = trimmed
        .rsplit_once(',')
        .filter(|(_, suffix)| suffix.trim().parse::<i32>().is_ok())
        .map(|(path, _)| path)
        .unwrap_or(trimmed)
        .trim()
        .trim_matches('"');

    if without_index.is_empty() {
        None
    } else {
        Some(PathBuf::from(without_index))
    }
}

fn unix_seconds() -> AppResult<u64> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .map_err(|error| AppError::OperationFailed(error.to_string()))
}

#[cfg(target_os = "windows")]
pub(crate) fn load_icon_data_url(path: &Path) -> Option<String> {
    windows_icons::extract_icon_data_url(path)
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn load_icon_data_url(_path: &Path) -> Option<String> {
    None
}

#[cfg(target_os = "windows")]
mod windows_registry {
    use std::collections::HashSet;
    use std::ffi::c_void;
    use std::mem::size_of;

    use windows::core::{PCWSTR, PWSTR};
    use windows::Win32::Foundation::{
        ERROR_MORE_DATA, ERROR_NO_MORE_ITEMS, ERROR_SUCCESS, WIN32_ERROR,
    };
    use windows::Win32::System::Registry::{
        RegCloseKey, RegEnumKeyExW, RegGetValueW, RegOpenKeyExW, HKEY, HKEY_CURRENT_USER,
        HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_32KEY, KEY_WOW64_64KEY, REG_SAM_FLAGS,
        RRF_RT_REG_DWORD, RRF_RT_REG_EXPAND_SZ, RRF_RT_REG_SZ,
    };

    use super::{AppError, AppResult, RawInstalledApp};

    const UNINSTALL_KEY: &str = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall";

    struct OwnedKey(HKEY);

    impl Drop for OwnedKey {
        fn drop(&mut self) {
            unsafe {
                let _ = RegCloseKey(self.0);
            }
        }
    }

    pub fn scan_installed_apps() -> AppResult<Vec<RawInstalledApp>> {
        let mut apps = Vec::new();
        let mut seen = HashSet::new();
        let locations = [
            (HKEY_LOCAL_MACHINE, KEY_WOW64_64KEY, true),
            (HKEY_LOCAL_MACHINE, KEY_WOW64_32KEY, true),
            (HKEY_CURRENT_USER, KEY_WOW64_64KEY, false),
            (HKEY_CURRENT_USER, KEY_WOW64_32KEY, false),
        ];

        for (root, view, machine_scope) in locations {
            let Some(base) = open_key(root, UNINSTALL_KEY, view) else {
                continue;
            };
            for subkey_name in enumerate_subkeys(&base) {
                let Some(key) = open_key(base.0, &subkey_name, REG_SAM_FLAGS(0)) else {
                    continue;
                };
                if read_dword(&key, "SystemComponent") == Some(1) {
                    continue;
                }

                let Some(name) = read_string(&key, "DisplayName").filter(|name| !name.is_empty())
                else {
                    continue;
                };
                let publisher = read_string(&key, "Publisher");
                let version = read_string(&key, "DisplayVersion");
                let identity = format!(
                    "{}|{}|{}",
                    name.to_lowercase(),
                    publisher.as_deref().unwrap_or_default().to_lowercase(),
                    version.as_deref().unwrap_or_default().to_lowercase()
                );
                if !seen.insert(identity) {
                    continue;
                }

                apps.push(RawInstalledApp {
                    name,
                    publisher,
                    version,
                    install_location: read_string(&key, "InstallLocation"),
                    estimated_size_bytes: read_dword(&key, "EstimatedSize")
                        .map(|kilobytes| u64::from(kilobytes).saturating_mul(1024)),
                    display_icon: read_string(&key, "DisplayIcon"),
                    uninstall_command: read_string(&key, "UninstallString"),
                    may_require_elevation: machine_scope,
                });
            }
        }

        Ok(apps)
    }

    fn open_key(root: HKEY, path: &str, view: REG_SAM_FLAGS) -> Option<OwnedKey> {
        let path = wide(path);
        let mut key = HKEY::default();
        let access = REG_SAM_FLAGS(KEY_READ.0 | view.0);
        let result =
            unsafe { RegOpenKeyExW(root, PCWSTR(path.as_ptr()), Some(0), access, &mut key) };
        (result == ERROR_SUCCESS).then_some(OwnedKey(key))
    }

    fn enumerate_subkeys(key: &OwnedKey) -> Vec<String> {
        let mut names = Vec::new();
        let mut index = 0;

        loop {
            let mut buffer = vec![0_u16; 16_384];
            let mut length = buffer.len() as u32;
            let result = unsafe {
                RegEnumKeyExW(
                    key.0,
                    index,
                    Some(PWSTR(buffer.as_mut_ptr())),
                    &mut length,
                    None,
                    None,
                    None,
                    None,
                )
            };
            if result == ERROR_NO_MORE_ITEMS {
                break;
            }
            if result == ERROR_SUCCESS {
                names.push(String::from_utf16_lossy(&buffer[..length as usize]));
            } else if result != ERROR_MORE_DATA {
                break;
            }
            index += 1;
        }
        names
    }

    fn read_string(key: &OwnedKey, name: &str) -> Option<String> {
        let name = wide(name);
        let flags = RRF_RT_REG_SZ | RRF_RT_REG_EXPAND_SZ;
        let mut bytes = 0_u32;
        let first = unsafe {
            RegGetValueW(
                key.0,
                PCWSTR::null(),
                PCWSTR(name.as_ptr()),
                flags,
                None,
                None,
                Some(&mut bytes),
            )
        };
        if first != ERROR_SUCCESS || bytes < 2 || bytes > 64 * 1024 {
            return None;
        }

        let mut buffer = vec![0_u16; bytes as usize / 2];
        let second = unsafe {
            RegGetValueW(
                key.0,
                PCWSTR::null(),
                PCWSTR(name.as_ptr()),
                flags,
                None,
                Some(buffer.as_mut_ptr().cast::<c_void>()),
                Some(&mut bytes),
            )
        };
        if second != ERROR_SUCCESS {
            return None;
        }
        let length = buffer
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(buffer.len());
        let value = String::from_utf16_lossy(&buffer[..length])
            .trim()
            .to_string();
        (!value.is_empty()).then_some(value)
    }

    fn read_dword(key: &OwnedKey, name: &str) -> Option<u32> {
        let name = wide(name);
        let mut value = 0_u32;
        let mut bytes = size_of::<u32>() as u32;
        let result = unsafe {
            RegGetValueW(
                key.0,
                PCWSTR::null(),
                PCWSTR(name.as_ptr()),
                RRF_RT_REG_DWORD,
                None,
                Some((&mut value as *mut u32).cast::<c_void>()),
                Some(&mut bytes),
            )
        };
        (result == ERROR_SUCCESS).then_some(value)
    }

    fn wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    #[allow(dead_code)]
    fn _error_code(error: WIN32_ERROR) -> AppError {
        AppError::OperationFailed(format!("Windows registry error {}", error.0))
    }
}

#[cfg(target_os = "windows")]
mod windows_actions {
    use std::ffi::c_void;
    use std::os::windows::ffi::OsStrExt;

    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{LocalFree, HLOCAL};
    use windows::Win32::System::Environment::ExpandEnvironmentStringsW;

    use windows::Win32::UI::Shell::{CommandLineToArgvW, ShellExecuteW};
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    use super::{AppError, AppResult, ParsedCommand};

    pub fn parse_registered_command(command: &str) -> AppResult<ParsedCommand> {
        let command = command.trim();
        if command.is_empty() || command.len() > 8192 || command.contains('\0') {
            return Err(AppError::InvalidInput(
                "The registered uninstaller command is invalid.".into(),
            ));
        }

        let command = expand_environment(command)?;

        let wide = command
            .encode_utf16()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>();
        let mut count = 0_i32;
        let argv = unsafe { CommandLineToArgvW(PCWSTR(wide.as_ptr()), &mut count) };
        if argv.is_null() || !(1..=32).contains(&count) {
            return Err(AppError::InvalidInput(
                "The registered uninstaller command could not be parsed safely.".into(),
            ));
        }

        let mut parts = Vec::with_capacity(count as usize);
        for index in 0..count as isize {
            let value = unsafe { *argv.offset(index) };
            let text = unsafe { value.to_string() }
                .map_err(|error| AppError::InvalidInput(error.to_string()))?;
            parts.push(text);
        }
        unsafe {
            let _ = LocalFree(Some(HLOCAL(argv.cast::<c_void>())));
        }

        let executable_value = parts.remove(0);
        let file_name = Path::new(&executable_value)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_ascii_lowercase();
        let executable = if file_name == "msiexec" || file_name == "msiexec.exe" {
            let windows = std::env::var_os("WINDIR")
                .map(PathBuf::from)
                .ok_or_else(|| AppError::OperationFailed("WINDIR is unavailable.".into()))?;
            windows.join("System32").join("msiexec.exe")
        } else {
            PathBuf::from(executable_value)
        };

        if !is_allowed_uninstaller_path(&executable) {
            return Err(AppError::OperationDenied(
                "The registered uninstaller does not resolve to a validated executable.".into(),
            ));
        }
        let executable = std::fs::canonicalize(&executable)
            .map_err(|error| AppError::OperationFailed(error.to_string()))?;

        Ok(ParsedCommand {
            executable,
            arguments: parts,
        })
    }

    pub fn launch_elevated(command: &ParsedCommand) -> AppResult<()> {
        let verb = wide("runas");
        let executable = command
            .executable
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>();
        let parameters = command
            .arguments
            .iter()
            .map(|argument| quote_windows_argument(argument))
            .collect::<Vec<_>>()
            .join(" ");
        let parameters = wide(&parameters);

        let result = unsafe {
            ShellExecuteW(
                None,
                PCWSTR(verb.as_ptr()),
                PCWSTR(executable.as_ptr()),
                PCWSTR(parameters.as_ptr()),
                PCWSTR::null(),
                SW_SHOWNORMAL,
            )
        };
        if result.0 as isize <= 32 {
            return Err(AppError::OperationFailed(
                "Windows declined or could not start the elevated uninstaller.".into(),
            ));
        }
        Ok(())
    }

    fn is_allowed_uninstaller_path(path: &Path) -> bool {
        path.is_absolute()
            && path.is_file()
            && path
                .extension()
                .and_then(|value| value.to_str())
                .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
    }

    fn quote_windows_argument(argument: &str) -> String {
        if !argument.is_empty()
            && !argument
                .chars()
                .any(|character| character.is_whitespace() || character == '"')
        {
            return argument.to_string();
        }

        let mut quoted = String::from("\"");
        let mut backslashes = 0;
        for character in argument.chars() {
            if character == '\\' {
                backslashes += 1;
            } else {
                if character == '"' {
                    quoted.push_str(&"\\".repeat(backslashes * 2 + 1));
                } else {
                    quoted.push_str(&"\\".repeat(backslashes));
                }
                quoted.push(character);
                backslashes = 0;
            }
        }
        quoted.push_str(&"\\".repeat(backslashes * 2));
        quoted.push('"');
        quoted
    }

    fn expand_environment(value: &str) -> AppResult<String> {
        let source = wide(value);
        let required = unsafe { ExpandEnvironmentStringsW(PCWSTR(source.as_ptr()), None) };
        if required == 0 || required > 32_768 {
            return Err(AppError::InvalidInput(
                "The registered uninstaller contains invalid environment variables.".into(),
            ));
        }

        let mut output = vec![0_u16; required as usize];
        let written = unsafe {
            ExpandEnvironmentStringsW(PCWSTR(source.as_ptr()), Some(output.as_mut_slice()))
        };
        if written == 0 || written > required {
            return Err(AppError::OperationFailed(
                "Windows could not expand the registered uninstaller path.".into(),
            ));
        }
        let length = output
            .iter()
            .position(|value| *value == 0)
            .unwrap_or(output.len());
        Ok(String::from_utf16_lossy(&output[..length]))
    }

    fn wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    use std::path::{Path, PathBuf};

    #[cfg(test)]
    mod tests {
        use super::quote_windows_argument;

        #[test]
        fn quotes_windows_arguments_without_changing_simple_values() {
            assert_eq!(quote_windows_argument("/x"), "/x");
            assert_eq!(quote_windows_argument("two words"), "\"two words\"");
            assert_eq!(quote_windows_argument(""), "\"\"");
        }

        #[test]
        fn parses_environment_expanded_msiexec_commands() {
            let parsed = super::parse_registered_command(
                r#""%WINDIR%\System32\msiexec.exe" /X{00000000-0000-0000-0000-000000000000}"#,
            )
            .expect("the Windows Installer command should be valid");
            assert!(parsed.executable.ends_with("msiexec.exe"));
            assert_eq!(parsed.arguments.len(), 1);
        }
    }
}

#[cfg(target_os = "windows")]
mod windows_icons {
    use std::ffi::c_void;
    use std::mem::size_of;
    use std::os::windows::ffi::OsStrExt;
    use std::slice;

    use windows::core::PCWSTR;
    use windows::Win32::Graphics::Gdi::{
        CreateCompatibleDC, CreateDIBSection, DeleteDC, DeleteObject, GetDC, ReleaseDC,
        SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HGDIOBJ,
    };
    use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;
    use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_SMALLICON};
    use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, DrawIconEx, DI_NORMAL};

    const ICON_SIZE: i32 = 32;

    pub fn extract_icon_data_url(path: &Path) -> Option<String> {
        if !path.is_file() {
            return None;
        }
        let path = path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect::<Vec<_>>();
        let mut info = SHFILEINFOW::default();
        let result = unsafe {
            SHGetFileInfoW(
                PCWSTR(path.as_ptr()),
                FILE_FLAGS_AND_ATTRIBUTES(0),
                Some(&mut info),
                size_of::<SHFILEINFOW>() as u32,
                SHGFI_ICON | SHGFI_SMALLICON,
            )
        };
        if result == 0 || info.hIcon.is_invalid() {
            return None;
        }

        let screen = unsafe { GetDC(None) };
        if screen.is_invalid() {
            unsafe {
                let _ = DestroyIcon(info.hIcon);
            }
            return None;
        }
        let memory = unsafe { CreateCompatibleDC(Some(screen)) };
        if memory.is_invalid() {
            unsafe {
                let _ = ReleaseDC(None, screen);
                let _ = DestroyIcon(info.hIcon);
            }
            return None;
        }

        let mut bitmap_info = BITMAPINFO::default();
        bitmap_info.bmiHeader = BITMAPINFOHEADER {
            biSize: size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: ICON_SIZE,
            biHeight: -ICON_SIZE,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0,
            ..Default::default()
        };
        let mut pixels: *mut c_void = std::ptr::null_mut();
        let bitmap = unsafe {
            CreateDIBSection(
                Some(memory),
                &bitmap_info,
                DIB_RGB_COLORS,
                &mut pixels,
                None,
                0,
            )
        }
        .ok()?;
        if pixels.is_null() {
            unsafe {
                let _ = DeleteObject(HGDIOBJ(bitmap.0));
                let _ = DeleteDC(memory);
                let _ = ReleaseDC(None, screen);
                let _ = DestroyIcon(info.hIcon);
            }
            return None;
        }

        let old = unsafe { SelectObject(memory, HGDIOBJ(bitmap.0)) };
        let pixel_length = (ICON_SIZE * ICON_SIZE * 4) as usize;
        unsafe {
            std::ptr::write_bytes(pixels.cast::<u8>(), 0, pixel_length);
        }
        let drawn = unsafe {
            DrawIconEx(
                memory, 0, 0, info.hIcon, ICON_SIZE, ICON_SIZE, 0, None, DI_NORMAL,
            )
        }
        .is_ok();

        let data = if drawn {
            let pixels = unsafe { slice::from_raw_parts(pixels.cast::<u8>(), pixel_length) };
            Some(bmp_data_url(ICON_SIZE, ICON_SIZE, pixels))
        } else {
            None
        };

        unsafe {
            let _ = SelectObject(memory, old);
            let _ = DeleteObject(HGDIOBJ(bitmap.0));
            let _ = DeleteDC(memory);
            let _ = ReleaseDC(None, screen);
            let _ = DestroyIcon(info.hIcon);
        }
        data
    }

    fn bmp_data_url(width: i32, height: i32, pixels: &[u8]) -> String {
        let file_size = 54_u32.saturating_add(pixels.len() as u32);
        let mut bmp = Vec::with_capacity(file_size as usize);
        bmp.extend_from_slice(b"BM");
        bmp.extend_from_slice(&file_size.to_le_bytes());
        bmp.extend_from_slice(&[0; 4]);
        bmp.extend_from_slice(&54_u32.to_le_bytes());
        bmp.extend_from_slice(&40_u32.to_le_bytes());
        bmp.extend_from_slice(&width.to_le_bytes());
        bmp.extend_from_slice(&(-height).to_le_bytes());
        bmp.extend_from_slice(&1_u16.to_le_bytes());
        bmp.extend_from_slice(&32_u16.to_le_bytes());
        bmp.extend_from_slice(&0_u32.to_le_bytes());
        bmp.extend_from_slice(&(pixels.len() as u32).to_le_bytes());
        bmp.extend_from_slice(&[0; 16]);
        bmp.extend_from_slice(pixels);
        format!("data:image/bmp;base64,{}", base64_encode(&bmp))
    }

    fn base64_encode(input: &[u8]) -> String {
        const TABLE: &[u8; 64] =
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        let mut output = String::with_capacity(input.len().div_ceil(3) * 4);
        for chunk in input.chunks(3) {
            let value = (u32::from(chunk[0]) << 16)
                | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8)
                | u32::from(*chunk.get(2).unwrap_or(&0));
            output.push(TABLE[((value >> 18) & 0x3f) as usize] as char);
            output.push(TABLE[((value >> 12) & 0x3f) as usize] as char);
            output.push(if chunk.len() > 1 {
                TABLE[((value >> 6) & 0x3f) as usize] as char
            } else {
                '='
            });
            output.push(if chunk.len() > 2 {
                TABLE[(value & 0x3f) as usize] as char
            } else {
                '='
            });
        }
        output
    }

    use std::path::Path;

    #[cfg(test)]
    mod tests {
        use super::base64_encode;

        #[test]
        fn base64_encoder_handles_padding() {
            assert_eq!(base64_encode(b"f"), "Zg==");
            assert_eq!(base64_encode(b"fo"), "Zm8=");
            assert_eq!(base64_encode(b"foo"), "Zm9v");
        }

        #[test]
        fn extracts_a_shell_icon_for_a_real_executable() {
            let executable = std::env::current_exe().expect("test executable path");
            let icon = super::extract_icon_data_url(&executable).expect("shell icon data");
            assert!(icon.starts_with("data:image/bmp;base64,"));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::parse_display_icon_path;
    use std::path::PathBuf;

    #[test]
    fn parses_quoted_display_icon_paths_and_resource_indexes() {
        assert_eq!(
            parse_display_icon_path(r#""C:\Program Files\Faith\faith.exe",0"#),
            Some(PathBuf::from(r"C:\Program Files\Faith\faith.exe"))
        );
        assert_eq!(parse_display_icon_path("  "), None);
    }
}
