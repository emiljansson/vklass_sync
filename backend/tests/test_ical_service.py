"""Tests for ical_service"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.ical_service import extract_time_from_description


class TestExtractTimeFromDescription:
    """Tests for extract_time_from_description function"""
    
    def test_extract_time_with_colon(self):
        """Should extract time from 'kl: HH:MM' format"""
        assert extract_time_from_description("kl: 09:25") == "09:25"
        assert extract_time_from_description("kl: 14:00") == "14:00"
        assert extract_time_from_description("Möte kl: 08:30 i rum 5") == "08:30"
    
    def test_extract_time_without_colon(self):
        """Should extract time from 'kl HH:MM' format"""
        assert extract_time_from_description("kl 09:25") == "09:25"
        assert extract_time_from_description("kl 14:00") == "14:00"
    
    def test_extract_time_case_insensitive(self):
        """Should work case-insensitively"""
        assert extract_time_from_description("KL: 09:25") == "09:25"
        assert extract_time_from_description("Kl: 09:25") == "09:25"
    
    def test_extract_time_single_digit_hour(self):
        """Should handle single digit hours"""
        assert extract_time_from_description("kl: 9:25") == "09:25"
        assert extract_time_from_description("kl 8:00") == "08:00"
    
    def test_no_time_returns_none(self):
        """Should return None when no time found"""
        assert extract_time_from_description("No time here") is None
        assert extract_time_from_description("") is None
        assert extract_time_from_description("Meeting at room 5") is None
    
    def test_none_input_returns_none(self):
        """Should handle None input"""
        assert extract_time_from_description(None) is None
    
    def test_extract_first_time_only(self):
        """Should extract first time found"""
        result = extract_time_from_description("kl: 09:00 till kl: 10:00")
        assert result == "09:00"


class TestParseIcalFeed:
    """Tests for parse_ical_feed function - requires mocking HTTP"""
    
    @pytest.mark.asyncio
    async def test_empty_url_returns_empty_list(self):
        """Empty URL should return empty list"""
        from services.ical_service import parse_ical_feed
        result = await parse_ical_feed("")
        assert result == []
        
        result = await parse_ical_feed(None)
        assert result == []
    
    @pytest.mark.asyncio
    async def test_parse_valid_ical(self):
        """Should parse valid iCal data"""
        from services.ical_service import parse_ical_feed
        
        ical_data = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-event-1
SUMMARY:Test Event
DTSTART:20260310
DTEND:20260310
DESCRIPTION:Test description kl: 09:00
END:VEVENT
END:VCALENDAR"""
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.text = ical_data
            mock_response.raise_for_status = MagicMock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            result = await parse_ical_feed("https://example.com/cal.ics")
            
            assert len(result) == 1
            assert result[0]['summary'] == "Test Event"
            assert result[0]['event_time'] == "09:00"
    
    @pytest.mark.asyncio
    async def test_skip_events_with_start_and_end_time(self):
        """Should skip events that have both start and end time"""
        from services.ical_service import parse_ical_feed
        
        ical_data = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:scheduled-event
SUMMARY:Scheduled Meeting
DTSTART:20260310T090000
DTEND:20260310T100000
END:VEVENT
BEGIN:VEVENT
UID:all-day-event
SUMMARY:All Day Task
DTSTART:20260310
DTEND:20260310
END:VEVENT
END:VCALENDAR"""
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.text = ical_data
            mock_response.raise_for_status = MagicMock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            result = await parse_ical_feed("https://example.com/cal.ics")
            
            # Should only include all-day event, not the scheduled meeting
            assert len(result) == 1
            assert result[0]['summary'] == "All Day Task"


class TestParseIcalForStats:
    """Tests for parse_ical_for_stats function"""
    
    @pytest.mark.asyncio
    async def test_empty_url_returns_empty_list(self):
        """Empty URL should return empty list"""
        from services.ical_service import parse_ical_for_stats
        result = await parse_ical_for_stats("", datetime.now(), datetime.now())
        assert result == []
    
    @pytest.mark.asyncio
    async def test_only_includes_scheduled_events(self):
        """Should only include events with both start and end time"""
        from services.ical_service import parse_ical_for_stats
        import pytz
        
        SWEDISH_TZ = pytz.timezone('Europe/Stockholm')
        week_start = SWEDISH_TZ.localize(datetime(2026, 3, 9))
        week_end = SWEDISH_TZ.localize(datetime(2026, 3, 15))
        
        ical_data = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:scheduled-event
SUMMARY:Scheduled Meeting
DTSTART:20260310T090000
DTEND:20260310T100000
END:VEVENT
BEGIN:VEVENT
UID:all-day-event
SUMMARY:All Day Task
DTSTART:20260310
DTEND:20260310
END:VEVENT
END:VCALENDAR"""
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.text = ical_data
            mock_response.raise_for_status = MagicMock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            result = await parse_ical_for_stats("https://example.com/cal.ics", week_start, week_end)
            
            # Should only include scheduled meeting, not all-day event
            assert len(result) == 1
            assert result[0]['summary'] == "Scheduled Meeting"
            assert result[0]['duration_minutes'] == 60
