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


# ===== PROJECT REQUEST MODELS =====

class ProjectCreateRequest(BaseModel):
    """Request model for creating a new project"""
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=2000)
    type: str = Field(description="ProjectType: software, research, writing, creative, admin, personal")
    objective: str = Field(min_length=1, max_length=500, description="Primary project objective")
    estimated_hours: Optional[int] = Field(default=40, ge=1, le=10000)
    initial_phase: Optional[str] = Field(default="initiation")
    current_state: Optional[str] = Field(default="Project just created. Ready to begin work.")


class ProjectUpdateRequest(BaseModel):
    """Request model for updating an existing project"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    type: Optional[str] = None
    status: Optional[str] = None
    phase: Optional[str] = None
    objective: Optional[str] = Field(None, min_length=1, max_length=500)
    current_state: Optional[str] = Field(None, min_length=1, max_length=1000)
    progress_percentage: Optional[float] = Field(None, ge=0, le=100)
    momentum: Optional[str] = None
    total_estimated_hours: Optional[int] = Field(None, ge=1, le=10000)


class ProjectFiltersRequest(BaseModel):
    """Request model for project filtering and search"""
    status: Optional[List[str]] = None
    type: Optional[List[str]] = None
    phase: Optional[List[str]] = None
    momentum: Optional[List[str]] = None
    search: Optional[str] = Field(None, max_length=200)
    sort_by: Optional[str] = Field(default="updated_date")
    sort_order: Optional[str] = Field(default="desc", pattern="^(asc|desc)$")
    limit: Optional[int] = Field(default=50, ge=1, le=200)
    offset: Optional[int] = Field(default=0, ge=0)


# ===== HYBRID WIZARD REQUEST MODELS =====

class ConversationMessage(BaseModel):
    """Individual message in conversation history"""
    role: str = Field(pattern="^(user|assistant)$")
    content: str
    timestamp: str  # ISO datetime
    message_id: Optional[str] = None


class UploadedFileRef(BaseModel):
    """Reference to an uploaded file for context"""
    filename: str
    content_type: str 
    file_size: int
    file_path: str  # Storage path
    uploaded_at: str  # ISO datetime


class ConversationAnalysisRequest(BaseModel):
    """Request model for analyzing conversation into project structure"""
    message: str = Field(min_length=1, max_length=5000)
    conversation_history: List[ConversationMessage] = Field(default_factory=list)
    uploaded_files: List[UploadedFileRef] = Field(default_factory=list)
    current_analysis: Optional[Dict[str, Any]] = None  # Previous analysis to build upon


class RoadmapGenerationRequest(BaseModel):
    """Request model for generating AI project roadmap"""
    project_brief: Dict[str, Any] = Field(description="Current project brief state")
    project_type: str = Field(description="Type of project for roadmap generation")
    estimated_duration: Optional[int] = Field(None, ge=1, le=365, description="Estimated duration in days")
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User preferences for roadmap")


class HybridProjectCreateRequest(BaseModel):
    """Request model for creating project from hybrid wizard"""
    project_brief: Dict[str, Any] = Field(description="Complete project brief from conversation")
    conversation_history: List[ConversationMessage] = Field(description="Full conversation for context")
    roadmap: Optional[Dict[str, Any]] = None  # AI-generated roadmap
    uploaded_files: List[UploadedFileRef] = Field(default_factory=list)
    user_refinements: Optional[Dict[str, Any]] = Field(default_factory=dict, description="User manual refinements")


class FileUploadRequest(BaseModel):
    """Request model for file upload validation"""
    filename: str
    content_type: str
    file_size: int
    project_context: Optional[str] = None  # Optional context about how file relates to project


# ===== ANALYTICS REQUEST MODELS =====

class ActivityHeatmapRequest(BaseModel):
    """Request model for generating activity heatmap data"""
    project_id: str
    start_date: str  # ISO date
    end_date: str    # ISO date
    granularity: str = Field(default="daily", pattern="^(daily|weekly|monthly)$")


class WeeklySummaryGenerationRequest(BaseModel):
    """Request model for generating weekly project summary"""
    project_id: str
    week_ending: str  # ISO date (Sunday)
    force_regenerate: bool = Field(default=False)