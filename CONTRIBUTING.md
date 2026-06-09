# Contributing to OmniParse

Thank you for your interest in contributing. OmniParse is a **Cargo workspace** monorepo:

- `crates/omniparse-core` — Rust API (Axum)
- `frontend/src-tauri` — Tauri desktop shell
- `frontend/` — Next.js UI

## Getting Started

### Windows (recommended)

Double-click `start.bat` in the project root.

### Manual setup

```bash
# API (repo root)
cargo run --bin omniparse-server

# Frontend
cd frontend && npm install && npm run dev

# Desktop
cd frontend && npm run tauri:dev
```

See [README.md](README.md) for full prerequisites.

## Development Guidelines

- Keep changes focused and modular
- API types live in `crates/omniparse-core/src/models.rs`
- Business logic stays in `crates/omniparse-core/src/` — not in Tauri or route handlers
- Match existing naming and file structure
- Update `docs/architecture/` when behavior or data flow changes

## Pull Requests

1. Fork the repository and create a feature branch
2. Make your changes with clear commit messages
3. Verify:
   - `cargo build --bin omniparse-server` (repo root)
   - `cargo build -p omniparse` (desktop crate)
   - `npm run build` in `frontend/`
4. Open a pull request with a summary and test plan

## Reporting Issues

Use GitHub Issues and include:

- Steps to reproduce
- Expected vs actual behavior
- URL or HTML sample (if applicable)
- OS, Rust (`rustc --version`), and Node versions
- Whether Chrome or Edge is installed (for JS rendering issues)

## Code of Conduct

Be respectful and constructive. We welcome contributors of all experience levels.
