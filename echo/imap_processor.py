"""
IMAP Email Processor for Echo

Supports multiple email providers (Outlook, Gmail, Yahoo, etc.)
with full response tracking and action item extraction.
"""

import imaplib
import email
import json
import os
from datetime import date, datetime, timedelta
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from email.header import decode_header
import re
from pathlib import Path

from .models import Config
from .prompt_engine import build_action_extraction_prompt, parse_action_extraction_response


@dataclass
class EmailAction:
    """Email action item with priority and status tracking."""
    id: str
    description: str
    sender: str
    email_subject: str
    email_date: str
    priority: str = "normal"  # urgent, high, normal, low
    status: str = "pending"   # pending, completed, deferred
    created_date: str = field(default_factory=lambda: date.today().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Serializes the EmailAction into a JSON-safe dictionary."""
        return {
            "id": self.id,
            "description": self.description,
            "sender": self.sender,
            "email_subject": self.email_subject,
            "email_date": self.email_date,
            "priority": self.priority,
            "status": self.status,
            "created_date": self.created_date,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EmailAction':
        """Creates an EmailAction from a dictionary."""
        return cls(
            id=data["id"],
            description=data["description"],
            sender=data["sender"],
            email_subject=data["email_subject"],
            email_date=data["email_date"],
            priority=data.get("priority", "normal"),
            status=data.get("status", "pending"),
            created_date=data.get("created_date", date.today().isoformat()),
        )


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


class IMAPEmailProcessor:
    """Universal IMAP email processor supporting multiple providers."""
    
    # Email provider configurations
    PROVIDERS = {
        "outlook": {
            "server": "outlook.office365.com",
            "port": 993,
            "use_ssl": True
        },
        "gmail": {
            "server": "imap.gmail.com",
            "port": 993,
            "use_ssl": True
        },
        "yahoo": {
            "server": "imap.mail.yahoo.com",
            "port": 993,
            "use_ssl": True
        },
        "icloud": {
            "server": "imap.mail.me.com",
            "port": 993,
            "use_ssl": True
        }
    }
    
    def __init__(self, config: Config):
        self.config = config
        self.email_config = config.email.get("imap", {})
        self.provider = self.email_config.get("provider", "outlook")
        self.server = self.email_config.get("server") or self.PROVIDERS.get(self.provider, {}).get("server")
        self.port = self.email_config.get("port") or self.PROVIDERS.get(self.provider, {}).get("port", 993)
        self.username = self.email_config.get("username", "")
        self.password = self.email_config.get("password", "")
        self.use_ssl = self.email_config.get("use_ssl", True)
        
        # Email processing settings
        self.important_senders = config.email.get("important_senders", [])
        self.urgent_keywords = config.email.get("urgent_keywords", [])
        self.action_keywords = config.email.get("action_keywords", [])
        
        # Storage
        self.actions_file = Path("data/email_actions.json")
        self.actions_file.parent.mkdir(exist_ok=True)
    
    def _connect_imap(self):
        """Connect to IMAP server."""
        if not self.username or not self.password:
            raise ValueError("IMAP username and password must be configured")
        
        if not self.server:
            raise ValueError("IMAP server not configured")
        
        try:
            if self.use_ssl:
                imap = imaplib.IMAP4_SSL(self.server, self.port)
            else:
                imap = imaplib.IMAP4(self.server, self.port)
            
            imap.login(self.username, self.password)
            return imap
        except Exception as e:
            raise ConnectionError(f"Failed to connect to IMAP server: {e}")
    
    def _parse_email_message(self, msg_data: bytes) -> Dict[str, Any]:
        """Parse email message into structured data."""
        email_message = email.message_from_bytes(msg_data)
        
        # Extract headers
        subject = self._decode_header(email_message.get("Subject", ""))
        sender = self._decode_header(email_message.get("From", ""))
        date_str = email_message.get("Date", "")
        message_id = email_message.get("Message-ID", "")
        in_reply_to = email_message.get("In-Reply-To", "")
        
        # Extract body
        body = self._extract_body(email_message)
        
        # Determine importance
        importance = "normal"
        if any(keyword.lower() in subject.lower() for keyword in self.urgent_keywords):
            importance = "high"
        
        # Check if from important sender
        if any(sender.lower() in sender.lower() for sender in self.important_senders):
            importance = "high"
        
        return {
            "id": message_id,
            "subject": subject,
            "sender": sender,
            "body": body,
            "date": date_str,
            "importance": importance,
            "in_reply_to": in_reply_to,
            "message_id": message_id
        }
    
    def _decode_header(self, header: str) -> str:
        """Decode email header properly."""
        try:
            decoded_parts = decode_header(header)
            decoded_string = ""
            for part, encoding in decoded_parts:
                if isinstance(part, bytes):
                    decoded_string += part.decode(encoding or 'utf-8', errors='ignore')
                else:
                    decoded_string += str(part)
            return decoded_string
        except Exception:
            return str(header)
    
    def _extract_body(self, email_message) -> str:
        """Extract email body text."""
        body = ""
        
        if email_message.is_multipart():
            for part in email_message.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            body += payload.decode('utf-8', errors='ignore')
                    except Exception:
                        pass
        else:
            try:
                payload = email_message.get_payload(decode=True)
                if payload:
                    body = payload.decode('utf-8', errors='ignore')
                else:
                    body = str(email_message.get_payload())
            except Exception:
                body = str(email_message.get_payload())
        
        return body
    
    def get_emails(self, folder: str = "INBOX", days: int = 7) -> List[Dict[str, Any]]:
        """Get emails from specified folder within date range."""
        imap = self._connect_imap()
        
        try:
            # Select folder
            status, messages = imap.select(folder)
            if status != "OK":
                raise Exception(f"Failed to select folder {folder}")
            
            # Search for recent emails
            date_criteria = (datetime.now() - timedelta(days=days)).strftime("%d-%b-%Y")
            status, message_numbers = imap.search(None, f'SINCE {date_criteria}')
            
            if status != "OK" or not message_numbers or not message_numbers[0]:
                raise Exception("Failed to search emails")
            
            emails = []
            message_list = message_numbers[0].split()
            for num in message_list:
                try:
                    status, msg_data = imap.fetch(num, "(RFC822)")
                    if status == "OK" and msg_data and len(msg_data) > 0:
                        msg_bytes = msg_data[0][1]
                        if isinstance(msg_bytes, bytes):
                            email_data = self._parse_email_message(msg_bytes)
                            emails.append(email_data)
                except Exception as e:
                    print(f"Error processing email {num}: {e}")
                    continue
            
            return emails
            
        finally:
            imap.logout()
    
    def get_important_emails(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get important emails based on sender and keywords."""
        emails = self.get_emails("INBOX", days)
        
        important_emails = []
        for email_data in emails:
            # Check if from important sender
            if any(sender.lower() in email_data["sender"].lower() for sender in self.important_senders):
                important_emails.append(email_data)
                continue
            
            # Check for urgent keywords
            if any(keyword.lower() in email_data["subject"].lower() for keyword in self.urgent_keywords):
                important_emails.append(email_data)
                continue
            
            # Check for action keywords
            if any(keyword.lower() in email_data["body"].lower() for keyword in self.action_keywords):
                important_emails.append(email_data)
                continue
        
        return important_emails
    
    def get_sent_emails(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get sent emails for response tracking."""
        try:
            return self.get_emails("Sent Items", days)
        except Exception:
            # Try alternative sent folder names
            for folder in ["Sent", "Sent Mail", "Sent Items"]:
                try:
                    return self.get_emails(folder, days)
                except Exception:
                    continue
            return []
    
    def _get_responded_emails(self, emails: List[Dict]) -> List[Dict]:
        """Get emails that have been responded to."""
        return [email for email in emails if email.get("in_reply_to")]
    
    def _get_pending_response_emails(self, emails: List[Dict]) -> List[Dict]:
        """Get emails that need a response."""
        return [email for email in emails if not email.get("in_reply_to")]
    
    def extract_action_items(self, emails: List[Dict]) -> List[EmailAction]:
        """Extract action items from emails using LLM."""
        if not emails:
            return []
        
        # Build prompt for action extraction
        prompt = build_action_extraction_prompt(emails)
        
        # For now, use simple keyword-based extraction
        # TODO: Integrate with LLM for better extraction
        actions = []
        
        for email_data in emails:
            # Simple keyword-based action detection
            body_lower = email_data["body"].lower()
            subject_lower = email_data["subject"].lower()
            
            action_keywords = ["please", "can you", "need", "review", "send", "schedule", "meeting"]
            
            for keyword in action_keywords:
                if keyword in body_lower or keyword in subject_lower:
                    # Create action item
                    action = EmailAction(
                        id=f"action_{len(actions)}_{email_data['id']}",
                        description=f"Action from email: {email_data['subject']}",
                        sender=email_data["sender"],
                        email_subject=email_data["subject"],
                        email_date=email_data["date"],
                        priority=email_data["importance"]
                    )
                    actions.append(action)
                    break
        
        return actions
    
    def generate_daily_summary(self, emails: List[Dict], actions: List[EmailAction]) -> EmailSummary:
        """Generate daily email summary."""
        today = date.today()
        
        # Count emails by type
        urgent_count = len([e for e in emails if e.get("importance") == "high"])
        meetings_count = len([e for e in emails if "meeting" in e.get("subject", "").lower()])
        updates_count = len([e for e in emails if any(word in e.get("subject", "").lower() for word in ["update", "status", "progress"])])
        deferred_count = len([a for a in actions if a.status == "deferred"])
        
        # Categorize emails
        urgent_emails = [e for e in emails if e.get("importance") == "high"]
        meeting_requests = [e for e in emails if "meeting" in e.get("subject", "").lower()]
        project_updates = [e for e in emails if any(word in e.get("subject", "").lower() for word in ["update", "status", "progress"])]
        
        # Response tracking
        responded_emails = self._get_responded_emails(emails)
        pending_emails = self._get_pending_response_emails(emails)
        
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
            project_updates=project_updates,
            responded_count=len(responded_emails),
            pending_response_count=len(pending_emails),
            no_response_needed_count=len(emails) - len(responded_emails) - len(pending_emails)
        )
        
        return summary
    
    def load_actions(self) -> List[EmailAction]:
        """Load saved action items."""
        if not self.actions_file.exists():
            return []
        
        try:
            with open(self.actions_file, 'r') as f:
                data = json.load(f)
            return [EmailAction.from_dict(item) for item in data]
        except Exception as e:
            print(f"Error loading actions: {e}")
            return []
    
    def save_actions(self, actions: List[EmailAction]) -> None:
        """Save action items to file."""
        try:
            with open(self.actions_file, 'w') as f:
                json.dump([action.to_dict() for action in actions], f, indent=2)
        except Exception as e:
            print(f"Error saving actions: {e}")
    
    def get_urgent_actions(self) -> List[EmailAction]:
        """Get urgent action items."""
        actions = self.load_actions()
        return [action for action in actions if action.priority == "urgent" and action.status != "completed"] 