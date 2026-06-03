from fastapi import APIRouter

from app.models.schemas import ExtractRequest, ExtractResponse
from app.services.orchestrator import run_extraction

router = APIRouter()


@router.post("/extract", response_model=ExtractResponse)
async def extract_page(request: ExtractRequest) -> ExtractResponse:
    """Extract clean content from a URL or raw HTML string."""
    return await run_extraction(request)
