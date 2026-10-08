use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInfo {
    pub name: String,
    pub pid: u32,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub status: String,
    pub path: Option<String>,
    pub start_time_seconds: Option<u64>,
}
