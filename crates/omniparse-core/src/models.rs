use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum OutputFormat {
    #[serde(rename = "md")]
    Markdown,
    Json,
    Txt,
}

impl Default for OutputFormat {
    fn default() -> Self {
        Self::Markdown
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConvertFormat {
    Pdf,
    Txt,
    Md,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ExtractRequest {
    pub url: Option<String>,
    pub html: Option<String>,
    pub base_url: Option<String>,
    #[serde(default)]
    pub render_js: bool,
    #[serde(default = "default_true")]
    pub extract_images: bool,
    #[serde(default)]
    pub resolve_fullsize_images: bool,
    #[serde(default)]
    pub resolve_deep: bool,
    #[serde(default)]
    pub output_format: OutputFormat,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct PageMetadata {
    pub author: Option<String>,
    pub date: Option<String>,
    pub sitename: Option<String>,
    pub description: Option<String>,
    pub language: Option<String>,
    pub categories: Vec<String>,
    pub tags: Vec<String>,
    pub hostname: Option<String>,
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ExtractResponse {
    pub title: String,
    pub content_markdown: String,
    pub content_json: Option<serde_json::Value>,
    pub content_text: Option<String>,
    pub metadata: PageMetadata,
    pub images: Vec<String>,
    pub files: Vec<String>,
    pub output_format: OutputFormat,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConvertRequest {
    pub content: String,
    pub target_format: ConvertFormat,
    #[serde(default = "default_title")]
    pub title: String,
}

fn default_title() -> String {
    "omniparse-export".to_string()
}

#[derive(Debug, Clone, Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
}
