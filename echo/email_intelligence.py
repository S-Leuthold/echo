"""
Email Intelligence System for Echo Context Briefing

This module provides intelligent email categorization for actionable context briefings.
Transforms generic email processing into structured, actionable insights.

Key Features:
- Categorizes emails into Information, Action Items, Response Needed
- Sunday lookback (72 hours) vs normal 24-hour timeframe
- Person/context tagging with thread tracking
- Urgency calculation and aging analysis
"""

from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from echo.claude_client import ClaudeClient

logger = logging.getLogger(__name__)


# Pydantic models for structured outputs
class EmailActionItem(BaseModel):
    content: str = Field(description="The specific action item or task")
    person: str = Field(description="Person or sender associated with this action")
    due_date: str = Field(description="When this needs to be completed")
    timeline: str = Field(description="How urgent/timeline for completion")
    type: str = Field(description="Type of action (review, respond, complete, etc.)")
    priority: str = Field(description="Priority level (high, medium, low)")
    
class EmailInformation(BaseModel):
    content: str = Field(description="The informational content or update")
    person: str = Field(description="Person or source of the information")
    relevance: str = Field(description="Why this information is relevant")
    type: str = Field(description="Type of information (announcement, update, etc.)")
    
class EmailResponseNeeded(BaseModel):
    content: str = Field(description="What response is needed")
    person: str = Field(description="Who needs the response")
    urgency: str = Field(description="How urgent the response is")
    context: str = Field(description="Context or background for the response")
    type: str = Field(description="Type of response needed")

class EmailCategorization(BaseModel):
    action_items: List[EmailActionItem] = Field(description="Emails requiring specific actions")
    information: List[EmailInformation] = Field(description="Informational emails for awareness")
    response_needed: List[EmailResponseNeeded] = Field(description="Emails requiring responses")
    
    class Config:
        # Required for OpenAI Response API
        extra = "forbid"


