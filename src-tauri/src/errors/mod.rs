use serde::Serialize;
use thiserror::Error;

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("System telemetry is unavailable: {0}")]
    TelemetryUnavailable(String),
    #[error("Operation denied: {0}")]
    OperationDenied(String),
    #[error("Windows operation failed: {0}")]
    OperationFailed(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
    #[error("Network diagnostic failed: {0}")]
    NetworkDiagnostic(String),
}

#[derive(Debug, Serialize)]
pub struct AppErrorPayload {
    message: String,
    details: Option<String>,
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let payload = AppErrorPayload {
            message: self.to_string(),
            details: Some(format!("{self:?}")),
        };

        payload.serialize(serializer)
    }
}
