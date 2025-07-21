# ==============================================================================
# FILE: tests/test_email_processor.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Tests for the email processing functionality including Outlook integration,
#   action item extraction, and daily summaries.
#
# ==============================================================================

import pytest
from datetime import datetime, date, timedelta
from unittest.mock import Mock, patch
from pathlib import Path
import json

from echo.email_processor import OutlookEmailProcessor
from echo.models import Config, Defaults


class TestEmailProcessor:
    """Test the email processing functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create test config
        self.config = Config(
            defaults=Defaults(wake_time="07:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={},
            profiles={},
            email={
                "outlook_access_token": "test-token",
                "important_senders": ["ceo@company.com", "manager@company.com"],
                "urgent_keywords": ["urgent", "asap", "deadline"],
                "action_keywords": ["please", "can you", "need", "review"]
            }
        )
        
        # Create test email data
        self.test_emails = [
            {
                "id": "1",
                "subject": "Urgent: Project deadline",
                "from": {"emailAddress": {"address": "ceo@company.com"}},
                "bodyPreview": "Please review the project report by Friday. This is urgent.",
                "receivedDateTime": "2025-01-20T10:00:00Z",
                "importance": "high"
            },
            {
                "id": "2",
                "subject": "Meeting request",
                "from": {"emailAddress": {"address": "manager@company.com"}},
                "bodyPreview": "Can we schedule a meeting next week to discuss the project?",
                "receivedDateTime": "2025-01-20T11:00:00Z",
                "importance": "normal"
            },
            {
                "id": "3",
                "subject": "Project status update",
                "from": {"emailAddress": {"address": "team@company.com"}},
                "bodyPreview": "Here's the latest status on the Echo project. Please review.",
                "receivedDateTime": "2025-01-20T12:00:00Z",
                "importance": "normal"
            }
        ]
    
    @patch('echo.email_processor.requests.get')
    def test_get_emails(self, mock_get):
        """Test getting emails from Outlook."""
        # Mock successful response
        mock_response = Mock()
        mock_response.json.return_value = {"value": self.test_emails}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        processor = OutlookEmailProcessor()
        emails = processor.get_emails(days=7)
        
        assert len(emails) == 3
        assert emails[0]["subject"] == "Urgent: Project deadline"
        assert emails[1]["subject"] == "Meeting request"
        assert emails[2]["subject"] == "Project status update"
    
    def test_load_email_filters(self):
        """Test loading email filters from config."""
        processor = OutlookEmailProcessor()
        processor.load_email_filters(self.config.email)
        
        assert "ceo@company.com" in processor.important_senders
        assert "urgent" in processor.urgent_keywords
        assert "please" in processor.action_keywords
    
    def test_filter_emails(self):
        """Test email filtering based on important senders and keywords."""
        processor = OutlookEmailProcessor()
        processor.load_email_filters(self.config.email)
        
        # Test filtering by important sender
        filtered = processor.filter_emails(self.test_emails)
        assert len(filtered) == 2  # ceo@company.com and manager@company.com
        
        # Test filtering by urgent keyword
        urgent_emails = [email for email in filtered if "urgent" in email["subject"].lower()]
        assert len(urgent_emails) == 1
        
        # Test filtering by action keyword
        action_emails = [email for email in filtered if "please" in email["bodyPreview"].lower()]
        assert len(action_emails) == 1
    
    @patch('echo.email_processor.requests.get')
    def test_get_emails_with_error(self, mock_get):
        """Test handling of API errors when getting emails."""
        # Mock failed response
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"
        mock_get.return_value = mock_response
        
        processor = OutlookEmailProcessor()
        emails = processor.get_emails(days=7)
        
        assert len(emails) == 0
    
    def test_processor_initialization(self):
        """Test OutlookEmailProcessor initialization."""
        processor = OutlookEmailProcessor()
        
        assert processor.base_url == "https://graph.microsoft.com/v1.0"
        assert processor.redirect_uri == "http://localhost:8080/auth/callback"
        assert processor.token_file == ".token"
    
    @patch('os.path.exists')
    @patch('builtins.open')
    @patch('json.load')
    def test_load_access_token(self, mock_json_load, mock_open, mock_exists):
        """Test loading access token from file."""
        mock_exists.return_value = True
        mock_json_load.return_value = {"access_token": "test-token"}
        
        processor = OutlookEmailProcessor()
        
        assert processor.access_token == "test-token"
        assert processor.headers["Authorization"] == "Bearer test-token"
    
    @patch('os.path.exists')
    def test_load_access_token_no_file(self, mock_exists):
        """Test loading access token when file doesn't exist."""
        mock_exists.return_value = False
        
        processor = OutlookEmailProcessor()
        
        assert processor.access_token is None
        assert processor.headers["Authorization"] == "Bearer None"
    
    def test_summarize_emails_via_llm_empty_list(self):
        """Test summarizing empty email list."""
        processor = OutlookEmailProcessor()
        result = processor.summarize_emails_via_llm([])
        
        assert result["summary"] == "No emails to summarize."
        assert result["action_items"] == []
    
    @patch('echo.email_processor.build_email_summary_prompt')
    @patch('echo.email_processor.parse_email_summary_response')
    @patch('echo.email_processor._get_openai_client')
    @patch('echo.email_processor._call_llm')
    def test_summarize_emails_via_llm_with_emails(self, mock_call_llm, mock_get_client, mock_parse, mock_build):
        """Test summarizing emails with LLM."""
        mock_build.return_value = "test prompt"
        mock_call_llm.return_value = "test response"
        mock_parse.return_value = {"summary": "Test summary", "action_items": ["item1"]}
        
        processor = OutlookEmailProcessor()
        result = processor.summarize_emails_via_llm(self.test_emails[:1])
        
        assert result["summary"] == "Test summary"
        assert result["action_items"] == ["item1"] 