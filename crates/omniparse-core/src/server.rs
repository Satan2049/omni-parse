use std::net::SocketAddr;

use axum::extract::Query;
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use tower_http::cors::{Any, CorsLayer};

use crate::config::{read_settings, AppSettings, APP_VERSION};
use crate::convert::convert_content;
use crate::error::AppError;
use crate::fetch::download_media_bytes;
use crate::models::{
    ConvertRequest, ExtractRequest, HealthResponse,
};
use crate::orchestrator::run_extraction;
use crate::settings::{apply_settings, get_public_settings};

#[derive(Debug, Deserialize)]
struct DownloadQuery {
    url: String,
}

pub fn build_router() -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/health", get(health))
        .route("/extract", post(extract))
        .route("/convert", post(convert))
        .route("/images/download", get(download_image))
        .route("/settings", get(read_settings_handler).put(update_settings_handler))
        .layer(cors)
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: APP_VERSION,
    })
}

async fn extract(Json(request): Json<ExtractRequest>) -> Result<Json<serde_json::Value>, AppError> {
    let response = run_extraction(request).await?;
    Ok(Json(serde_json::to_value(response).unwrap()))
}

async fn convert(Json(request): Json<ConvertRequest>) -> Result<Response, AppError> {
    if request.content.trim().is_empty() {
        return Err(AppError::Validation("content must not be empty".into()));
    }
    let (bytes, content_type, filename) =
        convert_content(&request.content, request.target_format, &request.title)?;
    let safe_name = filename.replace('"', "");
    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, content_type),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{safe_name}\""),
            ),
            (header::CACHE_CONTROL, "no-store".to_string()),
        ],
        bytes,
    )
        .into_response())
}

async fn download_image(Query(query): Query<DownloadQuery>) -> Result<Response, AppError> {
    let (bytes, content_type, filename) = download_media_bytes(&query.url).await?;
    let safe_name = filename.replace('"', "");
    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, content_type),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{safe_name}\""),
            ),
            (header::CACHE_CONTROL, "no-store".to_string()),
        ],
        bytes,
    )
        .into_response())
}

async fn read_settings_handler() -> Json<AppSettings> {
    Json(get_public_settings())
}

async fn update_settings_handler(Json(patch): Json<AppSettings>) -> Json<AppSettings> {
    let current = read_settings();
    let updated = AppSettings {
        request_timeout_seconds: patch.request_timeout_seconds,
        playwright_timeout_ms: patch.playwright_timeout_ms,
        playwright_image_timeout_ms: patch.playwright_image_timeout_ms,
        max_lightbox_clicks: patch.max_lightbox_clicks,
        max_gallery_pages: patch.max_gallery_pages,
        verify_image_sizes: patch.verify_image_sizes,
        max_html_size_bytes: patch.max_html_size_bytes,
        allow_private_network_urls: patch.allow_private_network_urls,
    };
    let _ = current;
    Json(apply_settings(updated))
}

pub async fn run_server() {
    let app = build_router();
    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind API server to 127.0.0.1:8000");
    log::info!("OmniParse API listening on http://{addr}");
    axum::serve(listener, app)
        .await
        .expect("API server error");
}
