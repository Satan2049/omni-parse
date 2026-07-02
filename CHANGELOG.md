# Changelog

All notable changes to OmniParse are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-07-03

### Added

- **Extraction presets** — Fast / Standard / Deep Gallery one-click option bundles
- **Extraction history** — last 50 runs in localStorage with re-run
- **Live progress (SSE)** — `POST /extract/stream` with stage updates during fetch, render, and image resolution
- **Markdown rendered preview** — Raw / Rendered toggle in the Content tab
- **Extraction stats** — word count, image count, file count, and elapsed time after each run
- **Keyboard shortcuts** — Ctrl+Enter extract, Ctrl+Shift+C copy, Esc cancel
- **Drag & drop** — drop URLs, HTML files, or pasted HTML into the workspace
- **Custom title bar** — frameless Tauri window with app-themed chrome; F11 fullscreen
- **Virtualized preview** — smooth scrolling for large markdown/JSON payloads
- **Parallel bulk image download** — concurrent downloads (limit 5) from the Images tab
- **Browser session reuse** — pooled Chrome/Edge instance with 120s idle timeout
- **Product roadmap** — [docs/vision.md](docs/vision.md) with v1.6 → v2.0 milestones

### Changed

- Output format can be switched client-side without re-extracting (MD / JSON / TXT)
- API responses always include `content_markdown`, `content_text`, and `content_json`
- App version **1.6.0** across API health, UI, and docs

## [1.5.0] - 2026-06-09

### Added

- **Rust API** — full backend rewrite in Axum (`crates/omniparse-core/`), replacing the Python FastAPI stack
- **Tauri desktop app** — single `omniparse.exe` (~23 MB) with embedded API; NSIS/MSI installers
- **Arrangements panel** — tune timeouts and limits from the UI; persisted via `GET/PUT /settings` to `%LOCALAPPDATA%\OmniParse\.env`
- **Deep gallery crawl** (`resolve_deep`) — headless Chrome/Edge scroll, pagination, lightbox clicks, and detail-page visits
- **Fast full-size resolve** (`resolve_fullsize_images`) — static URL upgrades and single-page browser capture without deep crawl
- **Files tab** — linked file URLs from pages (PDFs, archives, etc.) in extraction results
- **Save all images** — bulk download from the Images tab
- **`ALLOW_PRIVATE_NETWORK_URLS`** — opt-in setting for intentional LAN/local URL extraction (default remains blocked)
- **Download trust** — `SHA256.txt`, `docs/TRUST.md`, and checksum generation script
- **Browser-like fetch headers** — reduces 403 blocks on bot-protected sites
- Chrome/Edge **CDP fallback** via chromiumoxide when bundled Chromium is unavailable

### Changed

- **No Python runtime** — deleted `backend/`; API starts in ~5s vs 20–60s with PyInstaller sidecar
- JS rendering and image resolution use **system Chrome or Edge** (CDP) instead of Playwright
- Gallery-only and block pages fall back to full-page image scanning when readability finds no article body
- Clearer SSRF error messages (distinguishes security blocks from login/password issues)
- Image extraction merges and deduplicates size variants; optional `VERIFY_IMAGE_SIZES` probing
- App version **1.5.0** across API health, UI status badge, and docs

### Changed (architecture)

- **Cargo workspace** — API extracted to `crates/omniparse-core`; Tauri is a thin desktop shell

### Removed

- Python FastAPI backend, PyInstaller sidecar build, and Playwright dependency
- `backend/.venv` and Python launcher scripts

### Fixed

- Desktop installer file-lock errors (`app.exe` → `omniparse.exe`, NSIS pre-install process kill)
- “API offline” on cold start — health polling + faster Rust API startup
- Image API returned structured tuples instead of URL strings (500 on extract)

## [1.1.0] - 2026-06-04

### Added

- **Full-size image resolution** (`resolve_fullsize_images`) for URL extraction:
  - Picks the largest candidate from `srcset` and common lazy-load attributes (`data-original`, `data-zoom-image`, etc.)
  - Uses a browser session to expand lightboxes (PhotoSwipe, Fancybox, LightGallery, and similar)
  - Captures image network requests during render for additional high-resolution URLs
- **Image download API** — `GET /images/download?url=` proxies public image files with SSRF checks
- **Images tab Save button** — download resolved images from the UI via the API proxy
- **Advanced option** — “Resolve Full-Size Images” toggle in the workspace (URL mode only)
- **GitHub Pages landing** at `docs/index.html`

### Changed

- Image extraction deduplicates size variants and prefers higher-quality URLs
- Browser page loads use `networkidle` for more complete dynamic content

### Fixed

- Backend dev script pointed at the wrong virtual environment path

## [1.0.0] - 2026-06-04

### Added

- Initial release: URL/HTML extraction to Markdown, JSON, and Text
- Extraction API with optional JavaScript rendering
- Next.js split-screen workspace with live preview
- Export to MD, TXT, JSON, and PDF
- Basic image URL collection from article HTML
- One-click Windows launcher (`start.bat`)

[1.6.0]: https://github.com/Satan2049/omni-parse/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/Satan2049/omni-parse/compare/v1.1.0...v1.5.0
[1.1.0]: https://github.com/Satan2049/omni-parse/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Satan2049/omni-parse/releases/tag/v1.0.0
