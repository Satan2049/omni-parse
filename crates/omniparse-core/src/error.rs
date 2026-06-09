use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    InvalidUrl(String),
    #[error("{0}")]
    Fetch(String),
    #[error("Request timed out while fetching the page")]
    FetchTimeout,
    #[error("Page content exceeds maximum allowed size")]
    PayloadTooLarge,
    #[error("{0}")]
    Extraction(String),
    #[error("{0}")]
    Conversion(String),
    #[error("{0}")]
    Validation(String),
}

impl AppError {
    pub fn status(&self) -> StatusCode {
        match self {
            Self::InvalidUrl(_) | Self::Validation(_) => StatusCode::UNPROCESSABLE_ENTITY,
            Self::FetchTimeout => StatusCode::GATEWAY_TIMEOUT,
            Self::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            Self::Fetch(_) | Self::Extraction(_) | Self::Conversion(_) => {
                StatusCode::UNPROCESSABLE_ENTITY
            }
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status();
        (status, Json(json!({ "detail": self.to_string() }))).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
