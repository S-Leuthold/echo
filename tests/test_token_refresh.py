"""
Test token refresh functionality for Outlook email processor.
"""

import pytest
import json
import os
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from echo.email_processor import OutlookEmailProcessor


class TestTokenRefresh:
    """Test token refresh functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.test_token_file = ".test_token"
        
    def teardown_method(self):
        """Clean up test environment."""
        if os.path.exists(self.test_token_file):
            os.remove(self.test_token_file)
    
    def test_token_loading_with_refresh_token(self):
        """Test loading tokens with refresh token."""
        # Create test token data with refresh token
        token_data = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with open(self.test_token_file, "w") as f:
            json.dump(token_data, f)
        
        # Mock environment variables and create processor
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            processor._load_tokens()
            
            assert processor.access_token == "test_access_token"
            assert processor.refresh_token == "test_refresh_token"
            assert processor.token_expires_at is not None
    
    def test_token_loading_without_refresh_token(self):
        """Test loading tokens without refresh token."""
        # Create test token data without refresh token
        token_data = {
            "access_token": "test_access_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with open(self.test_token_file, "w") as f:
            json.dump(token_data, f)
        
        # Mock environment variables and create processor
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            processor._load_tokens()
            
            assert processor.access_token == "test_access_token"
            assert processor.refresh_token is None
            assert processor.token_expires_at is not None
    
    def test_token_expiration_check(self):
        """Test token expiration checking."""
        # Create test token data
        token_data = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with open(self.test_token_file, "w") as f:
            json.dump(token_data, f)
        
        # Mock environment variables and create processor
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            processor._load_tokens()
            
            # Token should not be expired (just created)
            assert not processor._is_token_expired()
            
            # Set expiration to past
            processor.token_expires_at = datetime.now() - timedelta(minutes=10)
            assert processor._is_token_expired()
    
    @patch('requests.post')
    def test_successful_token_refresh(self, mock_post):
        """Test successful token refresh."""
        # Mock successful refresh response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600
        }
        mock_post.return_value = mock_response
        
        # Create test token data
        token_data = {
            "access_token": "old_access_token",
            "refresh_token": "old_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with open(self.test_token_file, "w") as f:
            json.dump(token_data, f)
        
        # Mock environment variables
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            processor._load_tokens()
            
            # Test token refresh
            result = processor._refresh_access_token()
            
            assert result is True
            assert processor.access_token == "new_access_token"
            assert processor.refresh_token == "new_refresh_token"
            
            # Verify the request was made correctly
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            assert call_args[1]['data']['grant_type'] == 'refresh_token'
            assert call_args[1]['data']['refresh_token'] == 'old_refresh_token'
    
    @patch('requests.post')
    def test_failed_token_refresh(self, mock_post):
        """Test failed token refresh."""
        # Mock failed refresh response
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Invalid refresh token"
        mock_post.return_value = mock_response
        
        # Create test token data
        token_data = {
            "access_token": "old_access_token",
            "refresh_token": "invalid_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with open(self.test_token_file, "w") as f:
            json.dump(token_data, f)
        
        # Mock environment variables
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            processor._load_tokens()
            
            # Test token refresh
            result = processor._refresh_access_token()
            
            assert result is False
    
    def test_ensure_valid_token_with_expired_token(self):
        """Test ensuring valid token when token is expired."""
        # Create test token data
        token_data = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with open(self.test_token_file, "w") as f:
            json.dump(token_data, f)
        
        # Mock environment variables and create processor
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            processor._load_tokens()
            
            # Set token as expired
            processor.token_expires_at = datetime.now() - timedelta(minutes=10)
            
            # Mock refresh to succeed
            with patch.object(processor, '_refresh_access_token', return_value=True):
                result = processor._ensure_valid_token()
                assert result is True
    
    def test_ensure_valid_token_without_refresh_token(self):
        """Test ensuring valid token when no refresh token is available."""
        # Create test token data without refresh token
        token_data = {
            "access_token": "test_access_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with open(self.test_token_file, "w") as f:
            json.dump(token_data, f)
        
        # Mock environment variables and create processor
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            processor._load_tokens()
            
            # Set token as expired
            processor.token_expires_at = datetime.now() - timedelta(minutes=10)
            
            # Should fail without refresh token
            result = processor._ensure_valid_token()
            assert result is False
    
    def test_token_saving_with_expiration_tracking(self):
        """Test saving tokens with expiration tracking."""
        # Mock environment variables
        with patch.dict(os.environ, {
            'ECHO_GRAPH_CLIENT_ID': 'test_client_id',
            'ECHO_GRAPH_CLIENT_SECRET': 'test_client_secret'
        }):
            processor = OutlookEmailProcessor()
            processor.token_file = self.test_token_file
            
            token_data = {
                "access_token": "test_access_token",
                "refresh_token": "test_refresh_token",
                "expires_in": 3600,
                "token_type": "Bearer"
            }
            
            # Save tokens
            processor._save_tokens(token_data)
            
            # Verify file was created
            assert os.path.exists(self.test_token_file)
            
            # Load and verify
            with open(self.test_token_file, "r") as f:
                saved_data = json.load(f)
            
            assert saved_data["access_token"] == "test_access_token"
            assert saved_data["refresh_token"] == "test_refresh_token"
            assert "expires_at" in saved_data
            
            # Verify instance variables were updated
            assert processor.access_token == "test_access_token"
            assert processor.refresh_token == "test_refresh_token"
            assert processor.token_expires_at is not None 