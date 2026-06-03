# Modules

## Backend (`backend/app/`)

### `api/routes/extract.py`
- `POST /extract` — accepts `ExtractRequest`, returns `ExtractResponse`

### `api/routes/convert.py`
- `POST /convert` — accepts `ConvertRequest`, streams file download

### `services/fetch_service.py`
- URL validation and HTTP fetch via httpx
- Optional Playwright rendering for SPAs
- Image URL extraction via BeautifulSoup

### `services/extract_service.py`
- Trafilatura-based main content extraction
- Metadata parsing and format-specific output

### `services/convert_service.py`
- TXT/MD passthrough encoding
- PDF generation via ReportLab

### `services/orchestrator.py`
- Coordinates fetch → extract → response assembly

### `models/schemas.py`
- All Pydantic request/response models

## Frontend (`frontend/src/`)

### `components/extractor-workspace.tsx`
- Main split-screen layout and state management

### `components/advanced-options.tsx`
- Collapsible panel: Render JS, Extract Images, Output Format

### `components/preview-panel.tsx`
- Live preview tabs: Content, Metadata, Images + download actions

### `lib/api.ts`
- Typed API client for `/extract` and `/convert`
