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
import pytz

# Swedish timezone
SWEDISH_TZ = pytz.timezone('Europe/Stockholm')

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
completion_check_task = None
weekly_summary_task = None

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
    webpushr_test_user_id: Optional[str] = ""  # If set, send notifications only to this user
    auth_enabled: Optional[bool] = False
    auth_password: Optional[str] = ""
    sound_enabled: Optional[bool] = True
    sound_volume: Optional[int] = 50  # 0-100
    impact_effect_enabled: Optional[bool] = False  # Visual effect at timer zero
    event_mappings: Optional[list] = []  # List of {cid: str, subject: str, event_id: str, event_type: str}
    screen_wake_lock: Optional[bool] = False  # Prevent screen from sleeping
    
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
    webpushr_test_user_id: Optional[str] = None
    auth_enabled: Optional[bool] = None
    auth_password: Optional[str] = None
    sound_enabled: Optional[bool] = None
    sound_volume: Optional[int] = None
    impact_effect_enabled: Optional[bool] = None
    event_mappings: Optional[list] = None
    screen_wake_lock: Optional[bool] = None

class CalendarEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    uid: str  # iCal UID
    calendar_index: int  # 1 or 2
    summary: str
    description: str = ""
    location: str = ""
    url: str = ""  # URL from iCal
    start: str
    end: str
    event_time: Optional[str] = None  # Extracted time like "09:25"
    status: str = "normal"  # new, removed, normal
    status_changed_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EventConfirm(BaseModel):
    event_id: str

class CreateEventRequest(BaseModel):
    calendar_index: int
    summary: str
    description: str = ""
    location: str = ""
    start: str  # Date in YYYY-MM-DD format
    event_time: Optional[str] = None  # Time like "09:25"
    subject_name: Optional[str] = None
    event_type: Optional[str] = None  # Läxa, Prov, etc.
    send_push: bool = False  # Whether to send push notification

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


async def update_event_mappings_from_events():
    """Auto-discover events from URLs and add to settings if not present"""
    from urllib.parse import urlparse, parse_qs
    
    settings = await get_settings_from_db()
    existing_event_ids = {m.get('event_id') for m in (settings.event_mappings or []) if m.get('event_id')}
    
    # Build CID to subject lookup from existing mappings (for inheritance)
    cid_to_subject = {}
    for m in (settings.event_mappings or []):
        cid = m.get('cid')
        subject = m.get('subject', '')
        if cid and subject and cid not in cid_to_subject:
            cid_to_subject[cid] = subject
    
    # Find all events with URLs and extract CID + event ID
    new_mappings = []
    async for event in db.events.find({"url": {"$ne": "", "$exists": True}}, {"url": 1, "summary": 1}):
        url = event.get('url', '')
        if url:
            try:
                params = parse_qs(urlparse(url).query)
                cid = params.get('cid', [''])[0]
                event_id = params.get('id', [''])[0]
                if event_id and event_id not in existing_event_ids:
                    # Inherit subject from existing CID mapping
                    inherited_subject = cid_to_subject.get(cid, '')
                    new_mappings.append({
                        'cid': cid,
                        'subject': inherited_subject,
                        'event_id': event_id,
                        'event_type': '',
                        'summary': event.get('summary', '')[:50]
                    })
                    existing_event_ids.add(event_id)
                    if inherited_subject:
                        logger.info(f"New event {event_id} inherited subject '{inherited_subject}' from CID {cid}")
            except:
                pass
    
    if new_mappings:
        current_mappings = list(settings.event_mappings or [])
        current_mappings.extend(new_mappings)
        await db.settings.update_one(
            {"id": "app_settings"},
            {"$set": {"event_mappings": current_mappings}}
        )
        logger.info(f"Added {len(new_mappings)} new event mapping(s)")
    
    # Also update CID for any existing mappings that are missing it
    updated = False
    current_mappings = list(settings.event_mappings or [])
    event_id_to_cid = {}
    
    # Build lookup of event_id to CID from events
    async for event in db.events.find({"url": {"$ne": "", "$exists": True}}, {"url": 1}):
        url = event.get('url', '')
        if url:
            try:
                params = parse_qs(urlparse(url).query)
                cid = params.get('cid', [''])[0]
                event_id = params.get('id', [''])[0]
                if event_id and cid:
                    event_id_to_cid[event_id] = cid
            except:
                pass
    
    # Update mappings with missing CID
    for mapping in current_mappings:
        event_id = mapping.get('event_id', '')
        if event_id and not mapping.get('cid') and event_id in event_id_to_cid:
            mapping['cid'] = event_id_to_cid[event_id]
            updated = True
    
    if updated:
        await db.settings.update_one(
            {"id": "app_settings"},
            {"$set": {"event_mappings": current_mappings}}
        )
        logger.info("Updated CIDs for existing event mappings")

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
                    'end': end_str,
                    'url': str(component.get('url', '')) if component.get('url') else '',
                    'event_time': extract_time_from_description(description)
                })
        
        return events
    except Exception as e:
        logger.error(f"Error parsing iCal feed {url}: {e}")
        return []

