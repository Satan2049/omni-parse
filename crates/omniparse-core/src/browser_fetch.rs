use std::path::PathBuf;
use std::time::Duration;

use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::js::EvaluationResult;
use chromiumoxide::page::Page;
use futures::StreamExt;
use tokio::task::JoinHandle;
use url::Url;

use crate::browser::CHROME_USER_AGENT;
use crate::config::read_settings;
use crate::error::{AppError, AppResult};
use crate::images::extract_images;
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

struct BrowserSession {
    browser: Option<Browser>,
    handler: JoinHandle<()>,
}

fn friendly_browser_error(err: impl std::fmt::Display) -> AppError {
    let message = err.to_string();
    if message.contains("oneshot canceled") || message.contains("Canceled") {
        AppError::Fetch(
            "Browser session ended unexpectedly. Ensure Chrome or Edge is installed, close \
             other automation windows, and retry."
                .into(),
        )
    } else {
        AppError::Fetch(message)
    }
}

async fn shutdown_browser(mut session: BrowserSession) {
    if let Some(mut browser) = session.browser.take() {
        let _ = browser.close().await;
        let _ = browser.wait().await;
    }
    session.handler.abort();
}

fn find_chromium_executable() -> Option<PathBuf> {
    let candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ];
    candidates
        .iter()
        .map(PathBuf::from)
        .find(|p| p.exists())
}

async fn launch_browser() -> AppResult<BrowserSession> {
    let executable = find_chromium_executable().ok_or_else(|| {
        AppError::Fetch(
            "No Chromium-based browser found. Install Google Chrome or Microsoft Edge for \
             JavaScript rendering and image resolution."
                .into(),
        )
    })?;

    let profile_dir = std::env::temp_dir().join(format!("omniparse-browser-{}", std::process::id()));

    let config = BrowserConfig::builder()
        .chrome_executable(executable)
        .no_sandbox()
        .new_headless_mode()
        .user_data_dir(&profile_dir)
        .arg("--disable-blink-features=AutomationControlled")
        .arg("--disable-dev-shm-usage")
        .arg("--no-first-run")
        .arg("--no-default-browser-check")
        .arg("--disable-gpu")
        .window_size(1920, 1080)
        .build()
        .map_err(|e| AppError::Fetch(format!("Browser launch config failed: {e}")))?;

    let (browser, mut handler) = Browser::launch(config)
        .await
        .map_err(|e| AppError::Fetch(format!("Failed to launch browser: {e}")))?;

    let handle = tokio::spawn(async move {
        while let Some(event) = handler.next().await {
            if let Err(err) = event {
                log::warn!("Browser handler event error: {err}");
            }
        }
    });

    Ok(BrowserSession {
        browser: Some(browser),
        handler: handle,
    })
}

fn browser_ref(session: &BrowserSession) -> AppResult<&Browser> {
    session
        .browser
        .as_ref()
        .ok_or_else(|| AppError::Fetch("Browser is not available".into()))
}

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

async fn click_gallery_images(page: &Page) -> AppResult<Vec<String>> {
    let settings = read_settings();
    let mut collected = Vec::new();
    let mut seen_clicks = 0usize;

    for selector in CLICKABLE_SELECTORS {
        if seen_clicks >= settings.max_lightbox_clicks as usize {
            break;
        }
        let elements = match page.find_elements(*selector).await {
            Ok(elems) => elems,
            Err(_) => continue,
        };

        for element in elements {
            if seen_clicks >= settings.max_lightbox_clicks as usize {
                break;
            }
            if element.click().await.is_err() {
                continue;
            }
            seen_clicks += 1;
            tokio::time::sleep(Duration::from_millis(
                settings.playwright_image_timeout_ms as u64,
            ))
            .await;

            if let Ok(mut lightbox) = collect_lightbox_images(page).await {
                collected.append(&mut lightbox);
            }
            let _ = page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', keyCode:27}))").await;
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
    seed_url: &str,
    detail_urls: Vec<String>,
) -> AppResult<Vec<String>> {
    let settings = read_settings();
    let max_pages = settings.max_gallery_pages as usize;
    let mut images = Vec::new();

    for detail_url in detail_urls.into_iter().take(max_pages) {
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

    // Return to seed page is optional; callers already have main HTML.
    let _ = seed_url;
    Ok(images)
}

pub async fn render_page_html(url: &str) -> AppResult<String> {
    assert_url_is_safe(url)?;
    let session = launch_browser().await?;
    let result = async {
        let browser = browser_ref(&session)?;
        let page = browser
            .new_page("about:blank")
            .await
            .map_err(friendly_browser_error)?;
        configure_page(&page).await?;
        navigate(&page, url).await?;
        auto_scroll(&page).await?;
        page_html(&page).await
    }
    .await;
    shutdown_browser(session).await;
    result
}

pub async fn fetch_with_fullsize_images(url: &str, deep: bool) -> AppResult<(String, Vec<String>)> {
    assert_url_is_safe(url)?;
    let session = launch_browser().await?;
    let result = async {
        let browser = browser_ref(&session)?;
        let page = browser
            .new_page("about:blank")
            .await
            .map_err(friendly_browser_error)?;
        configure_page(&page).await?;
        navigate(&page, url).await?;
        auto_scroll(&page).await?;

        let mut resolved = Vec::new();
        if let Ok(mut network) = collect_network_images(&page).await {
            resolved.append(&mut network);
        }

        if let Ok(mut clicked) = click_gallery_images(&page).await {
            resolved.append(&mut clicked);
        }

        if deep {
            if let Ok(detail_urls) = gallery_detail_urls(&page, url).await {
                if let Ok(mut crawled) = crawl_gallery_pages(browser, url, detail_urls).await {
                    resolved.append(&mut crawled);
                }
            }
            auto_scroll(&page).await.ok();
        }

        let html = page_html(&page).await?;
        resolved.extend(extract_images(&html, Some(url)));

        resolved.sort();
        resolved.dedup();
        Ok((html, resolved))
    }
    .await;
    shutdown_browser(session).await;
    result
}
