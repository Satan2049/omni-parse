# Core Logic

## Content Extraction (Trafilatura)

Trafilatura is the primary extractor for high-precision main-content detection. It strips boilerplate (nav, ads, footers) and returns:

- Markdown (default preview format)
- Plain text fallback
- Metadata (author, date, sitename, tags, etc.)

## JavaScript Rendering

When `render_js=true`:

1. Playwright launches headless Chromium
2. Page loads with `wait_until="networkidle"`
3. Rendered DOM HTML is passed to Trafilatura

Use for SPAs and pages that require client-side rendering.

## Image Extraction

BeautifulSoup parses `<img>` tags, resolves relative URLs against the source page, and deduplicates results.

## File Conversion

| Format | Implementation                          |
|--------|-----------------------------------------|
| TXT    | UTF-8 encode                            |
| MD     | UTF-8 encode                            |
| PDF    | ReportLab SimpleDocTemplate + paragraphs|
