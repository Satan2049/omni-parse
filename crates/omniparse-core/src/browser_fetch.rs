use std::time::Duration;

use chromiumoxide::browser::Browser;
use chromiumoxide::js::EvaluationResult;
use chromiumoxide::page::Page;
use tokio_util::sync::CancellationToken;
use url::Url;

use crate::browser::CHROME_USER_AGENT;
use crate::browser_pool::{
    browser_from_session, browser_lock, friendly_browser_error, return_session, shutdown_session,
    take_session,
};
use crate::config::read_settings;
use crate::error::{AppError, AppResult};
use crate::images::extract_images;
use crate::progress::{emit, emit_step, ensure_not_cancelled, ProgressCallback};
use crate::security::assert_url_is_safe;

const CLICKABLE_SELECTORS: &[&str] = &[
    "img:not([width='1']):not([height='1'])",
    "a[data-fancybox]",
    "a[data-lightbox]",
    ".gallery img",
    ".gallery-item img",
    "[data-action='zoom']",
    ".product-image img",
    "figure img",
];

const LIGHTBOX_IMAGE_SELECTORS: &[&str] = &[
    ".pswp__img",
    ".fancybox-image",
    ".lg-image",
    ".lightbox img",
    "[class*='lightbox'] img",
    ".modal img",
    "[role='dialog'] img",
];

async fn configure_page(page: &Page) -> AppResult<()> {
    page.set_user_agent(CHROME_USER_AGENT)
        .await
        .map_err(|e| AppError::Fetch(format!("Failed to set user agent: {e}")))?;
    Ok(())
}

async fn navigate(page: &Page, url: &str) -> AppResult<()> {
    let settings = read_settings();
    let timeout = Duration::from_millis(settings.playwright_timeout_ms as u64);
    tokio::time::timeout(timeout, page.goto(url))
        .await
        .map_err(|_| AppError::FetchTimeout)?
        .map_err(|e| AppError::Fetch(format!("Navigation failed: {e}")))?;
    tokio::time::sleep(Duration::from_millis(500)).await;
    Ok(())
}

async fn auto_scroll(page: &Page) -> AppResult<()> {
    page.evaluate(
        r#"new Promise((resolve) => {
            let total = 0;
            const distance = 500;
            const timer = setInterval(() => {
                const scrollHeight = document.body?.scrollHeight || 0;
                window.scrollBy(0, distance);
                total += distance;
                if (total >= scrollHeight || total > 20000) {
                    clearInterval(timer);
                    resolve(true);
                }
            }, 200);
        })"#,
    )
    .await
    .map_err(|e| AppError::Fetch(format!("Scroll failed: {e}")))?;
    tokio::time::sleep(Duration::from_millis(800)).await;
    Ok(())
}

async fn page_html(page: &Page) -> AppResult<String> {
    let settings = read_settings();
    let html = page
        .content()
        .await
        .map_err(|e| AppError::Fetch(format!("Failed to read page HTML: {e}")))?;
    if html.len() > settings.max_html_size_bytes {
        return Err(AppError::PayloadTooLarge);
    }
    Ok(html)
}

async fn collect_network_images(page: &Page) -> AppResult<Vec<String>> {
    let value = page
        .evaluate(
            r#"JSON.stringify(
                performance.getEntriesByType('resource')
                    .filter((entry) => /\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(entry.name)
                        || entry.initiatorType === 'img')
                    .map((entry) => entry.name)
            )"#,
        )
        .await
        .map_err(|e| AppError::Fetch(format!("Network image scan failed: {e}")))?;

    parse_string_array(value)
}

async fn collect_lightbox_images(page: &Page) -> AppResult<Vec<String>> {
    let selector_list = LIGHTBOX_IMAGE_SELECTORS
        .iter()
        .map(|s| format!("'{s}'"))
        .collect::<Vec<_>>()
        .join(",");

    let script = format!(
        r#"JSON.stringify(
            Array.from(document.querySelectorAll([{selector_list}].join(',')))
                .map((el) => el.currentSrc || el.src || el.getAttribute('data-src') || '')
                .filter((url) => url && !url.startsWith('data:'))
        )"#
    );

    let value = page
        .evaluate(script.as_str())
        .await
        .map_err(|e| AppError::Fetch(format!("Lightbox scan failed: {e}")))?;

    parse_string_array(value)
}

fn parse_string_array(result: EvaluationResult) -> AppResult<Vec<String>> {
    let raw: String = result
        .into_value()
        .unwrap_or_else(|_| "[]".to_string());
    serde_json::from_str(&raw).map_err(|e| AppError::Fetch(e.to_string()))
}

