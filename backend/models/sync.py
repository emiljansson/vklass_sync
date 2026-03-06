"""Sync models"""
from pydantic import BaseModel


class SyncResult(BaseModel):
    success: bool
    message: str
    new_events: int = 0
    removed_events: int = 0