class EmailCategorizer:
    """Intelligent email categorization for actionable context briefings."""
    
    # Constants for consistent behavior - increased for Claude's better context handling
    MAX_ITEMS_PER_CATEGORY = 15  # Increased from 5 to leverage Claude's capabilities
    MAX_EMAILS_FOR_ANALYSIS = 50  # Increased from 20 for better email analysis
    BODY_PREVIEW_MAX_LENGTH = 400
    DEFAULT_TIMEFRAME_HOURS = 24
    SUNDAY_EXTENDED_HOURS = 72
    SUNDAY_WEEKDAY = 6  # datetime.weekday() returns 6 for Sunday
    
    def __init__(self, claude_client: ClaudeClient) -> None:
        """Initialize email categorizer with Claude client.
        
        Args:
            claude_client: Configured Claude client instance
        """
        if not claude_client:
            raise ValueError("Claude client is required")
        self.client = claude_client
        
    def categorize_emails(
        self, 
        emails: List[Dict[str, Any]], 
        timeframe_hours: int = DEFAULT_TIMEFRAME_HOURS, 
        sunday_lookback: int = SUNDAY_EXTENDED_HOURS
    ) -> Dict[str, Any]:
        """
        Main entry point for email categorization using OpenAI Response API.
        
        Args:
            emails: List of email objects from email processor
            timeframe_hours: Normal lookback period (default: 24 hours)
            sunday_lookback: Extended lookback for Sundays (default: 72 hours)
            
        Returns:
            Dict containing categorized emails and metadata
        """
        # Validate input
        if not isinstance(emails, list):
            raise TypeError("emails must be a list")
            
        try:
            # Filter emails by timeframe
            filtered_emails = self._filter_by_timeframe(emails, timeframe_hours, sunday_lookback)
            
            if not filtered_emails:
                return self._empty_response()
            
            # Use structured output for all categorization
            categorization = self._categorize_emails_structured(filtered_emails)
            
            logger.info(
                f"Email categorization complete: {len(categorization.information)} info, "
                f"{len(categorization.action_items)} actions, "
                f"{len(categorization.response_needed)} responses needed"
            )
            
            return self._build_categorization_response(
                categorization, filtered_emails, emails, timeframe_hours, sunday_lookback
            )
            
        except (TypeError, ValueError) as e:
            logger.error(f"Email categorization validation failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Email categorization failed: {e}")
            error_response = self._error_response(str(e))
            error_response['metadata']['total_raw_emails'] = len(emails) if emails else 0
            return error_response
    
    def _build_categorization_response(
        self,
        categorization: EmailCategorization,
        filtered_emails: List[Dict[str, Any]],
        raw_emails: List[Dict[str, Any]],
        timeframe_hours: int,
        sunday_lookback: int
    ) -> Dict[str, Any]:
        """Build the final categorization response with metadata.
        
        Args:
            categorization: Categorized email data from OpenAI
            filtered_emails: Emails after timeframe filtering
            raw_emails: Original email list
            timeframe_hours: Normal timeframe hours
            sunday_lookback: Sunday extended hours
            
        Returns:
            Formatted response dictionary
        """
        return {
            'information': [
                item.model_dump() 
                for item in categorization.information[:self.MAX_ITEMS_PER_CATEGORY]
            ],
            'action_items': [
                item.model_dump() 
                for item in categorization.action_items[:self.MAX_ITEMS_PER_CATEGORY]
            ],
            'response_needed': [
                item.model_dump() 
                for item in categorization.response_needed[:self.MAX_ITEMS_PER_CATEGORY]
            ],
            'metadata': {
                'total_processed': len(filtered_emails),
                'total_raw_emails': len(raw_emails),
                'timeframe_hours': self._get_effective_timeframe(timeframe_hours, sunday_lookback),
                'categories_generated_at': datetime.now().isoformat(),
                'is_sunday_lookback': datetime.now().weekday() == self.SUNDAY_WEEKDAY
            }
        }
    
    def _categorize_emails_structured(self, emails: List[Dict[str, Any]]) -> EmailCategorization:
        """Use OpenAI Response API for structured email categorization."""
        emails_text = self._format_emails_for_analysis(emails)
        
        prompt = f"""
        Analyze the following emails and categorize them into three types:
        
        1. **Information**: Updates, announcements, notifications that don't require action
        2. **Action Items**: Tasks, requests, or items requiring specific actions
        3. **Response Needed**: Emails that require a response from the user
        
        For each email, extract the key details and categorize appropriately.
        
        EMAILS TO ANALYZE:
        {emails_text}
        
        Provide a comprehensive categorization with accurate person attribution and priority assessment.
        """
        
        try:
            response = self.client.beta.chat.completions.parse(
                model="claude-sonnet-4-20250514",
                messages=[{"role": "user", "content": prompt}],
                response_format=EmailCategorization,
                temperature=0.1,
                max_tokens=4000
            )
            
            return response.choices[0].message.parsed
            
        except Exception as e:
            logger.error(f"Error in structured email categorization: {e}")
            # Return empty structure on error
            return EmailCategorization(
                action_items=[],
                information=[],
                response_needed=[]
            )
    
    def _filter_by_timeframe(
        self, 
        emails: List[Dict[str, Any]], 
        hours: int, 
        sunday_hours: int
    ) -> List[Dict[str, Any]]:
        """Apply timeframe filter with Sunday extension.
        
        Args:
            emails: List of email dictionaries to filter
            hours: Normal timeframe in hours
            sunday_hours: Extended timeframe for Sundays
            
        Returns:
            Filtered list of emails within timeframe
        """
        if not emails:
            return []
            
        current_time = datetime.now()
        is_sunday = current_time.weekday() == self.SUNDAY_WEEKDAY
        lookback_hours = sunday_hours if is_sunday else hours
        cutoff = current_time - timedelta(hours=lookback_hours)
        
        logger.info(
            f"Filtering emails with {lookback_hours}h lookback "
            f"({'Sunday extended' if is_sunday else 'normal'})"
        )
        
        filtered = []
        for email in emails:
            if not isinstance(email, dict):
                logger.warning(f"Invalid email type: {type(email)}, expected dict")
                continue
                
            # Parse email timestamp - handle multiple possible formats
            timestamp_fields = ['receivedDateTime', 'received_time', 'dateTime']
            email_time = None
            
            for field in timestamp_fields:
                if field in email:
                    email_time = self._parse_email_timestamp(email[field])
                    if email_time:
                        break
            
            if email_time and email_time > cutoff:
                filtered.append(email)
        
        logger.info(f"Filtered {len(filtered)} emails from {len(emails)} total")
        return filtered
    
    def _parse_email_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse email timestamp from various formats."""
        if not timestamp_str:
            return None
            
        try:
            # Try ISO format first (Microsoft Graph API format)
            if 'T' in timestamp_str:
                # Handle Graph API format with Z suffix
                if timestamp_str.endswith('Z'):
                    timestamp_str = timestamp_str[:-1] + '+00:00'
                
                parsed_dt = datetime.fromisoformat(timestamp_str)
                # Convert to naive datetime for consistent comparison
                return parsed_dt.replace(tzinfo=None)
            
            # Try other common formats
            for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%m/%d/%Y %H:%M:%S']:
                try:
                    return datetime.strptime(timestamp_str, fmt)
                except ValueError:
                    continue
                    
            logger.warning(f"Could not parse timestamp: {timestamp_str}")
            return None
            
        except Exception as e:
            logger.warning(f"Timestamp parsing failed for '{timestamp_str}': {e}")
            return None
    
    
    def _format_emails_for_analysis(self, emails: List[Dict]) -> str:
        """Format emails for LLM analysis, leveraging Graph API metadata."""
        formatted_emails = []
        
        # Limit emails to stay within token limits
        limited_emails = emails[:self.MAX_EMAILS_FOR_ANALYSIS]
        
        for i, email in enumerate(limited_emails, 1):
            # Extract rich Graph API metadata
            sender = self._extract_sender_info(email)
            subject = email.get('subject', 'No Subject')
            body = self._extract_body_preview(email)
            timestamp = self._format_timestamp(email.get('receivedDateTime', ''))
            
            # Leverage Graph API metadata for better categorization
            importance = email.get('importance', 'normal')  # normal, low, high
            is_read = email.get('isRead', False)
            has_recipients = len(email.get('toRecipients', [])) > 1  # CC/group email indicator
            conversation_id = email.get('conversationId', 'unknown')
            
            # Enhance context with Graph API insights
            metadata_context = []
            if importance == 'high':
                metadata_context.append("[HIGH IMPORTANCE]")
            if not is_read:
                metadata_context.append("[UNREAD]")
            if has_recipients:
                metadata_context.append("[GROUP EMAIL]")
            
            metadata_str = " ".join(metadata_context)
            
            formatted_emails.append(f"""
