"""
Pydantic models for structured LLM outputs in the Echo planning system.

These models define the schemas for OpenAI's structured outputs feature,
ensuring consistent and validated responses from the LLM.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ScheduleItem(BaseModel):
    """Represents a fixed calendar event or scheduled item."""
    time: str = Field(pattern=r'^\d{1,2}:\d{2} (AM|PM)$', description="Time in format like '10:00 AM'")
    title: str = Field(max_length=300, description="Event title exactly as stated in source")
    source: str = Field(description="Source of the event (e.g., 'calendar', 'email')")
    duration_minutes: Optional[int] = Field(description="Duration if explicitly stated")

class Task(BaseModel):
    """Represents an actionable task extracted from various sources."""
    title: str = Field(max_length=150, description="Brief task title")
    context: str = Field(max_length=240, description="Brief context or empty string")
    source: str = Field(description="'email', 'reminders', or 'sessions'")
    sender: Optional[str] = Field(description="Email if from email")
    project: Optional[str] = Field(max_length=90, description="Project if mentioned")
    urgency: Optional[str] = Field(description="Urgency if stated")
    estimated_minutes: Optional[int] = Field(description="Minutes if provided")

class Suggestion(BaseModel):
    """Represents an AI-generated suggestion for optimization or improvement."""
    suggestion: str = Field(max_length=180, description="Brief suggestion")
    reasoning: str = Field(max_length=240, description="Brief reasoning")
    related_project: Optional[str] = Field(max_length=90, description="Project if mentioned")
    estimated_minutes: Optional[int] = Field(description="Minutes if provided")

class Insight(BaseModel):
    """Represents a pattern or insight derived from data analysis."""
    insight: str = Field(max_length=180, description="Brief insight")
    source: str = Field(description="Source")
    impact: str = Field(max_length=180, description="Brief impact")

class ContextBriefing(BaseModel):
    """
    Complete context briefing structure for planning.
    
    This model defines the structure for comprehensive context extraction
    that feeds into the daily planning process.
    """
    conversation_summary: str = Field(
        max_length=450, 
        description="Concise 1-2 sentence summary"
    )
    confirmed_schedule: List[ScheduleItem] = Field(description="Fixed calendar events only", max_length=24)
    high_priority_tasks: List[Task] = Field(description="Email actions requiring response", max_length=18)
    medium_priority_tasks: List[Task] = Field(description="Optional tasks from other sources", max_length=12)
    ai_suggestions: List[Suggestion] = Field(description="Skip unless explicitly stated", max_length=3)
    insights: List[Insight] = Field(description="Skip unless explicitly stated", max_length=3)

# Utility functions for model validation and processing

def validate_context_briefing(data: Dict[str, Any]) -> ContextBriefing:
    """
    Validate and convert dictionary data to ContextBriefing model.
    
    Args:
        data: Dictionary with briefing data
        
    Returns:
        Validated ContextBriefing instance
        
    Raises:
        ValidationError: If data doesn't match schema
    """
    return ContextBriefing.model_validate(data)

def briefing_to_dict(briefing: ContextBriefing) -> Dict[str, Any]:
    """
    Convert ContextBriefing model to dictionary for API compatibility.
    
    Args:
        briefing: ContextBriefing instance
        
    Returns:
        Dictionary representation
    """
    return briefing.model_dump()

def create_empty_briefing(error_message: str = "") -> Dict[str, Any]:
    """
    Create an empty briefing structure for error cases.
    
    Args:
        error_message: Optional error message to include
        
    Returns:
        Empty briefing dictionary
    """
    return {
        "conversation_summary": error_message or "No context available",
        "confirmed_schedule": [],
        "high_priority_tasks": [],
        "medium_priority_tasks": [],
        "ai_suggestions": [],
        "insights": []
    }