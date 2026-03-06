"""Sync routes"""
import time
from fastapi import APIRouter
from urllib.parse import urlparse, parse_qs
from config import db, logger
from models.sync import SyncResult
from services.settings_service import get_settings_from_db
from services.sync_service import sync_calendars
from services.notification_service import send_webpushr_notification

router = APIRouter(tags=["sync"])


@router.post("/sync", response_model=SyncResult)
async def trigger_sync():
    """Manually trigger calendar sync"""
    return await sync_calendars()


@router.get("/sync-status")
async def get_sync_status():
    """Get current sync status and time until next sync"""
    settings = await get_settings_from_db()
    status = await db.sync_status.find_one({"id": "sync_status"}, {"_id": 0})
    
    if status and status.get('last_sync'):
        last_sync = status['last_sync']
        interval_seconds = settings.safe_sync_interval * 60
        next_sync = last_sync + interval_seconds
        time_until = max(0, int(next_sync - time.time()))
        
        return {
            "last_sync": last_sync,
            "next_sync": next_sync,
            "time_until_sync": time_until,
            "sync_interval_minutes": settings.safe_sync_interval
        }
    
    return {
        "last_sync": None,
        "next_sync": None,
        "time_until_sync": 0,
        "sync_interval_minutes": settings.safe_sync_interval
    }


@router.post("/test-push")
async def test_push_notification():
    """Send a test push notification with current events"""
    settings = await get_settings_from_db()
    
    if not settings.webpushr_key or not settings.webpushr_auth_token:
        return {"success": False, "message": "Webpushr API-nycklar saknas"}
    
    # Create CID to subject lookup
    cid_lookup = {m.get('cid'): m.get('subject', '') for m in (settings.event_mappings or []) if m.get('cid') and m.get('subject')}
    
    # Get current new events
    events = await db.events.find({"status": "new"}, {"_id": 0}).to_list(10000)
    
    if not events:
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
        return {"success": False, "message": "Kunde inte skicka notifikation"}


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@router.post("/test-stats-notification")
async def test_stats_notification(week_offset: int = 0):
    """Send weekly stats notification to specific user
    
    Args:
        week_offset: Week offset (0 = current week, 1 = next week, -1 = last week)
    """
    from services.sync_service import generate_weekly_summary
    await generate_weekly_summary(week_offset=week_offset)
    return {"success": True, "message": f"Stats-notifikation skickad till 197920509 (vecka offset: {week_offset})"}
