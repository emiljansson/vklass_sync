"""Event utility service"""
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlparse, parse_qs
from config import db, logger, SWEDISH_TZ
from services.settings_service import get_settings_from_db


def is_event_past(start_date: str, event_time: Optional[str]) -> bool:
    """Check if an event has passed (40 minutes after start time, or day after for all-day events)
    Uses Swedish timezone for all comparisons since events are in Swedish time."""
    if not start_date:
        return False
    try:
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
            event_date = datetime.strptime(start_date, "%Y-%m-%d")
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


async def update_event_mappings_from_events():
    """Auto-discover events from URLs and add to settings if not present"""
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
                if cid and event_id:
                    event_id_to_cid[event_id] = cid
            except:
                pass
    
    # Update mappings missing CIDs
    for mapping in current_mappings:
        event_id = mapping.get('event_id', '')
        if event_id and not mapping.get('cid') and event_id in event_id_to_cid:
            mapping['cid'] = event_id_to_cid[event_id]
            # Also try to inherit subject
            cid = mapping['cid']
            if cid in cid_to_subject and not mapping.get('subject'):
                mapping['subject'] = cid_to_subject[cid]
                logger.info(f"Mapping {event_id} inherited subject '{cid_to_subject[cid]}' from CID {cid}")
            updated = True
    
    if updated:
        await db.settings.update_one(
            {"id": "app_settings"},
            {"$set": {"event_mappings": current_mappings}}
        )
        logger.info("Updated CIDs for existing event mappings")
