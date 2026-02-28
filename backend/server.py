from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
from icalendar import Calendar
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global sync task reference
sync_task = None

# ----- Models -----

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="app_settings")
    ical_url_1: Optional[str] = ""
    ical_url_2: Optional[str] = ""
    calendar_name_1: Optional[str] = "Kalender 1"
    calendar_name_2: Optional[str] = "Kalender 2"
    sync_interval: Optional[int] = 15  # minutes
    webpushr_key: Optional[str] = ""
    webpushr_auth_token: Optional[str] = ""
    auth_enabled: Optional[bool] = False
    auth_password: Optional[str] = ""
    
    @property
    def safe_ical_url_1(self) -> str:
        return self.ical_url_1 or ""
    
    @property
    def safe_ical_url_2(self) -> str:
        return self.ical_url_2 or ""
    
    @property
    def safe_sync_interval(self) -> int:
        return self.sync_interval if self.sync_interval else 15

class SettingsUpdate(BaseModel):
    ical_url_1: Optional[str] = None
    ical_url_2: Optional[str] = None
    calendar_name_1: Optional[str] = None
    calendar_name_2: Optional[str] = None
    sync_interval: Optional[int] = None
    webpushr_key: Optional[str] = None
    webpushr_auth_token: Optional[str] = None
    auth_enabled: Optional[bool] = None
    auth_password: Optional[str] = None
    auth_enabled: Optional[bool] = None
    auth_password: Optional[str] = None

class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uid: str  # iCal UID
    calendar_index: int  # 1 or 2
    summary: str
    description: str = ""
    location: str = ""
    start: str
    end: str
    status: str = "normal"  # new, removed, normal
    status_changed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EventConfirm(BaseModel):
    event_id: str

class AuthLogin(BaseModel):
    password: str

class SyncResult(BaseModel):
    success: bool
    message: str
    new_events: int = 0
    removed_events: int = 0

# ----- Helper Functions -----

def generate_event_key(summary: str, start: str, calendar_index: int) -> str:
    """Generate stable unique key for event identification based on content, not UID"""
    # Use summary + start date + calendar index to create a stable identifier
    # This handles iCal feeds that regenerate UIDs on each request
    key_string = f"{summary.strip().lower()}-{start}-{calendar_index}"
    return hashlib.md5(key_string.encode()).hexdigest()

async def parse_ical_feed(url: str) -> List[Dict[str, Any]]:
    """Fetch and parse iCal feed"""
    if not url:
        return []
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
        cal = Calendar.from_ical(response.text)
        events = []
        
        for component in cal.walk():
            if component.name == "VEVENT":
                original_uid = str(component.get('uid', ''))
                summary = str(component.get('summary', 'Ingen titel'))
                description = str(component.get('description', ''))
                location = str(component.get('location', ''))
                
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')
                
                start_dt = dtstart.dt if dtstart else None
                end_dt = dtend.dt if dtend else None
                
                # Check if event has both start AND end TIME (not just date)
                # If both have time components, skip this event (it's a meeting, not a task)
                has_start_time = start_dt and hasattr(start_dt, 'hour')
                has_end_time = end_dt and hasattr(end_dt, 'hour')
                
                if has_start_time and has_end_time:
                    # Skip events with both start and end time
                    logger.debug(f"Skipping event with start/end time: {summary}")
                    continue
                
                # Handle all-day events (date without time)
                if start_dt:
                    if hasattr(start_dt, 'isoformat'):
                        start_str = start_dt.isoformat()
                    else:
                        start_str = str(start_dt)
                else:
                    start_str = ""
                
                if end_dt:
                    if hasattr(end_dt, 'isoformat'):
                        end_str = end_dt.isoformat()
                    else:
                        end_str = str(end_dt)
                else:
                    end_str = start_str
                
                events.append({
                    'original_uid': original_uid,
                    'summary': summary,
                    'description': description,
                    'location': location,
                    'start': start_str,
                    'end': end_str
                })
        
        return events
    except Exception as e:
        logger.error(f"Error parsing iCal feed {url}: {e}")
        return []

