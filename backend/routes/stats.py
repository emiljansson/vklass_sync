"""Stats routes"""
from fastapi import APIRouter
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
from config import logger, SWEDISH_TZ
from services.settings_service import get_settings_from_db
from services.ical_service import parse_ical_for_stats
from services.notification_service import send_webpushr_notification

router = APIRouter(tags=["stats"])


def format_minutes(minutes: int) -> str:
    """Format minutes as hours and minutes"""
    if minutes < 60:
        return f"{minutes}min"
    hours = minutes // 60
    mins = minutes % 60
    if mins > 0:
        return f"{hours}h {mins}min"
    return f"{hours}h"


@router.get("/stats/weekly")
async def get_weekly_stats(week_offset: int = 0):
    """Get weekly statistics for the stats page"""
    settings = await get_settings_from_db()
    
    # Get the target week's Monday and Sunday
    now = datetime.now(SWEDISH_TZ)
    days_since_monday = now.weekday()
    current_monday = (now - timedelta(days=days_since_monday)).replace(hour=0, minute=0, second=0, microsecond=0)
    
    monday = current_monday + timedelta(weeks=week_offset)
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    
    monday_str = monday.strftime("%Y-%m-%d")
    sunday_str = sunday.strftime("%Y-%m-%d")
    
    # Create CID to subject lookup
    cid_lookup = {m.get('cid'): m.get('subject', '') for m in (settings.event_mappings or []) if m.get('cid') and m.get('subject')}
    
    # Fetch scheduled activities from both calendars
    calendar_summaries = {1: {}, 2: {}}
    
    for cal_index in [1, 2]:
        url = settings.ical_url_1 if cal_index == 1 else settings.ical_url_2
        if not url:
            continue
        
        events = await parse_ical_for_stats(url, monday, sunday)
        
        for event in events:
            subject = None
            
            # Try to get subject from CID in URL
            event_url = event.get('url', '')
            if event_url:
                try:
                    params = parse_qs(urlparse(event_url).query)
                    cid = params.get('cid', [''])[0]
                    if cid and cid in cid_lookup:
                        subject = cid_lookup[cid]
                except:
                    pass
            
            # Use summary as subject if no CID match
            if not subject:
                summary = event.get('summary', '').strip()
                if '(' in summary:
                    subject = summary.split('(')[0].strip()
                elif '\n' in summary:
                    subject = summary.split('\n')[0].strip()
                else:
                    subject = summary
            
            if not subject:
                subject = 'Okänt ämne'
            
            duration = event.get('duration_minutes', 0)
            
            if subject not in calendar_summaries[cal_index]:
                calendar_summaries[cal_index][subject] = 0
            calendar_summaries[cal_index][subject] += duration
    
    # Check if there's data for next week
    next_monday = monday + timedelta(weeks=1)
    next_sunday = next_monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    has_next_week = False
    
    for cal_index in [1, 2]:
        url = settings.ical_url_1 if cal_index == 1 else settings.ical_url_2
        if url:
            next_week_events = await parse_ical_for_stats(url, next_monday, next_sunday)
            if next_week_events:
                has_next_week = True
                break
    
    return {
        "week_number": monday.isocalendar()[1],
        "year": monday.year,
        "week_offset": week_offset,
        "has_next_week": has_next_week,
        "period": {
            "start": monday_str,
            "end": sunday_str
        },
        "calendars": {
            "calendar_1": {
                "name": settings.calendar_name_1 or "Kalender 1",
                "subjects": [
                    {"name": subject, "minutes": mins}
                    for subject, mins in sorted(calendar_summaries[1].items())
                ],
                "total_minutes": sum(calendar_summaries[1].values())
            },
            "calendar_2": {
                "name": settings.calendar_name_2 or "Kalender 2",
                "subjects": [
                    {"name": subject, "minutes": mins}
                    for subject, mins in sorted(calendar_summaries[2].items())
                ],
                "total_minutes": sum(calendar_summaries[2].values())
            }
        }
    }


@router.post("/test-notification")
async def send_test_notification(notification_type: str = "utfort"):
    """Send a test notification"""
    from services.sync_service import generate_weekly_summary
    
    settings = await get_settings_from_db()
    
    if notification_type == "utfort":
        title = "Utfört: Matematik - Prov ✓"
        message = f"Bra jobbat {settings.calendar_name_1 or 'Anton'}!"
    elif notification_type == "past":
        title = "Utfört: Måndag 2 mars 2026 kl: 10:00."
        message = f"{settings.calendar_name_1 or 'Anton'}\n[Engelska] Test \"Animals\""
    elif notification_type == "weekly":
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
