"""
Session Intelligence System for Echo Context Briefing

This module extracts forward-looking commitments from session notes and tracks
completion across multiple sessions using semantic analysis.

Key Features:
- Extracts "Next:", "TODO:", and similar forward-looking commitments
- Tracks completion across multiple sessions using semantic matching
- Identifies stale items that haven't been addressed in 3+ days
- Integrates with session logging system for intelligent context
"""

from __future__ import annotations
import json
import re
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from echo.claude_client import ClaudeClient

logger = logging.getLogger(__name__)


# Pydantic models for structured outputs
class PendingCommitment(BaseModel):
    commitment: str = Field(description="The specific commitment or task")
    context: str = Field(description="Context or session where this was identified")
    days_pending: int = Field(description="How many days this has been pending")
    priority: str = Field(description="Priority level (high, medium, low)")
    category: str = Field(description="Category of the commitment")
    
class CompletedItem(BaseModel):
    item: str = Field(description="The completed item")
    completion_session: str = Field(description="Session where it was completed")
    days_to_complete: int = Field(description="How many days it took to complete")
    
class StaleItem(BaseModel):
    item: str = Field(description="The stale item that hasn't been addressed")
    days_stale: int = Field(description="How many days it's been stale")
    last_mentioned: str = Field(description="When it was last mentioned")
    
class SessionAnalysis(BaseModel):
    pending_commitments: List[PendingCommitment] = Field(description="Active commitments from sessions")
    completed_items: List[CompletedItem] = Field(description="Recently completed items")
    stale_items: List[StaleItem] = Field(description="Items that have gone stale")
    
    class Config:
        # Required for OpenAI Response API
        extra = "forbid"


