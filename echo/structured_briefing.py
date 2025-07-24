"""
Structured Context Briefing System for Echo

This module orchestrates the four-panel context briefing system that replaces
the monolithic approach with structured, actionable intelligence.

Key Features:
- Four-panel architecture: Executive Summary, Email, Session Notes, Commitments
- Executive summary generated LAST with full context awareness
- Panel-specific processing with focused, actionable outputs
- Error handling with graceful fallbacks for each intelligence system
- Structured data flow that enables interactive frontend elements
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from pydantic import BaseModel, Field
from echo.claude_client import ClaudeClient

logger = logging.getLogger(__name__)


# Pydantic model for structured executive summary
class ExecutiveSummary(BaseModel):
    summary: str = Field(description="Concise executive summary of tomorrow's context and priorities")
    key_priorities: List[str] = Field(description="3-5 key priorities for tomorrow")
    notable_items: List[str] = Field(description="Notable items requiring attention")
    recommendation: str = Field(description="Overall recommendation for approaching tomorrow")
    
    class Config:
        # Required for OpenAI Response API
        extra = "forbid"


class StructuredContextBriefing:
    """Generate structured four-panel context briefings."""
    
    # Constants for consistent data access and limits - increased for Claude's capabilities
    MAX_ITEMS_PER_CATEGORY = 15  # Increased from 5 to match email intelligence
    DEFAULT_COMPLETION_RATE = 100
    DEFAULT_URGENCY_THRESHOLD = 'high'
    
    def __init__(self, claude_client: ClaudeClient) -> None:
        """Initialize the briefing system with Claude client.
        
        Args:
            claude_client: Configured Claude client instance
        """
        self.client = claude_client
    
    def build_four_panel_briefing(
        self, 
        email_context: Dict[str, Any], 
        session_context: Dict[str, Any], 
        config_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main orchestration method - generates panels in correct order.
        
        Args:
            email_context: Output from EmailCategorizer.categorize_emails()
            session_context: Output from SessionNotesAnalyzer.extract_next_items()
            config_context: Output from ConfigDeadlineExtractor.get_upcoming_commitments()
            
        Returns:
            Dict with four-panel structure and metadata
        """
        try:
            # Generate data panels first (2, 3, 4) - no LLM processing needed
            email_panel = self._generate_email_panel(email_context)
            session_panel = self._generate_session_panel(session_context)
            commitments_panel = self._generate_commitments_panel(config_context)
            
            # Generate executive summary LAST with full context
            executive_summary = self._generate_executive_summary({
                'email_panel': email_panel,
                'session_panel': session_panel,
                'commitments_panel': commitments_panel
            })
            
            return {
                'executive_summary': executive_summary,
                'email_summary': email_panel,
                'session_notes': session_panel,
                'commitments_deadlines': commitments_panel,
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'panels_generated': 4,
                    'data_sources': {
                        'email_intelligence': len(email_context.get('information', [])) + 
                                           len(email_context.get('action_items', [])) + 
                                           len(email_context.get('response_needed', [])),
                        'session_intelligence': len(session_context.get('pending_commitments', [])) + 
                                              len(session_context.get('stale_items', [])),
                        'config_intelligence': len(config_context.get('deadlines', [])) + 
                                             len(config_context.get('recurring_events', [])) + 
                                             len(config_context.get('birthdays', []))
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Four-panel briefing generation failed: {e}")
            return self._error_response(str(e))
    
    def _generate_email_panel(self, email_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate formatted email panel from categorized data."""
        try:
            # Minimal processing - mostly formatting and limiting
            # Input: categorized email data from EmailCategorizer
            # Output: formatted panel with up to 5 items per category
            
            return {
                'information': self._format_email_category(
                    email_context.get('information', [])[:self.MAX_ITEMS_PER_CATEGORY],
                    'information'
                ),
                'action_items': self._format_email_category(
                    email_context.get('action_items', [])[:self.MAX_ITEMS_PER_CATEGORY],
                    'action_items'
                ),
                'response_needed': self._format_email_category(
                    email_context.get('response_needed', [])[:self.MAX_ITEMS_PER_CATEGORY],
                    'response_needed'
                ),
                'metadata': {
                    'total_emails_processed': email_context.get('metadata', {}).get('total_processed', 0),
                    'timeframe_hours': email_context.get('metadata', {}).get('timeframe_hours', 24),
                    'is_sunday_lookback': email_context.get('metadata', {}).get('is_sunday_lookback', False),
                    'categories_generated_at': email_context.get('metadata', {}).get('categories_generated_at', ''),
                    'has_urgent_items': any(
                        item.get('urgency') == 'high' for item in email_context.get('response_needed', [])
                    ) or any(
                        item.get('importance') == 'high' for item in email_context.get('action_items', [])
                    )
                }
            }
            
        except Exception as e:
            logger.error(f"Email panel generation failed: {e}")
            return {
                'information': [],
                'action_items': [],
                'response_needed': [],
                'metadata': {'error': str(e)}
            }
    
    def _format_email_category(self, items: List[Dict[str, Any]], category_type: str) -> List[Dict[str, Any]]:
        """Format email category items with consistent structure.
        
        Args:
            items: List of email items to format
            category_type: Type of email category ('action_items', 'response_needed', 'information')
            
        Returns:
            List of formatted email items with consistent structure
        """
        if not items:
            return []
            
        formatted_items = []
        
        for item in items:
            try:
                # Validate required fields
                if not isinstance(item, dict):
                    logger.warning(f"Invalid item type: {type(item)}, expected dict")
                    continue
                    
                # Common fields for all categories
                formatted_item = {
                    'content': item.get('content', 'No content'),
                    'person': item.get('person', 'Unknown'),
                    'thread_id': item.get('thread_id', ''),
                    'email_subject': item.get('email_subject', ''),
                    'received_time': item.get('received_time', ''),
                    'category': category_type
                }
                
                # Category-specific fields with validation
                self._add_category_specific_fields(formatted_item, item, category_type)
                formatted_items.append(formatted_item)
                
            except (KeyError, TypeError, ValueError) as e:
                logger.warning(f"Failed to format email item {item}: {e}")
                continue
        
        return formatted_items
    
    def _add_category_specific_fields(
        self, 
        formatted_item: Dict[str, Any], 
        item: Dict[str, Any], 
        category_type: str
    ) -> None:
        """Add category-specific fields to formatted item.
        
        Args:
            formatted_item: The item being formatted (modified in place)
            item: Original item data
            category_type: Type of email category
        """
        if category_type == 'action_items':
            formatted_item.update({
                'due_date': item.get('due_date'),
                'type': item.get('type', 'unknown'),  # promised_by_me | requested_of_me
                'timeline': item.get('timeline', 'not specified')
            })
        elif category_type == 'response_needed':
            formatted_item.update({
                'urgency': item.get('urgency', 'medium'),
                'days_old': item.get('days_old', 0)
            })
        elif category_type == 'information':
            formatted_item.update({
                'timestamp_context': item.get('timestamp_context', 'unknown time')
            })
        else:
            logger.warning(f"Unknown category type: {category_type}")
    
    def _generate_session_panel(self, session_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate formatted session panel from analyzed data."""
        try:
            # Focus on unaddressed items and stale commitments
            # Note: session_intelligence.py returns 'pending_commitments', not 'pending_items'
            pending_items = session_context.get('pending_commitments', [])
            stale_items = session_context.get('stale_items', [])
            completed_items = session_context.get('completed_items', [])
            
            # Calculate session health metrics
            total_items = len(pending_items) + len(stale_items) + len(completed_items)
            completion_rate = (
                (len(completed_items) / total_items * 100) 
                if total_items > 0 
                else self.DEFAULT_COMPLETION_RATE
            )
            
            return {
                'pending_commitments': self._format_session_items(pending_items, 'pending'),
                'stale_items': self._format_session_items(stale_items, 'stale'),
                'metadata': {
                    'sessions_analyzed': session_context.get('metadata', {}).get('sessions_analyzed', 0),
                    'days_back': session_context.get('metadata', {}).get('days_back', 3),
                    'total_next_items': session_context.get('metadata', {}).get('total_next_items', 0),
                    'completion_rate': completion_rate,
                    'oldest_pending_days': max([
                        item.get('days_stale', item.get('days_pending', 0)) 
                        for item in stale_items + pending_items
                    ], default=0),
                    'has_stale_items': len(stale_items) > 0,
                    'analysis_date': session_context.get('metadata', {}).get('analysis_date', '')
                }
            }
            
        except Exception as e:
            logger.error(f"Session panel generation failed: {e}")
            return {
                'pending_commitments': [],
                'stale_items': [],
                'metadata': {'error': str(e)}
            }
    
    def _format_session_items(self, items: List[Dict[str, Any]], status: str) -> List[Dict[str, Any]]:
        """Format session items with consistent structure.
        
        Args:
            items: List of session items to format
            status: Status of the items ('pending', 'stale', 'completed')
            
        Returns:
            List of formatted session items
        """
        if not items:
            return []
            
        formatted_items = []
        valid_statuses = {'pending', 'stale', 'completed'}
        
        if status not in valid_statuses:
            logger.warning(f"Invalid status '{status}', expected one of {valid_statuses}")
            return []
        
        for item in items:
            try:
                if not isinstance(item, dict):
                    logger.warning(f"Invalid item type: {type(item)}, expected dict")
                    continue
                    
                formatted_item = {
                    'commitment': item.get('commitment', 'Unknown commitment'),
                    'session_date': item.get('session_date', ''),
                    'session_id': item.get('session_id', ''),
                    'timeline': item.get('timeline', 'not specified'),
                    'priority': item.get('priority', 'medium'),
                    'context': item.get('context', ''),
                    'category': item.get('category', 'task'),
                    'status': status
                }
                
                # Status-specific fields with validation
                self._add_status_specific_fields(formatted_item, item, status)
                formatted_items.append(formatted_item)
                
            except (KeyError, TypeError, ValueError) as e:
                logger.warning(f"Failed to format session item {item}: {e}")
                continue
        
        return formatted_items
    
    def _add_status_specific_fields(
        self, 
        formatted_item: Dict[str, Any], 
        item: Dict[str, Any], 
        status: str
    ) -> None:
        """Add status-specific fields to formatted session item.
        
        Args:
            formatted_item: The item being formatted (modified in place)
            item: Original item data
            status: Status of the item
        """
        if status == 'stale':
            formatted_item.update({
                'days_stale': item.get('days_stale', 0),
                'last_mentioned': item.get('last_mentioned', ''),
                'follow_up_sessions': item.get('follow_up_sessions', 0)
            })
        elif status == 'pending':
            formatted_item.update({
                'days_pending': item.get('days_pending', 0)
            })
        elif status == 'completed':
            formatted_item.update({
                'completion_confidence': item.get('completion_confidence', 'medium'),
                'completion_evidence': item.get('completion_evidence', [])
            })
    
    def _generate_commitments_panel(self, config_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate commitments panel - minimal processing needed."""
        try:
            # Organize commitments by urgency and type
            deadlines = config_context.get('deadlines', [])
            
            urgent_deadlines = [d for d in deadlines if d.get('urgency') in ['critical', 'high']]
            upcoming_deadlines = [d for d in deadlines if d.get('urgency') in ['medium', 'low']]
            
            return {
                'urgent_deadlines': urgent_deadlines,
                'upcoming_deadlines': upcoming_deadlines,
                'reminders': config_context.get('reminders', []),
                'upcoming_birthdays': config_context.get('birthdays', []),
                'fixed_meetings': config_context.get('fixed_meetings', []),
                'metadata': {
                    'days_ahead': config_context.get('metadata', {}).get('days_ahead', 7),
                    'extracted_at': config_context.get('metadata', {}).get('extracted_at', ''),
                    'config_version': config_context.get('metadata', {}).get('config_version', 'unknown'),
                    'total_deadlines': len(deadlines),
                    'urgent_count': len(urgent_deadlines),
                    'reminders_count': len(config_context.get('reminders', [])),
                    'upcoming_birthdays_count': len(config_context.get('birthdays', []))
                }
            }
            
        except Exception as e:
            logger.error(f"Commitments panel generation failed: {e}")
            return {
                'urgent_deadlines': [],
                'upcoming_deadlines': [],
                'reminders': [],
                'upcoming_birthdays': [],
                'fixed_meetings': [],
                'metadata': {'error': str(e)}
            }
    
    def _generate_executive_summary(self, all_panels: Dict[str, Any]) -> str:
        """Generate 2-4 sentence synthesis using all panel data."""
        try:
            # Extract key metrics from all panels
            email_panel = all_panels.get('email_panel', {})
            session_panel = all_panels.get('session_panel', {})
            commitments_panel = all_panels.get('commitments_panel', {})
            
            email_metrics = {
                'action_items': len(email_panel.get('action_items', [])),
                'response_needed': len(email_panel.get('response_needed', [])),
                'information': len(email_panel.get('information', [])),
                'has_urgent': email_panel.get('metadata', {}).get('has_urgent_items', False)
            }
            
            session_metrics = {
                'pending': len(session_panel.get('pending_commitments', [])),
                'stale': len(session_panel.get('stale_items', [])),
                'oldest_days': session_panel.get('metadata', {}).get('oldest_pending_days', 0),
                'completion_rate': session_panel.get('metadata', {}).get('completion_rate', 100)
            }
            
            commitments_metrics = {
                'urgent_deadlines': len(commitments_panel.get('urgent_deadlines', [])),
                'reminders': len(commitments_panel.get('reminders', [])),
                'todays_events': len(commitments_panel.get('todays_events', [])),
                'upcoming_birthdays': len(commitments_panel.get('upcoming_birthdays', []))
            }
            
            # Build context-aware prompt with reminders details
            reminders_details = commitments_panel.get('reminders', [])
            prompt = self._build_executive_summary_prompt(
                email_metrics, session_metrics, commitments_metrics, reminders_details
            )
            
            # Call LLM for structured synthesis
            response = self.client.beta.chat.completions.parse(
                model="claude-3-5-sonnet-20241022",
                messages=[{"role": "user", "content": prompt}],
                response_format=ExecutiveSummary,
                temperature=0.1,
                max_tokens=2000
            )
            
            # Return the summary field for backward compatibility
            executive_summary = response.choices[0].message.parsed
            return executive_summary.summary
            
        except Exception as e:
            logger.error(f"Executive summary generation failed: {e}")
            return self._fallback_executive_summary(all_panels)
    
    def _build_executive_summary_prompt(
        self, 
        email_metrics: Dict, 
        session_metrics: Dict, 
        commitments_metrics: Dict,
        reminders_details: List[Dict] = None
    ) -> str:
        """Build context-aware prompt for executive summary."""
        
        # Build reminders section with specific details
        reminders_section = ""
        if reminders_details and len(reminders_details) > 0:
            reminders_section = "\nSPECIFIC REMINDERS TO MENTION:\n"
            for reminder in reminders_details:
                title = reminder.get('title', 'Unknown reminder')
                date = reminder.get('date', 'unknown date')
                urgency = reminder.get('urgency', 'normal')
                reminders_section += f"- {title} (due {date}, {urgency} priority)\n"
            reminders_section += "\nYou MUST mention these reminders by name in your summary.\n"
        
        return f"""Generate a 2-4 sentence executive summary for today's context briefing.

Synthesize patterns across these areas:

Email Summary:
- {email_metrics['action_items']} action items
- {email_metrics['response_needed']} responses needed
- {email_metrics['information']} information updates
- {'High urgency items present' if email_metrics['has_urgent'] else 'Normal urgency levels'}

Session Notes:
- {session_metrics['pending']} pending commitments
- {session_metrics['stale']} stale items (unaddressed)
- Oldest pending item: {session_metrics['oldest_days']} days
- Completion rate: {session_metrics['completion_rate']:.0f}%

Commitments & Deadlines:
- {commitments_metrics['urgent_deadlines']} urgent deadlines
- {commitments_metrics['reminders']} reminders (bills, deadlines, tasks)
- {commitments_metrics['todays_events']} events today
- {commitments_metrics['upcoming_birthdays']} upcoming birthdays{reminders_section}

Focus on:
1. Overall workload/intensity for today
2. Most critical items requiring attention (especially bills due tomorrow)
3. Any concerning patterns (overdue items, accumulating tasks)
4. Energy/focus recommendations

Keep it actionable and strategic - what should I know to plan my day effectively?
Be specific about numbers and patterns. If reminders are present, mention them by name."""
    
    def _fallback_executive_summary(self, all_panels: Dict[str, Any]) -> str:
        """Generate fallback summary when LLM fails."""
        try:
            email_panel = all_panels.get('email_panel', {})
            session_panel = all_panels.get('session_panel', {})
            commitments_panel = all_panels.get('commitments_panel', {})
            
            action_count = len(email_panel.get('action_items', []))
            response_count = len(email_panel.get('response_needed', []))
            pending_count = len(session_panel.get('pending_commitments', []))
            stale_count = len(session_panel.get('stale_items', []))
            urgent_deadlines = len(commitments_panel.get('urgent_deadlines', []))
            reminders_count = len(commitments_panel.get('reminders', []))
            
            # Build fallback summary based on key metrics
            summary_parts = []
            
            # Prioritize reminders (especially bills due soon)
            if reminders_count > 0:
                reminders = commitments_panel.get('reminders', [])
                bills_due = [r for r in reminders if 'bill' in r.get('title', '').lower() or 'payment' in r.get('title', '').lower()]
                if bills_due:
                    summary_parts.append(f"{len(bills_due)} bill payment{'s' if len(bills_due) != 1 else ''} due soon")
                else:
                    summary_parts.append(f"{reminders_count} reminder{'s' if reminders_count != 1 else ''} require attention")
            
            if urgent_deadlines > 0:
                summary_parts.append(f"{urgent_deadlines} urgent deadline{'s' if urgent_deadlines != 1 else ''} require immediate attention")
            
            if action_count > 0 or response_count > 0:
                email_workload = action_count + response_count
                summary_parts.append(f"{email_workload} email action{'s' if email_workload != 1 else ''} pending")
            
            if stale_count > 0:
                summary_parts.append(f"{stale_count} stale commitment{'s' if stale_count != 1 else ''} need follow-up")
            elif pending_count > 0:
                summary_parts.append(f"{pending_count} session commitment{'s' if pending_count != 1 else ''} to address")
            
            if not summary_parts:
                return "All systems are current. Light workload with no urgent items requiring immediate attention."
            
            return ". ".join(summary_parts[:3]) + ". Focus on urgent items first."
            
        except Exception as e:
            logger.error(f"Fallback summary generation failed: {e}")
            return "Context briefing generated with some limitations. Check individual panels for details."
    
    def _error_response(self, error_message: str) -> Dict[str, Any]:
        """Return error response structure."""
        return {
            'executive_summary': f"Context briefing unavailable: {error_message}",
            'email_summary': {
                'information': [],
                'action_items': [],
                'response_needed': [],
                'metadata': {'error': error_message}
            },
            'session_notes': {
                'pending_commitments': [],
                'stale_items': [],
                'metadata': {'error': error_message}
            },
            'commitments_deadlines': {
                'urgent_deadlines': [],
                'upcoming_deadlines': [],
                'todays_events': [],
                'upcoming_birthdays': [],
                'fixed_meetings': [],
                'metadata': {'error': error_message}
            },
            'metadata': {
                'generated_at': datetime.now().isoformat(),
                'panels_generated': 0,
                'error': error_message
            }
        }