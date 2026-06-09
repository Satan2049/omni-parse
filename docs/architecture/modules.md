# Modules

## Rust API (`crates/omniparse-core/`)

### `server.rs`
- `GET /health` — version and status
- `POST /extract` — accepts `ExtractRequest`, returns `ExtractResponse`
- `POST /convert` — accepts `ConvertRequest`, streams file download
- `GET /images/download` — SSRF-safe proxy download for image/file URLs
- `GET/PUT /settings` — read/write runtime configuration (persisted to `.env`)

### `fetch.rs`
- URL validation and HTTP fetch via reqwest
- Delegates to `browser_fetch` when `render_js=true`

### `browser_fetch.rs`
- Headless Chrome/Edge via chromiumoxide
- `render_page_html` — JS rendering for SPAs
- `fetch_with_fullsize_images` — scroll, network capture, lightbox clicks, optional deep gallery crawl

### `images.rs`
- Static image URL extraction with srcset/lazy-attribute scoring
- Thumbnail upgrade heuristics and optional HEAD size verification
- Image list merge and deduplication

### `media.rs`
- File link extraction (PDF, video, archives)
- Linked images and script-embedded image URLs

### `extract.rs`
- Readability-based article extraction
- html2md conversion, gallery fallback, block-page detection

### `convert.rs`
- TXT/MD passthrough encoding
- PDF generation via printpdf

### `orchestrator.rs`
- Coordinates fetch/browser → extract → image merge → response assembly

### `config.rs` / `settings.rs`
- Runtime settings loaded from `%LOCALAPPDATA%\OmniParse\.env`

### `security.rs`
- SSRF protection (private network blocking)

## Desktop shell (`frontend/src-tauri/`)

- Thin Tauri wrapper; spawns `omniparse_core::run_server()` on startup
- No business logic — all API code lives in `omniparse-core`

## Frontend (`frontend/src/`)

### `components/extractor-workspace.tsx`
- Main split-screen layout and state management

### `components/advanced-options.tsx`
- Collapsible panel: Render JS, Extract Images, Resolve Full-Size Images, Deep Gallery, Output Format

### `components/arrangements-panel.tsx`
- Server-side limits and timeouts (`.env` persistence)

### `components/preview-panel.tsx`
- Live preview tabs: Content, Metadata, Images + download actions

### `lib/api.ts`
- Typed API client for all endpoints
