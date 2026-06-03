# Codebase Map

```
omni-parse/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI app factory, CORS, error handlers
│       ├── core/
│       │   ├── config.py           # Settings (timeouts, CORS, limits)
│       │   └── exceptions.py       # Domain exceptions
│       ├── models/
│       │   └── schemas.py          # Pydantic API schemas
│       ├── api/
│       │   ├── router.py           # Route aggregation
│       │   └── routes/
│       │       ├── extract.py      # POST /extract
│       │       └── convert.py      # POST /convert
│       └── services/
│           ├── fetch_service.py    # URL fetch, Playwright, images
│           ├── extract_service.py  # Trafilatura extraction
│           ├── convert_service.py  # PDF/TXT/MD conversion
│           └── orchestrator.py     # Extraction pipeline
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx          # Root layout (dark theme)
│   │   │   ├── page.tsx            # Landing page
│   │   │   └── globals.css         # Theme tokens, fonts
│   │   ├── components/
│   │   │   ├── extractor-workspace.tsx
│   │   │   ├── advanced-options.tsx
│   │   │   ├── preview-panel.tsx
│   │   │   └── ui/                 # shadcn/ui primitives
│   │   └── lib/
│   │       ├── api.ts              # Backend API client
│   │       └── utils.ts            # cn() helper
│   └── package.json
├── scripts/
│   ├── run-backend.bat             # Backend launcher (used by start.bat)
│   └── run-frontend.bat            # Frontend launcher (used by start.bat)
├── start.bat                       # One-click Windows setup & launcher
└── docs/architecture/
```

## Critical Services

| Service            | File                              | Role                        |
|--------------------|-----------------------------------|-----------------------------|
| Fetch              | `services/fetch_service.py`       | Retrieve HTML from URLs     |
| Extract            | `services/extract_service.py`     | Trafilatura content parsing  |
| Convert            | `services/convert_service.py`     | File format conversion      |
| Orchestrator       | `services/orchestrator.py`        | Pipeline coordination       |

## Entry Points

- **One-click (Windows):** double-click `start.bat` in the repo root
- **API:** `uvicorn app.main:app --reload --port 8000`
- **UI:** `npm run dev` in `frontend/` → http://localhost:3000
