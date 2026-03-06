"""Tests for settings_service"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestGetSettingsFromDb:
    """Tests for get_settings_from_db function"""
    
    @pytest.mark.asyncio
    async def test_returns_settings_when_found(self):
        """Should return Settings object when document exists"""
        from services.settings_service import get_settings_from_db
        from models.settings import Settings
        
        mock_doc = {
            "id": "app_settings",
            "ical_url_1": "https://cal.example.com/1.ics",
            "calendar_name_1": "Test Calendar",
            "sync_interval": 15
        }
        
        with patch('services.settings_service.db') as mock_db:
            mock_db.settings.find_one = AsyncMock(return_value=mock_doc)
            
            result = await get_settings_from_db()
            
            assert isinstance(result, Settings)
            assert result.ical_url_1 == "https://cal.example.com/1.ics"
            assert result.calendar_name_1 == "Test Calendar"
            assert result.sync_interval == 15
    
    @pytest.mark.asyncio
    async def test_returns_default_settings_when_not_found(self):
        """Should return default Settings when no document exists"""
        from services.settings_service import get_settings_from_db
        from models.settings import Settings
        
        with patch('services.settings_service.db') as mock_db:
            mock_db.settings.find_one = AsyncMock(return_value=None)
            
            result = await get_settings_from_db()
            
            assert isinstance(result, Settings)
            assert result.ical_url_1 == ""
            assert result.sync_interval == 15  # Default value
