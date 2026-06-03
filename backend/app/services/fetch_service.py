import re
from urllib.parse import urljoin, urlparse

import httpx
import trafilatura
from bs4 import BeautifulSoup

from app.core.config import settings
from app.core.exceptions import (
    FetchError,
    FetchTimeoutError,
    InvalidURLError,
    PayloadTooLargeError,
    ServiceUnavailableError,
)
from app.core.security import assert_url_is_safe

_USER_AGENT = "OmniParse/0.1 (+https://github.com/omni-parse)"


def is_valid_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


async def fetch_url(url: str, *, render_js: bool = False) -> str:
    if not is_valid_url(url):
        raise InvalidURLError(f"Unsupported URL scheme or malformed URL: {url}")

    assert_url_is_safe(url)

    if render_js:
        return await _fetch_with_playwright(url)

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=settings.request_timeout_seconds,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").lower()
                if content_type and "html" not in content_type and not content_type.startswith("text/"):
                    raise InvalidURLError(
                        f"URL did not return HTML content (Content-Type: {content_type.split(';')[0]})"
                    )
                content = await _read_stream_with_limit(response)
    except httpx.TimeoutException as exc:
        raise FetchTimeoutError() from exc
    except httpx.HTTPStatusError as exc:
        raise FetchError(f"HTTP {exc.response.status_code} for URL: {url}") from exc
    except httpx.RequestError as exc:
        raise FetchError(f"Could not reach URL: {url}") from exc
    except PayloadTooLargeError:
        raise
    except InvalidURLError:
        raise

    return content


async def _read_stream_with_limit(response: httpx.Response) -> str:
    chunks: list[bytes] = []
    total = 0
    async for chunk in response.aiter_bytes():
        total += len(chunk)
        if total > settings.max_html_size_bytes:
            raise PayloadTooLargeError("Page content exceeds maximum allowed size")
        chunks.append(chunk)
    return b"".join(chunks).decode("utf-8", errors="replace")


async def _fetch_with_playwright(url: str) -> str:
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise ServiceUnavailableError(
            "Playwright is not installed. Run: pip install playwright && playwright install chromium"
        ) from exc

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            try:
                page = await browser.new_page(user_agent=_USER_AGENT)
                await page.goto(url, wait_until="load", timeout=settings.playwright_timeout_ms)
                content = await page.content()
            finally:
                await browser.close()
    except Exception as exc:
        message = str(exc).lower()
        if "timeout" in message:
            raise FetchTimeoutError("Playwright timed out while rendering the page") from exc
        raise FetchError(f"Failed to render page with Playwright: {exc}") from exc

    if len(content.encode("utf-8")) > settings.max_html_size_bytes:
        raise PayloadTooLargeError("Rendered page content exceeds maximum allowed size")

    return content


def extract_main_content_html(html: str, source_url: str | None = None) -> str | None:
    return trafilatura.extract(
        html,
        output_format="html",
        include_comments=False,
        include_tables=True,
        include_links=True,
        url=source_url,
    )


def extract_images(html: str, base_url: str | None = None) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    images: list[str] = []

    for tag in soup.find_all("meta", property="og:image"):
        content = tag.get("content")
        if content:
            _append_image(images, content, base_url)

    for img in soup.find_all("img"):
        candidates = [
            img.get("src"),
            img.get("data-src"),
            img.get("data-lazy-src"),
        ]
        srcset = img.get("srcset") or img.get("data-srcset")
        if srcset:
            candidates.extend(_parse_srcset(srcset))

        for candidate in candidates:
            _append_image(images, candidate, base_url)

    for source in soup.find_all("source"):
        srcset = source.get("srcset")
        if srcset:
            for candidate in _parse_srcset(srcset):
                _append_image(images, candidate, base_url)

    return images


def _parse_srcset(srcset: str) -> list[str]:
    urls: list[str] = []
    for part in srcset.split(","):
        url = part.strip().split()[0] if part.strip() else ""
        if url:
            urls.append(url)
    return urls


def _append_image(images: list[str], src: str | None, base_url: str | None) -> None:
    if not src or src.startswith("data:"):
        return
    resolved = urljoin(base_url, src) if base_url else src
    if resolved not in images:
        images.append(resolved)
