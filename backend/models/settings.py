"""Settings models"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="app_settings")
    ical_url_1: Optional[str] = ""
    ical_url_2: Optional[str] = ""
    calendar_name_1: Optional[str] = "Kalender 1"
    calendar_name_2: Optional[str] = "Kalender 2"
    sync_interval: Optional[int] = 15  # minutes
    webpushr_key: Optional[str] = ""
    webpushr_auth_token: Optional[str] = ""
    webpushr_test_user_id: Optional[str] = ""  # If set, send notifications only to this user
    auth_enabled: Optional[bool] = False
    auth_password: Optional[str] = ""
    sound_enabled: Optional[bool] = True
    sound_volume: Optional[int] = 50  # 0-100
    impact_effect_enabled: Optional[bool] = False  # Visual effect at timer zero
    event_mappings: Optional[list] = []  # List of {cid: str, subject: str, event_id: str, event_type: str}
    screen_wake_lock: Optional[bool] = False  # Prevent screen from sleeping
    
    @property
    def safe_ical_url_1(self) -> str:
        return self.ical_url_1 or ""
    
    @property
    def safe_ical_url_2(self) -> str:
        return self.ical_url_2 or ""
    
    @property
    def safe_sync_interval(self) -> int:
        return self.sync_interval if self.sync_interval else 15


class SettingsUpdate(BaseModel):
    ical_url_1: Optional[str] = None
    ical_url_2: Optional[str] = None
    calendar_name_1: Optional[str] = None
    calendar_name_2: Optional[str] = None
    sync_interval: Optional[int] = None
    webpushr_key: Optional[str] = None
    webpushr_auth_token: Optional[str] = None
    webpushr_test_user_id: Optional[str] = None
    auth_enabled: Optional[bool] = None
    auth_password: Optional[str] = None
    sound_enabled: Optional[bool] = None
    sound_volume: Optional[int] = None
    impact_effect_enabled: Optional[bool] = None
    event_mappings: Optional[list] = None
    screen_wake_lock: Optional[bool] = None
