use regex::Regex;
use scraper::{Html, Selector};

use crate::error::{AppError, AppResult};
use crate::images::extract_images;
use crate::media::extract_file_links;
use std::io::Cursor;

use url::Url;

use crate::models::{OutputFormat, PageMetadata};

const BLOCK_MARKERS: &[&str] = &[
    "just a moment",
    "attention required",
    "cf-browser-verification",
    "enable javascript and cookies",
    "access denied",
];

fn looks_like_block_page(html: &str) -> bool {
    let lowered = html.to_lowercase();
    BLOCK_MARKERS.iter().any(|m| lowered.contains(m))
}

fn fallback_title(document: &Html) -> String {
    if let Ok(sel) = Selector::parse("meta[property='og:title']") {
        for el in document.select(&sel) {
            if let Some(content) = el.value().attr("content") {
                let t = content.trim();
                if !t.is_empty() {
                    return t.to_string();
                }
            }
        }
    }
    if let Ok(sel) = Selector::parse("title") {
        for el in document.select(&sel) {
            let text: String = el.text().collect();
            let t = text.trim();
            if !t.is_empty() {
                return t.to_string();
            }
        }
    }
    if let Ok(sel) = Selector::parse("h1") {
        for el in document.select(&sel) {
            let text: String = el.text().collect();
            let t = text.trim();
            if !t.is_empty() {
                return t.to_string();
            }
        }
    }
    "Untitled".to_string()
}

fn fallback_body_text(document: &Html) -> String {
    let selectors = ["main", "article", "body"];
    for sel_str in selectors {
        if let Ok(sel) = Selector::parse(sel_str) {
            if let Some(root) = document.select(&sel).next() {
                let text: String = root.text().collect::<Vec<_>>().join("\n");
                let text = Regex::new(r"\n{3,}")
                    .unwrap()
                    .replace_all(text.trim(), "\n\n")
                    .to_string();
                if !text.is_empty() {
                    return text;
                }
            }
        }
    }
    String::new()
}

fn gallery_markdown(title: &str, images: &[String], files: &[String]) -> (String, String) {
    let mut lines = vec![format!("# {title}"), String::new(), format!("Found {} image(s).", images.len())];
    for (i, image) in images.iter().enumerate() {
        lines.push(String::new());
        lines.push(format!("![Image {}]({image})", i + 1));
        lines.push(image.clone());
    }
    if !files.is_empty() {
        lines.push(String::new());
        lines.push(format!("Found {} other file(s).", files.len()));
        for (i, file) in files.iter().enumerate() {
            lines.push(format!("- [File {}]({file})", i + 1));
        }
    }
    let markdown = lines.join("\n");
    let mut text_lines: Vec<String> = images
        .iter()
        .enumerate()
        .map(|(i, img)| format!("Image {}: {img}", i + 1))
        .collect();
    for (i, file) in files.iter().enumerate() {
        text_lines.push(format!("File {}: {file}", i + 1));
    }
    (markdown, text_lines.join("\n"))
}

fn readability_extract(html: &str, source_url: Option<&str>) -> Option<(String, String, String)> {
    let url_str = source_url.unwrap_or("https://example.com/");
    let url = Url::parse(url_str).ok()?;
    let mut cursor = Cursor::new(html.as_bytes());
    let product = readability::extractor::extract(&mut cursor, &url).ok()?;
    let title = if product.title.is_empty() {
        "Untitled".to_string()
    } else {
        product.title
    };
    let markdown = if product.content.is_empty() {
        format!("# {title}\n\n{}", product.text)
    } else {
        let md = html2md::parse_html(&product.content);
        if md.trim().is_empty() {
            product.text.clone()
        } else {
            md
        }
    };
    let text = product.text;
    Some((title, markdown, text))
}

pub struct ExtractResult {
    pub title: String,
    pub content_markdown: String,
    pub content_text: String,
    pub metadata: PageMetadata,
    pub content_json: serde_json::Value,
}

pub fn extract_content(html: &str, source_url: Option<&str>) -> AppResult<ExtractResult> {
    if looks_like_block_page(html) {
        return Err(AppError::Extraction(
            "The page looks like a bot-check or block screen, not real content. \
             Open the URL in your browser, then paste saved HTML if needed."
                .into(),
        ));
    }

    let document = Html::parse_document(html);
    let mut title = fallback_title(&document);
    let hostname = source_url.and_then(|u| url::Url::parse(u).ok().and_then(|p| p.host_str().map(str::to_string)));

    let metadata = PageMetadata {
        hostname,
        source_url: source_url.map(str::to_string),
        ..Default::default()
    };

    let mut markdown = String::new();
    let mut text = String::new();

    if let Some((t, md, txt)) = readability_extract(html, source_url) {
        title = t;
        markdown = md;
        text = txt;
    }

    if markdown.is_empty() && text.is_empty() {
        let images = extract_images(html, source_url);
        let files = extract_file_links(html, source_url);
        if !images.is_empty() || !files.is_empty() {
            let (md, txt) = gallery_markdown(&title, &images, &files);
            markdown = md;
            text = txt;
        } else {
            let body = fallback_body_text(&document);
            if body.len() >= 80 {
                markdown = format!("# {title}\n\n{body}");
                text = body;
            }
        }
    }

    if markdown.is_empty() && text.is_empty() {
        return Err(AppError::Extraction(
            "No extractable content found. Enable Extract Images for gallery pages, \
             or paste saved HTML from your browser."
                .into(),
        ));
    }

    if markdown.is_empty() {
        markdown = text.clone();
    }
    if text.is_empty() {
        text = markdown.clone();
    }

    let content_json = serde_json::json!({
        "title": title,
        "content_markdown": markdown,
        "content_text": text,
        "metadata": metadata,
    });

    Ok(ExtractResult {
        title,
        content_markdown: markdown,
        content_text: text,
        metadata,
        content_json,
    })
}

pub fn format_output(result: &ExtractResult, format: OutputFormat) -> (String, Option<String>, Option<serde_json::Value>) {
    match format {
        OutputFormat::Markdown => (
            result.content_markdown.clone(),
            Some(result.content_text.clone()),
            Some(result.content_json.clone()),
        ),
        OutputFormat::Txt => (
            result.content_text.clone(),
            Some(result.content_text.clone()),
            None,
        ),
        OutputFormat::Json => {
            let json_str = serde_json::to_string_pretty(&result.content_json).unwrap_or_default();
            (json_str, None, Some(result.content_json.clone()))
        }
    }
}
