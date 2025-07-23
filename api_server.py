"""
Echo API Server

FastAPI server that exposes Echo's core functionality for the macOS app.
Provides endpoints for today's schedule, analytics, projects, and sessions.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
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
from echo.prompt_engine import build_email_aware_planner_prompt, parse_planner_response, build_enricher_prompt, parse_enricher_response, build_refinement_enhanced_planner_prompt, parse_refinement_feedback, detect_refinement_scope, build_context_briefing_prompt, parse_context_briefing_response
from echo.journal import get_recent_reflection_context, analyze_energy_mood_trends
from echo.models import Block, BlockType, Config
from echo.analytics import calculate_daily_stats, get_recent_stats, categorize_block
from echo.session import SessionState
import openai
import os
import yaml
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions."""
    logger.error(f"Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# Handle HTTP exceptions specifically
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging."""
    logger.warning(f"HTTP exception on {request.url}: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Pydantic models for API requests/responses
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

class PlanningRequest(BaseModel):
    most_important: str
    todos: List[str]
    energy_level: str
    non_negotiables: str
    avoid_today: str
    fixed_events: List[str]

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

class PlanRefinementResponse(BaseModel):
    """Model for plan refinement responses"""
    status: str
    message: str
    refined_blocks: List[Dict[str, Any]]
    refinement_scope: str
    changes_made: List[str]
    plan_file: Optional[str] = None

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

class ConfigRequest(BaseModel):
    """Model for configuration wizard requests"""
    known_blocks: List[KnownBlock]

class ConfigResponse(BaseModel):
    """Model for configuration response"""
    message: str
    success: bool
    config_path: Optional[str] = None

# Global state (in production, use proper state management)
config: Optional[Config] = None
email_processor: Optional[OutlookEmailProcessor] = None

def _get_openai_client():
    """Get OpenAI client with API key from environment."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        return openai.OpenAI(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to get OpenAI client: {e}")
        raise

def _call_llm(client, prompt: str) -> str:
    """Call the LLM with the given prompt with error handling."""
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that follows instructions precisely."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"Error calling LLM: {e}")
        raise

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
            
            # Get enricher data if available
            icon = "Rocket"  # Default
            note = ""     # Default
            
            # Check if plan data has enricher information
            if plan_file.exists():
                with open(plan_file, 'r') as f:
                    plan_data = json.load(f)
                    for saved_block in plan_data.get("blocks", []):
                        if (saved_block.get("start") == block.start.strftime("%H:%M:%S") and 
                            saved_block.get("end") == block.end.strftime("%H:%M:%S")):
                            icon = saved_block.get("icon", "Rocket")
                            note = saved_block.get("note", "")
                            break
            
            block_response = BlockResponse(
                id=f"block_{block.start.isoformat()}",
                start_time=block.start.isoformat(),
                end_time=block.end.isoformat(),
                icon=icon,
                project_name=project_name,
                task_name=task_name,
                note=note,
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
        
        # Get email context and daily brief
        email_context = {}
        email_brief = {}
        if email_processor:
            try:
                email_context = email_processor.get_email_planning_context(days=7)
                email_brief = email_processor.get_daily_email_brief(days=1)
            except Exception as e:
                logger.warning(f"Failed to get email context: {e}")
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Build planning prompt with proactive email time blocks
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
            recent_trends=recent_trends,
            email_brief=email_brief
        )
        
        # Call LLM to generate plan using two-stage architecture
        try:
            client = _get_openai_client()
            
            # Stage 1: Planner generates basic structure
            planner_response = _call_llm(client, prompt)
            blocks = parse_planner_response(planner_response)
            
            # Stage 2: Enricher adds icons and notes
            enricher_prompt = build_enricher_prompt(blocks)
            enricher_response = _call_llm(client, enricher_prompt)
            enriched_blocks = parse_enricher_response(enricher_response, blocks)
            
            # Use enriched blocks for final plan
            blocks = enriched_blocks
            
            # Save plan to file
            today = date.today()
            plan_file = Path(f"plans/{today.isoformat()}-enhanced-plan.json")
            plan_file.parent.mkdir(exist_ok=True)
            
            plan_data = {
                "date": today.isoformat(),
                "created_at": datetime.now().isoformat(),
                "blocks": [],
                "metadata": {
                    "email_context": email_context,
                    "journal_context": journal_context[0] if journal_context else None,
                    "user_input": {
                        "most_important": request.most_important,
                        "todos": request.todos,
                        "energy_level": request.energy_level,
                        "non_negotiables": request.non_negotiables,
                        "avoid_today": request.avoid_today
                    }
                }
            }
            
            # Convert enriched blocks to JSON format
            for block in blocks:
                block_data = {
                    "start": block.start.strftime("%H:%M:%S"),
                    "end": block.end.strftime("%H:%M:%S"),
                    "label": block.label,
                    "type": block.type.value if hasattr(block.type, 'value') else str(block.type),
                    "icon": getattr(block, 'icon', 'Rocket'),  # Use enricher icon or default
                    "note": getattr(block, 'note', '')       # Use enricher note or empty
                }
                plan_data["blocks"].append(block_data)
            
            # Save to file
            with open(plan_file, 'w') as f:
                json.dump(plan_data, f, indent=2)
            
            # Return the generated plan
            return {
                "status": "success", 
                "message": "Plan generated successfully",
                "blocks": plan_data["blocks"],
                "plan_file": str(plan_file)
            }
            
        except Exception as llm_error:
            logger.error(f"LLM planning error: {llm_error}")
            raise HTTPException(status_code=500, detail=f"Failed to generate plan: {str(llm_error)}")
        
    except Exception as e:
        logger.error(f"Error creating plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/reflection")
