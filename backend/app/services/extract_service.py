from typing import Any

import trafilatura
from trafilatura.metadata import extract_metadata

from app.core.exceptions import ExtractionError
from app.models.schemas import OutputFormat, PageMetadata


def _build_metadata(raw_metadata: Any, source_url: str | None = None) -> PageMetadata:
    if raw_metadata is None:
        return PageMetadata(source_url=source_url)

    categories = raw_metadata.categories if raw_metadata.categories else []
    tags = raw_metadata.tags if raw_metadata.tags else []

    return PageMetadata(
        author=raw_metadata.author,
        date=raw_metadata.date,
        sitename=raw_metadata.sitename,
        description=raw_metadata.description,
        language=raw_metadata.language,
        categories=list(categories) if categories else [],
        tags=list(tags) if tags else [],
        hostname=raw_metadata.hostname,
        source_url=source_url or raw_metadata.url,
    )


def extract_content(
    html: str,
    *,
    source_url: str | None = None,
    output_format: OutputFormat = OutputFormat.MARKDOWN,
) -> dict[str, Any]:
    metadata_obj = extract_metadata(html, default_url=source_url)
    metadata = _build_metadata(metadata_obj, source_url)

    title = metadata_obj.title if metadata_obj and metadata_obj.title else "Untitled"

    markdown = trafilatura.extract(
        html,
        output_format="markdown",
        include_comments=False,
        include_tables=True,
        include_links=True,
        url=source_url,
    )
    text = trafilatura.extract(
        html,
        output_format="txt",
        include_comments=False,
        include_tables=True,
        include_links=True,
        url=source_url,
    )

    if not markdown and not text:
        raise ExtractionError("No extractable content found in the provided HTML")

    content_markdown = markdown or text or ""
    content_text = text or markdown or ""

    json_payload = {
        "title": title,
        "content_markdown": content_markdown,
        "content_text": content_text,
        "metadata": metadata.model_dump(),
    }

    return {
        "title": title,
        "content_markdown": content_markdown,
        "content_text": content_text,
        "content_json": json_payload,
        "metadata": metadata,
    }
