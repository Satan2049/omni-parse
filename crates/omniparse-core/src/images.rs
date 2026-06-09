use std::collections::HashMap;
use std::sync::LazyLock;
use std::time::Duration;

use regex::Regex;
use scraper::{ElementRef, Html, Selector};
use url::Url;

use crate::media::{extract_linked_images, extract_script_image_urls, is_skipped_asset};

static THUMB_TOKENS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)(?:^|[/_\-])(?:thumb(?:nail)?|small|mini|preview|icon|avatar|logo)(?:[/_\-]|$)|[-_](?:\d{1,3})x(?:\d{1,3})(?:\.|[-_])|[?&](?:w|width|h|height|size)=(?:\d{1,3})(?:&|$)",
    )
    .expect("regex")
});
static FULL_TOKENS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?i)(?:^|[/_\-])(?:original|full|large|hero|master|max|zoom)(?:[/_\-]|$)|[-_](?:\d{4,})x(?:\d{3,})(?:\.|[-_])|[?&](?:w|width)=(?:1[6-9]\d{2}|[2-9]\d{3})(?:&|$)",
    )
    .expect("regex")
});

const LAZY_ATTRS: &[(&str, f64)] = &[
    ("src", 100.0),
    ("data-src", 220.0),
    ("data-lazy-src", 220.0),
    ("data-original", 320.0),
    ("data-full", 320.0),
    ("data-full-src", 320.0),
    ("data-fullsize", 300.0),
    ("data-large", 280.0),
    ("data-large-src", 280.0),
    ("data-zoom-image", 350.0),
    ("data-zoom-src", 350.0),
    ("data-hi-res", 340.0),
    ("data-high-res", 340.0),
    ("data-image", 200.0),
    ("data-url", 200.0),
    ("data-img-url", 200.0),
    ("data-photo-high", 360.0),
    ("data-fullscreen", 360.0),
    ("data-hq", 340.0),
    ("data-hires", 340.0),
    ("data-download-url", 380.0),
    ("data-photo-url", 300.0),
];

fn resolve_url(base_url: Option<&str>, raw: &str) -> String {
    if let Some(base) = base_url {
        if let Ok(joined) = Url::parse(base).and_then(|b| b.join(raw)) {
            return joined.to_string();
        }
    }
    raw.to_string()
}

fn url_quality_score(url: &str) -> f64 {
    let mut score = 0.0;
    if FULL_TOKENS.is_match(url) {
        score += 180.0;
    }
    if THUMB_TOKENS.is_match(url) {
        score -= 220.0;
    }
    if let Ok(parsed) = Url::parse(url) {
        for (key, value) in parsed.query_pairs() {
            if key == "w" || key == "width" {
                if let Ok(v) = value.parse::<f64>() {
                    score += v.min(4000.0) / 10.0;
                }
            }
        }
        if let Some(caps) = Regex::new(r"(?i)(\d{2,4})x(\d{2,4})")
            .unwrap()
            .captures(parsed.path())
        {
            if let (Ok(w), Ok(h)) = (
                caps.get(1).unwrap().as_str().parse::<i32>(),
                caps.get(2).unwrap().as_str().parse::<i32>(),
            ) {
                score += (w + h) as f64 / 4.0;
            }
        }
    }
    score
}

fn normalize_image_key(url: &str) -> String {
    let Ok(parsed) = Url::parse(url) else {
        return url.to_lowercase();
    };
    let path = THUMB_TOKENS
        .replace_all(parsed.path(), "")
        .to_string();
    let path = Regex::new(r"(?i)[-_]\d{1,4}x\d{1,4}")
        .unwrap()
        .replace_all(&path, "")
        .to_string();
    format!("{}{}", parsed.host_str().unwrap_or("").to_lowercase(), path.to_lowercase())
}

