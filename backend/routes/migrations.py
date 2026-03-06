"""Migration routes"""
import re
from fastapi import APIRouter
from datetime import datetime, timezone
from config import db, logger, SWEDISH_TZ
from services.settings_service import get_settings_from_db
from services.event_service import is_event_past

router = APIRouter(tags=["migrations"])


@router.post("/migrate/fix-past-new-events")
async def fix_past_new_events():
    """Fix past events that are stuck with 'new' status"""
    events = await db.events.find({"status": "new"}, {"_id": 0}).to_list(10000)
    
    fixed_count = 0
    for event in events:
        start = event.get('start', '')
        event_time = event.get('event_time')
        
        if is_event_past(start, event_time):
            await db.events.update_one(
                {"id": event.get('id')},
                {"$set": {"status": "normal"}}
            )
            fixed_count += 1
            logger.info(f"Fixed past event: {event.get('summary', '')}")
    
    return {"success": True, "message": f"Fixade {fixed_count} event(s)"}


@router.post("/migrate/fix-swedish-dates")
async def fix_swedish_dates():
    """Convert ISO dates to Swedish format in descriptions"""
    events = await db.events.find({}, {"_id": 0}).to_list(10000)
    
    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    SWEDISH_MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                      'juli', 'augusti', 'september', 'oktober', 'november', 'december']
    
    updated = 0
    for event in events:
        description = event.get('description', '')
        # Check if description has ISO date pattern
        if re.match(r'^\d{4}-\d{2}-\d{2}', description):
            try:
                parts = description.split(' kl:')
                date_str = parts[0].strip()
                rest = parts[1] if len(parts) > 1 else ''
                
                date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                day_name = SWEDISH_DAYS[date_obj.weekday()]
                month_name = SWEDISH_MONTHS[date_obj.month - 1]
                swedish_date = f"{day_name} {date_obj.day} {month_name} {date_obj.year}"
                
                new_description = f"{swedish_date} kl:{rest}" if rest else swedish_date
                
                await db.events.update_one(
                    {"id": event.get('id')},
                    {"$set": {"description": new_description}}
                )
                updated += 1
            except:
                pass
    
    return {"success": True, "message": f"Konverterade {updated} datum"}


@router.post("/migrate/extract-event-times")
async def extract_event_times():
    """Extract event times from descriptions"""
    events = await db.events.find({}, {"_id": 0}).to_list(10000)
    
    updated = 0
    for event in events:
        if event.get('event_time'):
            continue
        
        description = event.get('description', '')
        match = re.search(r'kl:?\s*(\d{1,2}):(\d{2})', description, re.IGNORECASE)
        
        if match:
            hours = int(match.group(1))
            minutes = int(match.group(2))
            event_time = f"{hours:02d}:{minutes:02d}"
            
            await db.events.update_one(
                {"id": event.get('id')},
                {"$set": {"event_time": event_time}}
            )
            updated += 1
    
    return {"success": True, "message": f"Extraherade {updated} tider"}


@router.get("/debug/cid-status")
async def get_cid_status():
    """Get CID status for debugging"""
    settings = await get_settings_from_db()
    events = await db.events.find({}, {"_id": 0, "url": 1, "summary": 1}).to_list(100)
    
    return {
        "event_mappings_in_settings": settings.event_mappings or [],
        "sample_events_with_urls": [e for e in events if e.get('url')][:10]
    }
