# echo/email_processor.py
import os
import requests
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
import json
from pydantic import BaseModel, Field
import openai

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for structured conversation intelligence
class ActionableInput(BaseModel):
    title: str = Field(description="Brief title of the actionable item")
    details: str = Field(description="Additional context or details")
    urgency: str = Field(description="Urgency level: high, medium, or low")

class Commitment(BaseModel):
    commitment: str = Field(description="What I promised to do")
    to_whom: str = Field(description="Person or group the commitment was made to")
    status: str = Field(description="Status: pending, in_progress, or completed")

class Request(BaseModel):
    request: str = Field(description="What I requested from others")
    from_whom: str = Field(description="Person or group the request was made to")
    status: str = Field(description="Status: pending, in_progress, or completed")

class ConversationIntelligence(BaseModel):
    high_priority_threads: List[str] = Field(description="List of high priority conversation threads")
    stalled_conversations: List[str] = Field(description="Conversations that may need follow-up")
    strategic_insights: List[str] = Field(description="Strategic insights about communication patterns")
    recommended_actions: List[str] = Field(description="Recommended actions based on conversation analysis")

class ConversationAwareResponse(BaseModel):
    conversation_summary: str = Field(max_length=500, description="Brief summary of key conversation themes")
    actionable_inputs: List[ActionableInput] = Field(description="Items requiring action from me")
    my_commitments: List[Commitment] = Field(description="Commitments I made to others")
    my_requests: List[Request] = Field(description="Requests I made to others")
    conversation_intelligence: ConversationIntelligence = Field(description="Strategic conversation insights")

