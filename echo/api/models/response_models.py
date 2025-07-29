"""
API Response Models

All Pydantic response models for the Echo API endpoints.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class BlockResponse(BaseModel):
    id: str
    start_time: str
    end_time: str
    icon: str
    project_name: str
    task_name: str
    note: str
    type: str
    duration: int  # minutes
    label: str
    is_current: bool
    progress: float


class AnalyticsResponse(BaseModel):
    date: str
    total_time: int
    categories: Dict[str, int]
    projects: Dict[str, int]
    productivity_score: float
    focus_time: int
    break_time: int


# ===== PROJECT MODELS =====

class DailyActivity(BaseModel):
    """Daily activity data point for heatmap and analytics"""
    date: str  # ISO date string (YYYY-MM-DD)
    hours: float
    sessions: int
    intensity: int  # 0-4 activity intensity scale


class ProjectRoadmapPhase(BaseModel):
    """AI-generated project roadmap phase"""
    id: str
    title: str
    goal: str
    order: int
    is_current: bool
    estimated_days: Optional[int] = None
    due_date: Optional[str] = None  # ISO date string


class ProjectRoadmap(BaseModel):
    """Complete project roadmap with AI-generated phases"""
    phases: List[ProjectRoadmapPhase]
    current_phase_id: Optional[str] = None
    ai_confidence: float
    generated_at: str  # ISO datetime
    user_modified: bool = False


class WeeklySummary(BaseModel):
    """AI-generated weekly project summary"""
    id: str
    project_id: str
    week_ending: str  # ISO date
    hours_invested: float
    sessions_count: int
    summary: str
    key_accomplishments: List[str]
    decisions_made: List[str]
    blockers_encountered: List[str]
    next_week_focus: str
    tasks_completed: int
    generated_at: str  # ISO datetime
    ai_confidence: float


class ProjectSession(BaseModel):
    """Reference to a work session associated with a project"""
    id: str
    project_id: str
    title: str
    date: str  # ISO date
    start_time: str  # HH:MM format
    end_time: str  # HH:MM format
    duration_minutes: int
    category: str
    notes_summary: str
    tags: List[str]


class ProjectResponse(BaseModel):
    """Complete project entity matching frontend Project interface"""
    id: str
    name: str
    description: str
    type: str  # ProjectType: 'software' | 'research' | 'writing' | 'creative' | 'admin' | 'personal'
    status: str  # ProjectStatus: 'active' | 'on_hold' | 'backlog' | 'completed' | 'archived'
    phase: str  # ProjectPhase: varies by project type
    
    # Objective and Context
    objective: str
    current_state: str
    
    # Time Tracking
    total_estimated_hours: int
    total_actual_hours: int
    hours_this_week: float
    hours_last_week: float
    
    # Activity Tracking (for visualization)
    weekly_activity_hours: List[float]  # Last 6-8 weeks, most recent last
    daily_activity_hours: List[DailyActivity]  # Last 6 months for heatmap
    
    # Progress and Momentum
    progress_percentage: float
    momentum: str  # 'high' | 'medium' | 'low' | 'stalled'
    
    # Metadata
    created_date: str  # ISO date
    updated_date: str  # ISO date
    last_session_date: Optional[str] = None  # ISO date
    
    # Weekly summaries (chronological)
    weekly_summaries: List[WeeklySummary] = Field(default_factory=list)
    
    # Session counts
    total_sessions: int
    sessions_this_week: int
    
    # Hybrid Wizard Fields (AI-generated)
    roadmap: Optional[ProjectRoadmap] = None
    key_deliverables: List[str] = Field(default_factory=list)
    
    # Legacy compatibility
    current_focus: Optional[str] = None
    time_spent_today: int = 0  # For backwards compatibility
    time_spent_week: int = 0   # For backwards compatibility


class ProjectStatsResponse(BaseModel):
    """Project portfolio statistics summary"""
    total_projects: int
    active_projects: int
    total_hours_all_time: float
    total_hours_this_week: float
    total_hours_last_week: float
    most_active_project: Dict[str, Any]
    completion_rate: float  # percentage of completed projects


class ProjectsListResponse(BaseModel):
    """Response for project list endpoints with metadata"""
    projects: List[ProjectResponse]
    total_count: int
    active_count: int
    completed_count: int


class SessionResponse(BaseModel):
    id: str
    start_time: str
    end_time: Optional[str]
    duration: Optional[int]
    project: str
    task: str
    notes: str
    external_tools: Dict[str, bool]


class TodayResponse(BaseModel):
    date: str
    current_time: str
    current_block: Optional[BlockResponse]
    blocks: List[BlockResponse]
    email_summary: Dict[str, Any]
    planning_stats: Dict[str, Any]
    time_context: Dict[str, Any] = Field(default_factory=dict, description="Time context for same-day planning decisions")
    narrative: Optional[Dict[str, Any]] = Field(default=None, description="AI-generated narrative summary from the plan")


class PlanRefinementResponse(BaseModel):
    """Model for plan refinement responses"""
    status: str
    message: str
    refined_blocks: List[Dict[str, Any]]
    refinement_scope: str
    changes_made: List[str]
    plan_file: Optional[str] = None


class ConfigResponse(BaseModel):
    """Model for configuration response"""
    message: str
    success: bool
    config_path: Optional[str] = None


class ScaffoldGenerationResponse(BaseModel):
    """Response model for scaffold generation"""
    success: bool
    scaffolds_generated: int
    total_blocks: int
    generation_results: Dict[str, bool]
    message: str


class SessionStartResponse(BaseModel):
    """Response model for session start with generated checklist"""
    status: str
    session_title: str
    primary_objective: str
    original_user_goal: str
    checklist: List[Dict[str, Any]]
    time_allocation: Dict[str, int]
    success_criteria: List[str]
    contingency_plan: str


class SessionCompleteResponse(BaseModel):
    """Response model for session completion with synthesized log"""
    status: str
    session_log_markdown: str = Field(description="Complete session log in markdown format")
    session_metadata: Dict[str, Any] = Field(description="Metadata about the session")
    ai_insights: Dict[str, Any] = Field(description="AI-generated insights for future planning")
    data_source: str = Field(description="Source of the log (claude_synthesis or fallback)")
    stored_successfully: bool = Field(description="Whether the log was successfully stored in database")


class GetScaffoldResponse(BaseModel):
    """Response model for scaffold retrieval"""
    success: bool
    scaffold: Optional[Dict[str, Any]] = None
    message: str