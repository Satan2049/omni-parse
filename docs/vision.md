# OmniParse Product Vision & Roadmap

OmniParse is a **local-first page-to-data extractor** for developers and AI researchers. The goal is to turn any URL or HTML into clean, RAG-ready Markdown, JSON, or Text — fast, private, and without vendor lock-in.

This document defines release milestones. Each version should ship a **focused, shippable slice** — not a wish list dumped into one release.

---

## Current State (v1.5.0)

- Rust API (Axum) with readability + html2md pipeline
- Tauri desktop app with embedded API (~23 MB)
- Split-screen workspace: input, advanced options, live preview
- JS rendering via headless Chrome/Edge
- Full-size image resolution (fast + deep gallery crawl)
- Arrangements panel for server tuning
- Export to MD, TXT, JSON, PDF

---

## v1.6.0 — Workflow & Speed

**Theme:** Make daily extraction feel fast, transparent, and repeatable.

### UI / UX

| Feature | Description |
|---------|-------------|
| **Extraction presets** | `Fast` / `Standard` / `Deep Gallery` — one-click option bundles instead of toggling five switches |
| **Extraction history** | Last 50 runs stored locally (URL, options, result summary) with re-run |
| **Live progress steps** | SSE stream shows stage: fetching → rendering → resolving images → extracting |
| **Markdown rendered preview** | Toggle Raw / Rendered in the Content tab |
| **Extraction stats** | Word count, image count, elapsed time after each run |
| **Keyboard shortcuts** | `Ctrl+Enter` extract, `Ctrl+Shift+C` copy, `Esc` cancel |
| **Drag & drop** | Drop URL text, `.html` files, or paste from clipboard |
| **Custom title bar** | Frameless window with app-themed chrome; F11 fullscreen |

### Performance

| Feature | Description |
|---------|-------------|
| **Browser session reuse** | Pooled Chrome/Edge instance instead of cold launch per request |
| **Parallel bulk image download** | Concurrent downloads (limit 5) from Images tab |
| **Client-side format switch** | Change MD/JSON/TXT preview without re-extracting |
| **Virtualized preview** | Smooth scrolling for large markdown payloads |

### Exit criteria

- [x] All features above implemented and documented in CHANGELOG
- [x] `cargo test` and `npm run build` pass
- [ ] Desktop app tested on Windows 10/11

---

## v1.7.0 — Batch & Polish

**Theme:** Scale from single-page to multi-page workflows; polish desktop UX.

### UI / UX

| Feature | Description |
|---------|-------------|
| **Batch URL queue** | Paste multiple URLs, run sequentially, export all |
| **Resizable panels** | Drag handle between input and preview columns |
| **Toast notifications** | Extract complete / error / download ready (especially when minimized) |
| **Export as ZIP** | Markdown + images + metadata.json in one archive |
| **Smart error messages** | Actionable hints: Chrome missing, SSRF block, timeout |
| **First-run onboarding** | Short guided tour on first launch |
| **Light / dark theme toggle** | User preference beyond hardcoded dark |

### Performance

| Feature | Description |
|---------|-------------|
| **Response cache** | Hash(URL + options) → cache for 24h |
| **Lazy tab rendering** | Images tab loads thumbnails only when opened |
| **Thumbnail proxy** | Lightweight resized previews via API |
| **Job cancellation** | Abort propagates to backend browser session |

### Exit criteria

- [ ] Batch queue handles 10+ URLs without UI freeze
- [ ] Cache hit returns in <500 ms for repeated URLs

---

## v2.0.0 — Platform

**Theme:** OmniParse becomes a platform — CLI, plugins, and background workflows.

### Product

| Feature | Description |
|---------|-------------|
| **CLI tool** | `omniparse extract <url>` for CI/CD and scripts |
| **Extractor profiles** | Domain presets: Wikipedia, Medium, GitHub README |
| **Diff view** | Side-by-side format comparison (MD vs TXT vs JSON) |
| **Workspace sessions** | Multiple tabs / projects within one window |
| **Auto-update** | Tauri updater for desktop distribution |
| **System tray** | Minimize to tray; background extract with notification |

### Architecture

| Feature | Description |
|---------|-------------|
| **Async job queue** | Long extracts as background jobs with job ID polling |
| **Incremental streaming** | Title/metadata first, content second, images last |
| **Shared browser + page pool** | Required for batch queue throughput |
| **Metrics endpoint** | `/metrics` for pool usage, avg extract time |

### Exit criteria

- [ ] CLI parity with core `/extract` options
- [ ] Breaking changes documented; migration guide published

---

## Explicitly Out of Scope (for now)

These are intentionally deferred to avoid scope explosion:

- Multi-user / cloud sync
- Heavy database (SQLite for history in v1.6 is enough)
- Built-in AI summarization or LLM integration
- Full i18n (unless a clear non-English user base emerges)
- Electron rewrite

---

## Versioning

OmniParse follows [Semantic Versioning](https://semver.org/):

- **Minor** (1.x.0) — new features, backward compatible
- **Patch** (1.x.y) — bug fixes only
- **Major** (2.0.0) — breaking API or architecture changes

Track shipped work in [CHANGELOG.md](../CHANGELOG.md).
