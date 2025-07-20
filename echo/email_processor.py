# ==============================================================================
# FILE: echo/email_processor.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Provides Outlook email integration for reading emails, extracting action items,
#   and generating daily summaries. Integrates with the planning and admin workflows.
#
# DEPENDS ON:
#   - Microsoft Graph API for Outlook integration
#   - LLM for action item extraction and summarization
#
# DEPENDED ON BY:
#   - echo.cli (email processing commands)
#   - echo.scheduler (admin block integration)
#   - echo.journal (daily summaries)
# ==============================================================================

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, date, timedelta
from enum import Enum
from typing import List, Dict, Optional, Any
import json
import re
from pathlib import Path

from .models import Config


class EmailPriority(str, Enum):
    """Priority levels for extracted action items."""
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class EmailStatus(str, Enum):
    """Status of email processing and action items."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DEFERRED = "deferred"


@dataclass
class EmailAction:
    """Represents an action item extracted from an email."""
    id: str
    description: str
    priority: EmailPriority
    status: EmailStatus = EmailStatus.PENDING
    due_date: Optional[date] = None
    sender: str = ""
    email_subject: str = ""
    email_date: datetime = field(default_factory=datetime.now)
    project_context: Optional[str] = None
    notes: str = ""
    
    def to_dict(self) -> Dict:
        """Serializes the EmailAction into a JSON-safe dictionary."""
        return {
            "id": self.id,
            "description": self.description,
            "priority": self.priority.value,
            "status": self.status.value,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "sender": self.sender,
            "email_subject": self.email_subject,
            "email_date": self.email_date.isoformat(),
            "project_context": self.project_context,
            "notes": self.notes,
        }


@dataclass
class EmailSummary:
    """Daily email summary with counts and priorities."""
    date: date
    total_emails: int
    urgent_count: int
    action_items_count: int
    meetings_count: int
    updates_count: int
    deferred_count: int
    actions: List[EmailAction] = field(default_factory=list)
    urgent_emails: List[Dict] = field(default_factory=list)
    meeting_requests: List[Dict] = field(default_factory=list)
    project_updates: List[Dict] = field(default_factory=list)
    # Response tracking fields
    responded_count: int = 0
    pending_response_count: int = 0
    no_response_needed_count: int = 0
    
    def to_dict(self) -> Dict:
        """Serializes the EmailSummary into a JSON-safe dictionary."""
        return {
            "date": self.date.isoformat(),
            "total_emails": self.total_emails,
            "urgent_count": self.urgent_count,
            "action_items_count": self.action_items_count,
            "meetings_count": self.meetings_count,
            "updates_count": self.updates_count,
            "deferred_count": self.deferred_count,
            "actions": [action.to_dict() for action in self.actions],
            "urgent_emails": self.urgent_emails,
            "meeting_requests": self.meeting_requests,
            "project_updates": self.project_updates,
            "responded_count": self.responded_count,
            "pending_response_count": self.pending_response_count,
            "no_response_needed_count": self.no_response_needed_count,
        }


class OutlookEmailProcessor:
    """Handles Outlook email integration and processing."""
    
    def __init__(self, config: Config):
        self.config = config
        self.access_token = config.email.get("outlook_access_token", "")
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def _make_request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict:
        """Make a request to the Microsoft Graph API."""
        import requests
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=self.headers)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data or {})
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error making request to {endpoint}: {e}")
            return {}
    
    def get_today_emails(self) -> List[Dict]:
        """Get emails from today."""
        today = date.today()
        start_date = datetime.combine(today, datetime.min.time())
        end_date = datetime.combine(today, datetime.max.time())
        
        # Format dates for Microsoft Graph API
        start_str = start_date.isoformat() + "Z"
        end_str = end_date.isoformat() + "Z"
        
        endpoint = f"/me/messages?$filter=receivedDateTime ge '{start_str}' and receivedDateTime le '{end_str}'&$orderby=receivedDateTime desc"
        
        response = self._make_request(endpoint)
        return response.get("value", [])
    
    def get_important_emails(self, days: int = 7) -> List[Dict]:
        """Get important emails from the last N days."""
        start_date = datetime.now() - timedelta(days=days)
        start_str = start_date.isoformat() + "Z"
        
        # Get emails from important senders or with urgent keywords
        important_senders = self.config.email.get("important_senders", [])
        urgent_keywords = self.config.email.get("urgent_keywords", [])
        
        # Build filter for important emails
        filters = []
        for sender in important_senders:
            filters.append(f"from/emailAddress/address eq '{sender}'")
        
        for keyword in urgent_keywords:
            filters.append(f"contains(subject, '{keyword}')")
        
        filter_string = " or ".join(filters) if filters else "true"
        endpoint = f"/me/messages?$filter=receivedDateTime ge '{start_str}' and ({filter_string})&$orderby=receivedDateTime desc"
        
        response = self._make_request(endpoint)
        return response.get("value", [])
    
    def extract_action_items(self, emails: List[Dict]) -> List[EmailAction]:
        """Extract action items from emails using LLM."""
        from .prompt_engine import build_action_extraction_prompt, parse_action_extraction_response
        from .cli import _get_openai_client, _call_llm
        
        if not emails:
            return []
        
        # Prepare email data for LLM
        email_data = []
        for email in emails[:10]:  # Limit to 10 emails for prompt size
            email_info = {
                "subject": email.get("subject", ""),
                "sender": email.get("from", {}).get("emailAddress", {}).get("address", ""),
                "body": email.get("bodyPreview", ""),
                "received": email.get("receivedDateTime", ""),
                "importance": email.get("importance", "normal")
            }
            email_data.append(email_info)
        
        # Build prompt for action item extraction
        prompt = build_action_extraction_prompt(email_data)
        
        # Call LLM
        client = _get_openai_client()
        response = _call_llm(client, prompt)
        
        try:
            actions_data = parse_action_extraction_response(response)
            actions = []
            
            for action_data in actions_data:
                action = EmailAction(
                    id=f"action_{len(actions)}_{datetime.now().timestamp()}",
                    description=action_data["description"],
                    priority=EmailPriority(action_data["priority"]),
                    sender=action_data.get("sender", ""),
                    email_subject=action_data.get("email_subject", ""),
                    email_date=datetime.fromisoformat(action_data.get("email_date", datetime.now().isoformat())),
                    project_context=action_data.get("project_context"),
                    notes=action_data.get("notes", "")
                )
                actions.append(action)
            
            return actions
        except ValueError as e:
            print(f"Error extracting action items: {e}")
            return []
    
    def generate_daily_summary(self, emails: List[Dict], actions: List[EmailAction]) -> EmailSummary:
        """Generate a daily email summary."""
        today = date.today()
        
        # Count different types of emails
        urgent_count = len([e for e in emails if e.get("importance") == "high"])
        meetings_count = len([e for e in emails if "meeting" in e.get("subject", "").lower()])
        updates_count = len([e for e in emails if any(word in e.get("subject", "").lower() for word in ["update", "status", "progress"])])
        deferred_count = len([a for a in actions if a.status == EmailStatus.DEFERRED])
        
        # Categorize emails
        urgent_emails = [e for e in emails if e.get("importance") == "high"]
        meeting_requests = [e for e in emails if "meeting" in e.get("subject", "").lower()]
        project_updates = [e for e in emails if any(word in e.get("subject", "").lower() for word in ["update", "status", "progress"])]
        
        return EmailSummary(
            date=today,
            total_emails=len(emails),
            urgent_count=urgent_count,
            action_items_count=len(actions),
            meetings_count=meetings_count,
            updates_count=updates_count,
            deferred_count=deferred_count,
            actions=actions,
            urgent_emails=urgent_emails,
            meeting_requests=meeting_requests,
            project_updates=project_updates
        )
    
    def save_actions(self, actions: List[EmailAction]) -> None:
        """Save action items to persistent storage."""
        actions_file = Path("data/email_actions.json")
        actions_file.parent.mkdir(exist_ok=True)
        
        actions_data = [action.to_dict() for action in actions]
        
        with open(actions_file, "w") as f:
            json.dump(actions_data, f, indent=2)
    
    def load_actions(self) -> List[EmailAction]:
        """Load action items from persistent storage."""
        actions_file = Path("data/email_actions.json")
        
        if not actions_file.exists():
            return []
        
        try:
            with open(actions_file, "r") as f:
                actions_data = json.load(f)
            
            actions = []
            for action_data in actions_data:
                action = EmailAction(
                    id=action_data["id"],
                    description=action_data["description"],
                    priority=EmailPriority(action_data["priority"]),
                    status=EmailStatus(action_data["status"]),
                    due_date=date.fromisoformat(action_data["due_date"]) if action_data.get("due_date") else None,
                    sender=action_data.get("sender", ""),
                    email_subject=action_data.get("email_subject", ""),
                    email_date=datetime.fromisoformat(action_data["email_date"]),
                    project_context=action_data.get("project_context"),
                    notes=action_data.get("notes", "")
                )
                actions.append(action)
            
            return actions
        except Exception as e:
            print(f"Error loading email actions: {e}")
            return []
    
    def update_action_status(self, action_id: str, status: EmailStatus, notes: str = "") -> bool:
        """Update the status of an action item."""
        actions = self.load_actions()
        
        for action in actions:
            if action.id == action_id:
                action.status = status
                if notes:
                    action.notes = notes
                self.save_actions(actions)
                return True
        
        return False
    
    def get_pending_actions(self) -> List[EmailAction]:
        """Get all pending action items."""
        actions = self.load_actions()
        return [action for action in actions if action.status in [EmailStatus.PENDING, EmailStatus.IN_PROGRESS]]
    
    def get_urgent_actions(self) -> List[EmailAction]:
        """Get urgent action items."""
        actions = self.load_actions()
        return [action for action in actions if action.priority == EmailPriority.URGENT and action.status != EmailStatus.COMPLETED]
    
    def _get_auth_url(self) -> str:
        """Generate OAuth authorization URL."""
        oauth_config = self.config.email.get("oauth", {})
        client_id = oauth_config.get("client_id", "")
        redirect_uri = oauth_config.get("redirect_uri", "http://localhost:8080/auth/callback")
        scopes = oauth_config.get("scopes", ["Mail.Read", "Mail.ReadWrite"])
        
        scope_string = " ".join(scopes)
        return f"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id={client_id}&response_type=code&redirect_uri={redirect_uri}&scope={scope_string}&response_mode=query"
    
    def _refresh_access_token(self) -> str:
        """Refresh the access token using refresh token."""
        oauth_config = self.config.email.get("oauth", {})
        client_id = oauth_config.get("client_id", "")
        client_secret = oauth_config.get("client_secret", "")
        refresh_token = oauth_config.get("refresh_token", "")
        
        if not refresh_token:
            raise ValueError("No refresh token available")
        
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        
        response = self._make_request("/common/oauth2/v2.0/token", method="POST", data=data)
        return response.get("access_token", "")
    
    def _ensure_valid_token(self) -> None:
        """Ensure we have a valid access token, refresh if needed."""
        if not self.access_token:
            # Try to refresh token
            try:
                self.access_token = self._refresh_access_token()
                self.headers["Authorization"] = f"Bearer {self.access_token}"
            except Exception as e:
                print(f"Could not refresh access token: {e}")
    
    def _get_responded_emails(self, emails: List[Dict]) -> List[Dict]:
        """Get emails that have been responded to (have In-Reply-To header)."""
        return [email for email in emails if email.get("inReplyTo")]
    
    def _get_pending_response_emails(self, emails: List[Dict]) -> List[Dict]:
        """Get emails that need a response (no In-Reply-To header)."""
        return [email for email in emails if not email.get("inReplyTo")]
    
    def _group_emails_by_thread(self, emails: List[Dict]) -> Dict[str, List[Dict]]:
        """Group emails by conversation thread."""
        threads = {}
        for email in emails:
            conversation_id = email.get("conversationId", "unknown")
            if conversation_id not in threads:
                threads[conversation_id] = []
            threads[conversation_id].append(email)
        
        # Sort emails in each thread by date
        for thread_id in threads:
            threads[thread_id].sort(key=lambda e: e.get("receivedDateTime", ""))
        
        return threads
    
    def _get_sent_responses(self) -> List[Dict]:
        """Get sent emails that are responses to other emails."""
        endpoint = "/me/mailFolders/SentItems/messages?$filter=inReplyTo ne null&$orderby=sentDateTime desc"
        response = self._make_request(endpoint)
        return response.get("value", [])
    
    def _get_urgent_pending_emails(self, emails: List[Dict]) -> List[Dict]:
        """Get urgent emails that haven't been responded to."""
        urgent_emails = [e for e in emails if e.get("importance") == "high"]
        return [e for e in urgent_emails if not e.get("inReplyTo")]
    
    def _get_urgent_responded_emails(self, emails: List[Dict]) -> List[Dict]:
        """Get urgent emails that have been responded to."""
        urgent_emails = [e for e in emails if e.get("importance") == "high"]
        return [e for e in urgent_emails if e.get("inReplyTo")]
    
    def generate_enhanced_summary(self, emails: List[Dict], actions: List[EmailAction]) -> EmailSummary:
        """Generate enhanced email summary with response tracking."""
        today = date.today()
        
        # Basic counts
        urgent_count = len([e for e in emails if e.get("importance") == "high"])
        meetings_count = len([e for e in emails if "meeting" in e.get("subject", "").lower()])
        updates_count = len([e for e in emails if any(word in e.get("subject", "").lower() for word in ["update", "status", "progress"])])
        deferred_count = len([a for a in actions if a.status == EmailStatus.DEFERRED])
        
        # Response tracking
        responded_emails = self._get_responded_emails(emails)
        pending_emails = self._get_pending_response_emails(emails)
        
        # Categorize emails
        urgent_emails = [e for e in emails if e.get("importance") == "high"]
        meeting_requests = [e for e in emails if "meeting" in e.get("subject", "").lower()]
        project_updates = [e for e in emails if any(word in e.get("subject", "").lower() for word in ["update", "status", "progress"])]
        
        # Create enhanced summary
        summary = EmailSummary(
            date=today,
            total_emails=len(emails),
            urgent_count=urgent_count,
            action_items_count=len(actions),
            meetings_count=meetings_count,
            updates_count=updates_count,
            deferred_count=deferred_count,
            actions=actions,
            urgent_emails=urgent_emails,
            meeting_requests=meeting_requests,
            project_updates=project_updates
        )
        
        # Add response tracking attributes
        summary.responded_count = len(responded_emails)
        summary.pending_response_count = len(pending_emails)
        summary.no_response_needed_count = len(emails) - len(responded_emails) - len(pending_emails)
        
        return summary 