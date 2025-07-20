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

from echo.email_processor import (
    OutlookEmailProcessor, EmailAction, EmailSummary,
    EmailPriority, EmailStatus
)
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
    
    def test_email_action_creation(self):
        """Test creating EmailAction objects."""
        action = EmailAction(
            id="test_action_1",
            description="Review project report",
            priority=EmailPriority.URGENT,
            sender="ceo@company.com",
            email_subject="Urgent: Project deadline",
            email_date=datetime.now(),
            project_context="Echo project",
            notes="Due by Friday"
        )
        
        assert action.id == "test_action_1"
        assert action.description == "Review project report"
        assert action.priority == EmailPriority.URGENT
        assert action.status == EmailStatus.PENDING
        assert action.sender == "ceo@company.com"
        assert action.project_context == "Echo project"
    
    def test_email_action_serialization(self):
        """Test EmailAction serialization to dictionary."""
        action = EmailAction(
            id="test_action_1",
            description="Review project report",
            priority=EmailPriority.URGENT,
            sender="ceo@company.com",
            email_subject="Urgent: Project deadline",
            email_date=datetime(2025, 1, 20, 10, 0, 0),
            project_context="Echo project",
            notes="Due by Friday"
        )
        
        action_dict = action.to_dict()
        
        assert action_dict["id"] == "test_action_1"
        assert action_dict["description"] == "Review project report"
        assert action_dict["priority"] == "urgent"
        assert action_dict["status"] == "pending"
        assert action_dict["sender"] == "ceo@company.com"
        assert action_dict["project_context"] == "Echo project"
        assert action_dict["notes"] == "Due by Friday"
    
    def test_email_summary_creation(self):
        """Test creating EmailSummary objects."""
        actions = [
            EmailAction(
                id="action_1",
                description="Review project report",
                priority=EmailPriority.URGENT,
                sender="ceo@company.com",
                email_subject="Urgent: Project deadline"
            ),
            EmailAction(
                id="action_2",
                description="Schedule meeting",
                priority=EmailPriority.HIGH,
                sender="manager@company.com",
                email_subject="Meeting request"
            )
        ]
        
        summary = EmailSummary(
            date=date.today(),
            total_emails=3,
            urgent_count=1,
            action_items_count=2,
            meetings_count=1,
            updates_count=1,
            deferred_count=0,
            actions=actions,
            urgent_emails=self.test_emails[:1],
            meeting_requests=self.test_emails[1:2],
            project_updates=self.test_emails[2:3]
        )
        
        assert summary.total_emails == 3
        assert summary.urgent_count == 1
        assert summary.action_items_count == 2
        assert summary.meetings_count == 1
        assert len(summary.actions) == 2
        assert len(summary.urgent_emails) == 1
        assert len(summary.meeting_requests) == 1
        assert len(summary.project_updates) == 1
    
    def test_email_summary_serialization(self):
        """Test EmailSummary serialization to dictionary."""
        actions = [
            EmailAction(
                id="action_1",
                description="Review project report",
                priority=EmailPriority.URGENT,
                sender="ceo@company.com",
                email_subject="Urgent: Project deadline"
            )
        ]
        
        summary = EmailSummary(
            date=date.today(),
            total_emails=1,
            urgent_count=1,
            action_items_count=1,
            meetings_count=0,
            updates_count=0,
            deferred_count=0,
            actions=actions
        )
        
        summary_dict = summary.to_dict()
        
        assert summary_dict["total_emails"] == 1
        assert summary_dict["urgent_count"] == 1
        assert summary_dict["action_items_count"] == 1
        assert len(summary_dict["actions"]) == 1
        assert summary_dict["actions"][0]["description"] == "Review project report"
    
    @patch('echo.email_processor.requests.get')
    def test_get_today_emails(self, mock_get):
        """Test getting today's emails from Outlook."""
        # Mock successful response
        mock_response = Mock()
        mock_response.json.return_value = {"value": self.test_emails}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        processor = OutlookEmailProcessor(self.config)
        emails = processor.get_today_emails()
        
        assert len(emails) == 3
        assert emails[0]["subject"] == "Urgent: Project deadline"
        assert emails[1]["subject"] == "Meeting request"
        assert emails[2]["subject"] == "Project status update"
    
    @patch('echo.email_processor.requests.get')
    def test_get_important_emails(self, mock_get):
        """Test getting important emails from Outlook."""
        # Mock successful response
        mock_response = Mock()
        mock_response.json.return_value = {"value": self.test_emails[:2]}  # Only first 2
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        processor = OutlookEmailProcessor(self.config)
        emails = processor.get_important_emails(days=7)
        
        assert len(emails) == 2
        assert emails[0]["subject"] == "Urgent: Project deadline"
        assert emails[1]["subject"] == "Meeting request"
    
    @patch('echo.cli._call_llm')
    def test_extract_action_items(self, mock_llm):
        """Test extracting action items from emails using LLM."""
        # Mock LLM response
        mock_response = '''[
            {
                "description": "Review project report by Friday",
                "priority": "urgent",
                "sender": "ceo@company.com",
                "email_subject": "Urgent: Project deadline",
                "email_date": "2025-01-20T10:00:00Z",
                "project_context": "Echo project",
                "notes": "Due by Friday"
            },
            {
                "description": "Schedule meeting next week",
                "priority": "high",
                "sender": "manager@company.com",
                "email_subject": "Meeting request",
                "email_date": "2025-01-20T11:00:00Z",
                "project_context": null,
                "notes": "Discuss project progress"
            }
        ]'''
        mock_llm.return_value = mock_response
        
        processor = OutlookEmailProcessor(self.config)
        actions = processor.extract_action_items(self.test_emails)
        
        assert len(actions) == 2
        assert actions[0].description == "Review project report by Friday"
        assert actions[0].priority == EmailPriority.URGENT
        assert actions[0].sender == "ceo@company.com"
        assert actions[1].description == "Schedule meeting next week"
        assert actions[1].priority == EmailPriority.HIGH
        assert actions[1].sender == "manager@company.com"
    
    def test_generate_daily_summary(self):
        """Test generating daily email summary."""
        actions = [
            EmailAction(
                id="action_1",
                description="Review project report",
                priority=EmailPriority.URGENT,
                sender="ceo@company.com",
                email_subject="Urgent: Project deadline"
            ),
            EmailAction(
                id="action_2",
                description="Schedule meeting",
                priority=EmailPriority.HIGH,
                sender="manager@company.com",
                email_subject="Meeting request"
            )
        ]
        
        processor = OutlookEmailProcessor(self.config)
        summary = processor.generate_daily_summary(self.test_emails, actions)
        
        assert summary.total_emails == 3
        assert summary.urgent_count == 1
        assert summary.action_items_count == 2
        assert summary.meetings_count == 1
        assert summary.updates_count == 1
        assert summary.deferred_count == 0
        assert len(summary.actions) == 2
        assert len(summary.urgent_emails) == 1
        assert len(summary.meeting_requests) == 1
        assert len(summary.project_updates) == 1
    
    def test_save_and_load_actions(self):
        """Test saving and loading action items."""
        actions = [
            EmailAction(
                id="test_action_1",
                description="Review project report",
                priority=EmailPriority.URGENT,
                sender="ceo@company.com",
                email_subject="Urgent: Project deadline",
                email_date=datetime(2025, 1, 20, 10, 0, 0),
                project_context="Echo project",
                notes="Due by Friday"
            )
        ]
        
        processor = OutlookEmailProcessor(self.config)
        
        # Save actions
        processor.save_actions(actions)
        
        # Load actions
        loaded_actions = processor.load_actions()
        
        assert len(loaded_actions) == 1
        assert loaded_actions[0].id == "test_action_1"
        assert loaded_actions[0].description == "Review project report"
        assert loaded_actions[0].priority == EmailPriority.URGENT
        assert loaded_actions[0].sender == "ceo@company.com"
        assert loaded_actions[0].project_context == "Echo project"
        assert loaded_actions[0].notes == "Due by Friday"
    
    def test_update_action_status(self):
        """Test updating action item status."""
        actions = [
            EmailAction(
                id="test_action_1",
                description="Review project report",
                priority=EmailPriority.URGENT,
                status=EmailStatus.PENDING,
                sender="ceo@company.com",
                email_subject="Urgent: Project deadline"
            )
        ]
        
        processor = OutlookEmailProcessor(self.config)
        processor.save_actions(actions)
        
        # Update status
        success = processor.update_action_status("test_action_1", EmailStatus.COMPLETED, "Done!")
        
        assert success is True
        
        # Load and verify
        loaded_actions = processor.load_actions()
        assert len(loaded_actions) == 1
        assert loaded_actions[0].status == EmailStatus.COMPLETED
        assert loaded_actions[0].notes == "Done!"
    
    def test_get_pending_actions(self):
        """Test getting pending action items."""
        actions = [
            EmailAction(
                id="action_1",
                description="Review project report",
                priority=EmailPriority.URGENT,
                status=EmailStatus.PENDING,
                sender="ceo@company.com"
            ),
            EmailAction(
                id="action_2",
                description="Schedule meeting",
                priority=EmailPriority.HIGH,
                status=EmailStatus.IN_PROGRESS,
                sender="manager@company.com"
            ),
            EmailAction(
                id="action_3",
                description="Send report",
                priority=EmailPriority.MEDIUM,
                status=EmailStatus.COMPLETED,
                sender="team@company.com"
            )
        ]
        
        processor = OutlookEmailProcessor(self.config)
        processor.save_actions(actions)
        
        pending_actions = processor.get_pending_actions()
        
        assert len(pending_actions) == 2
        assert pending_actions[0].status == EmailStatus.PENDING
        assert pending_actions[1].status == EmailStatus.IN_PROGRESS
    
    def test_get_urgent_actions(self):
        """Test getting urgent action items."""
        actions = [
            EmailAction(
                id="action_1",
                description="Review project report",
                priority=EmailPriority.URGENT,
                status=EmailStatus.PENDING,
                sender="ceo@company.com"
            ),
            EmailAction(
                id="action_2",
                description="Schedule meeting",
                priority=EmailPriority.HIGH,
                status=EmailStatus.PENDING,
                sender="manager@company.com"
            ),
            EmailAction(
                id="action_3",
                description="Send report",
                priority=EmailPriority.URGENT,
                status=EmailStatus.COMPLETED,
                sender="team@company.com"
            )
        ]
        
        processor = OutlookEmailProcessor(self.config)
        processor.save_actions(actions)
        
        urgent_actions = processor.get_urgent_actions()
        
        assert len(urgent_actions) == 1  # Only pending urgent actions
        assert urgent_actions[0].priority == EmailPriority.URGENT
        assert urgent_actions[0].status == EmailStatus.PENDING
    
    def test_processor_without_token(self):
        """Test processor behavior without access token."""
        config = Config(
            defaults=Defaults(wake_time="07:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={},
            profiles={},
            email={}  # No access token
        )
        
        processor = OutlookEmailProcessor(config)
        
        # Should handle missing token gracefully
        emails = processor.get_today_emails()
        assert emails == []
    
    def test_action_extraction_with_no_emails(self):
        """Test action extraction with no emails."""
        processor = OutlookEmailProcessor(self.config)
        actions = processor.extract_action_items([])
        
        assert actions == []
    
    def test_daily_summary_with_no_data(self):
        """Test daily summary generation with no data."""
        processor = OutlookEmailProcessor(self.config)
        summary = processor.generate_daily_summary([], [])
        
        assert summary.total_emails == 0
        assert summary.urgent_count == 0
        assert summary.action_items_count == 0
        assert summary.meetings_count == 0
        assert summary.updates_count == 0
        assert summary.deferred_count == 0
        assert len(summary.actions) == 0
    
    def test_oauth_flow_initialization(self):
        """Test OAuth flow initialization."""
        config = Config(
            defaults=Defaults(wake_time="07:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={},
            profiles={},
            email={
                "oauth": {
                    "client_id": "test-client-id",
                    "client_secret": "test-client-secret",
                    "redirect_uri": "http://localhost:8080/auth/callback",
                    "scopes": ["Mail.Read", "Mail.ReadWrite"]
                }
            }
        )
        
        processor = OutlookEmailProcessor(config)
        
        # Should initialize without access token
        assert processor.access_token == ""
        assert "client_id=test-client-id" in processor._get_auth_url()
    
    def test_response_tracking(self):
        """Test email response tracking functionality."""
        # Create emails with response status
        emails_with_responses = [
            {
                "id": "1",
                "subject": "Re: Project deadline",
                "from": {"emailAddress": {"address": "ceo@company.com"}},
                "bodyPreview": "Thanks for the update!",
                "receivedDateTime": "2025-01-20T10:00:00Z",
                "importance": "high",
                "inReplyTo": "original-message-id",
                "conversationId": "conv-1"
            },
            {
                "id": "2",
                "subject": "Meeting request",
                "from": {"emailAddress": {"address": "manager@company.com"}},
                "bodyPreview": "Can we schedule a meeting?",
                "receivedDateTime": "2025-01-20T11:00:00Z",
                "importance": "normal",
                "conversationId": "conv-2"
            },
            {
                "id": "3",
                "subject": "Re: Re: Project status",
                "from": {"emailAddress": {"address": "team@company.com"}},
                "bodyPreview": "Here's the latest status.",
                "receivedDateTime": "2025-01-20T12:00:00Z",
                "importance": "normal",
                "inReplyTo": "previous-message-id",
                "conversationId": "conv-3"
            }
        ]
        
        processor = OutlookEmailProcessor(self.config)
        
        # Test response detection
        responded_emails = processor._get_responded_emails(emails_with_responses)
        pending_emails = processor._get_pending_response_emails(emails_with_responses)
        
        # Email 1 and 3 have In-Reply-To headers (responses)
        assert len(responded_emails) == 2
        # Email 2 has no In-Reply-To (pending response)
        assert len(pending_emails) == 1
        assert pending_emails[0]["subject"] == "Meeting request"
    
    def test_thread_tracking(self):
        """Test email thread/conversation tracking."""
        emails_in_thread = [
            {
                "id": "1",
                "subject": "Project update",
                "conversationId": "conv-1",
                "receivedDateTime": "2025-01-20T10:00:00Z"
            },
            {
                "id": "2",
                "subject": "Re: Project update",
                "conversationId": "conv-1",
                "receivedDateTime": "2025-01-20T11:00:00Z"
            },
            {
                "id": "3",
                "subject": "Re: Re: Project update",
                "conversationId": "conv-1",
                "receivedDateTime": "2025-01-20T12:00:00Z"
            }
        ]
        
        processor = OutlookEmailProcessor(self.config)
        threads = processor._group_emails_by_thread(emails_in_thread)
        
        assert len(threads) == 1
        assert len(threads["conv-1"]) == 3
        assert threads["conv-1"][0]["subject"] == "Project update"
        assert threads["conv-1"][1]["subject"] == "Re: Project update"
    
    def test_sent_items_analysis(self):
        """Test analysis of sent items for response tracking."""
        sent_emails = [
            {
                "id": "sent-1",
                "subject": "Re: Project deadline",
                "toRecipients": [{"emailAddress": {"address": "ceo@company.com"}}],
                "sentDateTime": "2025-01-20T10:30:00Z",
                "inReplyTo": "original-message-id"
            },
            {
                "id": "sent-2",
                "subject": "Re: Meeting request",
                "toRecipients": [{"emailAddress": {"address": "manager@company.com"}}],
                "sentDateTime": "2025-01-20T11:30:00Z",
                "inReplyTo": "meeting-request-id"
            }
        ]
        
        processor = OutlookEmailProcessor(self.config)
        
        # Mock sent items response
        with patch.object(processor, '_make_request') as mock_request:
            mock_request.return_value = {"value": sent_emails}
            
            responses = processor._get_sent_responses()
            
            assert len(responses) == 2
            assert responses[0]["subject"] == "Re: Project deadline"
            assert responses[1]["subject"] == "Re: Meeting request"
    
    def test_enhanced_email_summary_with_responses(self):
        """Test enhanced email summary with response tracking."""
        emails = [
            {
                "id": "1",
                "subject": "Urgent: Project deadline",
                "from": {"emailAddress": {"address": "ceo@company.com"}},
                "importance": "high",
                "conversationId": "conv-1"
            },
            {
                "id": "2",
                "subject": "Meeting request",
                "from": {"emailAddress": {"address": "manager@company.com"}},
                "importance": "normal",
                "conversationId": "conv-2"
            },
            {
                "id": "3",
                "subject": "Re: Project deadline",
                "from": {"emailAddress": {"address": "ceo@company.com"}},
                "importance": "high",
                "inReplyTo": "original-id",
                "conversationId": "conv-1"
            }
        ]
        
        processor = OutlookEmailProcessor(self.config)
        summary = processor.generate_enhanced_summary(emails, [])
        
        assert summary.total_emails == 3
        assert summary.responded_count == 1
        assert summary.pending_response_count == 2
        assert summary.no_response_needed_count == 0
    
    def test_oauth_token_refresh(self):
        """Test OAuth token refresh functionality."""
        config = Config(
            defaults=Defaults(wake_time="07:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={},
            profiles={},
            email={
                "oauth": {
                    "client_id": "test-client-id",
                    "client_secret": "test-client-secret",
                    "refresh_token": "test-refresh-token"
                }
            }
        )
        
        processor = OutlookEmailProcessor(config)
        
        # Mock token refresh
        with patch.object(processor, '_refresh_access_token') as mock_refresh:
            mock_refresh.return_value = "new-access-token"
            
            # Simulate expired token
            processor.access_token = "expired-token"
            processor._ensure_valid_token()
            
            mock_refresh.assert_called_once()
            assert processor.access_token == "new-access-token"
    
    def test_email_priority_with_response_status(self):
        """Test email priority calculation including response status."""
        emails = [
            {
                "id": "1",
                "subject": "Urgent: No response",
                "from": {"emailAddress": {"address": "ceo@company.com"}},
                "importance": "high",
                "conversationId": "conv-1"
            },
            {
                "id": "2",
                "subject": "Urgent: Responded",
                "from": {"emailAddress": {"address": "manager@company.com"}},
                "importance": "high",
                "inReplyTo": "original-id",
                "conversationId": "conv-2"
            }
        ]
        
        processor = OutlookEmailProcessor(self.config)
        
        # Test priority calculation
        urgent_pending = processor._get_urgent_pending_emails(emails)
        urgent_responded = processor._get_urgent_responded_emails(emails)
        
        assert len(urgent_pending) == 1
        assert urgent_pending[0]["subject"] == "Urgent: No response"
        assert len(urgent_responded) == 1
        assert urgent_responded[0]["subject"] == "Urgent: Responded" 