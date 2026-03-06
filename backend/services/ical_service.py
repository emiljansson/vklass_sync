"""iCal parsing service"""
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from icalendar import Calendar
from config import db, logger, SWEDISH_TZ
import re


def extract_time_from_description(description: str) -> Optional[str]:
    """Extract time from description like 'kl: 09:25' or 'kl 09:25'"""
    if not description:
        return None
    match = re.search(r'kl:?\s*(\d{1,2}):(\d{2})', description, re.IGNORECASE)
    if match:
        hours = int(match.group(1))
        minutes = int(match.group(2))
        return f"{hours:02d}:{minutes:02d}"
    return None


async def parse_ical_feed(url: str) -> List[Dict[str, Any]]:
    """Fetch and parse iCal feed - filters OUT events with both start and end time"""
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


async def parse_ical_for_stats(url: str, week_start: datetime, week_end: datetime) -> List[Dict[str, Any]]:
    """Fetch and parse iCal feed for stats - ONLY events with both start AND end time (scheduled activities)"""
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
                summary = str(component.get('summary', 'Ingen titel'))
                description = str(component.get('description', ''))
                
                dtstart = component.get('dtstart')
                dtend = component.get('dtend')
                
                start_dt = dtstart.dt if dtstart else None
                end_dt = dtend.dt if dtend else None
                
                # For stats, we ONLY want events with both start AND end TIME
                has_start_time = start_dt and hasattr(start_dt, 'hour')
                has_end_time = end_dt and hasattr(end_dt, 'hour')
                
                if not (has_start_time and has_end_time):
                    # Skip events without duration (all-day tasks)
                    continue
                
                # Convert to Swedish timezone for comparison
                if hasattr(start_dt, 'tzinfo') and start_dt.tzinfo:
                    start_dt = start_dt.astimezone(SWEDISH_TZ)
                else:
                    start_dt = SWEDISH_TZ.localize(start_dt)
                    
                if hasattr(end_dt, 'tzinfo') and end_dt.tzinfo:
                    end_dt = end_dt.astimezone(SWEDISH_TZ)
                else:
                    end_dt = SWEDISH_TZ.localize(end_dt)
                
                # Check if event is within the week
                if start_dt.date() < week_start.date() or start_dt.date() > week_end.date():
                    continue
                
                # Calculate duration in minutes
                duration_minutes = int((end_dt - start_dt).total_seconds() / 60)
                
                # Get URL for CID lookup
                event_url = str(component.get('url', '')) if component.get('url') else ''
                
                events.append({
                    'summary': summary,
                    'description': description,
                    'start': start_dt,
                    'end': end_dt,
                    'duration_minutes': duration_minutes,
                    'url': event_url
                })
        
        return events
    except Exception as e:
        logger.error(f"Error parsing iCal feed for stats {url}: {e}")
        return []
