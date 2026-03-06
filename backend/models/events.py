"""Event models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid


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