EMAIL {i}: {metadata_str}
From: {sender}
Subject: {subject}
Received: {timestamp}
Content: {body}
""")
        
        return "\n".join(formatted_emails)
    
    def _extract_sender_info(self, email: Dict) -> str:
        """Extract rich sender information from Graph API data."""
        if 'from' in email and isinstance(email['from'], dict):
            if 'emailAddress' in email['from']:
                sender_data = email['from']['emailAddress']
                name = sender_data.get('name', '')
                address = sender_data.get('address', 'Unknown Sender')
                
                # Return name if available, otherwise just email
                if name and name != address:
                    return f"{name} <{address}>"
                return address
            return email['from'].get('address', 'Unknown Sender')
        return email.get('sender', email.get('from', 'Unknown Sender'))
    
    def _extract_body_preview(self, email: Dict) -> str:
        """Extract optimized body preview from Graph API data."""
        # Graph API provides bodyPreview which is already truncated and clean
        body = email.get('bodyPreview', '')
        
        if not body:
            # Fallback to other body fields if bodyPreview not available
            body = (email.get('body', {}).get('content') if isinstance(email.get('body'), dict) else 
                   email.get('body') or email.get('preview') or 'No content available')
        
        # Graph API bodyPreview is usually already optimal length (~255 chars)
        # Only truncate if significantly longer
        if len(body) > self.BODY_PREVIEW_MAX_LENGTH:
            return body[:self.BODY_PREVIEW_MAX_LENGTH] + "..."
        return body
    
    
    def _format_timestamp(self, timestamp_str: str) -> str:
        """Format timestamp for human-readable context."""
        if not timestamp_str:
            return "Unknown time"
            
        try:
            # Parse the timestamp
            email_time = self._parse_email_timestamp(timestamp_str)
            if not email_time:
                return timestamp_str
            
            # Calculate relative time (handle timezone differences)
            now = datetime.now()
            
            # Remove timezone info for comparison if present
            if email_time.tzinfo:
                email_time = email_time.replace(tzinfo=None)
            
            diff = now - email_time
            
            if diff.days > 1:
                return f"{diff.days} days ago"
            elif diff.days == 1:
                return "Yesterday"
            elif diff.seconds > 3600:
                hours = diff.seconds // 3600
                return f"{hours} hours ago"
            elif diff.seconds > 60:
                minutes = diff.seconds // 60
                return f"{minutes} minutes ago"
            else:
                return "Just now"
                
        except Exception:
            return timestamp_str
    
    def _get_effective_timeframe(self, normal_hours: int, sunday_hours: int) -> int:
        """Get the timeframe actually used based on day of week.
        
        Args:
            normal_hours: Regular timeframe hours
            sunday_hours: Extended Sunday timeframe hours
            
        Returns:
            Effective timeframe hours for current day
        """
        return sunday_hours if datetime.now().weekday() == self.SUNDAY_WEEKDAY else normal_hours
    
    def _empty_response(self) -> Dict[str, Any]:
        """Return empty response structure."""
        return {
            'information': [],
            'action_items': [],
            'response_needed': [],
            'metadata': {
                'total_processed': 0,
                'total_raw_emails': 0,
                'timeframe_hours': 24,
                'categories_generated_at': datetime.now().isoformat(),
                'is_sunday_lookback': False
            }
        }
    
    def _error_response(self, error_message: str) -> Dict[str, Any]:
        """Return error response structure."""
        return {
            'information': [],
            'action_items': [],
            'response_needed': [],
            'metadata': {
                'error': error_message,
                'total_processed': 0,
                'total_raw_emails': 0,
                'timeframe_hours': 24,
                'categories_generated_at': datetime.now().isoformat(),
                'is_sunday_lookback': False
            }
        }