class OutlookEmailProcessor:
    """Handles Outlook email integration and processing via Microsoft Graph API."""
    def __init__(self):
        self.client_id = os.environ.get("ECHO_GRAPH_CLIENT_ID")
        self.client_secret = os.environ.get("ECHO_GRAPH_CLIENT_SECRET")
        self.redirect_uri = os.environ.get("ECHO_GRAPH_REDIRECT_URI", "http://localhost:8080/auth/callback")
        self.token_file = ".token"
        self.base_url = "https://graph.microsoft.com/v1.0"
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        self._load_tokens()
        self._update_headers()
        
        # Email planning state
        self.email_filters = {}
        self.scheduled_emails = {}  # Track scheduled email action items
        self.completed_emails = {}  # Track completed email action items
        
        # Initialize email intelligence system
        self.email_intelligence = None  # Will be initialized when needed

    def _load_tokens(self) -> None:
        """Load access token and refresh token from file with error handling."""
        try:
            if not os.path.exists(self.token_file):
                logger.warning("No token file found")
                return
            with open(self.token_file, "r") as f:
                data = json.load(f)
            
            self.access_token = data.get("access_token")
            self.refresh_token = data.get("refresh_token")
            
            # Calculate expiration time
            expires_in = data.get("expires_in", 3600)  # Default to 1 hour
            if "expires_at" in data:
                self.token_expires_at = datetime.fromisoformat(data["expires_at"])
            else:
                # Calculate expiration from expires_in
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
                
        except Exception as e:
            logger.error(f"Failed to load tokens: {e}")
            self.access_token = None
            self.refresh_token = None
            self.token_expires_at = None

    def _save_tokens(self, token_data: Dict) -> None:
        """Save tokens to file with expiration tracking."""
        try:
            # Calculate expiration time
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.now() + timedelta(seconds=expires_in)
            
            # Add expiration timestamp
            token_data["expires_at"] = expires_at.isoformat()
            
            with open(self.token_file, "w") as f:
                json.dump(token_data, f, indent=2)
                
            # Update instance variables
            self.access_token = token_data.get("access_token")
            self.refresh_token = token_data.get("refresh_token")
            self.token_expires_at = expires_at
            
            logger.info(f"Tokens saved, expires at {expires_at}")
            
        except Exception as e:
            logger.error(f"Failed to save tokens: {e}")

    def _update_headers(self) -> None:
        """Update headers with current access token."""
        if self.access_token:
            self.headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
        else:
            self.headers = {"Content-Type": "application/json"}

    def _is_token_expired(self) -> bool:
        """Check if the current token is expired or will expire soon (within 5 minutes)."""
        if not self.token_expires_at:
            return True
        
        # Consider token expired if it expires within 5 minutes
        buffer_time = timedelta(minutes=5)
        return datetime.now() + buffer_time >= self.token_expires_at

    def _refresh_access_token(self) -> bool:
        """Refresh the access token using the refresh token."""
        if not self.refresh_token:
            logger.error("No refresh token available")
            return False
        
        try:
            token_url = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
            token_data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": self.refresh_token,
                "grant_type": "refresh_token"
            }
            
            response = requests.post(token_url, data=token_data, timeout=30)
            
            if response.status_code == 200:
                new_token_data = response.json()
                
                # Preserve the refresh token if not provided in response
                if "refresh_token" not in new_token_data and self.refresh_token:
                    new_token_data["refresh_token"] = self.refresh_token
                
                self._save_tokens(new_token_data)
                self._update_headers()
                
                logger.info("Access token refreshed successfully")
                return True
            else:
                logger.error(f"Token refresh failed: {response.status_code} {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            return False

    def _ensure_valid_token(self) -> bool:
        """Ensure we have a valid access token, refreshing if necessary."""
        if not self.access_token:
            logger.error("No access token available")
            return False
        
        if self._is_token_expired():
            logger.info("Token expired, attempting refresh...")
            return self._refresh_access_token()
        
        return True

    def _make_api_request(self, endpoint: str, method: str = "GET", data: Dict = None) -> Tuple[bool, Dict]:
        """Make API request with comprehensive error handling and automatic token refresh."""
        try:
            # Ensure we have a valid token
            if not self._ensure_valid_token():
                return False, {"error": "No valid access token available"}
            
            url = f"{self.base_url}{endpoint}"
            
            if method == "GET":
                response = requests.get(url, headers=self.headers, timeout=30)
            elif method == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            if response.status_code == 401:
                logger.warning("Token expired during request, attempting refresh...")
                if self._refresh_access_token():
                    # Retry the request with new token
                    self._update_headers()
                    if method == "GET":
                        response = requests.get(url, headers=self.headers, timeout=30)
                    elif method == "POST":
                        response = requests.post(url, headers=self.headers, json=data, timeout=30)
                    
                    if response.status_code == 200:
                        return True, response.json()
                    else:
                        logger.error(f"Retry failed: {response.status_code} {response.text}")
                        return False, {"error": f"Retry failed: {response.status_code}"}
                else:
                    logger.error("Token refresh failed")
                    return False, {"error": "Token refresh failed", "status_code": 401}
            elif response.status_code == 429:
                logger.warning("Rate limit exceeded, retrying...")
                return False, {"error": "Rate limit exceeded", "status_code": 429}
            elif response.status_code != 200:
                logger.error(f"API request failed: {response.status_code} {response.text}")
                return False, {"error": f"API request failed: {response.status_code}", "status_code": response.status_code}
            
            return True, response.json()
            
        except requests.exceptions.Timeout:
            logger.error("API request timed out")
            return False, {"error": "Request timeout"}
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error: {e}")
            return False, {"error": f"Network error: {e}"}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return False, {"error": f"Unexpected error: {e}"}

    def get_emails(self, days: int = 7, include_conversation_data: bool = True) -> List[Dict]:
        """Get emails from the last N days with optional conversation threading."""
        start_date = datetime.now() - timedelta(days=days)
        start_str = start_date.isoformat() + "Z"
        
        # Include conversation fields for thread-aware processing
        select_fields = "id,subject,from,toRecipients,receivedDateTime,bodyPreview,importance,isRead"
        if include_conversation_data:
            select_fields += ",conversationId,conversationIndex,internetMessageId"
        
        endpoint = f"/me/messages?$filter=receivedDateTime ge {start_str}&$orderby=receivedDateTime desc&$select={select_fields}"
        
        success, result = self._make_api_request(endpoint)
        if success:
            return result.get("value", [])
        else:
            logger.error(f"Failed to fetch emails: {result}")
            return []

    def get_sent_emails(self, days: int = 7) -> List[Dict]:
        """Get sent emails from the last N days to track responses."""
        start_date = datetime.now() - timedelta(days=days)
        start_str = start_date.isoformat() + "Z"
        endpoint = f"/me/mailFolders/SentItems/messages?$filter=sentDateTime ge {start_str}&$orderby=sentDateTime desc"
        
        success, result = self._make_api_request(endpoint)
        if success:
            return result.get("value", [])
        else:
            logger.error(f"Failed to fetch sent emails: {result}")
            return []

    def check_email_responses(self, emails: List[Dict]) -> List[Dict]:
        """
        Check which emails have been responded to by comparing with sent emails.
        Adds a 'responded' field to each email.
        """
        sent_emails = self.get_sent_emails(days=7)
        
        # Create a map of sent email subjects and recipients for quick lookup
        sent_map = {}
        for sent_email in sent_emails:
            subject = sent_email.get('subject', '') or ''
            subject = subject.lower()
            # Extract original subject from reply (remove "Re:", "Fwd:", etc.)
            original_subject = self._extract_original_subject(subject)
            recipients = [r.get('emailAddress', {}).get('address', '') for r in sent_email.get('toRecipients', [])]
            
            for recipient in recipients:
                key = f"{recipient}:{original_subject}"
                sent_map[key] = sent_email.get('sentDateTime')
        
        # Check each incoming email for responses
        for email in emails:
            sender = email.get('from', {}).get('emailAddress', {}).get('address', '')
            subject = email.get('subject', '') or ''
            subject = subject.lower()
            original_subject = self._extract_original_subject(subject)
            
            # Check if we've sent a response to this sender about this subject
            key = f"{sender}:{original_subject}"
            email['responded'] = key in sent_map
            
            # Add response timestamp if available
            if email['responded']:
                email['response_sent_at'] = sent_map[key]
        
        return emails

    def _extract_original_subject(self, subject: str) -> str:
        """Extract the original subject from a reply/forward subject."""
        # Remove common prefixes
        prefixes = ['re:', 'fwd:', 'fw:', 'reply:', 'forward:']
        cleaned_subject = subject.lower()
        
        for prefix in prefixes:
            if cleaned_subject.startswith(prefix):
                cleaned_subject = cleaned_subject[len(prefix):].strip()
                break
        
        return cleaned_subject

    def load_email_filters(self, config: Optional[Dict] = None):
        """Load email filters from configuration with validation."""
        try:
            if config is None:
                logger.warning("No config provided for email filters")
                return
            
            # Handle both dict and Config object
            if hasattr(config, 'email'):
                email_config = config.email
            else:
                email_config = config
            
            if not email_config:
                logger.warning("No email configuration found")
                return
            
            self.email_filters = {
                'important_senders': email_config.get('important_senders', []),
                'urgent_keywords': email_config.get('urgent_keywords', []),
                'action_keywords': email_config.get('action_keywords', []),
                'promotional_keywords': email_config.get('promotional_keywords', []),
                'promotional_domains': email_config.get('promotional_domains', [])
            }
            
            logger.info(f"Loaded email filters: {len(self.email_filters['important_senders'])} important senders, {len(self.email_filters['urgent_keywords'])} urgent keywords")
            
        except Exception as e:
            logger.error(f"Failed to load email filters: {e}")
            self.email_filters = {}

    def filter_emails(self, emails: List[Dict]) -> List[Dict]:
        """Filter emails based on importance and relevance."""
        if not self.email_filters:
            logger.warning("No email filters loaded, returning all emails")
            return emails
        
        filtered_emails = []
        
        for email in emails:
            # Skip if already responded to
            if email.get('responded', False):
                continue
            
            # Skip calendar invites
            subject = email.get('subject', '') or ''
            if any(keyword in subject.lower() for keyword in ['accepted', 'declined', 'canceled', 'tentative']):
                continue
            
            # Skip promotional emails
            sender = email.get('from', {}).get('emailAddress', {}).get('address', '') or ''
            if self._is_promotional_email(sender, subject):
                continue
            
            # Check if it's an important email
            is_important = self._is_important_email(sender, subject)
            is_urgent = self._is_urgent_email(subject)
            has_action = self._has_action_keywords(subject)
            
            if is_important or is_urgent or has_action:
                email['importance'] = 'high' if is_important else 'medium'
                email['urgency'] = 'high' if is_urgent else 'medium'
                email['has_action'] = has_action
                filtered_emails.append(email)
        
        return filtered_emails

    def _is_promotional_email(self, sender: str, subject: str) -> bool:
        """Check if email is promotional/junk."""
        sender_lower = (sender or '').lower()
        subject_lower = (subject or '').lower()
        
        # Check promotional domains
        for domain in self.email_filters.get('promotional_domains', []):
            if domain.lower() in sender_lower:
                return True
        
        # Check promotional keywords
        for keyword in self.email_filters.get('promotional_keywords', []):
            if keyword.lower() in subject_lower:
                return True
        
        return False

    def _is_important_email(self, sender: str, subject: str) -> bool:
        """Check if email is from important sender."""
        sender_lower = (sender or '').lower()
        
        for important_sender in self.email_filters.get('important_senders', []):
            if important_sender.lower() in sender_lower:
                return True
        
        return False

    def _is_urgent_email(self, subject: str) -> bool:
        """Check if email contains urgent keywords."""
        subject_lower = (subject or '').lower()
        
        for keyword in self.email_filters.get('urgent_keywords', []):
            if keyword.lower() in subject_lower:
                return True
        
        return False

    def _has_action_keywords(self, subject: str) -> bool:
        """Check if email contains action keywords."""
        subject_lower = (subject or '').lower()
        
        for keyword in self.email_filters.get('action_keywords', []):
            if keyword.lower() in subject_lower:
                return True
        
        return False

    # Thread-Aware Conversation Processing Methods
    
    def group_emails_by_conversation(self, emails: List[Dict]) -> Dict[str, List[Dict]]:
        """Group emails by conversation thread using Graph API conversationId."""
        conversations = {}
        
        for email in emails:
            conversation_id = email.get('conversationId')
            if not conversation_id:
                # Fallback: create conversation ID from subject + participants
                conversation_id = self._generate_fallback_conversation_id(email)
            
            if conversation_id not in conversations:
                conversations[conversation_id] = []
            
            # Enrich email with thread position and metadata
            email['conversation_id'] = conversation_id
            email['thread_position'] = email.get('conversationIndex', 0)
            
            conversations[conversation_id].append(email)
        
        # Sort each conversation thread by received time (chronological order)
        for conv_id in conversations:
            conversations[conv_id].sort(key=lambda x: x.get('receivedDateTime', ''))
            
        logger.info(f"Grouped {len(emails)} emails into {len(conversations)} conversations")
        return conversations

    def _generate_fallback_conversation_id(self, email: Dict) -> str:
        """Generate a fallback conversation ID when Graph API doesn't provide one."""
        subject = email.get('subject', '').lower()
        # Clean subject of reply/forward prefixes
        subject = self._extract_original_subject(subject)
        
        # Get primary participant (sender for received, first recipient for sent)
        participants = []
        if email.get('from'):
            participants.append(email['from']['emailAddress']['address'])
        if email.get('toRecipients'):
            participants.extend([r['emailAddress']['address'] for r in email['toRecipients']])
        
        # Sort participants for consistency 
        participants = sorted(list(set(participants)))
        participant_key = '_'.join(participants[:2])  # Limit to first 2 participants
        
        return f"fallback_{hash(subject + participant_key)}"

    def extract_conversation_context(self, thread: List[Dict]) -> Dict:
        """Extract conversation-level context and metadata from thread."""
        if not thread:
            return {}
        
        # Sort thread chronologically
        thread.sort(key=lambda x: x.get('receivedDateTime', ''))
        
        # Identify conversation participants
        participants = set()
        for email in thread:
            if email.get('from'):
                participants.add(email['from']['emailAddress']['address'])
            if email.get('toRecipients'):
                participants.update([r['emailAddress']['address'] for r in email['toRecipients']])
        
        # Determine conversation topic from first email's subject
        conversation_topic = thread[0].get('subject') or 'No Subject'
        conversation_topic = self._extract_original_subject(conversation_topic.lower())
        
        # Analyze conversation state and activity
        latest_email = thread[-1]
        conversation_start = thread[0].get('receivedDateTime', '')
        last_activity = latest_email.get('receivedDateTime', '')
        
        # Determine who needs to respond next
        user_email = self._get_user_email_from_token()  # We'll implement this
        latest_sender = latest_email.get('from', {}).get('emailAddress', {}).get('address', '')
        response_required_from = user_email if latest_sender != user_email else 'external'
        
        # Assess conversation priority based on thread dynamics
        conversation_priority = self._assess_conversation_priority(thread)
        
        # Determine conversation state
        conversation_state = self._determine_conversation_state(thread)
        
        return {
            'conversation_id': thread[0].get('conversation_id', ''),
            'topic': conversation_topic,
            'participants': list(participants),
            'thread_length': len(thread),
            'conversation_start_date': conversation_start,
            'last_activity': last_activity,
            'response_required_from': response_required_from,
            'conversation_priority': conversation_priority,
            'conversation_state': conversation_state,
            'latest_sender': latest_sender,
            'thread_messages': len(thread)
        }

    def _get_user_email_from_token(self) -> str:
        """Extract user's email from the access token or Graph API."""
        # For now, make a simple API call to get user info
        # In production, this could be cached
        try:
            endpoint = "/me?$select=mail,userPrincipalName"
            success, result = self._make_api_request(endpoint)
            if success:
                return result.get('mail') or result.get('userPrincipalName', '')
        except Exception as e:
            logger.warning(f"Failed to get user email: {e}")
        
        return ""

    def _assess_conversation_priority(self, thread: List[Dict]) -> str:
        """Assess conversation priority based on thread dynamics."""
        if not thread:
            return 'low'
        
        # Factors that increase priority:
        priority_score = 0
        
        # Recent activity (within 24 hours)
        latest_email = thread[-1]
        latest_time = datetime.fromisoformat(latest_email.get('receivedDateTime', '').replace('Z', '+00:00'))
        if datetime.now().replace(tzinfo=latest_time.tzinfo) - latest_time < timedelta(hours=24):
            priority_score += 2
        
        # Thread length (longer threads = more important)
        if len(thread) > 5:
            priority_score += 2
        elif len(thread) > 2:
            priority_score += 1
        
        # High importance emails in thread
        for email in thread:
            if email.get('importance') == 'high':
                priority_score += 3
                break
        
        # Keywords in subject or body indicating urgency
        for email in thread:
            subject = (email.get('subject') or '').lower()
            body = (email.get('bodyPreview') or '').lower()
            
            urgent_indicators = ['urgent', 'asap', 'deadline', 'critical', 'important', 'please respond']
            if any(indicator in subject or indicator in body for indicator in urgent_indicators):
                priority_score += 2
                break
        
        # Map score to priority level
        if priority_score >= 6:
            return 'critical'
        elif priority_score >= 4:
            return 'high'
        elif priority_score >= 2:
            return 'medium'
        else:
            return 'low'

    def _determine_conversation_state(self, thread: List[Dict]) -> str:
        """Determine the current state of the conversation."""
        if not thread:
            return 'unknown'
        
        latest_email = thread[-1]
        latest_time = datetime.fromisoformat(latest_email.get('receivedDateTime', '').replace('Z', '+00:00'))
        time_since_last = datetime.now().replace(tzinfo=latest_time.tzinfo) - latest_time
        
        # If conversation hasn't had activity in >7 days, consider it stale
        if time_since_last > timedelta(days=7):
            return 'stale'
        
        # If last message was >3 days ago, it's waiting
        if time_since_last > timedelta(days=3):
            return 'waiting'
        
        # Check if conversation seems resolved (look for closing words)
        latest_body = (latest_email.get('bodyPreview') or '').lower()
        closing_indicators = ['thank you', 'thanks', 'perfect', 'sounds good', 'got it', 'received', 'complete']
        
        if any(indicator in latest_body for indicator in closing_indicators):
            return 'resolved'
        
        # Default to active if recent activity
        return 'active'

    def get_conversation_summary(self, days: int = 7) -> Dict:
        """Get a comprehensive summary of all email conversations."""
        # Get both received and sent emails for complete conversation view
        received_emails = self.get_emails(days=days, include_conversation_data=True)
        sent_emails = self.get_sent_emails(days=days)
        
        # Combine for complete conversation threads
        all_emails = received_emails + sent_emails
        
        # Group by conversation
        conversations = self.group_emails_by_conversation(all_emails)
        
        # Extract context for each conversation
        conversation_contexts = []
        for conv_id, thread in conversations.items():
            context = self.extract_conversation_context(thread)
            conversation_contexts.append(context)
        
        # Sort by priority and recency
        conversation_contexts.sort(
            key=lambda x: (
                {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}.get(x['conversation_priority'], 0),
                x['last_activity']
            ),
            reverse=True
        )
        
        # Generate summary statistics
        total_conversations = len(conversation_contexts)
        active_conversations = len([c for c in conversation_contexts if c['conversation_state'] == 'active'])
        high_priority = len([c for c in conversation_contexts if c['conversation_priority'] in ['critical', 'high']])
        
        return {
            'total_conversations': total_conversations,
            'active_conversations': active_conversations,
            'high_priority_conversations': high_priority,
            'conversations': conversation_contexts,
            'summary': f"You have {active_conversations} active conversations, with {high_priority} requiring high-priority attention."
        }

    def get_daily_email_brief(self, days: int = 1) -> Dict:
        """Generate a comprehensive daily email brief with conversation intelligence."""
        try:
            # Get conversation intelligence for the period
            intelligence = self.get_conversation_intelligence(days=days)
            logger.info(f"Got intelligence type: {type(intelligence)}")
            
            # Debug: Check if intelligence is actually a dict
            if not isinstance(intelligence, dict):
                logger.error(f"Intelligence is not a dict! Type: {type(intelligence)}, Value: {intelligence}")
                intelligence = {
                    'conversation_summary': 'Invalid intelligence data type',
                    'actionable_inputs': [],
                    'my_commitments': [],
                    'my_requests': [],
                    'conversation_intelligence': {}
                }
            
            # Extract key metrics
            logger.info("Extracting metrics...")
            actionable_count = len(intelligence.get('actionable_inputs', []))
            logger.info(f"Got actionable_count: {actionable_count}")
            commitment_count = len(intelligence.get('my_commitments', []))
            logger.info(f"Got commitment_count: {commitment_count}")
            request_count = len(intelligence.get('my_requests', []))
            logger.info(f"Got request_count: {request_count}")
            
            conv_intel = intelligence.get('conversation_intelligence', {})
            logger.info(f"Got conv_intel type: {type(conv_intel)}")
            high_priority_threads = conv_intel.get('high_priority_threads', [])
            stalled_conversations = conv_intel.get('stalled_conversations', [])
            strategic_insights = conv_intel.get('strategic_insights', [])
            
            # Calculate estimated time requirements
            logger.info("Calculating time requirements...")
            total_estimated_time = 0
            actionable_inputs = intelligence.get('actionable_inputs', [])
            logger.info(f"Processing {len(actionable_inputs)} actionable inputs")
            for i, item in enumerate(actionable_inputs):
                logger.info(f"Processing item {i}: type={type(item)}")
                if isinstance(item, dict):
                    time_str = item.get('estimated_time', '15 mins')
                elif isinstance(item, str):
                    # Handle case where item is a string instead of dict
                    time_str = '15 mins'  # Default
                else:
                    time_str = '15 mins'  # Default
                
                # Extract minutes from time string
                try:
                    if isinstance(time_str, str):
                        # Extract all digits from the string
                        digits = ''.join(filter(str.isdigit, time_str))
                        if digits:
                            mins = int(digits)
                        else:
                            mins = 15  # Default
                    else:
                        mins = int(time_str) if time_str else 15
                    total_estimated_time += mins
                except (ValueError, TypeError):
                    total_estimated_time += 15  # Default 15 minutes
            
            # Create comprehensive brief
            brief = {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'conversation_summary': intelligence.get('conversation_summary', 'No summary available'),
                'metrics': {
                    'actionable_inputs': actionable_count,
                    'my_commitments': commitment_count, 
                    'my_requests': request_count,
                    'high_priority_threads': len(high_priority_threads),
                    'stalled_conversations': len(stalled_conversations),
                    'total_estimated_time': total_estimated_time
                },
                'priority_actions': intelligence.get('actionable_inputs', [])[:3],  # Top 3
                'urgent_commitments': intelligence.get('my_commitments', [])[:3],  # Top 3
                'blocking_requests': [req for req in intelligence.get('my_requests', []) if isinstance(req, dict) and 'blocking' in req.get('context', '').lower()][:3],
                'strategic_insights': strategic_insights[:2],  # Top 2 insights
            }
            
            # Add time blocks and follow-ups separately to isolate errors
            try:
                logger.info("Getting time blocks...")
                brief['time_blocks_needed'] = self._suggest_email_time_blocks(intelligence)
                logger.info("Time blocks completed")
            except Exception as e:
                logger.error(f"Error getting time blocks: {e}")
                brief['time_blocks_needed'] = []
                
            try:
                logger.info("Getting follow-ups...")
                brief['follow_up_scheduling'] = self._suggest_follow_ups(stalled_conversations)
                logger.info("Follow-ups completed")
            except Exception as e:
                logger.error(f"Error getting follow-ups: {e}")
                brief['follow_up_scheduling'] = []
            
            logger.info(f"Generated daily email brief: {actionable_count} actions, {total_estimated_time} mins estimated")
            return brief
            
        except Exception as e:
            logger.error(f"Failed to generate daily email brief: {e}")
            return {
                'date': datetime.now().strftime('%Y-%m-%d'),
                'conversation_summary': f"Brief unavailable: {str(e)}",
                'metrics': {'actionable_inputs': 0, 'my_commitments': 0, 'my_requests': 0},
                'priority_actions': [],
                'urgent_commitments': [],
                'blocking_requests': [],
                'strategic_insights': [],
                'time_blocks_needed': [],
                'follow_up_scheduling': []
            }
    
    def _suggest_email_time_blocks(self, intelligence: Dict) -> List[Dict]:
        """Suggest time blocks for email-derived tasks."""
        time_blocks = []
        
        # Process actionable inputs
        for item in intelligence.get('actionable_inputs', []):
            if isinstance(item, dict):
                time_str = item.get('estimated_time', '15 mins')
                description = item.get('description', 'Action required')
                priority = item.get('priority', 'medium')
                context = item.get('context', '')
            else:
                # Handle case where item is a string
                time_str = '15 mins'
                description = str(item) if item else 'Action required'
                priority = 'medium'
                context = ''
            
            # Extract minutes from time string
            try:
                if isinstance(time_str, str):
                    digits = ''.join(filter(str.isdigit, time_str))
                    mins = int(digits) if digits else 15
                else:
                    mins = int(time_str) if time_str else 15
            except (ValueError, TypeError):
                mins = 15  # Default
            
            time_blocks.append({
                'type': 'email_action',
                'duration_minutes': mins,
                'label': f"Email: {description}",
                'priority': priority,
                'context': context,
                'preferred_time': 'morning' if 'urgent' in priority.lower() else 'afternoon'
            })
        
        # Add commitment review block if there are commitments
        commitments = intelligence.get('my_commitments', [])
        if commitments:
            time_blocks.append({
                'type': 'commitment_review',
                'duration_minutes': min(30, len(commitments) * 5),
                'label': f"Review {len(commitments)} commitment(s)",
                'priority': 'medium',
                'context': 'Review and track progress on commitments made',
                'preferred_time': 'morning'
            })
        
        # Add follow-up block for stalled conversations
        stalled = intelligence.get('conversation_intelligence', {}).get('stalled_conversations', [])
        if stalled:
            time_blocks.append({
                'type': 'follow_up',
                'duration_minutes': 20,
                'label': f"Follow up on {len(stalled)} stalled conversation(s)",
                'priority': 'medium',
                'context': 'Re-engage stalled conversations to move them forward',
                'preferred_time': 'afternoon'
            })
        
        return time_blocks[:5]  # Limit to 5 blocks max
    
    def _suggest_follow_ups(self, stalled_conversations: List[Dict]) -> List[Dict]:
        """Suggest follow-up actions for stalled conversations."""
        follow_ups = []
        
        for conv in stalled_conversations[:3]:  # Top 3
            if not isinstance(conv, dict):
                logger.warning(f"Skipping non-dict conversation: {type(conv)} - {conv}")
                continue
                
            follow_ups.append({
                'conversation_topic': conv.get('topic', 'Unknown'),
                'last_activity': conv.get('last_activity_date', ''),
                'suggested_action': self._generate_follow_up_suggestion(conv),
                'priority': conv.get('priority', 'medium'),
                'participants': conv.get('participants', [])
            })
        
        return follow_ups
    
    def track_commitments_and_deadlines(self, days: int = 30) -> Dict:
        """Track commitments with deadline awareness and progress monitoring."""
        try:
            # Get conversation intelligence to extract commitments
            intelligence = self.get_conversation_intelligence(days=days)
            commitments = intelligence.get('my_commitments', [])
            
            # Organize commitments by urgency and deadline proximity
            categorized_commitments = {
                'overdue': [],
                'due_today': [],
                'due_this_week': [],
                'due_later': [],
                'no_deadline': []
            }
            
            today = datetime.now().date()
            
            for commitment in commitments:
                if not isinstance(commitment, dict):
                    # Handle string commitments
                    categorized_commitments['no_deadline'].append({
                        'description': str(commitment),
                        'recipient': 'Unknown',
                        'deadline': None,
                        'status': 'active',
                        'days_until_due': None,
                        'priority': 'medium'
                    })
                    continue
                
                deadline_str = commitment.get('deadline', '')
                deadline_date = None
                days_until_due = None
                
                # Try to parse deadline
                if deadline_str and deadline_str.lower() not in ['not specified', 'n/a', '']:
                    try:
                        # Simple parsing - look for date patterns
                        import re
                        date_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', deadline_str)
                        if date_match:
                            year, month, day = map(int, date_match.groups())
                            deadline_date = datetime(year, month, day).date()
                            days_until_due = (deadline_date - today).days
                    except:
                        pass
                
                commitment_obj = {
                    'description': commitment.get('description', 'Unknown commitment'),
                    'recipient': commitment.get('recipient', 'Unknown'),
                    'deadline': deadline_str,
                    'deadline_date': deadline_date,
                    'status': commitment.get('status', 'active'),
                    'days_until_due': days_until_due,
                    'priority': self._assess_commitment_priority(commitment, days_until_due),
                    'context': commitment.get('context', ''),
                    'estimated_effort': commitment.get('estimated_time', '30 mins')
                }
                
                # Categorize by urgency
                if days_until_due is not None:
                    if days_until_due < 0:
                        categorized_commitments['overdue'].append(commitment_obj)
                    elif days_until_due == 0:
                        categorized_commitments['due_today'].append(commitment_obj)
                    elif days_until_due <= 7:
                        categorized_commitments['due_this_week'].append(commitment_obj)
                    else:
                        categorized_commitments['due_later'].append(commitment_obj)
                else:
                    categorized_commitments['no_deadline'].append(commitment_obj)
            
            # Calculate summary statistics
            total_commitments = sum(len(cat) for cat in categorized_commitments.values())
            urgent_count = len(categorized_commitments['overdue']) + len(categorized_commitments['due_today'])
            
            # Generate commitment tracking report
            tracking_report = {
                'date_generated': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'total_commitments': total_commitments,
                'urgent_commitments': urgent_count,
                'commitments_by_urgency': categorized_commitments,
                'next_actions': self._generate_commitment_actions(categorized_commitments),
                'commitment_health_score': self._calculate_commitment_health_score(categorized_commitments)
            }
            
            logger.info(f"Generated commitment tracking: {total_commitments} total, {urgent_count} urgent")
            return tracking_report
            
        except Exception as e:
            logger.error(f"Failed to track commitments: {e}")
            return {
                'date_generated': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'total_commitments': 0,
                'urgent_commitments': 0,
                'commitments_by_urgency': {},
                'next_actions': [],
                'commitment_health_score': 0.0,
                'error': str(e)
            }
    
    def _assess_commitment_priority(self, commitment: Dict, days_until_due: int = None) -> str:
        """Assess priority of a commitment based on deadline and context."""
        if days_until_due is not None:
            if days_until_due < 0:  # Overdue
                return 'critical'
            elif days_until_due <= 1:  # Due today/tomorrow
                return 'high'
            elif days_until_due <= 7:  # Due this week
                return 'medium'
        
        # Check context for urgency indicators
        context = commitment.get('context', '').lower()
        if any(word in context for word in ['urgent', 'asap', 'critical', 'deadline']):
            return 'high'
        
        return 'medium'
    
    def _generate_commitment_actions(self, categorized_commitments: Dict) -> List[Dict]:
        """Generate next actions for commitment management."""
        actions = []
        
        # Actions for overdue commitments
        overdue = categorized_commitments.get('overdue', [])
        if overdue:
            actions.append({
                'type': 'urgent_action',
                'title': f"Address {len(overdue)} overdue commitment(s)",
                'description': "Immediate attention required for overdue commitments",
                'commitments': [c['description'] for c in overdue[:3]],  # Top 3
                'priority': 'critical',
                'estimated_time': '60 mins'
            })
        
        # Actions for today's commitments
        due_today = categorized_commitments.get('due_today', [])
        if due_today:
            actions.append({
                'type': 'daily_action',
                'title': f"Complete {len(due_today)} commitment(s) due today",
                'description': "Focus on today's deadline commitments",
                'commitments': [c['description'] for c in due_today],
                'priority': 'high',
                'estimated_time': '45 mins'
            })
        
        # Weekly planning action
        due_this_week = categorized_commitments.get('due_this_week', [])
        if due_this_week:
            actions.append({
                'type': 'planning_action',
                'title': f"Plan {len(due_this_week)} commitment(s) due this week",
                'description': "Schedule time for weekly commitments",
                'commitments': [c['description'] for c in due_this_week[:5]],
                'priority': 'medium',
                'estimated_time': '30 mins'
            })
        
        return actions
    
    def _calculate_commitment_health_score(self, categorized_commitments: Dict) -> float:
        """Calculate a health score (0-100) for commitment management."""
        total = sum(len(cat) for cat in categorized_commitments.values())
        if total == 0:
            return 100.0  # Perfect score if no commitments
        
        # Penalties for different categories
        overdue_penalty = len(categorized_commitments.get('overdue', [])) * 30
        today_penalty = len(categorized_commitments.get('due_today', [])) * 15
        week_penalty = len(categorized_commitments.get('due_this_week', [])) * 5
        
        total_penalty = overdue_penalty + today_penalty + week_penalty
        max_penalty = total * 30  # Maximum possible penalty
        
        # Score is inversely related to penalty percentage
        penalty_ratio = total_penalty / max_penalty if max_penalty > 0 else 0
        health_score = max(0.0, min(100.0, (1 - penalty_ratio) * 100))
        
        return round(health_score, 1)
    
    def _generate_follow_up_suggestion(self, conversation: Dict) -> str:
        """Generate a contextual follow-up suggestion."""
        topic = conversation.get('topic', '').lower()
        days_stalled = conversation.get('days_since_last_activity', 0)
        
        if 'meeting' in topic:
            return "Send meeting agenda or reschedule request"
        elif 'review' in topic or 'feedback' in topic:
            return "Request status update or provide gentle reminder"
        elif days_stalled > 7:
            return "Send polite check-in to re-engage conversation"
        else:
            return "Provide update or ask clarifying question to move forward"

    def get_conversation_intelligence(self, days: int = 7) -> Dict:
        """Get AI-powered conversation intelligence for planning integration."""
        try:
            # Check cache first (30 minute cache for conversation intelligence)
            import hashlib
            import time
            cache_key = f"conv_intel_{days}_{hashlib.md5(str(self.get_emails(days=days)).encode()).hexdigest()[:10]}"
            
            if hasattr(self, '_conversation_intelligence_cache'):
                cached_result, cached_time = self._conversation_intelligence_cache.get(cache_key, (None, 0))
                if cached_result and (time.time() - cached_time) < 1800:  # 30 minutes
                    logger.info(f"Using cached conversation intelligence")
                    return cached_result
            else:
                self._conversation_intelligence_cache = {}
            
        except Exception as e:
            logger.warning(f"Cache check failed: {e}")
            
        try:
            # Get conversation summary
            conversation_data = self.get_conversation_summary(days=days)
            
            if not conversation_data.get('conversations'):
                return {
                    'conversation_summary': 'No active conversations found',
                    'actionable_inputs': [],
                    'my_commitments': [],
                    'my_requests': [],
                    'conversation_intelligence': {
                        'high_priority_threads': [],
                        'stalled_conversations': [],
                        'strategic_insights': ['No email conversations to analyze'],
                        'recommended_actions': ['Check email connectivity']
                    }
                }
            
            # Get raw email threads for LLM processing
            all_emails = self.get_emails(days=days, include_conversation_data=True) + self.get_sent_emails(days=days)
            conversations = self.group_emails_by_conversation(all_emails)
            
            # Filter to active/high-priority conversations only
            filtered_conversations = {}
            for conv_id, thread in conversations.items():
                try:
                    context = self.extract_conversation_context(thread)
                    if context.get('conversation_state') in ['active', 'waiting'] and context.get('conversation_priority') in ['critical', 'high', 'medium']:
                        filtered_conversations[conv_id] = thread
                except Exception as e:
                    logger.error(f"Error processing conversation {conv_id}: {e}")
                    logger.error(f"Thread data: {thread}")
            
            if not filtered_conversations:
                return {
                    'conversation_summary': 'No active conversations requiring attention',
                    'actionable_inputs': [],
                    'my_commitments': [],
                    'my_requests': [],
                    'conversation_intelligence': {
                        'high_priority_threads': [],
                        'stalled_conversations': [],
                        'strategic_insights': ['All conversations are resolved or low priority'],
                        'recommended_actions': ['Continue monitoring for new email activity']
                    }
                }
            
            # Call LLM for conversation-aware analysis
            from .prompt_engine import build_conversation_aware_email_prompt, parse_conversation_aware_response
            import openai
            import os
            
            prompt = build_conversation_aware_email_prompt(filtered_conversations)
            
            client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
            response = client.beta.chat.completions.parse(
                model="gpt-4.1-2025-04-14",
                messages=[
                    {"role": "system", "content": "You are an expert email conversation analyst."},
                    {"role": "user", "content": prompt}
                ],
                response_format=ConversationAwareResponse,
                temperature=0.1,
                max_tokens=2000
            )
            
            conversation_intelligence = response.choices[0].message.parsed.model_dump()
            
            logger.info(f"Generated conversation intelligence for {len(filtered_conversations)} active threads")
            
            # Cache the result
            try:
                cache_key = f"conv_intel_{days}_{hashlib.md5(str(self.get_emails(days=days)).encode()).hexdigest()[:10]}"
                self._conversation_intelligence_cache[cache_key] = (conversation_intelligence, time.time())
            except Exception as e:
                logger.warning(f"Failed to cache conversation intelligence: {e}")
            
            return conversation_intelligence
            
        except Exception as e:
            logger.error(f"Failed to get conversation intelligence: {e}")
            return {
                'conversation_summary': f'Error analyzing conversations: {str(e)}',
                'actionable_inputs': [],
                'my_commitments': [],
                'my_requests': [],
                'conversation_intelligence': {
                    'high_priority_threads': [],
                    'stalled_conversations': [],
                    'strategic_insights': ['Error in conversation analysis'],
                    'recommended_actions': ['Check email processor configuration']
                }
            }

    def get_unresponded_action_emails(self, days: int = 7) -> List[Dict]:
        """Get unresponded RECEIVED emails that require action."""
        emails = self.get_emails(days=days)  # This gets received emails
        emails = self.check_email_responses(emails)  # Check if we responded
        emails = self.filter_emails(emails)  # Filter for importance/action needed
        
        # Only include emails we received (not sent), that we haven't responded to
        filtered_emails = []
        for email in emails:
            # Skip if we already responded
            if email.get('responded', False):
                continue
                
            # Only include received emails that need action
            filtered_emails.append(email)
        
        return filtered_emails

    def summarize_emails_via_llm(self, emails: List[Dict]) -> Dict:
        """Summarize emails using LLM with error handling."""
        if not emails:
            return {
                "summary": "Your inbox is all caught up! No urgent emails requiring immediate attention.",
                "action_items": [],
                "total_unresponded": 0,
                "urgent_count": 0,
                "high_priority_count": 0
            }
        
        # Prepare email data for LLM
        email_data = []
        for email in emails:
            email_data.append({
                "subject": email.get('subject', ''),
                "sender": email.get('from', {}).get('emailAddress', {}).get('address', ''),
                "received": email.get('receivedDateTime', ''),
                "importance": email.get('importance', 'medium'),
                "urgency": email.get('urgency', 'medium'),
                "has_action": email.get('has_action', False)
            })
        
        urgent_count = sum(1 for e in emails if e.get('urgency') == 'high')
        high_priority_count = sum(1 for e in emails if e.get('importance') == 'high')
        
        # Generate LLM summary of inbox status
        try:
            from .prompt_engine import build_email_summary_prompt, parse_email_summary_response
            from .cli import _get_claude_client, _call_llm
            
            # Build the LLM prompt
            prompt = build_email_summary_prompt(emails)
            
            # Call LLM
            client = _get_claude_client()
            response = _call_llm(client, prompt)
            
            # Parse response
            result = parse_email_summary_response(response)
            inbox_summary = result.get("summary", f"Found {len(emails)} emails requiring attention")
            llm_action_items = result.get("action_items", [])
            
        except Exception as e:
            logger.warning(f"LLM email summary failed, using fallback: {e}")
            # Fallback summary based on email characteristics
            if urgent_count > 0:
                inbox_summary = f"Inbox needs attention: {urgent_count} urgent email{'s' if urgent_count != 1 else ''} and {len(emails) - urgent_count} other message{'s' if len(emails) - urgent_count != 1 else ''} requiring responses."
            elif high_priority_count > 0:
                inbox_summary = f"Moderate inbox day: {high_priority_count} high-priority email{'s' if high_priority_count != 1 else ''} and {len(emails) - high_priority_count} standard message{'s' if len(emails) - high_priority_count != 1 else ''} to handle."
            else:
                inbox_summary = f"Light inbox load: {len(emails)} routine email{'s' if len(emails) != 1 else ''} to process when convenient."
            
            llm_action_items = [f"Respond to {e.get('subject', 'email')} from {e.get('from', {}).get('emailAddress', {}).get('address', 'sender')}" for e in emails]
        
        return {
            "summary": inbox_summary,
            "action_items": llm_action_items,
            "total_unresponded": len(emails),
            "urgent_count": urgent_count,
            "high_priority_count": high_priority_count,
            "emails": email_data
        }

    def get_email_planning_context(self, days: int = 7) -> Dict:
        """Get email context for planning with enhanced features."""
        try:
            emails = self.get_unresponded_action_emails(days=days)
            summary_data = self.summarize_emails_via_llm(emails)
            
            # Add scheduling recommendations
            summary_data['scheduling_recommendations'] = self._generate_scheduling_recommendations(emails)
            
            # Add response time estimates
            summary_data['response_time_estimates'] = self._estimate_response_times(emails)
            
            return summary_data
            
        except Exception as e:
            logger.error(f"Failed to get email planning context: {e}")
            return {
                "summary": "Error loading email context",
                "action_items": [],
                "total_unresponded": 0,
                "urgent_count": 0,
                "high_priority_count": 0,
                "scheduling_recommendations": [],
                "response_time_estimates": {}
            }

    def _generate_scheduling_recommendations(self, emails: List[Dict]) -> List[Dict]:
        """Generate scheduling recommendations for email action items."""
        recommendations = []
        
        for email in emails:
            urgency = email.get('urgency', 'medium')
            importance = email.get('importance', 'medium')
            subject = email.get('subject', '')
            sender = email.get('from', {}).get('emailAddress', {}).get('address', '')
            
            # Determine priority and time allocation
            if urgency == 'high' and importance == 'high':
                priority = 'critical'
                time_allocation = 30  # minutes
                recommended_time = 'morning'
            elif urgency == 'high' or importance == 'high':
                priority = 'high'
                time_allocation = 20
                recommended_time = 'morning'
            else:
                priority = 'medium'
                time_allocation = 15
                recommended_time = 'afternoon'
            
            recommendations.append({
                'email_id': email.get('id'),
                'subject': subject,
                'sender': sender,
                'priority': priority,
                'time_allocation': time_allocation,
                'recommended_time': recommended_time,
                'action_item': f"Respond to {subject} from {sender}"
            })
        
        return recommendations

    def _estimate_response_times(self, emails: List[Dict]) -> Dict:
        """Estimate response times for emails based on priority."""
        estimates = {
            'critical': 30,  # minutes
            'high': 20,
            'medium': 15,
            'low': 10
        }
        
        total_time = 0
        for email in emails:
            urgency = email.get('urgency', 'medium')
            importance = email.get('importance', 'medium')
            
            if urgency == 'high' and importance == 'high':
                total_time += estimates['critical']
            elif urgency == 'high' or importance == 'high':
                total_time += estimates['high']
            else:
                total_time += estimates['medium']
        
        return {
            'total_estimated_time': total_time,
            'time_estimates': estimates,
            'email_count': len(emails)
        }

    def schedule_email_action_item(self, email_id: str, scheduled_time: str, block_title: str) -> bool:
        """Schedule an email action item for a specific time."""
        try:
            self.scheduled_emails[email_id] = {
                'scheduled_time': scheduled_time,
                'block_title': block_title,
                'scheduled_at': datetime.now().isoformat(),
                'status': 'scheduled'
            }
            logger.info(f"Scheduled email {email_id} for {scheduled_time}")
            return True
        except Exception as e:
            logger.error(f"Failed to schedule email {email_id}: {e}")
            return False

    def mark_email_action_completed(self, email_id: str) -> bool:
        """Mark an email action item as completed."""
        try:
            if email_id in self.scheduled_emails:
                self.scheduled_emails[email_id]['status'] = 'completed'
                self.scheduled_emails[email_id]['completed_at'] = datetime.now().isoformat()
            
            self.completed_emails[email_id] = {
                'completed_at': datetime.now().isoformat(),
                'status': 'completed'
            }
            
            logger.info(f"Marked email {email_id} as completed")
            return True
        except Exception as e:
            logger.error(f"Failed to mark email {email_id} as completed: {e}")
            return False

    def get_scheduled_emails(self) -> Dict:
        """Get all scheduled email action items."""
        return self.scheduled_emails

    def get_completed_emails(self) -> Dict:
        """Get all completed email action items."""
        return self.completed_emails

    def get_categorized_email_context(self, days: int = 1) -> Dict:
        """Get categorized email context using email intelligence system."""
        try:
            # Initialize email intelligence if needed
            if not self.email_intelligence:
                from .email_intelligence import EmailCategorizer
                self.email_intelligence = EmailCategorizer(self._get_claude_client())
            
            # Get recent emails with full Graph API data
            emails = self.get_emails(days=days, include_conversation_data=True)
            
            # Use email intelligence to categorize
            return self.email_intelligence.categorize_emails(emails)
            
        except Exception as e:
            logger.error(f"Failed to get categorized email context: {e}")
            return {
                'information': [],
                'action_items': [],
                'response_needed': [],
                'metadata': {
                    'error': str(e),
                    'total_processed': 0
                }
            }
    
    def _get_claude_client(self):
        """Get Claude client for email intelligence."""
        from .claude_client import get_claude_client
        return get_claude_client()

    def get_email_planning_stats(self) -> Dict:
        """Get statistics about email planning."""
        try:
            total_scheduled = len(self.scheduled_emails)
            total_completed = len(self.completed_emails)
            pending_scheduled = sum(1 for email in self.scheduled_emails.values() if email.get('status') == 'scheduled')
            
            return {
                'total_scheduled': total_scheduled,
                'total_completed': total_completed,
                'pending_scheduled': pending_scheduled,
                'completion_rate': (total_completed / total_scheduled * 100) if total_scheduled > 0 else 0
            }
        except Exception as e:
            logger.error(f"Failed to get email planning stats: {e}")
            return {
                'total_scheduled': 0,
                'total_completed': 0,
                'pending_scheduled': 0,
                'completion_rate': 0.0
            } 