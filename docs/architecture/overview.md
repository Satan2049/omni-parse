# OmniParse Architecture Overview

OmniParse is a monorepo with a FastAPI backend and Next.js frontend. The backend handles content extraction and file conversion; the frontend provides a split-screen workspace for input, configuration, and live preview.

## Goals

- Extract clean, structured content from URLs or raw HTML
- Support JS-rendered pages via Playwright (optional)
- Export to Markdown, JSON, Text, or downloadable files (PDF/TXT/MD)

## High-Level Flow

```
User Input (URL/HTML)
  → Frontend (Next.js)
  → POST /extract
  → Fetch Service (httpx or Playwright)
  → Extract Service (trafilatura)
  → JSON Response
  → Live Preview / Download via POST /convert
```

## Module Boundaries

| Layer    | Location              | Responsibility                    |
|----------|-----------------------|-----------------------------------|
| Routes   | `backend/app/api/`    | HTTP handlers, request validation |
| Services | `backend/app/services/` | Business logic, extraction      |
| Models   | `backend/app/models/` | Pydantic schemas                  |
| Core     | `backend/app/core/`   | Config, custom exceptions         |
| UI       | `frontend/src/`       | Landing page, workspace, preview  |

## Entry Points

- **API:** `backend/app/main.py` → `uvicorn app.main:app`
- **UI:** `frontend/src/app/page.tsx` → Next.js App Router