fn consider_candidate(grouped: &mut HashMap<String, (String, f64)>, url: String, score: f64) {
    if url.is_empty() || url.starts_with("data:") {
        return;
    }
    let key = normalize_image_key(&url);
    let replace = grouped
        .get(&key)
        .map(|(_, s)| score > *s)
        .unwrap_or(true);
    if replace {
        grouped.insert(key, (url, score));
    }
}

fn parse_srcset(srcset: &str) -> Vec<(String, f64)> {
    let mut out = Vec::new();
    for part in srcset.split(',') {
        let tokens: Vec<_> = part.trim().split_whitespace().collect();
        if tokens.is_empty() {
            continue;
        }
        let url = tokens[0].to_string();
        let mut width = 0.0;
        if tokens.len() > 1 {
            let d = tokens[1].to_lowercase();
            if let Some(w) = d.strip_suffix('w') {
                width = w.parse().unwrap_or(0.0);
            } else if let Some(x) = d.strip_suffix('x') {
                width = x.parse::<f64>().unwrap_or(0.0) * 1000.0;
            }
        }
        out.push((url, 250.0 + width));
    }
    out
}

fn best_candidate_for_element(img: ElementRef<'_>, base_url: Option<&str>) -> Option<(String, f64)> {
    let mut candidates: Vec<(String, f64)> = Vec::new();
    for (attr, weight) in LAZY_ATTRS {
        if let Some(value) = img.value().attr(attr) {
            candidates.push((value.trim().to_string(), *weight));
        }
    }
    for attr in ["srcset", "data-srcset"] {
        if let Some(srcset) = img.value().attr(attr) {
            candidates.extend(parse_srcset(srcset));
        }
    }
    let mut resolved: Vec<(String, f64)> = Vec::new();
    for (raw, attr_score) in candidates {
        if raw.starts_with("data:") {
            continue;
        }
        let url = resolve_url(base_url, &raw);
        let score = attr_score + url_quality_score(&url);
        resolved.push((url, score));
    }
    resolved.into_iter().max_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
}

pub fn extract_images(html: &str, base_url: Option<&str>) -> Vec<String> {
    let document = Html::parse_document(html);
    let mut grouped: HashMap<String, (String, f64)> = HashMap::new();

    if let Ok(sel) = Selector::parse("meta[property='og:image']") {
        for el in document.select(&sel) {
            if let Some(content) = el.value().attr("content") {
                consider_candidate(&mut grouped, resolve_url(base_url, content), 900.0);
            }
        }
    }

    if let Ok(sel) = Selector::parse("img") {
        for img in document.select(&sel) {
            if let Some((url, score)) = best_candidate_for_element(img, base_url) {
                if !is_skipped_asset(&url) {
                    consider_candidate(&mut grouped, url, score);
                }
            }
        }
    }

    for selector in ["source[srcset]", "source[data-srcset]"] {
        if let Ok(sel) = Selector::parse(selector) {
            for el in document.select(&sel) {
                let srcset = el
                    .value()
                    .attr("srcset")
                    .or_else(|| el.value().attr("data-srcset"))
                    .unwrap_or("");
                for (url, score) in parse_srcset(srcset) {
                    consider_candidate(&mut grouped, resolve_url(base_url, &url), score);
                }
            }
        }
    }

    for linked in extract_linked_images(html, base_url) {
        consider_candidate(
            &mut grouped,
            linked.clone(),
            url_quality_score(&linked) + 200.0,
        );
    }

    for scripted in extract_script_image_urls(html, base_url) {
        consider_candidate(
            &mut grouped,
            scripted.clone(),
            url_quality_score(&scripted) + 250.0,
        );
    }

    let mut items: Vec<_> = grouped.into_values().collect();
    items.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    items.into_iter().map(|(url, _)| url).collect()
}

pub fn merge_image_lists(lists: &[Vec<String>]) -> Vec<String> {
    let mut grouped: HashMap<String, (String, f64)> = HashMap::new();
    for list in lists {
        for url in list {
            consider_candidate(&mut grouped, url.clone(), url_quality_score(url));
        }
    }
    let mut items: Vec<_> = grouped.into_values().collect();
    items.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    items.into_iter().map(|(url, _)| url).collect()
}

