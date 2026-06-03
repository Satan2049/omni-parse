import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SAMPLE_HTML = """
<html>
<head><title>Test Article</title></head>
<body>
<article>
<h1>Hello World</h1>
<p>This is a <a href="/docs">sample</a> paragraph with enough text to extract.</p>
<img src="/images/hero.png" />
</article>
</body>
</html>
"""


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "version" in payload


def test_extract_html():
    response = client.post(
        "/extract",
        json={
            "html": SAMPLE_HTML,
            "base_url": "https://example.com/page",
            "output_format": "md",
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["title"] in {"Test Article", "Hello World"}
    assert "Hello World" in payload["content_markdown"]
    assert payload["content_json"] is not None
    assert "https://example.com/images/hero.png" in payload["images"]


def test_extract_rejects_empty_html():
    response = client.post("/extract", json={"html": "   "})
    assert response.status_code == 422


def test_extract_rejects_render_js_with_html():
    response = client.post(
        "/extract",
        json={"html": SAMPLE_HTML, "render_js": True},
    )
    assert response.status_code == 422


def test_extract_requires_source():
    response = client.post("/extract", json={})
    assert response.status_code == 422


def test_convert_markdown_to_txt():
    response = client.post(
        "/convert",
        json={
            "content": "# Title\n\nBody text",
            "target_format": "txt",
            "title": "Sample Export",
        },
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "Body text" in response.content.decode("utf-8")


def test_convert_to_pdf():
    response = client.post(
        "/convert",
        json={
            "content": "# Title\n\n**Bold** paragraph",
            "target_format": "pdf",
            "title": "Sample Export",
        },
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")


def test_blocks_private_url():
    response = client.post(
        "/extract",
        json={"url": "http://127.0.0.1:8000/health"},
    )
    assert response.status_code == 422
    assert "private" in response.json()["detail"].lower() or "loopback" in response.json()["detail"].lower()
