from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl, field_validator, model_validator

from app.core.config import settings


class OutputFormat(str, Enum):
    MARKDOWN = "md"
    JSON = "json"
    TEXT = "txt"


class ConvertFormat(str, Enum):
    PDF = "pdf"
    TXT = "txt"
    MD = "md"


class ExtractRequest(BaseModel):
    url: HttpUrl | None = Field(default=None, description="URL to fetch and extract")
    html: str | None = Field(default=None, description="Raw HTML string to extract from")
    base_url: HttpUrl | None = Field(
        default=None,
        description="Optional base URL for resolving relative links/images in HTML input",
    )
    render_js: bool = Field(default=False, description="Use Playwright to render JavaScript")
    extract_images: bool = Field(default=True, description="Include image URLs in the response")
    output_format: OutputFormat = Field(default=OutputFormat.MARKDOWN)

    @field_validator("html")
    @classmethod
    def strip_html(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None

    @model_validator(mode="after")
    def validate_source(self) -> "ExtractRequest":
        if not self.url and not self.html:
            raise ValueError("Either 'url' or 'html' must be provided")
        if self.url and self.html:
            raise ValueError("Provide either 'url' or 'html', not both")
        if self.html and self.render_js:
            raise ValueError("render_js is only supported when extracting from a URL")
        if self.html and len(self.html.encode("utf-8")) > settings.max_html_size_bytes:
            raise ValueError(
                f"HTML content exceeds maximum allowed size ({settings.max_html_size_bytes} bytes)"
            )
        if self.base_url and self.url:
            raise ValueError("base_url is only supported when extracting from raw HTML")
        return self


class PageMetadata(BaseModel):
    author: str | None = None
    date: str | None = None
    sitename: str | None = None
    description: str | None = None
    language: str | None = None
    categories: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    hostname: str | None = None
    source_url: str | None = None


class ExtractResponse(BaseModel):
    title: str
    content_markdown: str
    content_json: dict[str, Any] | None = None
    content_text: str | None = None
    metadata: PageMetadata
    images: list[str] = Field(default_factory=list)
    output_format: OutputFormat


class ConvertRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Text or markdown content to convert")
    target_format: ConvertFormat = Field(..., description="Desired output file format")
    title: str = Field(default="omniparse-export", description="Base filename for the download")


class HealthResponse(BaseModel):
    status: str
    version: str
