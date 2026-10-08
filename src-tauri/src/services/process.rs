use sysinfo::{ProcessRefreshKind, RefreshKind, Signal, System};

use crate::errors::{AppError, AppResult};
use crate::models::ProcessInfo;

const PROTECTED_NAMES: [&str; 9] = [
    "system",
    "registry",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
    "lsass.exe",
    "winlogon.exe",
    "dwm.exe",
];

pub fn get_processes() -> AppResult<Vec<ProcessInfo>> {
    let refresh_kind = RefreshKind::everything().with_processes(ProcessRefreshKind::everything());
    let mut system = System::new_with_specifics(refresh_kind);
    system.refresh_all();

    let mut processes = system
        .processes()
        .values()
        .map(|process| ProcessInfo {
            name: process.name().to_string_lossy().to_string(),
            pid: process.pid().as_u32(),
            cpu_percent: process.cpu_usage(),
            memory_bytes: process.memory(),
            status: format!("{:?}", process.status()),
            path: process.exe().map(|path| path.to_string_lossy().to_string()),
            start_time_seconds: Some(process.start_time()),
        })
        .collect::<Vec<_>>();

    processes.sort_by(|left, right| {
        right
            .cpu_percent
            .partial_cmp(&left.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    Ok(processes)
}

pub fn kill_process(pid: u32) -> AppResult<bool> {
    if pid <= 4 {
        return Err(AppError::OperationDenied(
            "Core Windows process IDs cannot be terminated from Fai1thful OS.".into(),
        ));
    }

    let mut system = System::new();
    system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    let process = system
        .process(sysinfo::Pid::from_u32(pid))
        .ok_or_else(|| AppError::InvalidInput(format!("Process {pid} is no longer running.")))?;

    let name = process.name().to_string_lossy().to_lowercase();
    if PROTECTED_NAMES.iter().any(|protected| *protected == name) {
        return Err(AppError::OperationDenied(format!(
            "{name} is protected because ending it can destabilize Windows."
        )));
    }

    Ok(process
        .kill_with(Signal::Term)
        .unwrap_or_else(|| process.kill()))
}