async def save_reflection(request: ReflectionRequest):
    """Save evening reflection to journal."""
    try:
        from echo.journal import create_enhanced_evening_reflection_entry
        
        # Create journal entry
        entry = create_enhanced_evening_reflection_entry(
            what_went_well=request.what_worked,
            challenges=request.what_drained,
            learnings=request.key_insights,
            energy_level=request.energy_level,
            mood=str(request.day_rating),  # Convert int to string
            patterns_noticed=request.what_happened,
            tomorrow_focus=request.tomorrow_priority,
            tomorrow_energy=request.tomorrow_energy,
            non_negotiables=request.tomorrow_non_negotiables,
            avoid_tomorrow=request.tomorrow_avoid
        )
        
        return {
            "status": "success",
            "message": "Reflection saved successfully",
            "entry_date": entry.date.isoformat(),
            "created_at": entry.created_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error saving reflection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email-summary")
async def get_email_summary():
    """Get today's email summary for planning page."""
    try:
        if not email_processor:
            return {
                "total_emails": 0,
                "unread_emails": 0,
                "urgent_emails": 0,
                "action_items": [],
                "summary": "Email integration not configured"
            }
        
        # Get email context
        email_context = email_processor.get_email_planning_context(days=1)
        
        # Transform to frontend format
        action_items = []
        if email_context.get("emails"):
            # Use the structured email data that includes sender info
            for i, email in enumerate(email_context["emails"][:5]):
                # Try to get LLM-generated specific description from action_items
                specific_description = "Review and respond to this email appropriately"
                if email_context.get("action_items") and i < len(email_context["action_items"]):
                    llm_action = email_context["action_items"][i]
                    if isinstance(llm_action, dict) and "specific_description" in llm_action:
                        specific_description = llm_action["specific_description"]
                
                action_items.append({
                    "id": str(i + 1),
                    "from": email.get("sender", "Unknown Sender"),
                    "subject": email.get("subject", "No Subject"),
                    "priority": "High" if email.get("importance") == "high" else "Medium",
                    "timeEstimate": "30 min" if email.get("urgency") == "high" else "15 min",
                    "category": "Urgent Reply" if email.get("urgency") == "high" else "Review & Respond",
                    "specificDescription": specific_description
                })
        elif email_context.get("action_items"):
            # Fallback to action items list if structured email data not available
            for i, item in enumerate(email_context["action_items"][:5]):
                action_items.append({
                    "id": str(i + 1),
                    "from": "Unknown Sender",  
                    "subject": item,
                    "priority": "Medium",
                    "timeEstimate": "15 min",
                    "category": "Review & Respond"
                })
        
        return {
            "total_emails": email_context.get("total_unresponded", 0),
            "unread_emails": email_context.get("total_unresponded", 0),
            "urgent_emails": email_context.get("urgent_count", 0),
            "action_items": action_items,
            "summary": email_context.get("summary", "No email summary available")
        }
        
    except Exception as e:
        logger.warning(f"Error getting email summary: {e}")
        # Return graceful fallback
        return {
            "total_emails": 0,
            "unread_emails": 0,
            "urgent_emails": 0,
            "action_items": [],
            "summary": f"Email summary unavailable: {str(e)}"
        }

@app.get("/conversation-intelligence")
async def get_conversation_intelligence():
    """Get thread-aware conversation intelligence for planning."""
    try:
        if not email_processor:
            return {
                "conversation_summary": "Email integration not configured",
                "actionable_inputs": [],
                "my_commitments": [],
                "my_requests": [],
                "conversation_intelligence": {
                    "high_priority_threads": [],
                    "stalled_conversations": [],
                    "strategic_insights": ["Email processor not available"],
                    "recommended_actions": ["Configure email integration"]
                }
            }
        
        # Get conversation intelligence with thread-aware processing
        intelligence = email_processor.get_conversation_intelligence(days=7)
        
        return intelligence
        
    except Exception as e:
        logger.error(f"Error getting conversation intelligence: {e}")
        # Return graceful fallback
        return {
            "conversation_summary": f"Conversation intelligence unavailable: {str(e)}",
            "actionable_inputs": [],
            "my_commitments": [],
            "my_requests": [],
            "conversation_intelligence": {
                "high_priority_threads": [],
                "stalled_conversations": [],
                "strategic_insights": ["Error in conversation processing"],
                "recommended_actions": ["Check email processor configuration"]
            }
        }

@app.get("/daily-email-brief")
async def get_daily_email_brief_endpoint():
    """Get comprehensive daily email brief with proactive time blocks."""
    try:
        if not email_processor:
            return {
                "date": datetime.now().strftime('%Y-%m-%d'),
                "conversation_summary": "Email integration not configured",
                "metrics": {"actionable_inputs": 0, "my_commitments": 0, "my_requests": 0},
                "priority_actions": [],
                "urgent_commitments": [],
                "blocking_requests": [],
                "strategic_insights": [],
                "time_blocks_needed": [],
                "follow_up_scheduling": []
            }
        
        # Get the daily brief
        brief = email_processor.get_daily_email_brief(days=1)
        
        return brief
        
    except Exception as e:
        logger.error(f"Error getting daily email brief: {e}")
        # Return graceful fallback
        return {
            "date": datetime.now().strftime('%Y-%m-%d'),
            "conversation_summary": f"Brief unavailable: {str(e)}",
            "metrics": {"actionable_inputs": 0, "my_commitments": 0, "my_requests": 0},
            "priority_actions": [],
            "urgent_commitments": [],
            "blocking_requests": [],
            "strategic_insights": [],
            "time_blocks_needed": [],
            "follow_up_scheduling": []
        }

@app.get("/context-briefing")
async def get_context_briefing():
    """Generate tomorrow's context briefing with comprehensive intelligence."""
    try:
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        # Get email context
        email_context = ""
        if email_processor:
            try:
                email_brief = email_processor.get_daily_email_brief(days=1)
                email_context = email_brief.get('conversation_summary', '')
                
                # Add priority actions
                priority_actions = email_brief.get('priority_actions', [])
                if priority_actions:
                    email_context += f"\n\nPriority Actions:\n"
                    for action in priority_actions[:5]:  # Top 5
                        email_context += f"- {action.get('action', 'Unknown action')}\n"
                        
            except Exception as e:
                logger.warning(f"Failed to get email context for briefing: {e}")
                email_context = "Email context unavailable."
        
        # Get fixed calendar events for tomorrow (placeholder - would integrate with actual calendar)
        calendar_events = []
        # TODO: Integrate with calendar API to get tomorrow's fixed events
        
        # Get session insights from recent work logs
        session_insights = []
        try:
            from pathlib import Path
            import glob
            
            # Look for recent session logs in logs directory
            logs_dir = Path("logs")
            if logs_dir.exists():
                # Get the most recent log files
                log_files = list(logs_dir.glob("*.md"))
                log_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                
                for log_file in log_files[:5]:  # Last 5 sessions
                    try:
                        with open(log_file, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Extract todos and insights from log content
                        todos = []
                        insights = []
                        
                        # Simple parsing of markdown logs
                        lines = content.split('\n')
                        for line in lines:
                            line_lower = line.lower().strip()
                            if any(keyword in line_lower for keyword in ['todo', 'need to', 'should', 'must']):
                                todos.append(line.strip('- ').strip())
                            elif any(keyword in line_lower for keyword in ['insight', 'learned', 'discovered', 'realized']):
                                insights.append(line.strip('- ').strip())
                        
                        if todos or insights:
                            session_insights.append({
                                'date': log_file.stem,
                                'project': 'Recent Work',  # Could be extracted from log content
                                'todos': todos[:3],  # Limit to top 3
                                'insights': insights[:2]  # Limit to top 2
                            })
                            
                    except Exception as e:
                        logger.warning(f"Failed to parse log file {log_file}: {e}")
                        continue
                        
        except Exception as e:
            logger.warning(f"Failed to get session insights: {e}")
        
        # Get reminders from the reminder system
        reminders = []
        try:
            # For now, we'll create some sample reminders that should show up
            # In the future, this would read from a database or config file
            from datetime import datetime, timedelta
            tomorrow = datetime.now() + timedelta(days=1)
            
            # Sample reminders for testing - in production this would come from the database
            reminders = [
                {
                    'text': 'Pay Amex bill',
                    'urgency': 'high',
                    'due_date': tomorrow.strftime('%Y-%m-%d')
                },
                {
                    'text': 'Submit quarterly report',
                    'urgency': 'medium',
                    'due_date': (tomorrow + timedelta(days=2)).strftime('%Y-%m-%d')
                }
            ]
        except Exception as e:
            logger.warning(f"Failed to load reminders: {e}")
            reminders = []
        
        # Build the context briefing prompt
        prompt = build_context_briefing_prompt(
            email_context=email_context,
            calendar_events=calendar_events,
            session_insights=session_insights,
            reminders=reminders
        )
        
        # Call LLM to generate briefing
        client = _get_openai_client()
        response = _call_llm(client, prompt)
        
        # Parse the response
        briefing_data = parse_context_briefing_response(response)
        
        return {
            "status": "success",
            "briefing": briefing_data["briefing_text"],
            "sections": briefing_data["sections"],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating context briefing: {e}")
        # Return graceful fallback
        return {
            "status": "error",
            "briefing": f"**Context Briefing Unavailable**\n\nUnable to generate briefing: {str(e)}\n\nPlease proceed with manual planning.",
            "sections": {
                "email": "No email context available",
                "calendar": "No calendar events loaded", 
                "sessions": "No session insights available",
                "reminders": "No reminders loaded"
            },
            "timestamp": datetime.now().isoformat()
        }

@app.post("/plan/refine", response_model=PlanRefinementResponse)
async def refine_plan(request: PlanRefinementRequest):
    """Refine an existing plan based on user feedback."""
    try:
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        # Parse the refinement feedback
        feedback_items = parse_refinement_feedback(request.refinement_feedback)
        
        if not feedback_items:
            raise HTTPException(status_code=400, detail="No valid refinement feedback provided")
        
        # Detect refinement scope for optimization
        refinement_scope = detect_refinement_scope(feedback_items)
        
        logger.info(f"Processing {refinement_scope} refinement with {len(feedback_items)} feedback items")
        
        # Get email context and daily brief (same as original planning)
        email_context = {}
        email_brief = {}
        if email_processor:
            try:
                email_context = email_processor.get_email_planning_context(days=7)
                email_brief = email_processor.get_daily_email_brief(days=1)
            except Exception as e:
                logger.warning(f"Failed to get email context for refinement: {e}")
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Build the refinement-enhanced planning prompt
        prompt = build_refinement_enhanced_planner_prompt(
            most_important=request.original_request.most_important,
            todos=request.original_request.todos,
            energy_level=request.original_request.energy_level,
            non_negotiables=request.original_request.non_negotiables,
            avoid_today=request.original_request.avoid_today,
            fixed_events=request.original_request.fixed_events,
            config=config,
            email_context=email_context,
            journal_context=journal_context[0] if journal_context else None,
            recent_trends=recent_trends,
            email_brief=email_brief,
            refinement_feedback=feedback_items,
            previous_plan=request.previous_plan,
            refinement_history=request.refinement_history
        )
        
        # Call LLM to generate refined plan using two-stage architecture
        try:
            client = _get_openai_client()
            
            # Stage 1: Planner generates refined structure
            planner_response = _call_llm(client, prompt)
            refined_blocks = parse_planner_response(planner_response)
            
            # Stage 2: Enricher adds icons and notes (skip if minor refinement)
            if refinement_scope in ['moderate', 'major']:
                enricher_prompt = build_enricher_prompt(refined_blocks)
                enricher_response = _call_llm(client, enricher_prompt)
                refined_blocks = parse_enricher_response(enricher_response, refined_blocks)
            else:
                # For minor refinements, preserve existing enrichment
                logger.info("Skipping enricher stage for minor refinement")
            
            # Save refined plan to file
            today = date.today()
            plan_file = Path(f"plans/{today.isoformat()}-refined-plan.json")
            plan_file.parent.mkdir(exist_ok=True)
            
            plan_data = {
                "date": today.isoformat(),
                "created_at": datetime.now().isoformat(),
                "refinement_applied": True,
                "refinement_scope": refinement_scope,
                "original_feedback": request.refinement_feedback,
                "parsed_feedback": feedback_items,
                "blocks": [],
                "metadata": {
                    "email_context": email_context,
                    "journal_context": journal_context[0] if journal_context else None,
                    "refinement_history": request.refinement_history,
                    "original_request": {
                        "most_important": request.original_request.most_important,
                        "todos": request.original_request.todos,
                        "energy_level": request.original_request.energy_level,
                        "non_negotiables": request.original_request.non_negotiables,
                        "avoid_today": request.original_request.avoid_today
                    }
                }
            }
            
            # Convert refined blocks to JSON format
            for block in refined_blocks:
                block_data = {
                    "start": block.start.strftime("%H:%M:%S"),
                    "end": block.end.strftime("%H:%M:%S"),
                    "label": block.label,
                    "type": block.type.value if hasattr(block.type, 'value') else str(block.type),
                    "icon": getattr(block, 'icon', 'Rocket'),
                    "note": getattr(block, 'note', '')
                }
                plan_data["blocks"].append(block_data)
            
            # Save refined plan
            with open(plan_file, 'w') as f:
                json.dump(plan_data, f, indent=2)
            
            # Generate change summary
            changes_made = [
                f"Applied {refinement_scope} refinement",
                f"Processed {len(feedback_items)} feedback items",
                f"Generated {len(refined_blocks)} refined blocks"
            ]
            
            # Add specific change descriptions based on feedback
            for feedback in feedback_items[:3]:  # Top 3 feedback items
                changes_made.append(f"Addressed: '{feedback[:50]}...' " if len(feedback) > 50 else f"Addressed: '{feedback}'")
            
            logger.info(f"Successfully refined plan with {refinement_scope} changes")
            
            return PlanRefinementResponse(
                status="success",
                message=f"Plan successfully refined with {refinement_scope} changes",
                refined_blocks=plan_data["blocks"],
                refinement_scope=refinement_scope,
                changes_made=changes_made,
                plan_file=str(plan_file)
            )
            
        except Exception as llm_error:
            logger.error(f"LLM refinement error: {llm_error}")
            raise HTTPException(status_code=500, detail=f"Failed to refine plan: {str(llm_error)}")
        
    except Exception as e:
        logger.error(f"Error refining plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def generate_today_plan() -> List[Block]:
    """Generate a plan for today using the LLM."""
    try:
        if not config:
            raise ValueError("Configuration not loaded")
        
        # Get email context and daily brief
        email_context = {}
        email_brief = {}
        if email_processor:
            try:
                email_context = email_processor.get_email_planning_context(days=7)
                email_brief = email_processor.get_daily_email_brief(days=1)
            except Exception as e:
                logger.warning(f"Failed to get email context for auto-plan: {e}")
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Build prompt with default values and email brief
        prompt = build_email_aware_planner_prompt(
            most_important="Focus on high-priority tasks",
            todos=["Complete outstanding work"],
            energy_level="7",
            non_negotiables="Morning routine, lunch break, evening routine",
            avoid_today="Unnecessary meetings, distractions",
            fixed_events=[],
            config=config,
            email_context=email_context,
            journal_context=journal_context[0] if journal_context else None,
            recent_trends=recent_trends,
            email_brief=email_brief
        )
        
        # Call LLM
        client = _get_openai_client()
        response = _call_llm(client, prompt)
        
        # Parse and return blocks
        blocks = parse_planner_response(response)
        return blocks
        
    except Exception as e:
        logger.warning(f"Failed to generate LLM plan, falling back to sample: {e}")
        # Fallback to sample blocks if LLM fails
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
                label="Echo Development | Frontend Integration",
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

@app.post("/config/save", response_model=ConfigResponse)
async def save_config(request: ConfigRequest):
    """Save configuration from the wizard to user_config.yaml"""
    try:
        # Convert known blocks to weekly_schedule format
        weekly_schedule = {}
        days_of_week = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for day in days_of_week:
            weekly_schedule[day] = {
                "anchors": [],
                "fixed": [],
                "flex": []
            }

        def add_minutes_to_time(time_str: str, minutes: int) -> str:
            """Helper to add minutes to a time string"""
            hours, mins = map(int, time_str.split(':'))
            total_minutes = hours * 60 + mins + minutes
            new_hours = (total_minutes // 60) % 24
            new_mins = total_minutes % 60
            return f"{new_hours:02d}:{new_mins:02d}"

        # Process each known block
        for block in request.known_blocks:
            for day in block.days:
                if day in weekly_schedule:
                    end_time = add_minutes_to_time(block.start_time, block.duration)
                    schedule_block = {
                        "time": f"{block.start_time}–{end_time}",
                        "category": block.category.lower()
                    }
                    
                    if block.type == "fixed":
                        schedule_block["label"] = block.name
                    else:
                        schedule_block["task"] = block.name
                    
                    if block.description:
                        schedule_block["description"] = block.description
                    
                    # Add to appropriate type list
                    type_key = f"{block.type}s" if block.type != "flex" else "flex"
                    if type_key in weekly_schedule[day]:
                        weekly_schedule[day][type_key].append(schedule_block)

        # Load existing config or create new one
        config_path = Path("config/user_config.yaml")
        
        if config_path.exists():
            with open(config_path, 'r') as f:
                existing_config = yaml.safe_load(f)
        else:
            # Create basic config structure
            existing_config = {
                "defaults": {
                    "wake_time": "07:00",
                    "sleep_time": "22:00"
                },
                "projects": {
                    "personal": {
                        "name": "Personal Projects",
                        "status": "active",
                        "current_focus": "General productivity"
                    }
                },
                "profiles": {
                    "default": {
                        "name": "Default Profile",
                        "overrides": {}
                    }
                },
                "email": {
                    "important_senders": [],
                    "urgent_keywords": ["urgent", "asap", "deadline", "important"],
                    "action_keywords": ["please", "can you", "need", "review"]
                }
            }

        # Update weekly_schedule
        existing_config["weekly_schedule"] = weekly_schedule

        # Create config directory if it doesn't exist
        config_path.parent.mkdir(parents=True, exist_ok=True)

        # Write updated config
        with open(config_path, 'w') as f:
            yaml.safe_dump(existing_config, f, default_flow_style=False, sort_keys=False, indent=2)

        logger.info(f"Configuration saved to {config_path}")
        
        return ConfigResponse(
            message=f"Configuration saved successfully with {len(request.known_blocks)} known blocks",
            success=True,
            config_path=str(config_path)
        )

    except Exception as e:
        logger.error(f"Error saving configuration: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save configuration: {str(e)}")

@app.get("/config/load")
async def load_existing_config():
    """Load existing configuration for editing in wizard"""
    try:
        config_path = Path("config/user_config.yaml")
        
        if not config_path.exists():
            return {
                "known_blocks": [],
                "message": "No existing configuration found"
            }

        with open(config_path, 'r') as f:
            config_data = yaml.safe_load(f)

        known_blocks = []
        weekly_schedule = config_data.get("weekly_schedule", {})
        
        # Convert weekly_schedule back to known blocks format
        # This is a simplified conversion - might need refinement
        block_templates = {}
        
        for day, schedule in weekly_schedule.items():
            for block_type in ["anchors", "fixed", "flex"]:
                if block_type in schedule:
                    for block in schedule[block_type]:
                        # Extract time range
                        time_range = block.get("time", "")
                        if "–" in time_range:
                            start_time, end_time = time_range.split("–")
                            start_time = start_time.strip()
                            end_time = end_time.strip()
                            
                            # Calculate duration with error handling
                            try:
                                start_h, start_m = map(int, start_time.split(":"))
                                end_h, end_m = map(int, end_time.split(":"))
                                duration = (end_h * 60 + end_m) - (start_h * 60 + start_m)
                            except (ValueError, IndexError) as e:
                                logger.warning(f"Invalid time format in config: start='{start_time}', end='{end_time}', time_range='{time_range}'. Skipping block.")
                                continue
                            
                            # Create unique key for similar blocks
                            name = block.get("task", block.get("label", ""))
                            category = block.get("category", "personal")
                            block_key = f"{name}_{start_time}_{duration}"
                            
                            if block_key not in block_templates:
                                block_templates[block_key] = {
                                    "id": block_key,
                                    "name": name,
                                    "type": block_type.rstrip("s"),  # Remove 's' from anchors/fixed
                                    "start_time": start_time,
                                    "duration": duration,
                                    "category": category.title(),
                                    "description": block.get("description", ""),
                                    "days": []
                                }
                            
                            # Add this day to the block
                            if day not in block_templates[block_key]["days"]:
                                block_templates[block_key]["days"].append(day)

        known_blocks = list(block_templates.values())
        
        return {
            "known_blocks": known_blocks,
            "message": f"Loaded {len(known_blocks)} known blocks from existing configuration"
        }

    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load configuration: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 