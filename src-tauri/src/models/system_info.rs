use serde::Serialize;

use super::DiskActivity;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub os_name: Option<String>,
    pub os_version: Option<String>,
    pub kernel_version: Option<String>,
    pub host_name: Option<String>,
    pub architecture: String,
    pub cpu_model: Option<String>,
    pub physical_cores: Option<usize>,
    pub logical_processors: usize,
    pub total_memory_bytes: u64,
    pub gpu_name: Option<String>,
    pub disks: Vec<DiskActivity>,
}
