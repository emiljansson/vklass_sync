"""Tests for notification_service"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.settings import Settings


class TestSendWebpushrNotification:
    """Tests for send_webpushr_notification function"""
    
    @pytest.mark.asyncio
    async def test_returns_false_without_credentials(self):
        """Should return False when credentials are missing"""
        from services.notification_service import send_webpushr_notification
        
        settings = Settings(webpushr_key="", webpushr_auth_token="")
        
        result = await send_webpushr_notification("Test", "Message", settings)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_sends_to_all_users(self):
        """Should send to all users endpoint when no test user ID"""
        from services.notification_service import send_webpushr_notification
        
        settings = Settings(
            webpushr_key="test-key",
            webpushr_auth_token="test-token",
            webpushr_test_user_id=""
        )
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            result = await send_webpushr_notification("Test", "Message", settings)
            
            assert result is True
            # Verify endpoint used
            call_args = mock_client_instance.post.call_args
            assert "send/all" in call_args[0][0]
    
    @pytest.mark.asyncio
    async def test_sends_to_specific_user(self):
        """Should send to specific user endpoint when test user ID set"""
        from services.notification_service import send_webpushr_notification
        
        settings = Settings(
            webpushr_key="test-key",
            webpushr_auth_token="test-token",
            webpushr_test_user_id="12345"
        )
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            result = await send_webpushr_notification("Test", "Message", settings)
            
            assert result is True
            # Verify endpoint used
            call_args = mock_client_instance.post.call_args
            assert "send/sid" in call_args[0][0]
            # Verify SID in payload
            payload = call_args[1]['json']
            assert payload['sid'] == "12345"
    
    @pytest.mark.asyncio
    async def test_includes_target_path(self):
        """Should include target path in URL"""
        from services.notification_service import send_webpushr_notification
        
        settings = Settings(
            webpushr_key="test-key",
            webpushr_auth_token="test-token"
        )
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = MagicMock()
            mock_response.raise_for_status = MagicMock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(return_value=mock_response)
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            await send_webpushr_notification("Test", "Message", settings, target_path="/stats/week/1")
            
            call_args = mock_client_instance.post.call_args
            payload = call_args[1]['json']
            assert "/stats/week/1" in payload['target_url']
    
    @pytest.mark.asyncio
    async def test_handles_http_error(self):
        """Should return False on HTTP error"""
        from services.notification_service import send_webpushr_notification
        
        settings = Settings(
            webpushr_key="test-key",
            webpushr_auth_token="test-token"
        )
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client_instance = AsyncMock()
            mock_client_instance.post = AsyncMock(side_effect=Exception("Network error"))
            mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_client_instance.__aexit__ = AsyncMock(return_value=None)
            mock_client.return_value = mock_client_instance
            
            result = await send_webpushr_notification("Test", "Message", settings)
            
            assert result is False
