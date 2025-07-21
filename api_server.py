"""
Echo API Server

FastAPI server that exposes Echo's core functionality for the macOS app.
Provides endpoints for today's schedule, analytics, projects, and sessions.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, date, time
import json
import logging
from pathlib import Path
import asyncio

# Echo imports
from echo.config_loader import load_config
from echo.email_processor import OutlookEmailProcessor
from echo.prompt_engine import build_email_aware_planner_prompt, parse_planner_response
from echo.journal import get_recent_reflection_context, analyze_energy_mood_trends
from echo.models import Block, BlockType, Config
from echo.analytics import calculate_daily_stats, get_recent_stats, categorize_block
from echo.session import SessionState

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Echo API",
    description="API server for Echo productivity system",
    version="1.0.0"
)

# Add CORS middleware for macOS app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class BlockResponse(BaseModel):
    id: str
    start_time: str
    end_time: str
    emoji: str
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

class PlanningRequest(BaseModel):
    most_important: str
    todos: List[str]
    energy_level: str
    non_negotiables: str
    avoid_today: str
    fixed_events: List[str]

# Global state (in production, use proper state management)
config: Optional[Config] = None
email_processor: Optional[OutlookEmailProcessor] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the API server on startup."""
    global config, email_processor
    
    try:
        logger.info("Initializing Echo API server...")
        config = load_config()
        email_processor = OutlookEmailProcessor()
        email_processor.load_email_filters(config.email)
        logger.info("Echo API server initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Echo API server: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/today", response_model=TodayResponse)
