"""Notification service for Webpushr"""
import httpx
from datetime import datetime, timedelta
from config import db, logger, SWEDISH_TZ
from models.settings import Settings
from services.settings_service import get_settings_from_db
from services.event_service import is_event_past


async def send_webpushr_notification(title: str, message: str, settings: Settings, target_path: str = ""):
    """Send push notification via Webpushr
    
    Args:
        title: Notification title
        message: Notification message
        settings: App settings with Webpushr credentials
        target_path: Optional path to append to base URL (e.g., "/stats")
    """
    if not settings.webpushr_key or not settings.webpushr_auth_token:
        logger.warning("Webpushr credentials not configured")
        return False
    
    try:
        headers = {
            "webpushrKey": settings.webpushr_key,
            "webpushrAuthToken": settings.webpushr_auth_token,
            "Content-Type": "application/json"
        }
        
        # Build target URL with optional path
        base_url = "https://vklass.frontproduction.se"
        target_url = f"{base_url}{target_path}" if target_path else base_url
        
        payload = {
            "title": title,
            "message": message,
            "target_url": target_url,
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
            logger.info(f"Webpushr notification sent: {title} -> {target_url}")
            return True
    except Exception as e:
        logger.error(f"Failed to send Webpushr notification: {e}")
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
