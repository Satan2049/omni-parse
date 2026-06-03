# OmniParse

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)

Universal Page-to-Data Extractor — convert any URL or HTML into clean **Markdown**, **JSON**, or **Text** for RAG pipelines and AI training.

**Project site:** Enable [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) from the `/docs` folder to publish the landing page at `https://<user>.github.io/omni-parse/`. Open [`docs/index.html`](docs/index.html) locally for a preview.

## Features

- High-precision extraction with [Trafilatura](https://github.com/adbar/trafilatura)
- Optional JavaScript rendering via Playwright
- Image URL collection for multimodal workflows
- Export to Markdown, JSON, Text, PDF, or downloadable files
- Split-screen UI with live preview

## Quick Start (Windows)

**Prerequisites:** [Python 3.11+](https://www.python.org/downloads/) and [Node.js 20+](https://nodejs.org/)

Double-click **`start.bat`** in the project root.

On first run it will:

1. Create `backend/.venv` and install Python packages
2. Install Playwright Chromium (for optional JS rendering)
3. Run `npm install` in `frontend/`
4. Open two terminals — API on port **8000**, UI on port **3000**

On later runs it skips installs and only activates the existing virtual environment before starting.

| Service  | URL |
|----------|-----|
| UI       | http://localhost:3000 |
| API      | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

## Manual Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
playwright install chromium   # only if using Render JS
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local    # or copy on Windows
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` if the API runs elsewhere.

## Project Structure

```
omni-parse/
├── backend/              # FastAPI extraction & conversion API
├── frontend/             # Next.js UI with live preview
├── scripts/              # Helper launch scripts for start.bat
├── docs/                 # GitHub Pages landing + architecture docs
├── docs/architecture/    # Architecture documentation
├── start.bat             # One-click Windows launcher
├── LICENSE
└── CONTRIBUTING.md
```

## API Endpoints

| Method | Path       | Description                                       |
|--------|------------|---------------------------------------------------|
| POST   | `/extract` | Extract title, markdown, metadata, and images     |
| POST   | `/convert` | Convert text/markdown to PDF, TXT, or MD download |
| GET    | `/health`  | Health check                                      |

## Tech Stack

- **Backend:** FastAPI, Trafilatura, BeautifulSoup4, Playwright, ReportLab
- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © OmniParse Contributors