def extract_time_from_description(description: str) -> Optional[str]:
    """Extract time from description like 'kl: 09:25' or 'kl 09:25'"""
    if not description:
        return None
    import re
    match = re.search(r'kl:?\s*(\d{1,2}):(\d{2})', description, re.IGNORECASE)
    if match:
        hours = int(match.group(1))
        minutes = int(match.group(2))
        return f"{hours:02d}:{minutes:02d}"
    return None

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
            "target_url": "https://vklass.frontproduction.se",
            "expire_push": "24h",
            "auto_hide": 1,
            "icon": "https://static.prod-images.emergentagent.com/jobs/a7217622-ec5d-4df3-84c4-cbfaa9d1f7a7/images/2eb5e5e259cf1239f680c86c85179d293784a3191b9167aa6a376f8aece287d3.png"
        }
        
        # Determine endpoint based on test user setting
        if settings.webpushr_test_user_id:
            endpoint = "https://api.webpushr.com/v1/notification/send/sid"
            payload["sid"] = settings.webpushr_test_user_id
            logger.info(f"Sending to test user: {settings.webpushr_test_user_id}")
        else:
            endpoint = "https://api.webpushr.com/v1/notification/send/all"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            logger.info(f"Webpushr notification sent: {title}")
            return True
    except Exception as e:
        logger.error(f"Failed to send Webpushr notification: {e}")
        return False

def is_event_past(start_date: str, event_time: Optional[str]) -> bool:
    """Check if an event has passed (40 minutes after start time, or day after for all-day events)
    Uses Swedish timezone for all comparisons since events are in Swedish time."""
    if not start_date:
        return False
    try:
        from datetime import datetime as dt
        # Use Swedish time for comparison
        now = datetime.now(SWEDISH_TZ)
        
        # Parse the start date
        if 'T' in start_date:
            # Has time component
            event_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            event_date = event_date.astimezone(SWEDISH_TZ)
            event_plus_forty = event_date + timedelta(minutes=40)
            return now >= event_plus_forty
        else:
            # Date only - treat as Swedish local time
            event_date = dt.strptime(start_date, "%Y-%m-%d")
            event_date = SWEDISH_TZ.localize(event_date)
            
            # If we have event_time, use it
            if event_time:
                try:
                    hours, minutes = map(int, event_time.split(':'))
                    event_date = event_date.replace(hour=hours, minute=minutes)
                    event_plus_forty = event_date + timedelta(minutes=40)
                    return now >= event_plus_forty
                except:
                    pass
            
            # For date-only events, check if the day has passed
            today = now.replace(hour=0, minute=0, second=0, microsecond=0)
            return event_date < today
    except Exception as e:
        logger.error(f"Error checking if event is past: {e}")
        return False

async def check_and_notify_completed_events():
    """Check for events that have become 'Utfört' and send push notifications"""
    try:
        settings = await get_settings_from_db()
        if not settings.webpushr_key or not settings.webpushr_auth_token:
            return  # No push credentials configured
        
        # Get all events that are not removed and not already notified for completion
        events = await db.events.find({
            "status": {"$ne": "removed"},
            "notified_utfort": {"$ne": True}
        }, {"_id": 0}).to_list(10000)
        
        completed_events = []
        for event in events:
            start = event.get('start', '')
            event_time = event.get('event_time')
            
            if is_event_past(start, event_time):
                completed_events.append(event)
        
        if not completed_events:
            return
        
        logger.info(f"Found {len(completed_events)} newly completed events")
        
        # Send notifications for each completed event
        for event in completed_events:
            # Build notification title
            subject = event.get('subject_name', '')
            event_type = event.get('event_type', '')
            summary = event.get('summary', 'Event')
            
            # Format: "Utfört: Matematik - Läxa kapitel 5 ✓"
            if subject and event_type:
                title = f"Utfört: {subject} - {event_type} ✓"
            elif subject:
                title = f"Utfört: {subject} - {summary} ✓"
            elif event_type:
                title = f"Utfört: {summary} ({event_type}) ✓"
            else:
                title = f"Utfört: {summary} ✓"
            
            # Get calendar name based on calendar_index
            calendar_index = event.get('calendar_index', 1)
            if calendar_index == 1:
                calendar_name = settings.calendar_name_1 or "Kalender 1"
            else:
                calendar_name = settings.calendar_name_2 or "Kalender 2"
            
            message = f"Bra jobbat {calendar_name}!"
            
            await send_webpushr_notification(title, message, settings)
            
            # Mark as notified
            await db.events.update_one(
                {"id": event.get('id')},
                {"$set": {"notified_utfort": True}}
            )
            logger.info(f"Sent completion notification for: {summary}")
        
    except Exception as e:
        logger.error(f"Error checking completed events: {e}")

async def get_settings_from_db() -> Settings:
    """Get settings from database"""
    doc = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if doc:
        return Settings(**doc)
    return Settings()

