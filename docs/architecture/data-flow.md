# Data Flow

## Extraction Flow

1. User submits URL or HTML from the frontend workspace.
2. Frontend sends `POST /extract` with options:
   - `render_js` — use headless Chrome/Edge instead of reqwest
   - `extract_images` — collect image URLs
   - `resolve_fullsize_images` — browser pass: scroll + network/lazy URLs (URL only)
   - `resolve_deep` — visit gallery detail pages + extra lightbox clicks
   - `output_format` — `md`, `json`, or `txt`
3. If URL provided:
   - `resolve_fullsize_images` → `browser_fetch::fetch_with_fullsize_images()`
   - otherwise → `fetch::fetch_url()` (reqwest or browser when `render_js`)
4. `extract::extract_content()` runs readability extraction.
5. When `extract_images` is enabled, `images::extract_images()` parses HTML; results merge with browser-resolved URLs when applicable.
6. Optional `finalize_resolved_images()` HEAD-verifies thumbnails when `verify_image_sizes` or `resolve_deep` is enabled.
7. `ExtractResponse` returned to frontend for live preview.

## Image Download Flow

1. User clicks **Save** on an image in the preview panel.
2. Frontend calls `GET /images/download?url=...`.
3. `fetch::download_media_bytes()` fetches the asset with SSRF checks.
4. API returns bytes with `Content-Disposition: attachment`.

## Conversion Flow

1. User clicks MD / TXT / PDF download in preview panel.
2. Frontend sends `POST /convert` with content and `target_format`.
3. `convert::convert_content()` produces bytes + MIME type.
4. Axum returns file with `Content-Disposition: attachment`.

## Settings Flow

1. User opens **Arrangements** and edits timeouts/limits.
2. Frontend `PUT /settings` with full settings object.
3. Rust updates in-memory config and writes `%LOCALAPPDATA%\OmniParse\.env`.

## Error Handling

| Error              | HTTP | Source                          |
|--------------------|------|---------------------------------|
| Invalid URL        | 422  | `AppError::InvalidUrl`          |
| Timeout            | 504  | `AppError::FetchTimeout`        |
| Empty extraction   | 422  | `AppError::Extraction`          |
| Conversion failure | 422  | `AppError::Conversion`          |
| Payload too large  | 413  | `AppError::PayloadTooLarge`     |

All errors return JSON `{ "detail": "message" }`.
