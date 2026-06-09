# omniparse-core

Shared Rust library for the OmniParse extraction API.

## Responsibilities

- HTTP API (Axum) on `127.0.0.1:8000`
- URL/HTML fetch, readability extraction, image resolution
- PDF/TXT/MD conversion and SSRF-safe media proxy

## Run standalone

From the repository root:

```bash
cargo run --bin omniparse-server
```

## Used by

- `frontend/src-tauri` — embedded in the desktop app
- Direct dev use via `scripts/run-backend.bat` or `start.bat`