async def sync_calendars() -> SyncResult:
    """Sync calendars and detect changes"""
    from urllib.parse import urlparse, parse_qs
    
    settings = await get_settings_from_db()
    
    # Create CID to subject lookup for notifications from event_mappings
    cid_lookup = {m.get('cid'): m.get('subject', '') for m in (settings.event_mappings or []) if m.get('cid') and m.get('subject')}
    
    new_count = 0
    removed_count = 0
    new_events_details = []  # Store details for notification
    removed_events_details = []  # Store details for removed events notification
    
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
        
        # Get existing events from database (excluding custom events)
        existing_events = await db.events.find(
            {
                "calendar_index": cal_index, 
                "status": {"$ne": "removed"},
                "uid": {"$not": {"$regex": "^custom-"}}
            },
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
                    url=event_data.get('url', ''),
                    start=event_data['start'],
                    end=event_data['end'],
                    event_time=event_data.get('event_time'),
                    status="normal" if is_event_past(event_data['start'], event_data.get('event_time')) else "new",
                    status_changed_at=datetime.now(timezone.utc).isoformat()
                )
                await db.events.insert_one(new_event.model_dump())
                new_count += 1
                
                # Get subject name from CID in URL
                subject_name = ''
                event_url = event_data.get('url', '')
                if event_url:
                    try:
                        params = parse_qs(urlparse(event_url).query)
                        cid = params.get('cid', [''])[0]
                        if cid and cid in cid_lookup:
                            subject_name = cid_lookup[cid]
                    except:
                        pass
                
                new_events_details.append({
                    'calendar_name': cal_name,
                    'summary': event_data['summary'],
                    'start': event_data['start'],
                    'event_time': event_data.get('event_time'),
                    'subject_name': subject_name
                })
                logger.info(f"New event detected: {event_data['summary']} in {cal_name}")
        
        # Find removed events (in DB but not in feed)
        for event_key, existing in existing_keys.items():
            if event_key not in feed_keys:
                # Get subject name for notification
                subject_name = ''
                event_url = existing.get('url', '')
                if event_url:
                    try:
                        params = parse_qs(urlparse(event_url).query)
                        cid = params.get('cid', [''])[0]
                        if cid and cid in cid_lookup:
                            subject_name = cid_lookup[cid]
                    except:
                        pass
                
                removed_events_details.append({
                    'calendar_name': cal_name,
                    'summary': existing['summary'],
                    'start': existing.get('start', ''),
                    'subject_name': subject_name
                })
                
                await db.events.update_one(
                    {"id": existing['id']},
                    {"$set": {
                        "status": "removed",
                        "status_changed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                removed_count += 1
                logger.info(f"Event removed: {existing['summary']} from {cal_name}")
    
    # Send notification for new events with calendar name and details
    # Only include future events (not past events)
    future_new_events = [e for e in new_events_details if not is_event_past(e['start'], e.get('event_time'))]
    past_new_events = [e for e in new_events_details if is_event_past(e['start'], e.get('event_time'))]
    
    if future_new_events:
        # Group events by calendar
        cal_events = {}
        for event in future_new_events:
            cal_name = event['calendar_name']
            if cal_name not in cal_events:
                cal_events[cal_name] = []
            cal_events[cal_name].append(event)
        
        # Build notification message
        message_parts = []
        for i, (cal_name, events_list) in enumerate(cal_events.items()):
            if i > 0:
                message_parts.append("")  # Extra line break between calendars
            message_parts.append(cal_name)
            for event in events_list:
                # Clean up summary (remove newlines etc)
                clean_summary = event['summary'].replace('\\n', ' ').replace('\n', ' ').strip()
                if len(clean_summary) > 80:
                    clean_summary = clean_summary[:77] + "..."
                
                # Add subject name if available
                subject = event.get('subject_name', '')
                if subject:
                    message_parts.append(f"[{subject}] {clean_summary}")
                else:
                    message_parts.append(clean_summary)
        
        await send_webpushr_notification(
            "Nya kalenderhändelser",
            '\n'.join(message_parts),
            settings
        )
    
    # Send notification for past events (already completed)
    if past_new_events:
        for event in past_new_events:
            # Format date in Swedish
            start_date = event['start']
            event_time = event.get('event_time', '')
            
            # Parse and format the date in Swedish
            try:
                from datetime import datetime as dt
                date_obj = dt.strptime(start_date, "%Y-%m-%d")
                weekdays_sv = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
                months_sv = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                            'juli', 'augusti', 'september', 'oktober', 'november', 'december']
                weekday = weekdays_sv[date_obj.weekday()]
                day = date_obj.day
                month = months_sv[date_obj.month - 1]
                year = date_obj.year
                
                if event_time:
                    formatted_date = f"{weekday} {day} {month} {year} kl: {event_time}"
                else:
                    formatted_date = f"{weekday} {day} {month} {year}"
            except:
                formatted_date = start_date
            
            title = f"Utfört: {formatted_date}."
            
            # Build message with calendar name and subject/summary
            cal_name = event.get('calendar_name', 'Kalender')
            subject = event.get('subject_name', '')
            summary = event.get('summary', '')
            
            if subject:
                message = f"{cal_name}\n[{subject}] {summary}"
            else:
                message = f"{cal_name}\n{summary}"
            
            await send_webpushr_notification(title, message, settings)
            logger.info(f"Sent past event notification: {title} - {message}")
        
        # Mark all past events as notified to prevent duplicate notifications
        for event in past_new_events:
            await db.events.update_one(
                {"summary": event['summary'], "start": event['start']},
                {"$set": {"notified_utfort": True}}
            )
    
    # Send notification for removed events
    if removed_events_details:
        # Group events by calendar
        cal_events = {}
        for event in removed_events_details:
            cal_name = event['calendar_name']
            if cal_name not in cal_events:
                cal_events[cal_name] = []
            cal_events[cal_name].append(event)
        
        # Build notification message
        message_parts = []
        for i, (cal_name, events_list) in enumerate(cal_events.items()):
            if i > 0:
                message_parts.append("")  # Extra line break between calendars
            message_parts.append(cal_name)
            for event in events_list:
                # Clean up summary (remove newlines etc)
                clean_summary = event['summary'].replace('\\n', ' ').replace('\n', ' ').strip()
                if len(clean_summary) > 80:
                    clean_summary = clean_summary[:77] + "..."
                
                # Add subject name if available
                subject = event.get('subject_name', '')
                if subject:
                    message_parts.append(f"[{subject}] {clean_summary}")
                else:
                    message_parts.append(clean_summary)
        
        await send_webpushr_notification(
            "Borttagna kalenderhändelser",
            '\n'.join(message_parts),
            settings
        )
    
    # Clean up old removed events (older than 24 hours)
    twenty_four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    result = await db.events.delete_many({
        "status": "removed",
        "status_changed_at": {"$lt": twenty_four_hours_ago}
    })
    if result.deleted_count > 0:
        logger.info(f"Auto-deleted {result.deleted_count} removed events older than 24 hours")
    
    # Clean up old completed events (older than 1 month)
    one_month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    # Find events that have been notified as completed and are older than 1 month
    all_events = await db.events.find({"notified_utfort": True}, {"_id": 0}).to_list(10000)
    deleted_completed = 0
    for event in all_events:
        start = event.get('start', '')
        event_time = event.get('event_time')
        if is_event_past(start, event_time):
            # Check if the event start date is more than 1 month old
            try:
                if 'T' in start:
                    event_date = datetime.fromisoformat(start.replace('Z', '+00:00'))
                else:
                    event_date = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                
                if event_date < datetime.now(timezone.utc) - timedelta(days=30):
                    await db.events.delete_one({"id": event.get('id')})
                    deleted_completed += 1
            except:
                pass
    if deleted_completed > 0:
        logger.info(f"Auto-deleted {deleted_completed} completed events older than 1 month")
    
    # Auto-discover new CIDs from events and add to settings
    await update_event_mappings_from_events()
    
    # Save sync timestamp
    import time
    await db.sync_status.update_one(
        {"id": "sync_status"},
        {"$set": {"id": "sync_status", "last_sync": time.time()}},
        upsert=True
    )
    
    return SyncResult(
        success=True,
        message=f"Synkronisering klar",
        new_events=new_count,
        removed_events=removed_count
    )

async def periodic_sync():
    """Background task for periodic sync"""
    global sync_task
    
    # Run initial sync immediately at startup
    try:
        logger.info("Running initial sync at startup...")
        await sync_calendars()
        logger.info("Initial sync completed")
    except Exception as e:
        logger.error(f"Initial sync error: {e}")
    
    # Then continue with periodic syncs
    while True:
        try:
            settings = await get_settings_from_db()
            interval = (settings.sync_interval or 15) * 60 + SYNC_INTERVAL_OFFSET_SECONDS  # Convert to seconds + offset
            
            # Wait for the interval
            await asyncio.sleep(interval)
            
            # Run the sync (this also updates sync_status)
            logger.info("Running scheduled sync...")
            await sync_calendars()
            logger.info("Scheduled sync completed")
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Periodic sync error: {e}")
            await asyncio.sleep(60)

async def periodic_completion_check():
    """Background task to check for completed events and send notifications"""
    # Wait a bit before starting to let initial sync complete
    await asyncio.sleep(30)
    
    while True:
        try:
            await check_and_notify_completed_events()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Completion check error: {e}")
        
        # Check every minute
        await asyncio.sleep(60)

async def generate_weekly_summary():
    """Generate weekly summary of subject minutes per calendar"""
    settings = await get_settings_from_db()
    
    # Get current week's Monday and Friday
    now = datetime.now(SWEDISH_TZ)
    days_since_monday = now.weekday()
    monday = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    friday = monday + timedelta(days=4, hours=23, minutes=59, seconds=59)
    
    monday_str = monday.strftime("%Y-%m-%d")
    friday_str = friday.strftime("%Y-%m-%d")
    
    # Get all events for this week
    events = await db.events.find({
        "start": {"$gte": monday_str, "$lte": friday_str},
        "status": {"$ne": "removed"}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate minutes per subject per calendar
    calendar_summaries = {1: {}, 2: {}}
    
    for event in events:
        cal_index = event.get('calendar_index', 1)
        subject = event.get('subject_name', 'Okänt ämne')
        event_time = event.get('event_time', '')
        
        # Assume each event is 60 minutes if no specific duration
        # You could parse actual duration if available
        minutes = 60
        
        if subject not in calendar_summaries[cal_index]:
            calendar_summaries[cal_index][subject] = 0
        calendar_summaries[cal_index][subject] += minutes
    
    # Build notification message
    cal1_name = settings.calendar_name_1 or "Kalender 1"
    cal2_name = settings.calendar_name_2 or "Kalender 2"
    
    message_parts = [f"Vecka {now.isocalendar()[1]} ({monday_str} - {friday_str})"]
    message_parts.append("")
    
    # Calendar 1
    message_parts.append(f"📚 {cal1_name}:")
    if calendar_summaries[1]:
        for subject, mins in sorted(calendar_summaries[1].items()):
            hours = mins // 60
            remaining_mins = mins % 60
            if hours > 0:
                message_parts.append(f"  • {subject}: {hours}h {remaining_mins}min")
            else:
                message_parts.append(f"  • {subject}: {mins}min")
    else:
        message_parts.append("  Inga events")
    
    message_parts.append("")
    
    # Calendar 2
    message_parts.append(f"📚 {cal2_name}:")
    if calendar_summaries[2]:
        for subject, mins in sorted(calendar_summaries[2].items()):
            hours = mins // 60
            remaining_mins = mins % 60
            if hours > 0:
                message_parts.append(f"  • {subject}: {hours}h {remaining_mins}min")
            else:
                message_parts.append(f"  • {subject}: {mins}min")
    else:
        message_parts.append("  Inga events")
    
    title = "📊 Veckosammanfattning"
    message = "\n".join(message_parts)
    
    # Send to specific user ID
    original_test_id = settings.webpushr_test_user_id
    settings.webpushr_test_user_id = "197920509"  # Always send to this user
    
    await send_webpushr_notification(title, message, settings)
    logger.info(f"Weekly summary sent: {title}")
    
    # Restore original setting
    settings.webpushr_test_user_id = original_test_id

async def periodic_weekly_summary():
    """Background task to send weekly summary on Fridays at 16:00"""
    while True:
        try:
            now = datetime.now(SWEDISH_TZ)
            
            # Check if it's Friday at 16:00
            if now.weekday() == 4 and now.hour == 16 and now.minute == 0:
                logger.info("Running weekly summary...")
                await generate_weekly_summary()
                # Wait 61 seconds to avoid running twice in the same minute
                await asyncio.sleep(61)
            else:
                # Check every 30 seconds
                await asyncio.sleep(30)
                
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Weekly summary error: {e}")
            await asyncio.sleep(60)

# ----- API Routes -----

# Internal offset added to sync intervals to account for effect duration (~20 seconds)
SYNC_INTERVAL_OFFSET_SECONDS = 15

@api_router.get("/")
async def root():
    return {"message": "iCal Sync API"}

@api_router.get("/sync-status")
async def get_sync_status():
    """Get last sync time and next sync time"""
    status = await db.sync_status.find_one({"id": "sync_status"}, {"_id": 0})
    settings = await get_settings_from_db()
    
    if status and status.get("last_sync"):
        last_sync = status["last_sync"]
        interval_seconds = (settings.sync_interval or 15) * 60 + SYNC_INTERVAL_OFFSET_SECONDS
        next_sync = last_sync + interval_seconds
    else:
        # No sync yet, return current time
        import time
        last_sync = time.time()
        next_sync = last_sync + ((settings.sync_interval or 15) * 60) + SYNC_INTERVAL_OFFSET_SECONDS
    
    return {
        "last_sync": last_sync,
        "next_sync": next_sync,
        "interval_minutes": settings.sync_interval or 15
    }

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

@api_router.get("/events")
async def get_events():
    """Get all events with CID mappings and event types"""
    from urllib.parse import urlparse, parse_qs
    
    events = await db.events.find({}, {"_id": 0}).to_list(10000)
    settings = await get_settings_from_db()
    
    # Create lookups from combined event_mappings
    cid_lookup = {}
    event_type_lookup = {}
    for m in (settings.event_mappings or []):
        cid = m.get('cid')
        subject = m.get('subject', '')
        event_id = m.get('event_id')
        event_type = m.get('event_type', '')
        if cid and subject:
            cid_lookup[cid] = subject
        if event_id and event_type:
            event_type_lookup[event_id] = event_type
    
    logger.info(f"CID lookup table: {cid_lookup}")
    logger.info(f"Event type lookup table: {event_type_lookup}")
    
    # Filter out removed events older than 6 hours
    six_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat()
    filtered_events = []
    
    for event in events:
        if event.get('status') == 'removed':
            changed_at = event.get('status_changed_at', '')
            if changed_at and changed_at < six_hours_ago:
                continue
        
        # For custom events, keep existing subject_name and event_type
        if event.get('uid', '').startswith('custom-'):
            # Keep values from database
            filtered_events.append(event)
            continue
        
        # Add subject_name and event_type from mappings
        url = event.get('url', '')
        subject_name = ''
        event_type = ''
        if url:
            try:
                params = parse_qs(urlparse(url).query)
                cid = params.get('cid', [''])[0]
                event_id = params.get('id', [''])[0]
                if cid and cid in cid_lookup:
                    subject_name = cid_lookup[cid]
                    logger.info(f"Matched CID {cid} -> {subject_name} for event: {event.get('summary', '')[:30]}")
                if event_id and event_id in event_type_lookup:
                    event_type = event_type_lookup[event_id]
                    logger.info(f"Matched event ID {event_id} -> {event_type}")
            except Exception as e:
                logger.error(f"Error parsing URL {url}: {e}")
        event['subject_name'] = subject_name
        event['event_type'] = event_type
        filtered_events.append(event)
    
    return filtered_events

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

@api_router.post("/events/create")
async def create_custom_event(event_data: CreateEventRequest):
    """Create a custom event manually"""
    # Swedish day and month names
    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    SWEDISH_MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                      'juli', 'augusti', 'september', 'oktober', 'november', 'december']
    
    # Build description with time if provided
    description = event_data.description
    if event_data.event_time and "kl:" not in description.lower():
        # Format date for description in Swedish
        try:
            from datetime import datetime as dt
            date_obj = dt.strptime(event_data.start, "%Y-%m-%d")
            day_name = SWEDISH_DAYS[date_obj.weekday()]
            month_name = SWEDISH_MONTHS[date_obj.month - 1]
            date_str = f"{day_name} {date_obj.day} {month_name} {date_obj.year}"
            description = f"{date_str} kl: {event_data.event_time}. {description}".strip()
        except:
            description = f"kl: {event_data.event_time}. {description}".strip()
    
    new_event = CalendarEvent(
        uid=f"custom-{uuid.uuid4()}",
        calendar_index=event_data.calendar_index,
        summary=event_data.summary,
        description=description,
        location=event_data.location,
        start=event_data.start,
        end=event_data.start,  # Same as start for custom events
        event_time=event_data.event_time,
        status="normal",
        status_changed_at=datetime.now(timezone.utc).isoformat()
    )
    
    event_dict = new_event.model_dump()
    
    # Add subject_name and event_type if provided
    if event_data.subject_name:
        event_dict['subject_name'] = event_data.subject_name
    if event_data.event_type:
        event_dict['event_type'] = event_data.event_type
    
    await db.events.insert_one(event_dict)
    
    logger.info(f"Created custom event: {event_data.summary}")
    
    # Send push notification if requested
    if event_data.send_push:
        settings = await get_settings_from_db()
        if settings.webpushr_key and settings.webpushr_auth_token:
            # Format the notification message
            time_str = f" kl {event_data.event_time}" if event_data.event_time else ""
            type_str = f" ({event_data.event_type})" if event_data.event_type else ""
            subject_str = f"{event_data.subject_name}: " if event_data.subject_name else ""
            
            title = f"Nytt event: {subject_str}{event_data.summary}{type_str}"
            message = f"Datum: {event_data.start}{time_str}"
            
            await send_webpushr_notification(title, message, settings)
            logger.info(f"Push notification sent for custom event: {event_data.summary}")
    
    return {"success": True, "message": "Event skapat", "event_id": new_event.id}

@api_router.get("/event-types")
async def get_event_types():
    """Get unique event types from mappings"""
    settings = await get_settings_from_db()
    event_types = set()
    for mapping in (settings.event_mappings or []):
        if mapping.get('event_type'):
            event_types.add(mapping['event_type'])
    return {"event_types": sorted(list(event_types))}

@api_router.get("/subjects")
async def get_subjects():
    """Get unique subjects from mappings"""
    settings = await get_settings_from_db()
    subjects = set()
    for mapping in (settings.event_mappings or []):
        if mapping.get('subject'):
            subjects.add(mapping['subject'])
    return {"subjects": sorted(list(subjects))}

@api_router.post("/sync", response_model=SyncResult)
async def trigger_sync():
    """Manually trigger calendar sync"""
    return await sync_calendars()

@api_router.post("/test-push")
async def test_push_notification():
    """Send a test push notification with current events"""
    from urllib.parse import urlparse, parse_qs
    
    settings = await get_settings_from_db()
    
    if not settings.webpushr_key or not settings.webpushr_auth_token:
        return {"success": False, "message": "Webpushr API-nycklar saknas"}
    
    # Create CID to subject lookup from event_mappings
    cid_lookup = {m.get('cid'): m.get('subject', '') for m in (settings.event_mappings or []) if m.get('cid') and m.get('subject')}
    
    # Get current new events from database
    events = await db.events.find({"status": "new"}, {"_id": 0}).to_list(10000)
    
    if not events:
        # If no new events, send a simple test
        success = await send_webpushr_notification(
            "Test från Vklass Sync",
            "Detta är en testnotifikation! Push-notifikationer fungerar.",
            settings
        )
    else:
        # Group events by calendar
        cal_events = {}
        for event in events:
            cal_index = event.get('calendar_index', 1)
            cal_name = settings.calendar_name_1 if cal_index == 1 else settings.calendar_name_2
            if cal_name not in cal_events:
                cal_events[cal_name] = []
            
            # Get subject name from CID
            subject_name = ''
            url = event.get('url', '')
            if url:
                try:
                    params = parse_qs(urlparse(url).query)
                    cid = params.get('cid', [''])[0]
                    if cid and cid in cid_lookup:
                        subject_name = cid_lookup[cid]
                except:
                    pass
            
            cal_events[cal_name].append({
                'summary': event['summary'],
                'subject_name': subject_name
            })
        
        # Build notification message
        message_parts = []
        for cal_name, events_list in cal_events.items():
            message_parts.append(cal_name)
            for event in events_list:
                clean_summary = event['summary'].replace('\\n', ' ').replace('\n', ' ').strip()
                if len(clean_summary) > 80:
                    clean_summary = clean_summary[:77] + "..."
                
                subject = event.get('subject_name', '')
                if subject:
                    message_parts.append(f"[{subject}] {clean_summary}")
                else:
                    message_parts.append(clean_summary)
        
        success = await send_webpushr_notification(
            "Nya kalenderhändelser",
            '\n'.join(message_parts),
            settings
        )
    
    if success:
        return {"success": True, "message": "Notifikation skickad"}
    else:
        return {"success": False, "message": "Kunde inte skicka notifikation. Kontrollera API-nycklar."}

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@api_router.post("/test-notification")
async def send_test_notification(notification_type: str = "utfort"):
    """Send a test notification"""
    settings = await get_settings_from_db()
    
    if notification_type == "utfort":
        # Test "Utfört" notification for Anton
        title = "Utfört: Matematik - Prov ✓"
        message = f"Bra jobbat {settings.calendar_name_1 or 'Anton'}!"
    elif notification_type == "past":
        # Test notification for past event from iCal
        title = "Utfört: Måndag 2 mars 2026 kl: 10:00."
        message = f"{settings.calendar_name_1 or 'Anton'}\n[Engelska] Test \"Animals\""
    elif notification_type == "weekly":
        # Test weekly summary
        await generate_weekly_summary()
        return {"success": True, "message": "Veckosammanfattning skickad"}
    else:
        title = "Test Notifikation"
        message = "Detta är en testnotis"
    
    success = await send_webpushr_notification(title, message, settings)
    
    if success:
        return {"success": True, "message": f"Testnotis skickad: {title}"}
    else:
        return {"success": False, "message": "Kunde inte skicka notifikation"}

@api_router.post("/migrate/fix-past-new-events")
async def fix_past_new_events():
    """Fix past events that still have status 'new' - change them to 'normal' and mark as notified"""
    events = await db.events.find({"status": "new"}, {"_id": 0}).to_list(10000)
    fixed_count = 0
    
    for event in events:
        start = event.get('start', '')
        event_time = event.get('event_time')
        
        if is_event_past(start, event_time):
            await db.events.update_one(
                {"id": event.get('id')},
                {"$set": {"status": "normal", "notified_utfort": True}}
            )
            fixed_count += 1
            logger.info(f"Fixed past event: {event.get('summary')}")
    
    return {"success": True, "message": f"Fixade {fixed_count} gamla events", "fixed_count": fixed_count}

@api_router.get("/debug/cid-status")
async def debug_cid_status():
    """Debug endpoint to check event mapping status"""
    from urllib.parse import urlparse, parse_qs
    
    settings = await get_settings_from_db()
    events = await db.events.find({}, {"_id": 0, "summary": 1, "url": 1}).to_list(10000)
    
    # Get all CIDs and event IDs from events
    events_info = []
    for event in events:
        url = event.get('url', '')
        if url:
            try:
                params = parse_qs(urlparse(url).query)
                cid = params.get('cid', [''])[0]
                event_id = params.get('id', [''])[0]
                events_info.append({
                    "summary": event.get('summary', '')[:40],
                    "cid": cid,
                    "event_id": event_id
                })
            except:
                pass
    
    return {
        "event_mappings_in_settings": settings.event_mappings or [],
        "events_info": events_info,
        "events_with_url_count": len([e for e in events if e.get('url')]),
        "total_events": len(events)
    }

@api_router.post("/migrate/update-event-urls")
async def migrate_update_event_urls():
    """One-time migration: Update existing events with URLs from iCal feeds"""
    settings = await get_settings_from_db()
    updated_count = 0
    
    for cal_index in [1, 2]:
        url = settings.ical_url_1 if cal_index == 1 else settings.ical_url_2
        if not url:
            continue
        
        # Parse events from feed
        feed_events = await parse_ical_feed(url)
        
        for feed_event in feed_events:
            if not feed_event.get('url'):
                continue
            
            # Find matching event in database by summary and start
            result = await db.events.update_many(
                {
                    "calendar_index": cal_index,
                    "summary": feed_event['summary'],
                    "start": feed_event['start'],
                    "$or": [{"url": ""}, {"url": {"$exists": False}}]
                },
                {"$set": {"url": feed_event['url']}}
            )
            updated_count += result.modified_count
    
    # After updating URLs, discover new CIDs
    await update_event_mappings_from_events()
    
    return {
        "success": True,
        "message": f"Uppdaterade {updated_count} events med URL:er",
        "updated_count": updated_count
    }

@api_router.post("/migrate/extract-event-times")
async def migrate_extract_event_times():
    """Extract event_time from description for all existing events"""
    import re
    
    events = await db.events.find({}).to_list(1000)
    updated_count = 0
    
    for event in events:
        description = event.get('description', '')
        if description and not event.get('event_time'):
            match = re.search(r'kl:?\s*(\d{1,2}):(\d{2})', description, re.IGNORECASE)
            if match:
                hours = int(match.group(1))
                minutes = int(match.group(2))
                event_time = f"{hours:02d}:{minutes:02d}"
                
                await db.events.update_one(
                    {"_id": event["_id"]},
                    {"$set": {"event_time": event_time}}
                )
                updated_count += 1
    
    return {
        "success": True,
        "message": f"Extraherade event_time för {updated_count} events",
        "updated_count": updated_count
    }

@api_router.post("/migrate/fix-swedish-dates")
async def migrate_fix_swedish_dates():
    """Convert English dates to Swedish in event descriptions"""
    import re
    
    ENGLISH_TO_SWEDISH_DAYS = {
        'Monday': 'Måndag', 'Tuesday': 'Tisdag', 'Wednesday': 'Onsdag',
        'Thursday': 'Torsdag', 'Friday': 'Fredag', 'Saturday': 'Lördag', 'Sunday': 'Söndag'
    }
    ENGLISH_TO_SWEDISH_MONTHS = {
        'january': 'januari', 'february': 'februari', 'march': 'mars',
        'april': 'april', 'may': 'maj', 'june': 'juni',
        'july': 'juli', 'august': 'augusti', 'september': 'september',
        'october': 'oktober', 'november': 'november', 'december': 'december'
    }
    
    events = await db.events.find({}).to_list(1000)
    updated_count = 0
    
    for event in events:
        description = event.get('description', '')
        new_description = description
        
        # Replace English day names
        for eng, swe in ENGLISH_TO_SWEDISH_DAYS.items():
            new_description = re.sub(eng, swe, new_description, flags=re.IGNORECASE)
        
        # Replace English month names
        for eng, swe in ENGLISH_TO_SWEDISH_MONTHS.items():
            new_description = re.sub(eng, swe, new_description, flags=re.IGNORECASE)
        
        if new_description != description:
            await db.events.update_one(
                {"_id": event["_id"]},
                {"$set": {"description": new_description}}
            )
            updated_count += 1
    
    return {
        "success": True,
        "message": f"Konverterade {updated_count} events till svenska datum",
        "updated_count": updated_count
    }

@api_router.get("/events/custom")
async def get_custom_events():
    """Get all custom (manually created) events that are not removed"""
    events = await db.events.find(
        {
            "uid": {"$regex": "^custom-"},
            "status": {"$ne": "removed"}
        },
        {"_id": 0}
    ).to_list(1000)
    return {"events": events}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete a specific event"""
    result = await db.events.delete_one({"id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"success": True, "message": "Event raderat"}

@api_router.delete("/events/removed")
async def delete_removed_events():
    """Delete all events with status 'removed' from database"""
    result = await db.events.delete_many({"status": "removed"})
    
    return {
        "success": True,
        "message": f"Raderade {result.deleted_count} borttagna events",
        "deleted_count": result.deleted_count
    }

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
    global sync_task, completion_check_task, weekly_summary_task
    # Start periodic sync task (will run initial sync immediately)
    sync_task = asyncio.create_task(periodic_sync())
    logger.info("Periodic sync task started")
    # Start completion check task
    completion_check_task = asyncio.create_task(periodic_completion_check())
    logger.info("Completion check task started")
    # Start weekly summary task
    weekly_summary_task = asyncio.create_task(periodic_weekly_summary())
    logger.info("Weekly summary task started")

@app.on_event("shutdown")
async def shutdown_db_client():
    global sync_task, completion_check_task, weekly_summary_task
    if sync_task:
        sync_task.cancel()
        try:
            await sync_task
        except asyncio.CancelledError:
            pass
    if completion_check_task:
        completion_check_task.cancel()
        try:
            await completion_check_task
        except asyncio.CancelledError:
            pass
    if weekly_summary_task:
        weekly_summary_task.cancel()
        try:
            await weekly_summary_task
        except asyncio.CancelledError:
            pass
    client.close()
