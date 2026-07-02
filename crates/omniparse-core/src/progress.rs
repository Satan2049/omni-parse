use std::sync::Arc;

use tokio_util::sync::CancellationToken;

use crate::models::ExtractProgress;

pub type ProgressCallback = Arc<dyn Fn(ExtractProgress) + Send + Sync>;

pub fn noop_progress() -> ProgressCallback {
    Arc::new(|_| {})
}

pub fn emit(callback: &ProgressCallback, stage: &str, message: impl Into<String>) {
    callback(ExtractProgress {
        stage: stage.to_string(),
        message: message.into(),
        current: None,
        total: None,
    });
}

pub fn emit_step(
    callback: &ProgressCallback,
    stage: &str,
    message: impl Into<String>,
    current: u32,
    total: u32,
) {
    callback(ExtractProgress {
        stage: stage.to_string(),
        message: message.into(),
        current: Some(current),
        total: Some(total),
    });
}

pub fn ensure_not_cancelled(token: &CancellationToken) -> Result<(), ()> {
    if token.is_cancelled() {
        Err(())
    } else {
        Ok(())
    }
}
