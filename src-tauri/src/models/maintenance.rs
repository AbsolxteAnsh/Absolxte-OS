use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoostResult {
    pub before_bytes: u64,
    pub after_bytes: u64,
    pub released_bytes: u64,
    pub processes_trimmed: u32,
    pub processes_skipped: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupCategory {
    pub id: String,
    pub label: String,
    pub description: String,
    pub file_count: u64,
    pub total_bytes: u64,
    pub requires_elevation: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupPlan {
    pub id: String,
    pub created_at_seconds: u64,
    pub expires_at_seconds: u64,
    pub categories: Vec<CleanupCategory>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub deleted_files: u64,
    pub freed_bytes: u64,
    pub failed_files: u64,
}
