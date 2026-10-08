use sysinfo::{Disks, System};

use crate::errors::AppResult;
use crate::models::{DiskActivity, SystemInfo};

pub fn get_system_info() -> AppResult<SystemInfo> {
    let mut system = System::new_all();
    system.refresh_all();
    let cpu = system.cpus().first();

    let disks = Disks::new_with_refreshed_list()
        .iter()
        .map(|disk| {
            let total_bytes = disk.total_space();
            let available_bytes = disk.available_space();
            DiskActivity {
                name: disk.name().to_string_lossy().to_string(),
                mount_point: disk.mount_point().to_string_lossy().to_string(),
                used_bytes: total_bytes.saturating_sub(available_bytes),
                total_bytes,
                read_bytes_per_second: None,
                write_bytes_per_second: None,
            }
        })
        .collect();

    Ok(SystemInfo {
        os_name: System::name(),
        os_version: System::os_version(),
        kernel_version: System::kernel_version(),
        host_name: System::host_name(),
        architecture: std::env::consts::ARCH.to_string(),
        cpu_model: cpu.map(|item| item.brand().to_string()),
        physical_cores: system.physical_core_count(),
        logical_processors: system.cpus().len(),
        total_memory_bytes: system.total_memory(),
        gpu_name: None,
        disks,
    })
}
