use regex::Regex;
use scraper::{Html, Selector};
use std::sync::LazyLock;
use url::Url;

static BACKGROUND_URL_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"url\(['"]?([^'")]+)['"]?\)"#).expect("regex"));
static SCRIPT_IMAGE_URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"https?://[^\s"'<>\\]+?\.(?:jpg|jpeg|png|webp|gif|avif)(?:\?[^\s"'<>\\]*)?"#)
        .expect("regex")
});

const IMAGE_EXTENSIONS: &[&str] = &[
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp", ".svg", ".tif", ".tiff",
];
const FILE_EXTENSIONS: &[&str] = &[
    ".pdf", ".zip", ".rar", ".7z", ".tar", ".gz", ".mp4", ".webm", ".mov", ".mkv", ".mp3", ".wav",
    ".m4a", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
];
const SKIP_IMAGE_SUBSTRINGS: &[&str] = &[
    "avatar", "favicon", "logo", "icon", "sprite", "emoji", "1x1", "pixel.gif",
];

pub fn is_skipped_asset(url: &str) -> bool {
    let lowered = url.to_lowercase();
    SKIP_IMAGE_SUBSTRINGS.iter().any(|s| lowered.contains(s))
}

fn extension(url: &str) -> Option<&'static str> {
    let path = Url::parse(url)
        .ok()
        .map(|u| u.path().to_lowercase())
        .unwrap_or_else(|| url.to_lowercase());
    IMAGE_EXTENSIONS
        .iter()
        .chain(FILE_EXTENSIONS.iter())
        .find(|ext| path.ends_with(**ext))
        .copied()
}

fn resolve_url(base_url: Option<&str>, raw: &str) -> String {
    if let Some(base) = base_url {
        if let Ok(joined) = Url::parse(base).and_then(|b| b.join(raw)) {
            return joined.to_string();
        }
    }
    raw.to_string()
}

fn append_unique(urls: &mut Vec<String>, url: String) {
    if !url.is_empty() && !url.starts_with("data:") && !urls.contains(&url) {
        urls.push(url);
    }
}

pub fn extract_file_links(html: &str, base_url: Option<&str>) -> Vec<String> {
    let document = Html::parse_document(html);
    let mut files = Vec::new();

    if let Ok(sel) = Selector::parse("a[href]") {
        for el in document.select(&sel) {
            let href = el.value().attr("href").unwrap_or("").trim();
            if href.is_empty() || href.starts_with('#') || href.starts_with("javascript:") || href.starts_with("mailto:") {
                continue;
            }
            let resolved = resolve_url(base_url, href);
            if let Some(ext) = extension(&resolved) {
                if !IMAGE_EXTENSIONS.contains(&ext) {
                    append_unique(&mut files, resolved);
                }
            }
        }
    }

    for selector in ["video[src]", "audio[src]", "source[src]"] {
        if let Ok(sel) = Selector::parse(selector) {
            for el in document.select(&sel) {
                if let Some(src) = el.value().attr("src") {
                    let resolved = resolve_url(base_url, src.trim());
                    if extension(&resolved).is_some() {
                        append_unique(&mut files, resolved);
                    }
                }
            }
        }
    }

    files
}

pub fn extract_linked_images(html: &str, base_url: Option<&str>) -> Vec<String> {
    let document = Html::parse_document(html);
    let mut images = Vec::new();

    if let Ok(sel) = Selector::parse("a[href]") {
        for el in document.select(&sel) {
            let href = el.value().attr("href").unwrap_or("").trim();
            if href.is_empty() || href.starts_with('#') || href.starts_with("javascript:") {
                continue;
            }
            let resolved = resolve_url(base_url, href);
            if let Some(ext) = extension(&resolved) {
                if IMAGE_EXTENSIONS.contains(&ext) && !is_skipped_asset(&resolved) {
                    append_unique(&mut images, resolved);
                }
            }
        }
    }

    if let Ok(sel) = Selector::parse("[style]") {
        for el in document.select(&sel) {
            if let Some(style) = el.value().attr("style") {
                for cap in BACKGROUND_URL_RE.captures_iter(style) {
                    let resolved = resolve_url(base_url, cap.get(1).map(|m| m.as_str()).unwrap_or(""));
                    if !is_skipped_asset(&resolved) {
                        append_unique(&mut images, resolved);
                    }
                }
            }
        }
    }

    images
}

pub fn extract_script_image_urls(html: &str, base_url: Option<&str>) -> Vec<String> {
    let mut images = Vec::new();
    for m in SCRIPT_IMAGE_URL_RE.find_iter(html) {
        let cleaned = m.as_str().trim_end_matches('\\').trim_end_matches(',');
        let resolved = resolve_url(base_url, cleaned);
        if !is_skipped_asset(&resolved) {
            append_unique(&mut images, resolved);
        }
    }
    images
}
