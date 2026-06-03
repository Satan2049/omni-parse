import asyncio

from app.models.schemas import ExtractRequest, ExtractResponse
from app.services.extract_service import extract_content
from app.services.fetch_service import extract_images, extract_main_content_html, fetch_url


async def run_extraction(request: ExtractRequest) -> ExtractResponse:
    source_url = str(request.url) if request.url else None
    base_url = str(request.base_url) if request.base_url else source_url
    html = request.html or ""

    if source_url:
        html = await fetch_url(source_url, render_js=request.render_js)

    result = await asyncio.to_thread(
        extract_content,
        html,
        source_url=base_url,
        output_format=request.output_format,
    )

    images: list[str] = []
    if request.extract_images:
        article_html = await asyncio.to_thread(extract_main_content_html, html, base_url)
        images = await asyncio.to_thread(extract_images, article_html or html, base_url)
        if article_html and not images:
            images = await asyncio.to_thread(extract_images, html, base_url)

    return ExtractResponse(
        title=result["title"],
        content_markdown=result["content_markdown"],
        content_json=result["content_json"],
        content_text=result["content_text"],
        metadata=result["metadata"],
        images=images,
        output_format=request.output_format,
    )
