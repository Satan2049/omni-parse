# OmniParse Architecture Overview

OmniParse is a **Cargo workspace** monorepo: a shared Rust API crate, a Tauri desktop shell, and a Next.js frontend. The API handles content extraction, browser automation, and file conversion; the frontend provides a split-screen workspace for input, configuration, and live preview.

## Goals

- Extract clean, structured content from URLs or raw HTML
- Support JS-rendered pages via headless Chrome/Edge (optional)
- Resolve full-size image URLs via srcset, lazy attributes, browser network capture, lightbox clicks, and optional deep gallery crawl
- Export to Markdown, JSON, Text, or downloadable files (PDF/TXT/MD)
- Ship as a compact desktop app (`omniparse.exe`) with no Python runtime

## High-Level Flow

```
User Input (URL/HTML)
  → Frontend (Next.js or Tauri webview)
  → POST /extract
  → Fetch (reqwest) or Browser (chromiumoxide)
  → Extract (readability + html2md)
  → JSON Response
  → Live Preview / Download via POST /convert
```

## Module Boundaries

| Layer    | Location                          | Responsibility                    |
|----------|-----------------------------------|-----------------------------------|
| Core API | `crates/omniparse-core/`          | Axum routes, fetch, extract, images |
| Models   | `crates/omniparse-core/src/models.rs` | Serde request/response types |
| Config   | `crates/omniparse-core/src/config.rs`   | Settings + `%LOCALAPPDATA%\OmniParse\.env` |
| Desktop  | `frontend/src-tauri/`             | Tauri shell; spawns embedded API  |
| UI       | `frontend/src/`                   | Workspace, preview, arrangements  |

## Entry Points

- **Desktop:** `omniparse.exe` (Tauri) — starts UI + API on `127.0.0.1:8000`
- **API only:** `cargo run --bin omniparse-server` from repo root
- **UI dev:** `npm run dev` in `frontend/` → http://localhost:3000
