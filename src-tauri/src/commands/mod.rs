use std::net::{TcpStream, ToSocketAddrs};

use std::time::Duration;

use crate::errors::{AppError, AppResult};
use crate::models::{ProcessInfo, SystemInfo, SystemSnapshot};
use crate::services::telemetry::TelemetryState;
use crate::services::{process, system, telemetry};
fn window_error(error: tauri::Error) -> AppError {
    AppError::OperationFailed(error.to_string())
}

#[tauri::command]
pub fn minimize_window(window: tauri::WebviewWindow) -> AppResult<bool> {
    window.minimize().map_err(window_error)?;
    Ok(true)
}

#[tauri::command]
pub fn toggle_maximize_window(window: tauri::WebviewWindow) -> AppResult<bool> {
    let maximized = window.is_maximized().map_err(window_error)?;
    if maximized {
        window.unmaximize().map_err(window_error)?;
    } else {
        window.maximize().map_err(window_error)?;
    }
    Ok(!maximized)
}

#[tauri::command]
pub fn close_window(window: tauri::WebviewWindow) -> AppResult<bool> {
    window.close().map_err(window_error)?;
    Ok(true)
}

#[tauri::command]
pub fn start_window_drag(window: tauri::WebviewWindow) -> AppResult<bool> {
    window.start_dragging().map_err(window_error)?;
    Ok(true)
}

#[tauri::command]
pub fn is_window_maximized(window: tauri::WebviewWindow) -> AppResult<bool> {
    window.is_maximized().map_err(window_error)
}

#[tauri::command]
pub fn scan_cleanup(
    state: tauri::State<'_, crate::services::maintenance::CleanupState>,
) -> AppResult<crate::models::CleanupPlan> {
    crate::services::maintenance::scan_cleanup(state.inner())
}

#[tauri::command]
pub fn execute_cleanup(
    state: tauri::State<'_, crate::services::maintenance::CleanupState>,
    plan_id: String,
    category_ids: Vec<String>,
) -> AppResult<crate::models::CleanupResult> {
    crate::services::maintenance::execute_cleanup(state.inner(), plan_id, category_ids)
}
#[tauri::command]
pub fn get_running_apps(
    state: tauri::State<'_, crate::services::apps::AppInventoryState>,
) -> AppResult<Vec<crate::models::RunningApp>> {
    crate::services::apps::get_running_apps(state.inner())
}

#[tauri::command]
pub fn close_running_app(pid: u32) -> AppResult<bool> {
    crate::services::apps::close_running_app(pid)
}

#[tauri::command]
pub fn get_installed_apps(
    state: tauri::State<'_, crate::services::apps::AppInventoryState>,
) -> AppResult<Vec<crate::models::InstalledApp>> {
    crate::services::apps::get_installed_apps(state.inner())
}

#[tauri::command]
pub fn launch_uninstaller(
    state: tauri::State<'_, crate::services::apps::AppInventoryState>,
    app_id: String,
    allow_elevation: bool,
) -> AppResult<crate::models::UninstallLaunchResult> {
    crate::services::apps::launch_uninstaller(state.inner(), app_id, allow_elevation)
}

#[tauri::command]
pub fn list_launchers(
    state: tauri::State<'_, crate::services::launcher::LauncherState>,
) -> AppResult<crate::models::LauncherInventory> {
    crate::services::launcher::list_launchers(state.inner())
}

#[tauri::command]
pub fn pick_launcher_app(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, crate::services::launcher::LauncherState>,
) -> AppResult<Option<crate::models::LauncherEntry>> {
    #[cfg(target_os = "windows")]
    {
        let owner = window
            .hwnd()
            .map_err(|error| AppError::OperationFailed(error.to_string()))?;
        crate::services::launcher::pick_launcher_app(state.inner(), owner)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = window;
        crate::services::launcher::pick_launcher_app(state.inner(), ())
    }
}

#[tauri::command]
pub fn rename_launcher(
    state: tauri::State<'_, crate::services::launcher::LauncherState>,
    id: String,
    name: String,
) -> AppResult<bool> {
    crate::services::launcher::rename_launcher(state.inner(), id, name)
}

#[tauri::command]
pub fn remove_launcher(
    state: tauri::State<'_, crate::services::launcher::LauncherState>,
    id: String,
) -> AppResult<bool> {
    crate::services::launcher::remove_launcher(state.inner(), id)
}

#[tauri::command]
pub fn launch_custom_app(
    state: tauri::State<'_, crate::services::launcher::LauncherState>,
    id: String,
) -> AppResult<bool> {
    crate::services::launcher::launch_custom_app(state.inner(), id)
}

#[tauri::command]
pub fn boost_memory() -> AppResult<crate::models::BoostResult> {
    crate::services::maintenance::boost_memory()
}

#[tauri::command]
pub fn get_system_snapshot(state: tauri::State<'_, TelemetryState>) -> AppResult<SystemSnapshot> {
    telemetry::get_system_snapshot(state.inner())
}

#[tauri::command]
pub fn get_processes() -> AppResult<Vec<ProcessInfo>> {
    process::get_processes()
}

#[tauri::command]
pub fn kill_process(pid: u32) -> AppResult<bool> {
    process::kill_process(pid)
}

#[tauri::command]
pub fn get_system_info() -> AppResult<SystemInfo> {
    system::get_system_info()
}

#[tauri::command]
pub fn open_system_target(target: String) -> AppResult<bool> {
    crate::services::system_actions::open_system_target(&target)
}

#[tauri::command]
pub fn test_latency(host: String) -> AppResult<u128> {
    let normalized = host.trim().trim_end_matches(':').to_string();
    if normalized.is_empty() || normalized.len() > 255 || normalized.contains(char::is_whitespace) {
        return Err(AppError::InvalidInput(
            "Enter a host such as 1.1.1.1 or example.com.".into(),
        ));
    }

    let address = format!("{normalized}:443")
        .to_socket_addrs()
        .map_err(|error| AppError::NetworkDiagnostic(error.to_string()))?
        .next()
        .ok_or_else(|| AppError::NetworkDiagnostic("The endpoint did not resolve.".into()))?;

    let started = std::time::Instant::now();
    TcpStream::connect_timeout(&address, Duration::from_secs(3))
        .map_err(|error| AppError::NetworkDiagnostic(error.to_string()))?;
    Ok(started.elapsed().as_millis())
}
