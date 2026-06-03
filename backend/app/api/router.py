from fastapi import APIRouter

from app.api.routes import convert, extract

api_router = APIRouter()
api_router.include_router(extract.router, tags=["extract"])
api_router.include_router(convert.router, tags=["convert"])
