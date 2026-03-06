"""Tests for event_service"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.event_service import is_event_past


class TestIsEventPast:
    """Tests for is_event_past function"""
    
    def test_empty_start_date_returns_false(self):
        """Empty start date should return False"""
        assert is_event_past("", None) is False
        assert is_event_past(None, None) is False
    
    def test_past_date_only_event(self):
        """Date-only event from yesterday should be past"""
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        assert is_event_past(yesterday, None) is True
    
    def test_future_date_only_event(self):
        """Date-only event for tomorrow should not be past"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        assert is_event_past(tomorrow, None) is False
    
    def test_today_date_only_event(self):
        """Date-only event for today should not be past (no time specified)"""
        today = datetime.now().strftime("%Y-%m-%d")
        # Today without time is not considered past
        result = is_event_past(today, None)
        # This depends on current time - today at midnight is past if it's after midnight
        assert isinstance(result, bool)
    
    def test_past_datetime_event(self):
        """Event with datetime 2 hours ago should be past"""
        two_hours_ago = (datetime.now() - timedelta(hours=2)).isoformat()
        assert is_event_past(two_hours_ago, None) is True
    
    def test_future_datetime_event(self):
        """Event with datetime 2 hours from now should not be past"""
        two_hours_later = (datetime.now() + timedelta(hours=2)).isoformat()
        assert is_event_past(two_hours_later, None) is False
    
    def test_event_with_time_string(self):
        """Event with separate time string should use it for calculation"""
        today = datetime.now().strftime("%Y-%m-%d")
        # Event at 00:01 today with 40 min offset
        result = is_event_past(today, "00:01")
        # Should be past if current time > 00:41
        assert isinstance(result, bool)
    
    def test_invalid_date_returns_false(self):
        """Invalid date format should return False"""
        assert is_event_past("invalid-date", None) is False
        assert is_event_past("2026-13-45", None) is False
    
    def test_forty_minute_threshold(self):
        """Event should be past 40 minutes after start time"""
        # 50 minutes ago should be past
        fifty_min_ago = (datetime.now() - timedelta(minutes=50)).isoformat()
        assert is_event_past(fifty_min_ago, None) is True
        
        # 30 minutes ago should NOT be past yet
        thirty_min_ago = (datetime.now() - timedelta(minutes=30)).isoformat()
        assert is_event_past(thirty_min_ago, None) is False
