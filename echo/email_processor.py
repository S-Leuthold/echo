# echo/email_processor.py
import os
import requests
import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

    def get_emails(self, days: int = 7) -> List[Dict]:
        """Get emails from the last N days with error handling."""
        start_date = datetime.now() - timedelta(days=days)
        start_str = start_date.isoformat() + "Z"
        endpoint = f"/me/messages?$filter=receivedDateTime ge {start_str}&$orderby=receivedDateTime desc"
        
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
        sender_lower = sender.lower()
        subject_lower = subject.lower()
        
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
        sender_lower = sender.lower()
        
        for important_sender in self.email_filters.get('important_senders', []):
            if important_sender.lower() in sender_lower:
                return True
        
        return False

    def _is_urgent_email(self, subject: str) -> bool:
        """Check if email contains urgent keywords."""
        subject_lower = subject.lower()
        
        for keyword in self.email_filters.get('urgent_keywords', []):
            if keyword.lower() in subject_lower:
                return True
        
        return False

    def _has_action_keywords(self, subject: str) -> bool:
        """Check if email contains action keywords."""
        subject_lower = subject.lower()
        
        for keyword in self.email_filters.get('action_keywords', []):
            if keyword.lower() in subject_lower:
                return True
        
        return False

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
            from .cli import _get_openai_client, _call_llm
            
            # Build the LLM prompt
            prompt = build_email_summary_prompt(emails)
            
            # Call LLM
            client = _get_openai_client()
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