class SessionNotesAnalyzer:
    """Extract forward-looking commitments from session notes."""
    
    # Constants for consistent behavior
    DEFAULT_DAYS_BACK = 3
    MAX_SESSION_CONTENT_LENGTH = 2000
    MAX_SESSIONS_FOR_ANALYSIS = 10
    STALE_THRESHOLD_DAYS = 3
    
    def __init__(self, claude_client: ClaudeClient) -> None:
        """Initialize session analyzer with Claude client.
        
        Args:
            claude_client: Configured Claude client instance
            
        Raises:
            ValueError: If claude_client is None
        """
        if not claude_client:
            raise ValueError("Claude client is required")
        self.client = claude_client
        
    def extract_next_items(
        self, 
        session_files: List[str], 
        days_back: int = DEFAULT_DAYS_BACK
    ) -> Dict[str, Any]:
        """
        Main entry point for session analysis.
        
        Args:
            session_files: List of session file paths
            days_back: How many days back to analyze
            
        Returns:
            Dict containing pending, completed, and stale items with metadata
        """
        try:
            # Load and parse recent sessions
            sessions = self._load_recent_sessions(session_files, days_back)
            
            if not sessions:
                return self._empty_response(days_back)
            
            # Extract forward-looking items from all sessions
            next_items = self._extract_forward_looking_items(sessions)
            
            # Use structured analysis for all session processing
            analysis = self._analyze_sessions_structured(sessions, days_back)
            
            logger.info(f"Session analysis complete: {len(analysis.pending_commitments)} pending, "
                       f"{len(analysis.completed_items)} completed, {len(analysis.stale_items)} stale")
            
            return {
                'pending_commitments': [item.model_dump() for item in analysis.pending_commitments],
                'completed_items': [item.model_dump() for item in analysis.completed_items],
                'stale_items': [item.model_dump() for item in analysis.stale_items],
                'metadata': {
                    'sessions_analyzed': len(sessions),
                    'days_back': days_back,
                    'analysis_date': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Session intelligence analysis failed: {e}")
            return self._error_response(str(e), days_back)
    
    def _analyze_sessions_structured(self, sessions: List[Dict], days_back: int) -> SessionAnalysis:
        """Use OpenAI Response API for structured session analysis."""
        sessions_text = self._format_sessions_for_analysis(sessions)
        
        prompt = f"""
        Analyze the following session notes to extract forward-looking commitments and track their completion status.
        
        Look for:
        1. **Pending Commitments**: Items marked as "Next:", "TODO:", "Follow up:", etc. that haven't been completed
        2. **Completed Items**: Tasks that were mentioned as pending in earlier sessions but completed in later ones  
        3. **Stale Items**: Commitments that have been mentioned repeatedly but never addressed (3+ days old)
        
        For each item, determine its priority, category, and current status based on the session context.
        
        SESSION NOTES TO ANALYZE (last {days_back} days):
        {sessions_text}
        
        Provide a comprehensive analysis with accurate tracking of commitment status over time.
        """
        
        try:
            response = self.client.beta.chat.completions.parse(
                model="claude-sonnet-4-20250514",
                messages=[{"role": "user", "content": prompt}],
                response_format=SessionAnalysis,
                temperature=0.1,
                max_tokens=4000
            )
            
            return response.choices[0].message.parsed
            
        except Exception as e:
            logger.error(f"Error in structured session analysis: {e}")
            # Return empty structure on error
            return SessionAnalysis(
                pending_commitments=[],
                completed_items=[],
                stale_items=[]
            )
    
    def _format_sessions_for_analysis(self, sessions: List[Dict]) -> str:
        """Format session data for LLM analysis."""
        formatted = []
        for session in sessions[-10:]:  # Last 10 sessions
            date = session.get('date', 'Unknown date')
            content = session.get('content', '')[:2000]  # Limit content length
            formatted.append(f"SESSION {date}:\n{content}\n---")
        return "\n".join(formatted)
    
    def _load_recent_sessions(self, session_files: List[str], days_back: int) -> List[Dict]:
        """Load and parse recent session files."""
        cutoff_date = datetime.now() - timedelta(days=days_back)
        recent_sessions = []
        
        for file_path in session_files:
            try:
                file_date = self._get_file_date(file_path)
                if file_date and file_date > cutoff_date:
                    content = self._read_session_file(file_path)
                    if content.strip():  # Only include non-empty sessions
                        recent_sessions.append({
                            'file_path': file_path,
                            'date': file_date,
                            'content': content,
                            'session_id': self._generate_session_id(file_path, file_date)
                        })
            except Exception as e:
                logger.warning(f"Failed to load session {file_path}: {e}")
                continue
        
        # Sort by date (oldest first for chronological analysis)
        recent_sessions.sort(key=lambda x: x['date'])
        
        logger.info(f"Loaded {len(recent_sessions)} sessions from last {days_back} days")
        return recent_sessions
    
    def _get_file_date(self, file_path: str) -> Optional[datetime]:
        """Extract date from session file path or modification time."""
        try:
            # Try to extract date from filename (e.g., "2025-07-23-session-1300-analysis.json")
            filename = Path(file_path).stem
            
            # Look for date pattern in filename
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
            if date_match:
                date_str = date_match.group(1)
                return datetime.strptime(date_str, '%Y-%m-%d')
            
            # Fallback to file modification time
            file_stat = Path(file_path).stat()
            return datetime.fromtimestamp(file_stat.st_mtime)
            
        except Exception as e:
            logger.warning(f"Could not extract date from {file_path}: {e}")
            return None
    
    def _read_session_file(self, file_path: str) -> str:
        """Read session file content (JSON or markdown)."""
        try:
            path = Path(file_path)
            
            if path.suffix == '.json':
                # JSON session file - extract relevant text content
                with open(path, 'r', encoding='utf-8') as f:
                    session_data = json.load(f)
                
                # Extract text content from various JSON fields
                content_parts = []
                
                # Common JSON session fields
                for field in ['summary', 'notes', 'content', 'description', 'next_steps']:
                    if field in session_data:
                        value = session_data[field]
                        if isinstance(value, str) and value.strip():
                            content_parts.append(f"{field.title()}: {value}")
                        elif isinstance(value, list):
                            for item in value:
                                if isinstance(item, str) and item.strip():
                                    content_parts.append(f"{field.title()}: {item}")
                
                return "\\n\\n".join(content_parts)
                
            else:
                # Markdown or text session file
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read()
                    
        except Exception as e:
            logger.error(f"Failed to read session file {file_path}: {e}")
            return ""
    
    def _generate_session_id(self, file_path: str, file_date: datetime) -> str:
        """Generate unique session ID for tracking."""
        filename = Path(file_path).stem
        date_str = file_date.strftime('%Y%m%d')
        return f"{date_str}_{filename}"
    
    
    def _empty_response(self, days_back: int) -> Dict[str, Any]:
        """Return empty response structure."""
        return {
            'pending_commitments': [],
            'completed_items': [],
            'stale_items': [],
            'metadata': {
                'sessions_analyzed': 0,
                'days_back': days_back,
                'total_next_items': 0,
                'analysis_date': datetime.now().isoformat()
            }
        }
    
    def _error_response(self, error_message: str, days_back: int) -> Dict[str, Any]:
        """Return error response structure."""
        return {
            'pending_commitments': [],
            'completed_items': [],
            'stale_items': [],
            'metadata': {
                'error': error_message,
                'sessions_analyzed': 0,
                'days_back': days_back,
                'analysis_date': datetime.now().isoformat()
            }
        }