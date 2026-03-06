"""Settings service"""
from config import db, logger
from models.settings import Settings


async def get_settings_from_db() -> Settings:
    """Get settings from database"""
    doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if doc:
        return Settings(**doc)
    return Settings()