async def get_today_schedule():
    """Get today's schedule with current status and email integration."""
    try:
        today = date.today()
        current_time = datetime.now()
        
        # Load today's plan from file
        plan_file = Path(f"plans/{today.isoformat()}-enhanced-plan.json")
        
        if not plan_file.exists():
            # Generate a new plan if none exists
            blocks = await generate_today_plan()
        else:
            with open(plan_file, 'r') as f:
                plan_data = json.load(f)
                blocks = []
                for block_data in plan_data.get("blocks", []):
                    # Parse time strings to time objects
                    start_time = datetime.strptime(block_data["start"], "%H:%M:%S").time()
                    end_time = datetime.strptime(block_data["end"], "%H:%M:%S").time()
                    
                    block = Block(
                        start=start_time,
                        end=end_time,
                        label=block_data["label"],
                        type=BlockType(block_data["type"])
                    )
                    blocks.append(block)
        
        # Convert blocks to response format
        block_responses = []
        current_block = None
        
        for block in blocks:
            # Convert time objects to strings for comparison
            current_time_str = current_time.strftime("%H:%M:%S")
            start_time_str = block.start.strftime("%H:%M:%S")
            end_time_str = block.end.strftime("%H:%M:%S")
            
            is_current = start_time_str <= current_time_str <= end_time_str
            progress = 0.0
            
            if is_current:
                current_block = block
                # Calculate progress
                start_minutes = block.start.hour * 60 + block.start.minute
                end_minutes = block.end.hour * 60 + block.end.minute
                current_minutes = current_time.hour * 60 + current_time.minute
                
                elapsed = current_minutes - start_minutes
                total = end_minutes - start_minutes
                progress = max(0.0, min(1.0, elapsed / total)) if total > 0 else 0.0
            
            # Parse project and task from label
            label_parts = block.label.split(" | ", 1)
            project_name = label_parts[0] if len(label_parts) > 1 else "Unknown"
            task_name = label_parts[1] if len(label_parts) > 1 else block.label
            
            block_response = BlockResponse(
                id=f"block_{block.start.isoformat()}",
                start_time=block.start.isoformat(),
                end_time=block.end.isoformat(),
                emoji="🚀",  # Default emoji
                project_name=project_name,
                task_name=task_name,
                note="",  # TODO: Add notes from block metadata
                type=block.type.value,
                duration=int(block.end.hour * 60 + block.end.minute - (block.start.hour * 60 + block.start.minute)),
                label=block.label,
                is_current=is_current,
                progress=progress
            )
            block_responses.append(block_response)
        
        # Get email context
        email_context = {}
        planning_stats = {}
        if email_processor:
            try:
                email_context = email_processor.get_email_planning_context(days=7)
                planning_stats = email_processor.get_email_planning_stats()
            except Exception as e:
                logger.warning(f"Failed to get email context: {e}")
        
        return TodayResponse(
            date=today.isoformat(),
            current_time=current_time.strftime("%H:%M"),
            current_block=BlockResponse(**current_block.__dict__) if current_block else None,
            blocks=block_responses,
            email_summary=email_context,
            planning_stats=planning_stats
        )
        
    except Exception as e:
        logger.error(f"Error getting today's schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(date_str: Optional[str] = None):
    """Get analytics for a specific date or today."""
    try:
        target_date = date.fromisoformat(date_str) if date_str else date.today()
        
        # Get recent stats for the target date
        recent_stats = get_recent_stats(7)  # Get last 7 days
        target_stats = None
        
        # Find stats for the target date
        for stats in recent_stats:
            if stats.date == target_date:
                target_stats = stats
                break
        
        if not target_stats:
            # Return empty stats if no data for target date
            return AnalyticsResponse(
                date=target_date.isoformat(),
                total_time=0,
                categories={},
                projects={},
                productivity_score=0.0,
                focus_time=0,
                break_time=0
            )
        
        # Calculate productivity score (simplified)
        total_time = target_stats.total_minutes
        focus_time = target_stats.category_breakdown.get("deep_work", 0)
        productivity_score = (focus_time / total_time * 100) if total_time > 0 else 0
        
        return AnalyticsResponse(
            date=target_date.isoformat(),
            total_time=total_time,
            categories=target_stats.category_breakdown,
            projects=target_stats.project_breakdown,
            productivity_score=productivity_score,
            focus_time=focus_time,
            break_time=target_stats.category_breakdown.get("rest", 0)
        )
        
    except Exception as e:
        logger.error(f"Error getting analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects():
    """Get all projects with their current status and time tracking."""
    try:
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        projects = []
        for project_id, project_data in config.projects.items():
            # Calculate time spent (simplified - in production, use real analytics)
            time_spent_today = 0  # TODO: Calculate from analytics
            time_spent_week = 0   # TODO: Calculate from analytics
            
            project_response = ProjectResponse(
                id=project_id,
                name=project_data.get("name", project_id),
                status=project_data.get("status", "active"),
                current_focus=project_data.get("current_focus"),
                time_spent_today=time_spent_today,
                time_spent_week=time_spent_week,
                progress_percentage=0.0  # TODO: Calculate from milestones
            )
            projects.append(project_response)
        
        return projects
        
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions", response_model=List[SessionResponse])
async def get_sessions():
    """Get recent sessions."""
    try:
        # TODO: Implement real session loading
        # For now, return empty list
        return []
        
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/plan")
async def create_plan(request: PlanningRequest):
    """Create a new plan for today."""
    try:
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        # Get email context
        email_context = {}
        if email_processor:
            try:
                email_context = email_processor.get_email_planning_context(days=7)
            except Exception as e:
                logger.warning(f"Failed to get email context: {e}")
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Build planning prompt
        prompt = build_email_aware_planner_prompt(
            most_important=request.most_important,
            todos=request.todos,
            energy_level=request.energy_level,
            non_negotiables=request.non_negotiables,
            avoid_today=request.avoid_today,
            fixed_events=request.fixed_events,
            config=config,
            email_context=email_context,
            journal_context=journal_context[0] if journal_context else None,
            recent_trends=recent_trends
        )
        
        # TODO: Call LLM to generate plan
        # For now, return success response
        return {"status": "success", "message": "Plan generation initiated"}
        
    except Exception as e:
        logger.error(f"Error creating plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_today_plan() -> List[Block]:
    """Generate a plan for today using the LLM."""
    # TODO: Implement actual plan generation
    # For now, return sample blocks
    today = date.today()
    
    sample_blocks = [
        Block(
            start=time(6, 0),
            end=time(7, 0),
            label="Personal | Morning Routine",
            type=BlockType.ANCHOR
        ),
        Block(
            start=time(9, 0),
            end=time(10, 30),
            label="Echo Development | API Server",
            type=BlockType.FLEX
        ),
        Block(
            start=time(10, 30),
            end=time(12, 0),
            label="Echo Development | macOS App",
            type=BlockType.FLEX
        ),
        Block(
            start=time(12, 0),
            end=time(13, 0),
            label="Personal | Lunch Break",
            type=BlockType.ANCHOR
        ),
        Block(
            start=time(17, 0),
            end=time(18, 0),
            label="Personal | Evening Routine",
            type=BlockType.ANCHOR
        )
    ]
    
    return sample_blocks

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 