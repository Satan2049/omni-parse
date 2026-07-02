use std::path::PathBuf;
use std::sync::RwLock;

use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

pub const APP_VERSION: &str = "1.6.0";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub request_timeout_seconds: f64,
    pub playwright_timeout_ms: u32,
    pub playwright_image_timeout_ms: u32,
    pub max_lightbox_clicks: u32,
    pub max_gallery_pages: u32,
    pub verify_image_sizes: bool,
    pub max_html_size_bytes: usize,
    pub allow_private_network_urls: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            request_timeout_seconds: 30.0,
            playwright_timeout_ms: 60_000,
            playwright_image_timeout_ms: 5_000,
            max_lightbox_clicks: 20,
            max_gallery_pages: 12,
            verify_image_sizes: false,
            max_html_size_bytes: 5_000_000,
            allow_private_network_urls: false,
        }
    }
}

pub static SETTINGS: Lazy<RwLock<AppSettings>> = Lazy::new(|| RwLock::new(load_settings()));

pub fn env_file_path() -> PathBuf {
    if let Some(local) = std::env::var_os("LOCALAPPDATA") {
        let dir = PathBuf::from(local).join("OmniParse");
        let _ = std::fs::create_dir_all(&dir);
        return dir.join(".env");
    }
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("omniparse")
        .join(".env")
}

fn load_settings() -> AppSettings {
    let mut settings = AppSettings::default();
    let path = env_file_path();
    if !path.exists() {
        return settings;
    }
    let Ok(content) = std::fs::read_to_string(&path) else {
        return settings;
    };
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        apply_env_pair(&mut settings, key.trim(), value.trim());
    }
    settings
}

fn apply_env_pair(settings: &mut AppSettings, key: &str, value: &str) {
    match key {
        "REQUEST_TIMEOUT_SECONDS" => {
            if let Ok(v) = value.parse() {
                settings.request_timeout_seconds = v;
            }
        }
        "PLAYWRIGHT_TIMEOUT_MS" => {
            if let Ok(v) = value.parse() {
                settings.playwright_timeout_ms = v;
            }
        }
        "PLAYWRIGHT_IMAGE_TIMEOUT_MS" => {
            if let Ok(v) = value.parse() {
                settings.playwright_image_timeout_ms = v;
            }
        }
        "MAX_LIGHTBOX_CLICKS" => {
            if let Ok(v) = value.parse() {
                settings.max_lightbox_clicks = v;
            }
        }
        "MAX_GALLERY_PAGES" => {
            if let Ok(v) = value.parse() {
                settings.max_gallery_pages = v;
            }
        }
        "VERIFY_IMAGE_SIZES" => {
            settings.verify_image_sizes = matches!(value.to_lowercase().as_str(), "1" | "true" | "yes");
        }
        "MAX_HTML_SIZE_BYTES" => {
            if let Ok(v) = value.parse() {
                settings.max_html_size_bytes = v;
            }
        }
        "ALLOW_PRIVATE_NETWORK_URLS" => {
            settings.allow_private_network_urls =
                matches!(value.to_lowercase().as_str(), "1" | "true" | "yes");
        }
        _ => {}
    }
}

pub fn read_settings() -> AppSettings {
    SETTINGS.read().expect("settings lock poisoned").clone()
}

pub fn update_settings(patch: AppSettings) -> AppSettings {
    {
        let mut guard = SETTINGS.write().expect("settings lock poisoned");
        *guard = patch.clone();
    }
    persist_settings(&patch);
    patch
}

fn persist_settings(settings: &AppSettings) {
    let path = env_file_path();
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let content = format!(
        "REQUEST_TIMEOUT_SECONDS={}\nPLAYWRIGHT_TIMEOUT_MS={}\nPLAYWRIGHT_IMAGE_TIMEOUT_MS={}\nMAX_LIGHTBOX_CLICKS={}\nMAX_GALLERY_PAGES={}\nVERIFY_IMAGE_SIZES={}\nMAX_HTML_SIZE_BYTES={}\nALLOW_PRIVATE_NETWORK_URLS={}\n",
        settings.request_timeout_seconds as i64,
        settings.playwright_timeout_ms,
        settings.playwright_image_timeout_ms,
        settings.max_lightbox_clicks,
        settings.max_gallery_pages,
        settings.verify_image_sizes,
        settings.max_html_size_bytes,
        settings.allow_private_network_urls
    );
    let _ = std::fs::write(path, content);
}
