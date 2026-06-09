# Dependencies

## Rust API (`frontend/src-tauri/Cargo.toml`)

| Crate            | Purpose                              |
|------------------|--------------------------------------|
| axum             | HTTP API framework                   |
| tokio            | Async runtime                        |
| reqwest          | Async HTTP client for URL fetching   |
| chromiumoxide    | Headless Chrome/Edge (CDP)           |
| readability      | Article content extraction           |
| html2md          | HTML → Markdown                      |
| scraper          | HTML parsing and selectors           |
| printpdf         | PDF generation                       |
| serde / serde_json | Request/response types             |
| tauri            | Desktop shell                        |

## Frontend (`frontend/package.json`)

| Package              | Purpose                    |
|----------------------|----------------------------|
| next / react         | App framework              |
| tailwindcss          | Utility-first styling      |
| @radix-ui/*          | Accessible UI primitives   |
| lucide-react         | Icons                      |
| class-variance-authority | Component variants   |

## External Runtime

- **Google Chrome or Microsoft Edge** — required when `render_js`, `resolve_fullsize_images`, or `resolve_deep` is enabled. OmniParse uses the system browser via CDP; no separate Playwright install is needed.
