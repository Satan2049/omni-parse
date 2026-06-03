import asyncio

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import ConvertRequest
from app.services.convert_service import convert_content

router = APIRouter()


@router.post("/convert")
async def convert_page(request: ConvertRequest) -> StreamingResponse:
    """Convert extracted text/markdown into a downloadable file."""
    file_bytes, media_type, filename = await asyncio.to_thread(
        convert_content,
        request.content,
        request.target_format,
        request.title,
    )

    return StreamingResponse(
        iter([file_bytes]),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
