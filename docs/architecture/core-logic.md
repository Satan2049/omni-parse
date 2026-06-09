# Core Logic

## Content Extraction (Readability)

The Rust API uses the `readability` crate (Mozilla-style article detection) plus `html2md` for Markdown output. Fallbacks handle gallery-only pages and block screens (Cloudflare, etc.).

Returns:

- Markdown (default preview format)
- Plain text
- Metadata (hostname, source URL)
- JSON envelope with images/files when requested

## JavaScript Rendering

When `render_js=true`:

1. chromiumoxide launches headless **Chrome** or **Edge** (must be installed on the system)
2. Page loads with configured timeout (`PLAYWRIGHT_TIMEOUT_MS`)
3. Auto-scroll triggers lazy-loaded content
4. Rendered DOM HTML is passed to readability

Use for SPAs and pages that require client-side rendering.

## Image Extraction

Image handling lives in `crates/omniparse-core/src/images.rs` and `browser_fetch.rs`.

### Static extraction (always)

Scraper scans each `<img>`, `<source>`, `og:image`, linked images, and script-embedded URLs. For every image element the service:

1. Collects candidates from `src`, lazy-load attributes, and `srcset`
2. Scores each URL (attribute weight, width descriptors, filename heuristics)
3. Deduplicates size variants and keeps the highest-quality URL per image

### Full-size resolution (`resolve_fullsize_images=true`, URL only)

Requires `extract_images=true`. Uses one browser session to:

1. Render and scroll the page
2. Record image network responses from the Performance API
3. Click visible gallery/thumbnail images and read lightbox overlays
4. Merge static, network, and lightbox URLs

### Deep gallery crawl (`resolve_deep=true`)

Extends the full-size pass by visiting up to `MAX_GALLERY_PAGES` same-origin gallery detail links and collecting additional images.

### Size verification

When `VERIFY_IMAGE_SIZES=true` or `resolve_deep=true`, thumbnail URLs are upgraded via heuristic rewrites and optional HEAD `Content-Length` comparison.

### Image download

`GET /images/download?url=` fetches a public image through the API with the same SSRF checks used for page URLs.

## File Conversion

| Format | Implementation        |
|--------|-----------------------|
| TXT    | UTF-8 encode          |
| MD     | UTF-8 encode          |
| PDF    | printpdf layout       |