fn looks_like_thumbnail(url: &str) -> bool {
    THUMB_TOKENS.is_match(url) || url_quality_score(url) < 120.0
}

pub fn suggest_upgraded_urls(url: &str) -> Vec<String> {
    let mut candidates = vec![url.to_string()];
    let Ok(base) = Url::parse(url) else {
        return candidates;
    };

    let path = base.path().to_string();
    let path_variants = [
        Regex::new(r"(?i)thumb(?:nail)?")
            .unwrap()
            .replace_all(&path, "original")
            .to_string(),
        Regex::new(r"(?i)thumb(?:nail)?")
            .unwrap()
            .replace_all(&path, "full")
            .to_string(),
        Regex::new(r"(?i)_small")
            .unwrap()
            .replace_all(&path, "_large")
            .to_string(),
        Regex::new(r"(?i)_thumb")
            .unwrap()
            .replace_all(&path, "_full")
            .to_string(),
        Regex::new(r"(?i)\d{2,4}x\d{2,4}")
            .unwrap()
            .replace_all(&path, "original")
            .to_string(),
    ];

    for variant in path_variants {
        if variant.is_empty() || variant == path {
            continue;
        }
        if let Ok(mut parsed) = Url::parse(url) {
            parsed.set_path(&variant);
            candidates.push(parsed.to_string());
        }
    }

    if base.query().is_some() {
        if let Ok(mut stripped) = Url::parse(url) {
            stripped.set_query(None);
            candidates.push(stripped.to_string());
        }
    }

    let mut unique = Vec::new();
    for c in candidates {
        if !unique.contains(&c) {
            unique.push(c);
        }
    }
    unique
}

pub async fn resolve_best_url_by_size(candidates: Vec<String>) -> String {
    if candidates.is_empty() {
        return String::new();
    }

    let settings = crate::config::read_settings();
    let client = match reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(Duration::from_secs_f64(settings.request_timeout_seconds))
        .build()
    {
        Ok(c) => c,
        Err(_) => return candidates[0].clone(),
    };

    let mut best_url = candidates[0].clone();
    let mut best_score = url_quality_score(&best_url);
    let mut best_bytes = -1i64;

    for candidate in candidates.into_iter().take(6) {
        if crate::security::assert_url_is_safe(&candidate).is_err() {
            continue;
        }
        let response = client
            .head(&candidate)
            .headers(crate::browser::browser_headers(Some(&candidate)))
            .send()
            .await;
        if let Ok(resp) = response {
            if resp.status().is_success() {
                let content_length = resp
                    .headers()
                    .get(reqwest::header::CONTENT_LENGTH)
                    .and_then(|v| v.to_str().ok())
                    .and_then(|v| v.parse::<i64>().ok())
                    .unwrap_or(0);
                let quality = url_quality_score(&candidate) + (content_length as f64 / 1024.0);
                if content_length > best_bytes
                    || (content_length == best_bytes && quality > best_score)
                {
                    best_bytes = content_length;
                    best_score = quality;
                    best_url = candidate;
                }
                continue;
            }
        }
        let quality = url_quality_score(&candidate);
        if quality > best_score && best_bytes < 0 {
            best_score = quality;
            best_url = candidate;
        }
    }

    best_url
}

pub async fn finalize_resolved_images(urls: Vec<String>) -> Vec<String> {
    let mut grouped: HashMap<String, (String, f64)> = HashMap::new();
    for url in urls {
        let chosen = if looks_like_thumbnail(&url) {
            resolve_best_url_by_size(suggest_upgraded_urls(&url)).await
        } else {
            url.clone()
        };
        let score = url_quality_score(&chosen);
        consider_candidate(&mut grouped, chosen, score);
    }
    let mut items: Vec<_> = grouped.into_values().collect();
    items.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    items.into_iter().map(|(url, _)| url).collect()
}
