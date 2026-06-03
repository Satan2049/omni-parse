# Dependencies

## Backend (`backend/requirements.txt`)

| Package            | Purpose                              |
|--------------------|--------------------------------------|
| fastapi            | Web framework                        |
| uvicorn            | ASGI server                          |
| pydantic           | Request/response validation          |
| trafilatura        | High-precision text extraction       |
| beautifulsoup4     | HTML parsing for images              |
| lxml               | Fast HTML parser backend             |
| httpx              | Async HTTP client for URL fetching   |
| playwright         | JS rendering (optional)              |
| reportlab          | PDF generation                       |
| python-multipart   | Form data support                    |

## Frontend (`frontend/package.json`)

| Package              | Purpose                    |
|----------------------|----------------------------|
| next / react         | App framework              |
| tailwindcss          | Utility-first styling      |
| @radix-ui/*          | Accessible UI primitives   |
| lucide-react         | Icons                      |
| class-variance-authority | Component variants   |

## External Runtime

- **Playwright Chromium** — required only when `render_js` is enabled (`playwright install chromium`)