async def send_webpushr_notification(title: str, message: str, settings: Settings):
    """Send push notification via Webpushr"""
    if not settings.webpushr_key or not settings.webpushr_auth_token:
        logger.warning("Webpushr credentials not configured")
        return False
    
    try:
        headers = {
            "webpushrKey": settings.webpushr_key,
            "webpushrAuthToken": settings.webpushr_auth_token,
            "Content-Type": "application/json"
        }
        
        payload = {
            "title": title,
            "message": message,
            "target_url": os.environ.get('FRONTEND_URL', 'https://example.com')
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.webpushr.com/v1/notification/send/all",
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            logger.info(f"Webpushr notification sent: {title}")
            return True
    except Exception as e:
        logger.error(f"Failed to send Webpushr notification: {e}")
        return False

async def get_settings_from_db() -> Settings:
    """Get settings from database"""
    doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if doc:
        return Settings(**doc)
    return Settings()

async def sync_calendars() -> SyncResult:
    """Sync calendars and detect changes"""
    settings = await get_settings_from_db()
    
    new_count = 0
    removed_count = 0
    
    for cal_index in [1, 2]:
        url = settings.ical_url_1 if cal_index == 1 else settings.ical_url_2
        cal_name = settings.calendar_name_1 if cal_index == 1 else settings.calendar_name_2
        
        if not url:
            continue
        
        # Parse new events from feed
        feed_events = await parse_ical_feed(url)
        
        # Create stable keys for feed events (based on summary + start, not UID)
        feed_keys = {}
        for e in feed_events:
            key = generate_event_key(e['summary'], e['start'], cal_index)
            feed_keys[key] = e
        
        # Get existing events from database
        existing_events = await db.events.find(
            {"calendar_index": cal_index, "status": {"$ne": "removed"}},
            {"_id": 0}
        ).to_list(10000)
        
        # Create map of existing event keys
        existing_keys = {}
        for e in existing_events:
            key = generate_event_key(e['summary'], e['start'], cal_index)
            existing_keys[key] = e
        
        # Find new events (in feed but not in DB)
        for event_key, event_data in feed_keys.items():
            if event_key not in existing_keys:
                new_event = CalendarEvent(
                    uid=event_key,  # Use stable key as UID
                    calendar_index=cal_index,
                    summary=event_data['summary'],
                    description=event_data['description'],
                    location=event_data['location'],
                    start=event_data['start'],
                    end=event_data['end'],
                    status="new",
                    status_changed_at=datetime.now(timezone.utc).isoformat()
                )
                await db.events.insert_one(new_event.model_dump())
                new_count += 1
                logger.info(f"New event detected: {event_data['summary']} in {cal_name}")
        
        # Find removed events (in DB but not in feed)
        for event_key, existing in existing_keys.items():
            if event_key not in feed_keys:
                await db.events.update_one(
                    {"id": existing['id']},
                    {"$set": {
                        "status": "removed",
                        "status_changed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                removed_count += 1
                logger.info(f"Event removed: {existing['summary']} from {cal_name}")
    
    # Send notification if changes detected
    if new_count > 0 or removed_count > 0:
        notification_parts = []
        if new_count > 0:
            notification_parts.append(f"{new_count} nya")
        if removed_count > 0:
            notification_parts.append(f"{removed_count} borttagna")
        
        await send_webpushr_notification(
            "Kalenderändring",
            f"Händelser uppdaterade: {', '.join(notification_parts)}",
            settings
        )
    
    # Clean up old removed events (older than 6 hours)
    six_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    await db.events.delete_many({
        "status": "removed",
        "status_changed_at": {"$lt": six_hours_ago}
    })
    
    return SyncResult(
        success=True,
        message=f"Synkronisering klar",
        new_events=new_count,
        removed_events=removed_count
    )

async def periodic_sync():
    """Background task for periodic sync"""
    global sync_task
    while True:
        try:
            settings = await get_settings_from_db()
            interval = (settings.sync_interval or 15) * 60  # Convert to seconds
            await asyncio.sleep(interval)
            await sync_calendars()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Periodic sync error: {e}")
            await asyncio.sleep(60)

# ----- API Routes -----

@api_router.get("/")
async def root():
    return {"message": "iCal Sync API"}

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    """Get current settings"""
    return await get_settings_from_db()

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings_update: SettingsUpdate):
    """Update settings"""
    current = await get_settings_from_db()
    update_data = settings_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current, key, value)
    
    await db.settings.update_one(
        {"id": "app_settings"},
        {"$set": current.model_dump()},
        upsert=True
    )
    
    return current

@api_router.post("/auth/login")
async def login(auth: AuthLogin):
    """Verify password for auth"""
    settings = await get_settings_from_db()
    
    if not settings.auth_enabled:
        return {"success": True, "message": "Auth disabled"}
    
    if auth.password == settings.auth_password:
        return {"success": True, "message": "Inloggad"}
    
    raise HTTPException(status_code=401, detail="Fel lösenord")

@api_router.get("/auth/status")
async def auth_status():
    """Check if auth is enabled"""
    settings = await get_settings_from_db()
    return {"auth_enabled": settings.auth_enabled}

@api_router.get("/events", response_model=List[CalendarEvent])
async def get_events():
    """Get all events"""
    events = await db.events.find({}, {"_id": 0}).to_list(10000)
    
    # Filter out removed events older than 6 hours
    six_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    filtered_events = []
    
    for event in events:
        if event.get('status') == 'removed':
            changed_at = event.get('status_changed_at', '')
            if changed_at and changed_at < six_hours_ago:
                continue
        filtered_events.append(event)
    
    return filtered_events

@api_router.get("/categories")
async def get_categories():
    """Get all unique categories from events"""
    # Get categories from current events
    events = await db.events.find({}, {"_id": 0, "category": 1, "summary": 1}).to_list(10000)
    
    categories = set()
    for event in events:
        cat = event.get('category')
        if cat:
            categories.add(cat)
        else:
            # Extract from summary if not set
            categories.add(extract_category(event.get('summary', '')))
    
    # Also parse fresh from iCal feeds to get all possible categories
    settings = await get_settings_from_db()
    for url in [settings.ical_url_1, settings.ical_url_2]:
        if url:
            feed_events = await parse_ical_feed(url)
            for e in feed_events:
                categories.add(e.get('category', extract_category(e.get('summary', ''))))
    
    return {"categories": sorted(list(categories))}

@api_router.post("/events/{event_id}/confirm")
async def confirm_event(event_id: str):
    """Confirm a new event (change status from 'new' to 'normal')"""
    result = await db.events.update_one(
        {"id": event_id, "status": "new"},
        {"$set": {"status": "normal", "status_changed_at": None}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event not found or already confirmed")
    
    return {"success": True, "message": "Händelse bekräftad"}

@api_router.post("/sync", response_model=SyncResult)
async def trigger_sync():
    """Manually trigger calendar sync"""
    return await sync_calendars()

@api_router.post("/test-push")
async def test_push_notification():
    """Send a test push notification"""
    settings = await get_settings_from_db()
    
    if not settings.webpushr_key or not settings.webpushr_auth_token:
        return {"success": False, "message": "Webpushr API-nycklar saknas"}
    
    success = await send_webpushr_notification(
        "Test från iCal Sync",
        "Detta är en testnotifikation! Push-notifikationer fungerar.",
        settings
    )
    
    if success:
        return {"success": True, "message": "Test-notifikation skickad"}
    else:
        return {"success": False, "message": "Kunde inte skicka notifikation. Kontrollera API-nycklar."}

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    global sync_task
    # Start periodic sync task
    sync_task = asyncio.create_task(periodic_sync())
    logger.info("Periodic sync task started")

@app.on_event("shutdown")
async def shutdown_db_client():
    global sync_task
    if sync_task:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass
    client.close()
