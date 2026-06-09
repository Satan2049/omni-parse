# Codebase Map

```
omni-parse/
├── Cargo.toml                      # Workspace root
├── crates/
│   └── omniparse-core/             # Shared Rust API library + server binary
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── server.rs           # Axum routes
│           ├── orchestrator.rs     # Extraction pipeline
│           ├── fetch.rs            # HTTP fetch
│           ├── browser_fetch.rs    # JS render + image crawl
│           ├── extract.rs          # Readability extraction
│           ├── images.rs           # Image discovery + upgrade
│           ├── media.rs            # File links
│           ├── convert.rs          # PDF/TXT/MD export
│           ├── security.rs         # SSRF protection
│           ├── config.rs           # Settings / .env
│           └── bin/server.rs       # omniparse-server entry
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   ├── components/             # Workspace, preview, options
│   │   └── lib/                    # API client, utilities
│   ├── src-tauri/                  # Tauri desktop shell (thin)
│   │   ├── src/lib.rs              # Spawns omniparse-core API
│   │   ├── tauri.conf.json
│   │   └── Cargo.toml
│   └── package.json
├── scripts/
│   ├── run-backend.bat             # cargo run --bin omniparse-server
│   ├── run-frontend.bat            # npm run dev
│   ├── build-desktop.ps1           # npm run tauri:build
│   └── generate-sha256.ps1         # Source + release checksums
├── SHA256.txt                      # Source/launcher checksums
├── start.bat                       # One-click Windows launcher
└── docs/
    ├── assets/                     # Logo, screenshots, demo media
    ├── index.html                  # GitHub Pages landing
    └── architecture/               # Architecture documentation
```

## Critical Services

| Service      | File                                      | Role                         |
|--------------|-------------------------------------------|------------------------------|
| Server       | `crates/omniparse-core/src/server.rs`     | HTTP routes                  |
| Fetch        | `crates/omniparse-core/src/fetch.rs`      | Retrieve HTML from URLs      |
| Browser      | `crates/omniparse-core/src/browser_fetch.rs` | JS render + image resolution |
| Extract      | `crates/omniparse-core/src/extract.rs`    | Readability content parsing  |
| Convert      | `crates/omniparse-core/src/convert.rs`    | File format conversion       |
| Orchestrator | `crates/omniparse-core/src/orchestrator.rs` | Pipeline coordination      |

## Entry Points

- **One-click (Windows):** double-click `start.bat`
- **API:** `cargo run --bin omniparse-server` from repo root
- **Desktop:** `npm run tauri:build` in `frontend/` → `omniparse.exe`
- **UI:** `npm run dev` in `frontend/` → http://localhost:3000
