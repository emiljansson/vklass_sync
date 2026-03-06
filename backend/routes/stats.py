"""Stats routes"""
from fastapi import APIRouter
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
from config import db, logger, SWEDISH_TZ
from services.settings_service import get_settings_from_db
from services.ical_service import parse_ical_for_stats

router = APIRouter(tags=["stats"])

SWEDISH_DAYS = ['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag', 'Söndag']
SWEDISH_MONTHS = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 
                  'juli', 'augusti', 'september', 'oktober', 'november', 'december']


def format_minutes(minutes: int) -> str:
    """Format minutes as hours and minutes"""
    if minutes < 60:
        return f"{minutes}min"
    hours = minutes // 60
    mins = minutes % 60
    if mins > 0:
        return f"{hours}h {mins}min"
    return f"{hours}h"


def format_swedish_date(dt: datetime) -> str:
    """Format datetime to Swedish date string"""
    day_name = SWEDISH_DAYS[dt.weekday()]
    day = dt.day
    month = SWEDISH_MONTHS[dt.month - 1]
    year = dt.year
    return f"{day_name} {day} {month} {year}"


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
    
    # Create CID to subject lookup and event_id to event_type lookup
    cid_lookup = {m.get('cid'): m.get('subject', '') for m in (settings.event_mappings or []) if m.get('cid') and m.get('subject')}
    event_type_lookup = {m.get('event_id'): m.get('event_type', '') for m in (settings.event_mappings or []) if m.get('event_id') and m.get('event_type')}
    
    # Fetch scheduled activities from both calendars
    calendar_summaries = {1: {}, 2: {}}
    calendar_daily = {1: {}, 2: {}}  # Daily school time per calendar (first start to last end)
    calendar_events_raw = {1: [], 2: []}  # Raw events for the list
    
    for cal_index in [1, 2]:
        url = settings.ical_url_1 if cal_index == 1 else settings.ical_url_2
        if not url:
            continue
        
        events = await parse_ical_for_stats(url, monday, sunday)
        
        # Group events by date for school time calculation
        daily_events = {}
        
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
            
            # Subject summary
            if subject not in calendar_summaries[cal_index]:
                calendar_summaries[cal_index][subject] = 0
            calendar_summaries[cal_index][subject] += duration
            
            # Group events by date for school time calculation
            event_start = event.get('start')
            event_end = event.get('end')
            if event_start and event_end:
                day_key = event_start.strftime("%Y-%m-%d")
                if day_key not in daily_events:
                    daily_events[day_key] = []
                daily_events[day_key].append({
                    'start': event_start,
                    'end': event_end
                })
        
        # Calculate school time per day (from first lesson start to last lesson end)
        for day_key, day_event_list in daily_events.items():
            if not day_event_list:
                continue
            
            # Find earliest start and latest end
            first_start = min(e['start'] for e in day_event_list)
            last_end = max(e['end'] for e in day_event_list)
            
            # Calculate school time in minutes
            school_time_minutes = int((last_end - first_start).total_seconds() / 60)
            day_name = SWEDISH_DAYS[first_start.weekday()]
            
            calendar_daily[cal_index][day_key] = {
                "name": day_name, 
                "minutes": school_time_minutes,
                "first_start": first_start.strftime("%H:%M"),
                "last_end": last_end.strftime("%H:%M")
            }
    
    # Fetch task events from database for this week
    db_events = await db.events.find({
        "start": {"$gte": monday_str, "$lte": sunday_str},
        "status": {"$ne": "removed"}
    }, {"_id": 0}).to_list(10000)
    
    # Format events for the list
    for event in db_events:
        cal_index = event.get('calendar_index', 1)
        start_date = event.get('start', '')
        event_time = event.get('event_time', '')
        
        # Format the date nicely
        try:
            if 'T' in start_date:
                dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            else:
                dt = datetime.strptime(start_date, "%Y-%m-%d")
            formatted_date = format_swedish_date(dt)
            if event_time:
                formatted_date += f" kl: {event_time}"
        except:
            formatted_date = start_date
        
        # Get subject name and event_type from mappings
        subject_name = event.get('subject_name', '')
        event_type = event.get('event_type', '')
        url = event.get('url', '')
        if url:
            try:
                params = parse_qs(urlparse(url).query)
                cid = params.get('cid', [''])[0]
                event_id = params.get('id', [''])[0]
                if cid and cid in cid_lookup and not subject_name:
                    subject_name = cid_lookup[cid]
                if event_id and event_id in event_type_lookup and not event_type:
                    event_type = event_type_lookup[event_id]
            except:
                pass
        
        calendar_events_raw[cal_index].append({
            "summary": event.get('summary', ''),
            "date": formatted_date,
            "start_raw": start_date,
            "event_time": event_time,
            "subject_name": subject_name,
            "event_type": event_type,
            "status": event.get('status', 'normal')
        })
    
    # Sort events by date
    for cal_index in [1, 2]:
        calendar_events_raw[cal_index].sort(key=lambda x: (x.get('start_raw', ''), x.get('event_time', '')))
    
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
    
    # Format daily data sorted by date
    def format_daily(daily_dict):
        sorted_days = sorted(daily_dict.items())
        return [{
            "date": k, 
            "name": v["name"], 
            "minutes": v["minutes"],
            "first_start": v.get("first_start", ""),
            "last_end": v.get("last_end", "")
        } for k, v in sorted_days]
    
    # Calculate total school time (sum of daily school time)
    def calc_school_time(daily_dict):
        return sum(v["minutes"] for v in daily_dict.values())
    
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
                "total_minutes": sum(calendar_summaries[1].values()),
                "school_time_minutes": calc_school_time(calendar_daily[1]),
                "daily": format_daily(calendar_daily[1]),
                "events": calendar_events_raw[1]
            },
            "calendar_2": {
                "name": settings.calendar_name_2 or "Kalender 2",
                "subjects": [
                    {"name": subject, "minutes": mins}
                    for subject, mins in sorted(calendar_summaries[2].items())
                ],
                "total_minutes": sum(calendar_summaries[2].values()),
                "school_time_minutes": calc_school_time(calendar_daily[2]),
                "daily": format_daily(calendar_daily[2]),
                "events": calendar_events_raw[2]
            }
        }
    }


@router.post("/test-notification")
async def send_test_notification(notification_type: str = "utfort"):
    """Send a test notification"""
    from services.sync_service import generate_weekly_summary
    from services.notification_service import send_webpushr_notification
    
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
