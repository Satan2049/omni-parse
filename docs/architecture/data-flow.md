# Data Flow

## Extraction Flow

1. User submits URL or HTML from the frontend workspace.
2. Frontend sends `POST /extract` with options:
   - `render_js` — use Playwright instead of httpx
   - `extract_images` — collect `<img>` URLs
   - `output_format` — `md`, `json`, or `txt`
3. If URL provided, `fetch_service.fetch_url()` retrieves HTML.
4. `extract_service.extract_content()` runs Trafilatura extraction.
5. Optional image URLs are parsed from HTML.
6. `ExtractResponse` returned to frontend for live preview.

## Conversion Flow

1. User clicks MD / TXT / PDF download in preview panel.
2. Frontend sends `POST /convert` with content and `target_format`.
3. `convert_service.convert_content()` produces bytes + MIME type.
4. FastAPI `StreamingResponse` returns file with `Content-Disposition: attachment`.

## Error Handling

| Error              | HTTP | Source                          |
|--------------------|------|---------------------------------|
| Invalid URL        | 422  | `InvalidURLError`               |
| Timeout            | 504  | `FetchTimeoutError`             |
| Empty extraction   | 422  | `ExtractionError`               |
| Conversion failure | 422  | `ConversionError`               |

All domain errors inherit from `OmniParseError` and are handled globally in `main.py`.
