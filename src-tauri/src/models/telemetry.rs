use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSnapshot {
    pub timestamp: u64,
    pub cpu: CpuSnapshot,
    pub memory: MemorySnapshot,
    pub gpu: Option<GpuSnapshot>,
    pub disks: Vec<DiskActivity>,
    pub network: NetworkSnapshot,
    pub uptime_seconds: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuSnapshot {
    pub usage_percent: f32,
    pub frequency_mhz: Option<u64>,
    pub temperature_c: Option<f32>,
    pub logical_processors: usize,
    pub physical_cores: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MemorySnapshot {
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuSnapshot {
    pub name: String,
    pub usage_percent: Option<f32>,
    pub temperature_c: Option<f32>,
    pub used_vram_bytes: Option<u64>,
    pub total_vram_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskActivity {
    pub name: String,
    pub mount_point: String,
    pub used_bytes: u64,
    pub total_bytes: u64,
    pub read_bytes_per_second: Option<u64>,
    pub write_bytes_per_second: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSnapshot {
    pub adapter_name: Option<String>,
    pub download_bytes_per_second: u64,
    pub upload_bytes_per_second: u64,
    pub session_downloaded_bytes: u64,
    pub session_uploaded_bytes: u64,
}
