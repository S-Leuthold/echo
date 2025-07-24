"""
Config Intelligence System for Echo Context Briefing

This module extracts deadlines, recurring events, and birthdays from user configuration
with appropriate lead times for intelligent context briefings.

Key Features:
- Deadline extraction with urgency calculation based on days until due
- Recurring event extraction from weekly schedule for today
- Birthday extraction with configurable lead time (default: 7 days)
- Fixed meeting extraction from user config schedules
"""

import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import re

logger = logging.getLogger(__name__)


class ConfigDeadlineExtractor:
    """Extract and surface commitments from user configuration."""
    
    def get_upcoming_commitments(self, config, days_ahead: int = 7) -> Dict[str, Any]:
        """
        Main entry point for config-based commitments.
        
        Args:
            config: User configuration object or dict
            days_ahead: How many days ahead to look for deadlines
            
        Returns:
            Dict containing deadlines, events, birthdays with metadata
        """
        try:
            return {
                'deadlines': self._extract_deadlines(config, days_ahead),
                'reminders': self._extract_reminders(config, days_ahead),
                'recurring_events': self._extract_recurring_events(config),
                'birthdays': self._extract_birthdays(config, days_ahead=7),  # Week lead time
                'fixed_meetings': self._extract_fixed_meetings(config),
                'metadata': {
                    'days_ahead': days_ahead,
                    'extracted_at': datetime.now().isoformat(),
                    'config_version': getattr(config, 'version', 'unknown')
                }
            }
            
        except Exception as e:
            logger.error(f"Config intelligence extraction failed: {e}")
            return self._error_response(str(e), days_ahead)
    
    def _extract_deadlines(self, config, days_ahead: int) -> List[Dict]:
        """Find upcoming deadlines from config."""
        deadlines = []
        
        try:
            # Handle both dict and Config object
            if hasattr(config, 'deadlines'):
                config_deadlines = config.deadlines
            elif hasattr(config, 'get') and 'deadlines' in config:
                config_deadlines = config['deadlines']
            else:
                config_deadlines = []
            
            for deadline in config_deadlines:
                try:
                    # Handle both dict and object formats
                    if hasattr(deadline, '__dict__') and not hasattr(deadline, 'get'):
                        deadline_dict = deadline.__dict__
                    else:
                        deadline_dict = deadline
                    
                    due_date = self._parse_date(deadline_dict.get('due_date'))
                    if not due_date:
                        continue
                        
                    days_until = (due_date - datetime.now().date()).days
                    
                    if 0 <= days_until <= days_ahead:
                        urgency = self._calculate_urgency(days_until)
                        deadlines.append({
                            'title': deadline_dict.get('title', 'Untitled Deadline'),
                            'due_date': due_date.isoformat(),
                            'days_until': days_until,
                            'urgency': urgency,
                            'description': deadline_dict.get('description', ''),
                            'project': deadline_dict.get('project', 'General'),
                            'category': deadline_dict.get('category', 'task'),
                            'estimated_effort': deadline_dict.get('estimated_effort', 'Unknown')
                        })
                        
                except Exception as e:
                    logger.warning(f"Failed to process deadline {deadline}: {e}")
                    continue
            
            # Also check project milestones
            project_deadlines = self._extract_project_milestones(config, days_ahead)
            deadlines.extend(project_deadlines)
            
            # Sort by urgency then by days until
            deadlines.sort(key=lambda x: (
                {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}.get(x['urgency'], 3),
                x['days_until']
            ))
            
            logger.info(f"Extracted {len(deadlines)} upcoming deadlines")
            return deadlines
            
        except Exception as e:
            logger.error(f"Deadline extraction failed: {e}")
            return []
    
    def _extract_project_milestones(self, config, days_ahead: int) -> List[Dict]:
        """Extract deadlines from project milestones."""
        milestones = []
        
        try:
            # Handle projects in config
            if hasattr(config, 'projects'):
                projects = config.projects
            elif hasattr(config, 'get') and 'projects' in config:
                projects = config['projects']
            else:
                projects = []
            
            for project_key, project in projects.items():
                try:
                    # Handle both dict and object formats
                    if hasattr(project, '__dict__') and not hasattr(project, 'get'):
                        project_dict = project.__dict__
                    else:
                        project_dict = project
                    project_name = project_dict.get('name', f'Project {project_key}')
                    
                    # Check for milestones
                    project_milestones = project_dict.get('milestones', [])
                    for milestone in project_milestones:
                        # Handle both dict and object formats
                        if hasattr(milestone, '__dict__') and not hasattr(milestone, 'get'):
                            milestone_dict = milestone.__dict__
                        else:
                            milestone_dict = milestone
                        
                        due_date = self._parse_date(milestone_dict.get('due_date'))
                        if not due_date:
                            continue
                            
                        days_until = (due_date - datetime.now().date()).days
                        
                        if 0 <= days_until <= days_ahead:
                            milestones.append({
                                'title': f"{project_name}: {milestone_dict.get('title', 'Milestone')}",
                                'due_date': due_date.isoformat(),
                                'days_until': days_until,
                                'urgency': self._calculate_urgency(days_until),
                                'description': milestone_dict.get('description', ''),
                                'project': project_name,
                                'category': 'milestone',
                                'estimated_effort': milestone_dict.get('estimated_effort', 'Unknown')
                            })
                            
                except Exception as e:
                    logger.warning(f"Failed to process project {project}: {e}")
                    continue
                    
        except Exception as e:
            logger.warning(f"Project milestone extraction failed: {e}")
        
        return milestones
    
    def _extract_birthdays(self, config, days_ahead: int = 7) -> List[Dict]:
        """Find upcoming birthdays with configurable lead time."""
        birthdays = []
        
        try:
            # Handle birthdays in config
            if hasattr(config, 'birthdays'):
                config_birthdays = config.birthdays
            elif hasattr(config, 'get') and 'birthdays' in config:
                config_birthdays = config['birthdays']
            else:
                config_birthdays = []
            
            for birthday in config_birthdays:
                try:
                    # Handle both dict and object formats
                    if hasattr(birthday, '__dict__') and not hasattr(birthday, 'get'):
                        birthday_dict = birthday.__dict__
                    else:
                        birthday_dict = birthday
                    
                    birthday_date = self._parse_date(birthday_dict.get('date'))
                    if not birthday_date:
                        continue
                    
                    next_occurrence = self._calculate_next_birthday(birthday_date)
                    days_until = (next_occurrence - datetime.now().date()).days
                    
                    if 0 <= days_until <= days_ahead:
                        age = None
                        birth_year = birthday_dict.get('birth_year')
                        if birth_year:
                            age = next_occurrence.year - birth_year
                        
                        birthdays.append({
                            'name': birthday_dict.get('name', 'Unknown'),
                            'date': next_occurrence.isoformat(),
                            'days_until': days_until,
                            'age': age,
                            'relationship': birthday_dict.get('relationship', 'Contact'),
                            'reminder_sent': False  # For tracking reminder status
                        })
                        
                except Exception as e:
                    logger.warning(f"Failed to process birthday {birthday}: {e}")
                    continue
            
            # Sort by days until
            birthdays.sort(key=lambda x: x['days_until'])
            
            logger.info(f"Found {len(birthdays)} upcoming birthdays")
            return birthdays
            
        except Exception as e:
            logger.error(f"Birthday extraction failed: {e}")
            return []
    
    def _extract_reminders(self, config, days_ahead: int) -> List[Dict]:
        """Extract reminders from config that should surface in the briefing."""
        reminders = []
        
        try:
            # Handle both dict and Config object
            if hasattr(config, 'reminders'):
                config_reminders = config.reminders
            elif hasattr(config, 'get') and 'reminders' in config:
                config_reminders = config['reminders']
            else:
                config_reminders = []
            
            for reminder in config_reminders:
                try:
                    # Handle both dict and object formats
                    if hasattr(reminder, '__dict__') and not hasattr(reminder, 'get'):
                        reminder_dict = reminder.__dict__
                    else:
                        reminder_dict = reminder
                    
                    # Check if reminder has a date (for one-time reminders)
                    reminder_date = reminder_dict.get('date')
                    if reminder_date:
                        parsed_date = self._parse_date(reminder_date)
                        if parsed_date:
                            days_until = (parsed_date - datetime.now().date()).days
                            if days_until < 0 or days_until > days_ahead:
                                continue  # Skip past or too far future reminders
                    
                    # Add reminder to list
                    reminders.append({
                        'title': reminder_dict.get('title', reminder_dict.get('text', 'Untitled Reminder')),
                        'description': reminder_dict.get('description', ''),
                        'urgency': reminder_dict.get('urgency', 'normal'),
                        'category': reminder_dict.get('category', 'general'),
                        'date': reminder_date or 'ongoing',
                        'days_until': (parsed_date - datetime.now().date()).days if reminder_date and parsed_date else None
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to process reminder {reminder}: {e}")
                    continue
            
            logger.info(f"Extracted {len(reminders)} reminders")
            return reminders
            
        except Exception as e:
            logger.error(f"Reminders extraction failed: {e}")
            return []
    
    def _extract_recurring_events(self, config) -> List[Dict]:
        """Extract today's recurring events from weekly schedule."""
        events = []
        
        try:
            today_name = datetime.now().strftime('%A').lower()
            
            # Handle weekly schedule in config
            if hasattr(config, 'weekly_schedule'):
                weekly_schedule = config.weekly_schedule
            elif hasattr(config, 'get') and 'weekly_schedule' in config:
                weekly_schedule = config['weekly_schedule']
            else:
                weekly_schedule = {}
            
            # Get today's schedule
            if hasattr(weekly_schedule, today_name):
                today_schedule = getattr(weekly_schedule, today_name)
            elif hasattr(weekly_schedule, 'get') and today_name in weekly_schedule:
                today_schedule = weekly_schedule[today_name]
            else:
                today_schedule = {}
            
            # Extract events from different block types
            for block_type in ['anchors', 'fixed', 'recurring']:
                if hasattr(today_schedule, block_type):
                    blocks = getattr(today_schedule, block_type)
                elif hasattr(today_schedule, 'get') and block_type in today_schedule:
                    blocks = today_schedule[block_type]
                else:
                    blocks = []
                
                for block in blocks:
                    try:
                        # Handle both dict and object formats
                        if hasattr(block, '__dict__') and not hasattr(block, 'get'):
                            block_dict = block.__dict__
                        else:
                            block_dict = block
                        
                        events.append({
                            'title': block_dict.get('task', block_dict.get('label', 'Unknown Event')),
                            'time': block_dict.get('time', ''),
                            'type': block_type,
                            'category': block_dict.get('category', 'general'),
                            'description': block_dict.get('description', ''),
                            'location': block_dict.get('location', ''),
                            'duration_minutes': block_dict.get('duration_minutes', 60)
                        })
                        
                    except Exception as e:
                        logger.warning(f"Failed to process event block {block}: {e}")
                        continue
            
            # Sort by time
            events.sort(key=lambda x: self._parse_time_string(x.get('time', '')))
            
            logger.info(f"Found {len(events)} recurring events for today")
            return events
            
        except Exception as e:
            logger.error(f"Recurring events extraction failed: {e}")
            return []
    
    def _extract_fixed_meetings(self, config) -> List[Dict]:
        """Extract fixed meetings and appointments."""
        meetings = []
        
        try:
            # Handle meetings in config
            if hasattr(config, 'meetings'):
                config_meetings = config.meetings
            elif hasattr(config, 'get') and 'meetings' in config:
                config_meetings = config['meetings']
            else:
                config_meetings = []
            
            for meeting in config_meetings:
                try:
                    # Handle both dict and object formats
                    if hasattr(meeting, '__dict__') and not hasattr(meeting, 'get'):
                        meeting_dict = meeting.__dict__
                    else:
                        meeting_dict = meeting
                    
                    meeting_date = self._parse_date(meeting_dict.get('date'))
                    if not meeting_date:
                        continue
                    
                    # Only include meetings for today
                    if meeting_date == datetime.now().date():
                        meetings.append({
                            'title': meeting_dict.get('title', 'Unknown Meeting'),
                            'time': meeting_dict.get('time', ''),
                            'attendees': meeting_dict.get('attendees', []),
                            'location': meeting_dict.get('location', ''),
                            'agenda': meeting_dict.get('agenda', ''),
                            'type': 'fixed_meeting',
                            'duration_minutes': meeting_dict.get('duration_minutes', 60)
                        })
                        
                except Exception as e:
                    logger.warning(f"Failed to process meeting {meeting}: {e}")
                    continue
            
            logger.info(f"Found {len(meetings)} fixed meetings for today")
            return meetings
            
        except Exception as e:
            logger.error(f"Fixed meetings extraction failed: {e}")
            return []
    
    def _parse_date(self, date_input) -> Optional[date]:
        """Parse date from various formats."""
        if not date_input:
            return None
        
        # If already a date object
        if isinstance(date_input, date):
            return date_input
        
        # If datetime object
        if isinstance(date_input, datetime):
            return date_input.date()
        
        # String parsing
        if isinstance(date_input, str):
            try:
                # Try various common formats
                formats = [
                    '%Y-%m-%d',
                    '%m/%d/%Y',
                    '%d/%m/%Y',
                    '%Y-%m-%d %H:%M:%S',
                    '%Y-%m-%dT%H:%M:%S'
                ]
                
                for fmt in formats:
                    try:
                        return datetime.strptime(date_input, fmt).date()
                    except ValueError:
                        continue
                
                # Try ISO format
                return datetime.fromisoformat(date_input.replace('Z', '+00:00')).date()
                
            except Exception:
                logger.warning(f"Could not parse date: {date_input}")
                return None
        
        return None
    
    def _calculate_next_birthday(self, birthday_date: date) -> date:
        """Calculate the next occurrence of a birthday."""
        today = datetime.now().date()
        this_year_birthday = birthday_date.replace(year=today.year)
        
        if this_year_birthday >= today:
            return this_year_birthday
        else:
            return birthday_date.replace(year=today.year + 1)
    
    def _calculate_urgency(self, days_until: int) -> str:
        """Calculate urgency based on days until due."""
        if days_until == 0:
            return 'critical'  # Due today
        elif days_until == 1:
            return 'high'      # Due tomorrow
        elif days_until <= 3:
            return 'medium'    # Due this week
        else:
            return 'low'       # Due later
    
    def _parse_time_string(self, time_str: str) -> int:
        """Parse time string to minutes for sorting."""
        if not time_str:
            return 999999  # Sort unknown times last
        
        try:
            # Handle formats like "09:00", "9:00 AM", "14:30"
            time_clean = time_str.strip().upper()
            
            # Remove AM/PM for now, handle 24h format
            is_pm = 'PM' in time_clean
            time_clean = time_clean.replace('AM', '').replace('PM', '').strip()
            
            if ':' in time_clean:
                hours, minutes = map(int, time_clean.split(':'))
                if is_pm and hours != 12:
                    hours += 12
                elif not is_pm and hours == 12:
                    hours = 0
                return hours * 60 + minutes
            else:
                # Just hour
                hours = int(time_clean)
                if is_pm and hours != 12:
                    hours += 12
                elif not is_pm and hours == 12:
                    hours = 0
                return hours * 60
                
        except Exception:
            return 999999  # Sort unparseable times last
    
    def _error_response(self, error_message: str, days_ahead: int) -> Dict[str, Any]:
        """Return error response structure."""
        return {
            'deadlines': [],
            'recurring_events': [],
            'birthdays': [],
            'fixed_meetings': [],
            'metadata': {
                'error': error_message,
                'days_ahead': days_ahead,
                'extracted_at': datetime.now().isoformat(),
                'config_version': 'unknown'
            }
        }