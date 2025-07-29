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


class ProjectResponse(BaseModel):
    id: str
    name: str
    status: str
    current_focus: Optional[str]
    time_spent_today: int
    time_spent_week: int
    progress_percentage: float


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