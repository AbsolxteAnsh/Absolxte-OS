mod commands;
mod errors;
mod models;
mod services;

pub fn run() {
    tauri::Builder::default()
        .manage(services::telemetry::TelemetryState::default())
        .manage(services::apps::AppInventoryState::default())
        .manage(services::launcher::LauncherState::default())
        .manage(services::maintenance::CleanupState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_running_apps,
            commands::close_running_app,
            commands::get_installed_apps,
            commands::launch_uninstaller,
            commands::list_launchers,
            commands::pick_launcher_app,
            commands::rename_launcher,
            commands::remove_launcher,
            commands::launch_custom_app,
            commands::boost_memory,
            commands::scan_cleanup,
            commands::execute_cleanup,
            commands::get_system_snapshot,
            commands::get_processes,
            commands::kill_process,
            commands::get_system_info,
            commands::open_system_target,
            commands::test_latency,
            commands::minimize_window,
            commands::toggle_maximize_window,
            commands::close_window,
            commands::start_window_drag,
            commands::is_window_maximized
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Absolxte OS");
}
