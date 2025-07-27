"""
API Request Models

All Pydantic request models for the Echo API endpoints.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class PlanningRequest(BaseModel):
    most_important: str
    todos: List[str]
    energy_level: str
    non_negotiables: str
    avoid_today: str
    fixed_events: List[str]
    routine_overrides: Optional[str] = ""


class ReflectionRequest(BaseModel):
    day_rating: int
    energy_level: str
    what_happened: str
    what_worked: str
    what_drained: str
    key_insights: str
    tomorrow_priority: str
    tomorrow_energy: str
    tomorrow_environment: str
    tomorrow_non_negotiables: str
    tomorrow_avoid: str


class PlanRefinementRequest(BaseModel):
    """Model for plan refinement requests"""
    refinement_feedback: str
    previous_plan: List[Dict[str, Any]]
    original_request: PlanningRequest
    refinement_history: Optional[List[Dict[str, Any]]] = None


class KnownBlock(BaseModel):
    """Model for known block configuration"""
    id: str
    name: str
    type: str  # anchor, fixed, flex
    start_time: str
    duration: int  # in minutes
    category: str
    description: Optional[str] = None
    days: List[str]  # days of the week
    preferred_time: Optional[str] = None  # For flex blocks


class Reminder(BaseModel):
    """Model for reminder configuration"""
    id: str
    title: str
    description: Optional[str] = None
    due_date: str  # ISO date string
    priority: str = "medium"  # high, medium, low
    category: str = "reminder"


class ConfigRequest(BaseModel):
    """Model for configuration wizard requests"""
    known_blocks: List[KnownBlock]
    reminders: List[Reminder] = []


class ScaffoldGenerationRequest(BaseModel):
    """Request model for scaffold generation after daily planning"""
    daily_plan: List[Dict[str, Any]] = Field(description="Daily plan blocks in JSON format")
    context_briefing: Dict[str, Any] = Field(description="Context briefing data for scaffolding")
    force_refresh: bool = Field(default=False, description="Force regeneration of scaffolds")


class SessionStartRequest(BaseModel):
    """Request model for session start with checklist generation"""
    block_id: str = Field(description="ID of the schedule block being started")
    primary_outcome: str = Field(description="User's main goal for this session")
    key_tasks: List[str] = Field(description="User's key tasks or notes")
    session_duration_minutes: int = Field(default=90, description="Session duration in minutes")
    energy_level: Optional[int] = Field(default=None, description="User's energy level 1-10")
    time_constraints: Optional[str] = Field(default=None, description="Any time constraints")


class SessionCompleteRequest(BaseModel):
    """Request model for session completion and log synthesis"""
    # Session identification
    block_id: str = Field(description="ID of the schedule block that was completed")
    
    # User debrief data  
    accomplishments: str = Field(description="What the user accomplished during the session")
    outstanding: str = Field(description="What's still outstanding or for next time")
    final_notes: str = Field(description="User's final thoughts and reflections")
    
    # Session metadata
    session_duration_minutes: int = Field(description="Actual session duration in minutes")
    block_title: str = Field(description="Title of the session block")
    project_name: str = Field(description="Project this session belonged to")
    time_category: str = Field(description="Session category (deep_work, meetings, etc)")
    start_time: str = Field(description="Session start time (HH:MM format)")
    end_time: str = Field(description="Session end time (HH:MM format)")
    
    # Optional checklist data for enhanced synthesis
    checklist_data: Optional[Dict[str, Any]] = Field(default=None, description="Original checklist and completion status")


class GetScaffoldRequest(BaseModel):
    """Request model for retrieving a session scaffold"""
    block_id: str = Field(description="ID of the schedule block")