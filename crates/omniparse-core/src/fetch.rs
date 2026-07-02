use crate::browser::{browser_headers, http_status_hint};
use crate::browser_fetch::render_page_html;
use crate::config::read_settings;
use crate::error::{AppError, AppResult};
use crate::progress::{emit, ProgressCallback};
use crate::security::{assert_url_is_safe, is_valid_url};
use tokio_util::sync::CancellationToken;

pub async fn fetch_url(
    url: &str,
    render_js: bool,
    progress: &ProgressCallback,
    cancel: &CancellationToken,
) -> AppResult<String> {
    if !is_valid_url(url) {
        return Err(AppError::InvalidUrl(format!(
            "Unsupported URL scheme or malformed URL: {url}"
        )));
    }
    assert_url_is_safe(url)?;

    if render_js {
        return render_page_html(url, progress, cancel).await;
    }

    emit(progress, "fetching", format!("Fetching {url}"));

    let settings = read_settings();
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs_f64(settings.request_timeout_seconds))
        .build()
        .map_err(|e| AppError::Fetch(e.to_string()))?;

    let response = client
        .get(url)
        .headers(browser_headers(Some(url)))
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                AppError::FetchTimeout
            } else {
                AppError::Fetch(format!("Could not reach URL: {url} ({e})"))
            }
        })?;

    let status = response.status().as_u16();
    if status >= 400 {
        return Err(AppError::Fetch(format!(
            "HTTP {status} for URL: {url}{}",
            http_status_hint(status)
        )));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    if !content_type.is_empty()
        && !content_type.contains("html")
        && !content_type.starts_with("text/")
    {
        return Err(AppError::InvalidUrl(format!(
            "URL did not return HTML content (Content-Type: {})",
            content_type.split(';').next().unwrap_or(&content_type)
        )));
    }

    if let Some(len) = response.content_length() {
        if len as usize > settings.max_html_size_bytes {
            return Err(AppError::PayloadTooLarge);
        }
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| AppError::Fetch(e.to_string()))?;

    if bytes.len() > settings.max_html_size_bytes {
        return Err(AppError::PayloadTooLarge);
    }

    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

pub async fn download_media_bytes(url: &str) -> AppResult<(Vec<u8>, String, String)> {
    assert_url_is_safe(url)?;
    let settings = read_settings();
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs_f64(settings.request_timeout_seconds))
        .build()
        .map_err(|e| AppError::Fetch(e.to_string()))?;

    let response = client
        .get(url)
        .headers(browser_headers(Some(url)))
        .send()
        .await
        .map_err(|e| AppError::Fetch(e.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::Fetch(format!(
            "HTTP {} for URL: {url}",
            response.status().as_u16()
        )));
    }

    let content_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .split(';')
        .next()
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| AppError::Fetch(e.to_string()))?
        .to_vec();

    let mut filename = url::Url::parse(url)
        .ok()
        .and_then(|u| u.path_segments().and_then(|s| s.last().map(|p| p.to_string())))
        .filter(|p| !p.is_empty())
        .unwrap_or_else(|| "download".to_string());

    if !filename.contains('.') {
        if let Some(ext) = content_type.rsplit('/').next() {
            if ext != "octet-stream" {
                filename = format!("{filename}.{ext}");
            }
        }
    }

    Ok((bytes, content_type, filename))
}