async fn click_gallery_images(
    page: &Page,
    progress: &ProgressCallback,
    cancel: &CancellationToken,
) -> AppResult<Vec<String>> {
    let settings = read_settings();
    let max_clicks = settings.max_lightbox_clicks as usize;
    let mut collected = Vec::new();
    let mut seen_clicks = 0usize;

    for selector in CLICKABLE_SELECTORS {
        if seen_clicks >= max_clicks {
            break;
        }
        ensure_not_cancelled(cancel).map_err(|_| AppError::Fetch("Extraction cancelled".into()))?;

        let elements = match page.find_elements(*selector).await {
            Ok(elems) => elems,
            Err(_) => continue,
        };

        for element in elements {
            if seen_clicks >= max_clicks {
                break;
            }
            ensure_not_cancelled(cancel).map_err(|_| AppError::Fetch("Extraction cancelled".into()))?;

            if element.click().await.is_err() {
                continue;
            }
            seen_clicks += 1;
            emit_step(
                progress,
                "resolving_images",
                format!("Opening lightbox {seen_clicks} of {max_clicks}"),
                seen_clicks as u32,
                max_clicks as u32,
            );

            tokio::time::sleep(Duration::from_millis(
                settings.playwright_image_timeout_ms as u64,
            ))
            .await;

            if let Ok(mut lightbox) = collect_lightbox_images(page).await {
                collected.append(&mut lightbox);
            }
            let _ = page
                .evaluate("document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', keyCode:27}))")
                .await;
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
    }

    Ok(collected)
}

async fn gallery_detail_urls(page: &Page, base_url: &str) -> AppResult<Vec<String>> {
    let base = Url::parse(base_url).map_err(|e| AppError::InvalidUrl(e.to_string()))?;
    let origin = base.origin().ascii_serialization();

    let value = page
        .evaluate(
            r#"JSON.stringify(
                Array.from(document.querySelectorAll('a[href]'))
                    .filter((a) => {
                        const href = a.getAttribute('href') || '';
                        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
                        const img = a.querySelector('img');
                        return Boolean(img);
                    })
                    .map((a) => a.href)
            )"#,
        )
        .await
        .map_err(|e| AppError::Fetch(format!("Gallery link scan failed: {e}")))?;

    let mut links = parse_string_array(value)?;
    links.retain(|link| link.starts_with(&origin));
    links.sort();
    links.dedup();
    Ok(links)
}

async fn crawl_gallery_pages(
    browser: &Browser,
    detail_urls: Vec<String>,
    progress: &ProgressCallback,
    cancel: &CancellationToken,
) -> AppResult<Vec<String>> {
    let settings = read_settings();
    let max_pages = settings.max_gallery_pages as usize;
    let total = detail_urls.len().min(max_pages);
    let mut images = Vec::new();

    for (index, detail_url) in detail_urls.into_iter().take(max_pages).enumerate() {
        ensure_not_cancelled(cancel).map_err(|_| AppError::Fetch("Extraction cancelled".into()))?;
        emit_step(
            progress,
            "deep_crawl",
            format!("Crawling gallery page {} of {total}", index + 1),
            (index + 1) as u32,
            total as u32,
        );

        if assert_url_is_safe(&detail_url).is_err() {
            continue;
        }
        let page = browser
            .new_page("about:blank")
            .await
            .map_err(|e| AppError::Fetch(e.to_string()))?;
        configure_page(&page).await?;
        if navigate(&page, &detail_url).await.is_err() {
            let _ = page.close().await;
            continue;
        }
        auto_scroll(&page).await.ok();
        if let Ok(mut network) = collect_network_images(&page).await {
            images.append(&mut network);
        }
        if let Ok(html) = page_html(&page).await {
            images.extend(extract_images(&html, Some(detail_url.as_str())));
        }
        let _ = page.close().await;
    }

    Ok(images)
}

async fn render_with_browser(
    url: &str,
    progress: &ProgressCallback,
    cancel: &CancellationToken,
    fullsize: bool,
    deep: bool,
) -> AppResult<(String, Option<Vec<String>>)> {
    emit(progress, "rendering", "Launching browser session");
    ensure_not_cancelled(cancel).map_err(|_| AppError::Fetch("Extraction cancelled".into()))?;

    let _guard = browser_lock().await;
    let session = take_session().await?;
    let browser = match browser_from_session(&session) {
        Ok(browser) => browser,
        Err(error) => {
            shutdown_session(session).await;
            return Err(error);
        }
    };

    let page = browser
        .new_page("about:blank")
        .await
        .map_err(friendly_browser_error)?;
    configure_page(&page).await?;

    emit(progress, "fetching", format!("Navigating to {url}"));
    navigate(&page, url).await?;

    emit(progress, "scrolling", "Scrolling page to load lazy content");
    auto_scroll(&page).await?;

    let result: AppResult<(String, Option<Vec<String>>)> = if fullsize {
        emit(progress, "resolving_images", "Scanning network image requests");
        let mut image_list = Vec::new();
        if let Ok(mut network) = collect_network_images(&page).await {
            image_list.append(&mut network);
        }

        if let Ok(mut clicked) = click_gallery_images(&page, progress, cancel).await {
            image_list.append(&mut clicked);
        }

        if deep {
            emit(progress, "deep_crawl", "Discovering gallery detail pages");
            if let Ok(detail_urls) = gallery_detail_urls(&page, url).await {
                if let Ok(mut crawled) =
                    crawl_gallery_pages(browser, detail_urls, progress, cancel).await
                {
                    image_list.append(&mut crawled);
                }
            }
            auto_scroll(&page).await.ok();
        }

        let html = page_html(&page).await?;
        image_list.extend(extract_images(&html, Some(url)));
        image_list.sort();
        image_list.dedup();
        Ok((html, Some(image_list)))
    } else {
        let html = page_html(&page).await?;
        Ok((html, None))
    };

    match &result {
        Ok(_) => return_session(session).await,
        Err(_) => shutdown_session(session).await,
    }

    result
}

pub async fn render_page_html(
    url: &str,
    progress: &ProgressCallback,
    cancel: &CancellationToken,
) -> AppResult<String> {
    assert_url_is_safe(url)?;
    let (html, _) = render_with_browser(url, progress, cancel, false, false).await?;
    Ok(html)
}

pub async fn fetch_with_fullsize_images(
    url: &str,
    deep: bool,
    progress: &ProgressCallback,
    cancel: &CancellationToken,
) -> AppResult<(String, Vec<String>)> {
    assert_url_is_safe(url)?;
    let (html, images) = render_with_browser(url, progress, cancel, true, deep).await?;
    Ok((html, images.unwrap_or_default()))
}
