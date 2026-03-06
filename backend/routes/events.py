"""Events routes"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs
import uuid
from config import db, logger
from models.events import CalendarEvent, CreateEventRequest
from services.settings_service import get_settings_from_db
from services.notification_service import send_webpushr_notification

router = APIRouter(tags=["events"])


@router.get("/events")
async def get_events():
    """Get all events with CID mappings and event types"""
    from datetime import timedelta
    
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
                if event_id and event_id in event_type_lookup:
                    event_type = event_type_lookup[event_id]
            except Exception as e:
                logger.error(f"Error parsing URL {url}: {e}")
        event['subject_name'] = subject_name
        event['event_type'] = event_type
        filtered_events.append(event)
    
    return filtered_events


@router.post("/events/{event_id}/confirm")
async def confirm_event(event_id: str):
    """Confirm a new event (change status from 'new' to 'normal')"""
    result = await db.events.update_one(
        {"id": event_id, "status": "new"},
        {"$set": {"status": "normal", "status_changed_at": None}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event not found or already confirmed")
    
    return {"success": True, "message": "Händelse bekräftad"}


@router.post("/events/create")
async def create_custom_event(event_data: CreateEventRequest):
    """Create a custom event manually"""
    SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
    SWEDISH_MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                      'juli', 'augusti', 'september', 'oktober', 'november', 'december']
    
    # Build description with time if provided
    description = event_data.description
    if event_data.event_time and "kl:" not in description.lower():
        try:
            date_obj = datetime.strptime(event_data.start, "%Y-%m-%d")
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
        end=event_data.start,
        event_time=event_data.event_time,
        status="normal",
        status_changed_at=datetime.now(timezone.utc).isoformat()
    )
    
    event_dict = new_event.model_dump()
    
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
            time_str = f" kl {event_data.event_time}" if event_data.event_time else ""
            type_str = f" ({event_data.event_type})" if event_data.event_type else ""
            subject_str = f"{event_data.subject_name}: " if event_data.subject_name else ""
            
            title = f"Nytt event: {subject_str}{event_data.summary}{type_str}"
            message = f"Datum: {event_data.start}{time_str}"
            
            await send_webpushr_notification(title, message, settings)
            logger.info(f"Push notification sent for custom event: {event_data.summary}")
    
    return {"success": True, "message": "Event skapat", "event_id": new_event.id}


@router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    """Delete a custom event"""
    result = await db.events.delete_one({"id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"success": True, "message": "Event raderat"}


@router.get("/events/custom")
async def get_custom_events():
    """Get all custom events"""
    events = await db.events.find(
        {"uid": {"$regex": "^custom-"}},
        {"_id": 0}
    ).to_list(10000)
    return {"events": events}


@router.delete("/events/removed")
async def delete_removed_events():
    """Delete all removed events"""
    result = await db.events.delete_many({"status": "removed"})
    return {"success": True, "message": f"Raderade {result.deleted_count} borttagna events"}


@router.get("/event-types")
async def get_event_types():
    """Get unique event types from mappings"""
    settings = await get_settings_from_db()
    event_types = set()
    for mapping in (settings.event_mappings or []):
        if mapping.get('event_type'):
            event_types.add(mapping['event_type'])
    return {"event_types": sorted(list(event_types))}


@router.get("/subjects")
async def get_subjects():
    """Get unique subjects from mappings"""
    settings = await get_settings_from_db()
    subjects = set()
    for mapping in (settings.event_mappings or []):
        if mapping.get('subject'):
            subjects.add(mapping['subject'])
    return {"subjects": sorted(list(subjects))}
