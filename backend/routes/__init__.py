"""Routes module for Vklass Sync"""
from fastapi import APIRouter

# Create main API router
api_router = APIRouter(prefix="/api")

# Import and include sub-routers
from .settings import router as settings_router
from .events import router as events_router
from .auth import router as auth_router
from .sync import router as sync_router
from .stats import router as stats_router
from .migrations import router as migrations_router

api_router.include_router(settings_router)
api_router.include_router(events_router)
api_router.include_router(auth_router)
api_router.include_router(sync_router)
api_router.include_router(stats_router)
api_router.include_router(migrations_router)
