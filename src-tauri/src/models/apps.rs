use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunningApp {
    pub name: String,
    pub pid: u32,
    pub memory_bytes: u64,
    pub path: String,
    pub icon_data_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledApp {
    pub id: String,
    pub name: String,
    pub publisher: Option<String>,
    pub version: Option<String>,
    pub install_location: Option<String>,
    pub estimated_size_bytes: Option<u64>,
    pub icon_data_url: Option<String>,
    pub uninstall_available: bool,
    pub may_require_elevation: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UninstallLaunchResult {
    pub launched: bool,
    pub elevation_requested: bool,
    pub needs_elevation: bool,
}
