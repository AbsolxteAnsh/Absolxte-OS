use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherEntry {
    pub id: String,
    pub name: String,
    pub path: String,
    pub icon_data_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherInventory {
    pub entries: Vec<LauncherEntry>,
    pub warning: Option<String>,
}
