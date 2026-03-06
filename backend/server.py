"""
Vklass Sync - Main Server
Refactored to use routes, services, and models modules
"""
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import asyncio
import logging
from datetime import datetime, timedelta

# Import from local modules
from config import db, logger, SWEDISH_TZ
from routes import api_router
from services.settings_service import get_settings_from_db
from services.sync_service import sync_calendars
from services.notification_service import send_webpushr_notification, check_and_notify_completed_events

# Create the main app
app = FastAPI(title="Vklass Sync API")

# Global task references
sync_task = None
completion_check_task = None
weekly_summary_task = None

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----- Background Tasks -----

async def periodic_sync():
    """Background task to periodically sync calendars"""
    # Initial sync on startup
    await asyncio.sleep(5)
    logger.info("Running initial sync...")
    try:
        await sync_calendars()
    except Exception as e:
        logger.error(f"Initial sync error: {e}")
    
    while True:
        try:
            settings = await get_settings_from_db()
            interval = settings.safe_sync_interval
            
            logger.info(f"Next sync in {interval} minutes...")
            await asyncio.sleep(interval * 60)
            
            logger.info("Running periodic sync...")
            await sync_calendars()
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Sync error: {e}")
            await asyncio.sleep(60)


async def periodic_completion_check():
    """Background task to check for completed events and send notifications"""
    await asyncio.sleep(30)
    
    while True:
        try:
            await check_and_notify_completed_events()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Completion check error: {e}")
        
        await asyncio.sleep(60)


async def generate_weekly_summary():
    """Send a simple push notification linking to next week's stats page"""
    settings = await get_settings_from_db()
    
    now = datetime.now(SWEDISH_TZ)
    days_since_monday = now.weekday()
    # Next week (week_offset=1)
    monday = (now - timedelta(days=days_since_monday) + timedelta(weeks=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    sunday = monday + timedelta(days=6)
    
    monday_str = monday.strftime("%Y-%m-%d")
    sunday_str = sunday.strftime("%Y-%m-%d")
    week_num = monday.isocalendar()[1]
    
    title = "Nästa veckas statistik"
    message = f"Datum: {monday_str} - {sunday_str}"
    
    # Send to specific user ID with link to next week's stats page
    original_test_id = settings.webpushr_test_user_id
    settings.webpushr_test_user_id = "197920509"
    
    await send_webpushr_notification(title, message, settings, target_path="/stats/week/1")
    logger.info(f"Weekly summary notification sent: {title} -> /stats/week/1")
    
    settings.webpushr_test_user_id = original_test_id


async def periodic_weekly_summary():
    """Background task to send weekly summary on Fridays at 16:00"""
    while True:
        try:
            now = datetime.now(SWEDISH_TZ)
            
            if now.weekday() == 4 and now.hour == 16 and now.minute == 0:
                logger.info("Running weekly summary...")
                await generate_weekly_summary()
                await asyncio.sleep(61)
            else:
                await asyncio.sleep(30)
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Weekly summary error: {e}")
            await asyncio.sleep(60)


# ----- Root Route -----

@api_router.get("/")
async def root():
    return {"message": "Vklass Sync API"}


# Include the API router
app.include_router(api_router)


# ----- Startup/Shutdown Events -----

@app.on_event("startup")
async def startup_event():
    global sync_task, completion_check_task, weekly_summary_task
    
    logger.info("Starting Vklass Sync API...")
    
    # Initialize settings if not exists
    settings = await get_settings_from_db()
    if not await db.settings.find_one({"id": "app_settings"}):
        await db.settings.insert_one(settings.model_dump())
        logger.info("Initialized default settings")
    
    # Start background tasks
    sync_task = asyncio.create_task(periodic_sync())
    completion_check_task = asyncio.create_task(periodic_completion_check())
    weekly_summary_task = asyncio.create_task(periodic_weekly_summary())
    
    logger.info("Background tasks started")


@app.on_event("shutdown")
async def shutdown_event():
    global sync_task, completion_check_task, weekly_summary_task
    
    logger.info("Shutting down...")
    
    # Cancel background tasks
    for task in [sync_task, completion_check_task, weekly_summary_task]:
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
    
    logger.info("Shutdown complete")
