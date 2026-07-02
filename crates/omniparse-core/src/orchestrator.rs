use tokio_util::sync::CancellationToken;

use crate::browser_fetch::fetch_with_fullsize_images;
use crate::config::read_settings;
use crate::error::{AppError, AppResult};
use crate::extract::{extract_content, format_output};
use crate::fetch::fetch_url;
use crate::images::{extract_images, merge_image_lists};
use crate::media::extract_file_links;
use crate::models::{ExtractRequest, ExtractResponse, OutputFormat};
use crate::progress::{emit, noop_progress, ProgressCallback};

pub fn validate_request(request: &ExtractRequest) -> AppResult<()> {
    let has_url = request.url.as_ref().is_some_and(|u| !u.trim().is_empty());
    let has_html = request.html.as_ref().is_some_and(|h| !h.trim().is_empty());

    if !has_url && !has_html {
        return Err(AppError::Validation("Either 'url' or 'html' must be provided".into()));
    }
    if has_url && has_html {
        return Err(AppError::Validation("Provide either 'url' or 'html', not both".into()));
    }
    if has_html && request.render_js {
        return Err(AppError::Validation(
            "render_js is only supported when extracting from a URL".into(),
        ));
    }
    if has_html && request.resolve_fullsize_images {
        return Err(AppError::Validation(
            "resolve_fullsize_images is only supported when extracting from a URL".into(),
        ));
    }
    if request.resolve_fullsize_images && !request.extract_images {
        return Err(AppError::Validation(
            "resolve_fullsize_images requires extract_images to be enabled".into(),
        ));
    }
    if request.resolve_deep && !request.resolve_fullsize_images {
        return Err(AppError::Validation(
            "resolve_deep requires resolve_fullsize_images to be enabled".into(),
        ));
    }
    if has_html && request.resolve_deep {
        return Err(AppError::Validation(
            "resolve_deep is only supported when extracting from a URL".into(),
        ));
    }
    if let Some(html) = &request.html {
        if html.as_bytes().len() > read_settings().max_html_size_bytes {
            return Err(AppError::PayloadTooLarge);
        }
    }
    if has_url && request.base_url.is_some() {
        return Err(AppError::Validation(
            "base_url is only supported when extracting from raw HTML".into(),
        ));
    }
    Ok(())
}

pub async fn run_extraction(request: ExtractRequest) -> AppResult<ExtractResponse> {
    run_extraction_with_progress(request, noop_progress(), CancellationToken::new()).await
}

pub async fn run_extraction_with_progress(
    request: ExtractRequest,
    progress: ProgressCallback,
    cancel: CancellationToken,
) -> AppResult<ExtractResponse> {
    emit(&progress, "validating", "Checking request");
    validate_request(&request)?;

    if cancel.is_cancelled() {
        return Err(AppError::Validation("Extraction cancelled".into()));
    }

    let source_url = request.url.as_ref().map(|u| u.trim().to_string()).filter(|u| !u.is_empty());
    let base_url = request
        .base_url
        .as_ref()
        .map(|u| u.trim().to_string())
        .filter(|u| !u.is_empty())
        .or_else(|| source_url.clone());

    let mut html = request
        .html
        .as_ref()
        .map(|h| h.trim().to_string())
        .unwrap_or_default();
    let mut resolved_images: Option<Vec<String>> = None;

    if let Some(url) = &source_url {
        if request.resolve_fullsize_images {
            let (rendered, images) = fetch_with_fullsize_images(
                url,
                request.resolve_deep,
                &progress,
                &cancel,
            )
            .await?;
            html = rendered;
            resolved_images = Some(images);
        } else {
            emit(&progress, "fetching", format!("Fetching {url}"));
            html = fetch_url(url, request.render_js, &progress, &cancel).await?;
        }
    }

    emit(&progress, "extracting", "Parsing article content");
    let result = extract_content(&html, base_url.as_deref())?;

    let mut images = Vec::new();
    let mut files = Vec::new();

    if request.extract_images {
        let page_images = extract_images(&html, base_url.as_deref());
        images = if let Some(resolved) = resolved_images {
            merge_image_lists(&[page_images, resolved])
        } else {
            page_images
        };

        let settings = read_settings();
        if settings.verify_image_sizes || request.resolve_deep {
            emit(&progress, "finalizing", "Verifying image sizes");
            images = crate::images::finalize_resolved_images(images).await;
        }

        files = extract_file_links(&html, base_url.as_deref());
    }

    emit(&progress, "finalizing", "Building output");

    let mut content_json = result.content_json.clone();
    if let Some(obj) = content_json.as_object_mut() {
        obj.insert("images".to_string(), serde_json::json!(images));
        obj.insert("files".to_string(), serde_json::json!(files));
    }

    let (_primary, _text, json_override) = format_output(&result, request.output_format);
    let content_json = match request.output_format {
        OutputFormat::Json => json_override.or(Some(content_json)),
        _ => Some(content_json),
    };

    Ok(ExtractResponse {
        title: result.title,
        content_markdown: result.content_markdown,
        content_text: Some(result.content_text),
        content_json,
        metadata: result.metadata,
        images,
        files,
        output_format: request.output_format,
    })
}
