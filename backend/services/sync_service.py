"""Sync service for calendar synchronization"""
import hashlib
from datetime import datetime, timezone, timedelta
from urllib.parse import urlparse, parse_qs
from config import db, logger
from models.events import CalendarEvent
from models.sync import SyncResult
from services.settings_service import get_settings_from_db
from services.ical_service import parse_ical_feed
from services.notification_service import send_webpushr_notification
from services.event_service import is_event_past, update_event_mappings_from_events


def generate_event_key(summary: str, start: str, calendar_index: int) -> str:
    """Generate stable unique key for event identification based on content, not UID"""
    key_string = f"{summary.strip().lower()}-{start}-{calendar_index}"
    return hashlib.md5(key_string.encode()).hexdigest()


async def sync_calendars() -> SyncResult:
    """Sync calendars and detect changes"""
    settings = await get_settings_from_db()
    
    # Create CID to subject lookup for notifications from event_mappings
    cid_lookup = {m.get('cid'): m.get('subject', '') for m in (settings.event_mappings or []) if m.get('cid') and m.get('subject')}
    
    new_count = 0
    removed_count = 0
    new_events_details = []
    removed_events_details = []
    
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
                    uid=event_key,
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
    
    # Send notification for new events (only future events)
    future_new_events = [e for e in new_events_details if not is_event_past(e['start'], e.get('event_time'))]
    past_new_events = [e for e in new_events_details if is_event_past(e['start'], e.get('event_time'))]
    
    if future_new_events:
        cal_events = {}
        for event in future_new_events:
            cal_name = event['calendar_name']
            if cal_name not in cal_events:
                cal_events[cal_name] = []
            cal_events[cal_name].append(event)
        
        message_parts = []
        for i, (cal_name, events_list) in enumerate(cal_events.items()):
            if i > 0:
                message_parts.append("")
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
        
        await send_webpushr_notification(
            "Nya kalenderhändelser",
            '\n'.join(message_parts),
            settings
        )
    
    # Send notification for past events (already completed)
    if past_new_events:
        for event in past_new_events:
            start_date = event['start']
            event_time = event.get('event_time', '')
            
            try:
                date_obj = datetime.strptime(start_date, "%Y-%m-%d")
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
            
            cal_name = event.get('calendar_name', 'Kalender')
            subject = event.get('subject_name', '')
            summary = event.get('summary', '')
            
            if subject:
                message = f"{cal_name}\n[{subject}] {summary}"
            else:
                message = f"{cal_name}\n{summary}"
            
            await send_webpushr_notification(title, message, settings)
            logger.info(f"Sent past event notification: {title} - {message}")
        
        # Mark all past events as notified
        for event in past_new_events:
            await db.events.update_one(
                {"summary": event['summary'], "start": event['start']},
                {"$set": {"notified_utfort": True}}
            )
    
    # Send notification for removed events
    if removed_events_details:
        cal_events = {}
        for event in removed_events_details:
            cal_name = event['calendar_name']
            if cal_name not in cal_events:
                cal_events[cal_name] = []
            cal_events[cal_name].append(event)
        
        message_parts = []
        for i, (cal_name, events_list) in enumerate(cal_events.items()):
            if i > 0:
                message_parts.append("")
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
    all_events = await db.events.find({"notified_utfort": True}, {"_id": 0}).to_list(10000)
    deleted_completed = 0
    for event in all_events:
        start = event.get('start', '')
        event_time = event.get('event_time')
        if is_event_past(start, event_time):
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
    
    # Auto-discover new CIDs from events
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


from config import SWEDISH_TZ

async def generate_weekly_summary():
    """Send a simple push notification linking to the stats page"""
    settings = await get_settings_from_db()
    
    now = datetime.now(SWEDISH_TZ)
    days_since_monday = now.weekday()
    monday = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    sunday = monday + timedelta(days=6)
    
    monday_str = monday.strftime("%Y-%m-%d")
    sunday_str = sunday.strftime("%Y-%m-%d")
    
    title = "Veckans statistik"
    message = f"Datum: {monday_str} - {sunday_str}"
    
    # Send to specific user ID with link to stats page
    original_test_id = settings.webpushr_test_user_id
    settings.webpushr_test_user_id = "197920509"
    
    await send_webpushr_notification(title, message, settings, target_path="/stats")
    logger.info(f"Weekly summary notification sent: {title}")
    
    settings.webpushr_test_user_id = original_test_id

