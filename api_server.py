"""
Echo API Server

FastAPI server that exposes Echo's core functionality for frontend applications.
Provides endpoints for daily planning, context briefing, analytics, and session management.

This server bridges the Python backend intelligence systems with the Next.js frontend,
using the new four-panel intelligence architecture.
"""

# Standard library imports
import asyncio
import hashlib
import json
import logging
import os
import time as time_module
from datetime import datetime, date, time, timedelta
from functools import lru_cache
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

# Third-party imports
import yaml
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Echo core imports
from echo.analytics import calculate_daily_stats, get_recent_stats, categorize_block
from echo.config_loader import load_config
from echo.email_processor import OutlookEmailProcessor
from echo.journal import get_recent_reflection_context, analyze_energy_mood_trends
from echo.models import Block, BlockType, Config
from echo.prompts.unified_planning import call_unified_planning
from echo.session import SessionState

# Intelligence systems - new four-panel architecture
from echo.claude_client import get_claude_client
from echo.config_intelligence import ConfigDeadlineExtractor
from echo.email_intelligence import EmailCategorizer
from echo.session_intelligence import SessionNotesAnalyzer
from echo.structured_briefing import StructuredContextBriefing

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================== 
# CACHING INFRASTRUCTURE - Phase 1 Performance Optimization
# ==============================================================================

# In-memory caches with timestamps
EMAIL_BRIEF_CACHE = {}
CONFIG_CACHE = {}
ANALYTICS_CACHE = {}
CONTEXT_BRIEFING_CACHE = {}

# Cache durations (in seconds)
EMAIL_BRIEF_CACHE_DURATION = 900      # 15 minutes
CONFIG_CACHE_DURATION = 300           # 5 minutes  
ANALYTICS_CACHE_DURATION = 300        # 5 minutes
CONTEXT_BRIEFING_CACHE_DURATION = 0  # No caching during development/planning

def get_cache_key(prefix: str, *args) -> str:
    """Generate a cache key from prefix and arguments."""
    key_data = f"{prefix}:{':'.join(map(str, args))}"
    return hashlib.md5(key_data.encode()).hexdigest()

def is_cache_valid(cache_entry: dict, duration: int) -> bool:
    """Check if cache entry is still valid."""
    if not cache_entry:
        return False
    return (time_module.time() - cache_entry.get('timestamp', 0)) < duration

def get_cached_data(cache: dict, key: str, duration: int) -> Any:
    """Get data from cache if valid."""
    if key in cache and is_cache_valid(cache[key], duration):
        logger.info(f"Cache HIT for key: {key[:12]}...")
        return cache[key]['data']
    logger.info(f"Cache MISS for key: {key[:12]}...")
    return None

def set_cached_data(cache: dict, key: str, data: Any) -> None:
    """Store data in cache with timestamp."""
    cache[key] = {
        'data': data,
        'timestamp': time_module.time()
    }

def get_cached_email_brief(days: int = 1) -> Dict:
    """Get cached daily email brief to avoid repeated processing."""
    if not email_processor:
        return {}
    
    cache_key = get_cache_key("email_brief", days)
    cached_result = get_cached_data(EMAIL_BRIEF_CACHE, cache_key, EMAIL_BRIEF_CACHE_DURATION)
    
    if cached_result is not None:
        return cached_result
    
    # Generate fresh brief and cache it
    try:
        brief = email_processor.get_daily_email_brief(days=days)
        set_cached_data(EMAIL_BRIEF_CACHE, cache_key, brief)
        return brief
    except Exception as e:
        logger.warning(f"Failed to generate email brief, returning empty: {e}")
        empty_brief = {}
        set_cached_data(EMAIL_BRIEF_CACHE, cache_key, empty_brief)
        return empty_brief

app = FastAPI(
    title="Echo API",
    description="API server for Echo productivity system with four-panel intelligence",
    version="2.0.0",
    docs_url="/docs" if os.getenv("ECHO_ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ECHO_ENVIRONMENT") != "production" else None,
)

# Configure CORS middleware for frontend applications
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Next.js development
    "http://localhost:3001",  # Alternative dev port
    "https://echo-app.vercel.app",  # Production frontend (example)
]

# Add wildcard only in development
if os.getenv("ECHO_ENVIRONMENT") == "development":
    ALLOWED_ORIGINS.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

class ConfigResponse(BaseModel):
    """Model for configuration response"""
    message: str
    success: bool
    config_path: Optional[str] = None

# Global state (in production, use proper state management)
config: Optional[Config] = None
email_processor: Optional[OutlookEmailProcessor] = None

def _get_claude_client():
    """Get Claude client with API key from environment."""
    try:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY environment variable not set")
        return get_claude_client(api_key)
    except Exception as e:
        logger.error(f"Failed to get Claude client: {e}")
        raise

def _add_basic_icons(blocks: List[Block]) -> List[Block]:
    """Add basic icons to blocks based on label content without API calls."""
    icon_map = {
        'morning': 'Sun',
        'routine': 'Sun', 
        'breakfast': 'Coffee',
        'coffee': 'Coffee',
        'work': 'Briefcase',
        'meeting': 'Users',
        'call': 'Phone',
        'email': 'Mail',
        'lunch': 'Utensils',
        'exercise': 'Activity',
        'gym': 'Activity',
        'workout': 'Activity',
        'walk': 'MapPin',
        'commute': 'Car',
        'travel': 'Car',
        'research': 'BookOpen',
        'read': 'BookOpen',
        'write': 'Edit',
        'review': 'Eye',
        'plan': 'Calendar',
        'break': 'Clock',
        'evening': 'Moon',
        'dinner': 'Utensils',
        'sleep': 'Moon',
        'personal': 'Heart',
        'family': 'Heart',
        'code': 'Code',
        'development': 'Code',
        'design': 'Palette',
        'admin': 'FileText',
        'finance': 'DollarSign',
        'health': 'Heart',
        'learning': 'GraduationCap'
    }
    
    enriched_blocks = []
    for block in blocks:
        # Find best matching icon based on label content
        label_lower = block.label.lower()
        icon = 'Calendar'  # default
        
        for keyword, mapped_icon in icon_map.items():
            if keyword in label_lower:
                icon = mapped_icon
                break
        
        # Create enriched block with icon in meta
        enriched_block = Block(
            start=block.start,
            end=block.end,
            label=block.label,
            type=block.type,
            meta={**block.meta, 'icon': icon}
        )
        enriched_blocks.append(enriched_block)
    
    return enriched_blocks

def _call_llm(client, prompt: str) -> str:
    """Call the LLM with the given prompt with error handling."""
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-2025-04-14",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that follows instructions precisely."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        content = response.choices[0].message.content
        if content is None:
            raise ValueError("LLM returned None content")
        return content
    except Exception as e:
        # Enhanced error logging for developers
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            logger.error("🚨 DEVELOPER WARNING: LLM API quota exceeded!")
            logger.error("   → Check your API billing and usage limits")
            logger.error("   → Echo will fall back to mock data where available")
        elif "401" in error_msg or "authentication" in error_msg.lower():
            logger.error("🚨 DEVELOPER WARNING: LLM API authentication failed!")
            logger.error("   → Check API key environment variables")
            logger.error("   → Verify API keys are valid and active")
        else:
            logger.error(f"LLM API Error: {e}")
        raise

def _load_recent_daily_logs(days: int = 3) -> List[Dict[str, Any]]:
    """Load recent daily logs to provide patterns and energy insights."""
    try:
        daily_logs = []
        logs_dir = Path("logs")
        
        if not logs_dir.exists():
            logger.warning("Logs directory not found, returning empty list")
            return []
        
        # Load recent daily markdown files
        for i in range(days):
            date_str = (date.today() - timedelta(days=i)).isoformat()
            daily_file = logs_dir / f"{date_str}-daily.md"
            
            if daily_file.exists():
                try:
                    with open(daily_file, 'r') as f:
                        content = f.read()
                        daily_logs.append({
                            'date': date_str,
                            'content': content
                        })
                except Exception as e:
                    logger.warning(f"Failed to load daily log {daily_file}: {e}")
                    continue
        
        logger.info(f"Loaded {len(daily_logs)} daily logs for context")
        return daily_logs
        
    except Exception as e:
        logger.error(f"Error loading daily logs: {e}")
        return []

def _load_recent_session_logs(days: int = 1) -> List[Dict[str, Any]]:
    """Load recent session logs to provide context for rationale generation."""
    try:
        session_logs = []
        sessions_dir = Path("logs/sessions")
        
        if not sessions_dir.exists():
            logger.warning("Session logs directory not found, returning empty list")
            return []
        
        # Load all JSON session files
        for session_file in sessions_dir.glob("*.json"):
            try:
                with open(session_file, 'r') as f:
                    session_data = json.load(f)
                    session_logs.append(session_data)
            except Exception as e:
                logger.warning(f"Failed to load session log {session_file}: {e}")
                continue
        
        # Sort by date/time, most recent first
        session_logs.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        logger.info(f"Loaded {len(session_logs)} session logs for context")
        return session_logs[:10]  # Return up to 10 most recent sessions
        
    except Exception as e:
        logger.error(f"Error loading session logs: {e}")
        return []

def _generate_block_rationale(client, blocks: List[Block], session_context: List[Dict[str, Any]], user_request: dict) -> List[Block]:
    """Generate rationale for each block using LLM with session context."""
    try:
        # Prepare session context summary for the LLM
        session_summary = ""
        if session_context:
            session_summary = "\n\nRECENT SESSION CONTEXT:\n"
            for session in session_context[:5]:  # Use top 5 sessions
                session_summary += f"- {session.get('block_label', 'Unknown')}: {session.get('summary', 'No summary')}\n"
        
        # Build prompt for rationale generation
        blocks_info = []
        for i, block in enumerate(blocks):
            blocks_info.append(f"{i+1}. {block.label} ({block.start.strftime('%H:%M')} - {block.end.strftime('%H:%M')})")
        
        blocks_text = "\n".join(blocks_info)
        
        rationale_prompt = f"""
Given this user's schedule and context, provide a brief rationale (1-2 sentences) for each time block explaining WHY it's scheduled at that time and what the focus should be.

USER'S PRIORITIES TODAY:
- Most important: {user_request.get('most_important', 'Not specified')}
- Energy level: {user_request.get('energy_level', 'Not specified')}
- Tasks: {', '.join(user_request.get('todos', []))}

SCHEDULE BLOCKS:
{blocks_text}
{session_summary}

For each block, provide ONLY the rationale text (no block names or numbers). Format as a simple numbered list:

1. [Rationale for first block]
2. [Rationale for second block]
...

Focus on timing logic, energy matching, and task progression. Keep each rationale to 1-2 sentences maximum.
"""

        response = _call_llm(client, rationale_prompt)
        
        # Parse rationale responses
        rationale_lines = [line.strip() for line in response.split('\n') if line.strip() and line.strip()[0].isdigit()]
        
        # Apply rationale to blocks
        enriched_blocks = blocks.copy()
        for i, block in enumerate(enriched_blocks):
            rationale = "Scheduled based on your daily priorities and energy patterns."
            
            if i < len(rationale_lines):
                # Extract rationale text (remove number prefix)
                raw_rationale = rationale_lines[i]
                # Remove "1. " or similar prefixes
                if '. ' in raw_rationale:
                    rationale = raw_rationale.split('. ', 1)[1]
                else:
                    rationale = raw_rationale
            
            # Add rationale to block metadata
            enriched_blocks[i] = Block(
                start=block.start,
                end=block.end,
                label=block.label,
                type=block.type,
                meta={**block.meta, 'rationale': rationale}
            )
        
        logger.info(f"Generated rationale for {len(enriched_blocks)} blocks")
        return enriched_blocks
        
    except Exception as e:
        logger.error(f"Error generating block rationale: {e}")
        # Return blocks without rationale on error
        return blocks

# Legacy context briefing function removed - now using Claude-based system

def _build_unified_planner_prompt(
    most_important: str,
    todos: List[str],
    energy_level: str,
    non_negotiables: str,
    avoid_today: str,
    fixed_events: List[str],
    config: 'Config',
    email_context: Optional[Dict] = None,
    email_brief: Optional[Dict] = None,
    context_briefing: Optional[Dict] = None
) -> str:
    """Build unified planning prompt with chain-of-thought reasoning and actionable context."""
    
    # Build fixed events with notes as rationale
    fixed_events_str = ""
    if fixed_events:
        fixed_events_str = "\n## FIXED EVENTS (do not change, use notes as rationale):\n"
        for event in fixed_events:
            fixed_events_str += f"- {event}\n"
    
    # Build context briefing section (comprehensive and factual)
    context_str = ""
    if context_briefing:
        context_str = "\n## COMPREHENSIVE CONTEXT (synthesized intelligence):\n"
        
        # High priority tasks with deadlines
        high_priority = context_briefing.get('high_priority_tasks', [])
        if high_priority:
            context_str += "**URGENT TASKS & DEADLINES:**\n"
            for task in high_priority:
                context_str += f"- {task.get('description', 'Unknown task')}\n"
        
        # Email actions with specific context
        email_actions = context_briefing.get('email_actions', [])
        if email_actions:
            context_str += "\n**EMAIL ACTIONS:**\n"
            for action in email_actions:
                sender = action.get('sender', 'Unknown')
                action_text = action.get('action', 'Unknown action')
                context_str += f"- {action_text} (from {sender})\n"
        
        # Reminders and deadlines
        reminders = context_briefing.get('reminders', [])
        if reminders:
            context_str += "\n**REMINDERS & DEADLINES:**\n"
            for reminder in reminders:
                urgency = reminder.get('urgency', 'normal')
                text = reminder.get('text', 'Unknown reminder')
                urgency_prefix = {'high': '🔥 URGENT:', 'medium': '⚡ SOON:', 'low': '📅 FYI:'}.get(urgency, '')
                context_str += f"- {urgency_prefix} {text}\n"
        
        # Session insights (what actually happened)
        insights = context_briefing.get('recent_insights', [])
        if insights:
            context_str += "\n**RECENT SESSION OUTCOMES:**\n"
            for insight in insights[:3]:  # Last 3
                context_str += f"- {insight}\n"
    
    todos_str = ", ".join(todos) if todos else "None"
    
    prompt = f"""# ACTIONABLE INTELLIGENT PLANNER

You are creating a daily schedule for Sam Leuthold. Use this identity context to understand email relationships, response priorities, and task ownership.

You create daily schedules with concrete, task-focused rationale based on actual deadlines and priorities.

## YOUR REASONING PROCESS:
1. **ANALYZE PRIORITIES**: Review deadlines, urgent tasks, and fixed commitments
2. **SEQUENCE LOGICALLY**: Order tasks by deadline pressure and dependencies  
3. **PROVIDE CONCRETE RATIONALE**: Explain WHAT needs to be accomplished and WHY NOW
4. **OUTPUT STRUCTURED PLAN**: Clear schedule with actionable context

## TODAY'S CONTEXT:
- **Most Important Work**: {most_important}
- **Todos**: {todos_str}
- **Non-negotiables**: {non_negotiables}
- **Avoid Today**: {avoid_today}
{fixed_events_str}{context_str}

## RATIONALE STYLE:
Focus on CONCRETE TASKS and DEADLINES with email relationship context. Remember you are scheduling for Sam.

**GOOD**: "Literature review due Thursday - focus on methodology section first"
**GOOD**: "Student requested sample manifest - prepare list for their de-quarantine process"
**GOOD**: "Respond to EndNote migration query from colleague - decision needed before CSU license expires"  
**BAD**: "Scheduled during high energy period for complex work"
**BAD**: "Good time for deep focus based on patterns"

## OUTPUT FORMAT:
**REASONING:**
[2-3 sentences about key scheduling decisions based on deadlines/priorities]

**SCHEDULE:**
START_TIME - END_TIME | LABEL | TYPE | RATIONALE

Where:
- TYPE: anchor, fixed, or flex
- RATIONALE: Concrete task focus and deadline context (NOT energy/patterns)

For FIXED EVENTS: Use the note from the config as rationale.

Example:
09:00 - 10:30 | Geoderma Review | flex | Manuscript feedback due Friday - prioritize methodology section review first.

Generate complete schedule from 6:00 AM to 10:00 PM, focusing on concrete task accomplishment.
"""
    
    return prompt

def _parse_unified_planner_response(response: str) -> List['Block']:
    """Parse unified planner response with embedded rationale."""
    from echo.models import Block, BlockType
    from datetime import datetime
    
    blocks = []
    
    try:
        # Find the SCHEDULE section
        if "**SCHEDULE:**" in response:
            schedule_section = response.split("**SCHEDULE:**")[1]
        else:
            # Fallback if format is different
            schedule_section = response
        
        lines = schedule_section.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('*') or line.startswith('-'):
                continue
                
            # Parse format: START_TIME - END_TIME | LABEL | TYPE | RATIONALE
            if ' | ' in line and ' - ' in line:
                try:
                    parts = line.split(' | ')
                    if len(parts) >= 4:
                        # Parse time part
                        time_part = parts[0].strip()
                        start_str, end_str = time_part.split(' - ')
                        
                        # Parse other parts
                        label = parts[1].strip()
                        block_type = parts[2].strip().lower()
                        rationale = parts[3].strip()
                        
                        # Convert times
                        start_time = datetime.strptime(start_str.strip(), "%H:%M").time()
                        end_time = datetime.strptime(end_str.strip(), "%H:%M").time()
                        
                        # Map block type
                        if block_type in ['anchor', 'fixed']:
                            bt = BlockType.ANCHOR
                        else:
                            bt = BlockType.FLEX
                        
                        block = Block(
                            start=start_time,
                            end=end_time,
                            label=label,
                            type=bt,
                            meta={'rationale': rationale, 'note': ''}
                        )
                        blocks.append(block)
                        
                except Exception as e:
                    logger.warning(f"Failed to parse line: {line} - {e}")
                    continue
        
        logger.info(f"Parsed {len(blocks)} blocks from unified response")
        return blocks
        
    except Exception as e:
        logger.error(f"Error parsing unified planner response: {e}")
        # Fallback to empty list
        return []

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
            # Return empty blocks if no plan exists - don't auto-generate
            blocks = []
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
        current_block_response = None
        
        for block in blocks:
            # Convert time objects to strings for comparison
            current_time_str = current_time.strftime("%H:%M:%S")
            start_time_str = block.start.strftime("%H:%M:%S")
            end_time_str = block.end.strftime("%H:%M:%S")
            
            is_current = start_time_str <= current_time_str <= end_time_str
            progress = 0.0
            
            if is_current:
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
            
            # Get icon using same logic as _add_basic_icons()
            icon_map = {
                'morning': 'Sun', 'routine': 'Sun', 'breakfast': 'Coffee', 'coffee': 'Coffee',
                'work': 'Briefcase', 'meeting': 'Users', 'call': 'Phone', 'email': 'Mail',
                'lunch': 'Utensils', 'exercise': 'Activity', 'workout': 'Activity',
                'study': 'BookOpen', 'learn': 'BookOpen', 'travel': 'Car',
                'research': 'BookOpen', 'read': 'BookOpen', 'write': 'Edit',
                'review': 'Eye', 'plan': 'Calendar', 'break': 'Clock',
                'evening': 'Moon', 'dinner': 'Utensils', 'sleep': 'Moon',
                'personal': 'Heart', 'family': 'Heart', 'code': 'Code',
                'development': 'Code', 'design': 'Palette', 'admin': 'FileText'
            }
            
            label_lower = block.label.lower()
            icon = 'Calendar'  # default
            for keyword, mapped_icon in icon_map.items():
                if keyword in label_lower:
                    icon = mapped_icon
                    break
            
            note = ""     # Default
            
            # Check if plan data has enricher information for notes
            if plan_file.exists():
                with open(plan_file, 'r') as f:
                    plan_data = json.load(f)
                    for saved_block in plan_data.get("blocks", []):
                        if (saved_block.get("start") == block.start.strftime("%H:%M:%S") and 
                            saved_block.get("end") == block.end.strftime("%H:%M:%S")):
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
            
            # Store current block response for later use
            if is_current:
                current_block_response = block_response
        
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
            current_block=current_block_response,
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
        
        # Check cache first
        cache_key = get_cache_key("analytics", target_date.isoformat())
        cached_result = get_cached_data(ANALYTICS_CACHE, cache_key, ANALYTICS_CACHE_DURATION)
        if cached_result is not None:
            return cached_result
        
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
            empty_result = AnalyticsResponse(
                date=target_date.isoformat(),
                total_time=0,
                categories={},
                projects={},
                productivity_score=0.0,
                focus_time=0,
                break_time=0
            )
            set_cached_data(ANALYTICS_CACHE, cache_key, empty_result)
            return empty_result
        
        # Calculate productivity score (simplified)
        total_time = target_stats.total_minutes
        focus_time = target_stats.category_breakdown.get("deep_work", 0)
        productivity_score = (focus_time / total_time * 100) if total_time > 0 else 0
        
        result = AnalyticsResponse(
            date=target_date.isoformat(),
            total_time=total_time,
            categories=target_stats.category_breakdown,
            projects=target_stats.project_breakdown,
            productivity_score=productivity_score,
            focus_time=focus_time,
            break_time=target_stats.category_breakdown.get("rest", 0)
        )
        
        # Cache the result
        set_cached_data(ANALYTICS_CACHE, cache_key, result)
        return result
        
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
                email_brief = get_cached_email_brief(days=1)
            except Exception as e:
                logger.warning(f"Failed to get email context: {e}")
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Extract user's configured schedule blocks
        config_fixed_events = []
        if config and hasattr(config, 'weekly_schedule'):
            today_name = datetime.now().strftime('%A').lower()
            today_schedule = config.weekly_schedule.get(today_name, {})
            
            # Extract anchors and fixed blocks
            for block_type in ['anchors', 'fixed']:
                for block in today_schedule.get(block_type, []):
                    task_name = block.get('task', 'Unknown Task')
                    time_range = block.get('time', 'Unknown Time')
                    config_fixed_events.append(f"{task_name} | {time_range}")
        
        # Combine config blocks with manual user input
        all_fixed_events = config_fixed_events + (request.fixed_events or [])
        
        logger.info(f"Using {len(config_fixed_events)} config blocks + {len(request.fixed_events or [])} manual events = {len(all_fixed_events)} total fixed events")
        
        # Get comprehensive context briefing using new Claude system
        try:
            context_briefing_response = await get_context_briefing({})
            # Extract just the data we need for planning
            context_briefing = {
                'executive_summary': context_briefing_response.get('executive_summary', ''),
                'email_summary': context_briefing_response.get('email_summary', {}),
                'commitments': context_briefing_response.get('commitments_deadlines', {}),
                'session_notes': context_briefing_response.get('session_notes', {})
            }
        except Exception as e:
            logger.warning(f"Failed to get context briefing: {e}")
            context_briefing = None
        
        # Get session insights for planning context
        try:
            from echo.log_reader import get_recent_session_insights
            session_insights = get_recent_session_insights(days=3)
        except Exception as e:
            logger.warning(f"Failed to get session insights: {e}")
            session_insights = []
        
        # Get reminders from config
        reminders = []
        if config and hasattr(config, 'reminders'):
            for reminder in config.reminders:
                reminders.append({
                    'text': reminder.get('text', ''),
                    'urgency': reminder.get('urgency', 'normal')
                })
        
        # Convert config fixed events to calendar format
        calendar_events = []
        for event in all_fixed_events:
            if ' | ' in event:
                task, time_range = event.split(' | ', 1)
                calendar_events.append({
                    'title': task,
                    'start': time_range.split('–')[0].strip() if '–' in time_range else time_range,
                    'end': time_range.split('–')[1].strip() if '–' in time_range else time_range
                })
        
        # Call new unified planning system
        try:
            # TODO: Replace OpenAI with Claude Opus for plan generation
            client = _get_openai_client()
            
            # Use the new unified planning system - single API call
            blocks, reasoning = call_unified_planning(
                most_important=request.most_important,
                todos=request.todos,
                energy_level=request.energy_level,
                non_negotiables=request.non_negotiables,
                avoid_today=request.avoid_today,
                email_context=email_context,
                calendar_events=calendar_events,
                session_insights=session_insights,
                reminders=reminders,
                openai_client=client,
                config=config
            )
            
            # Icons are already included in the unified planning response
            # No need for additional icon processing
            
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
                    "context_briefing": context_briefing,
                    "user_input": {
                        "most_important": request.most_important,
                        "todos": request.todos,
                        "energy_level": request.energy_level,
                        "non_negotiables": request.non_negotiables,
                        "avoid_today": request.avoid_today
                    }
                }
            }
            
            # Convert blocks to JSON format with unified planning metadata
            for block in blocks:
                block_data = {
                    "start": block.start.strftime("%H:%M:%S"),
                    "end": block.end.strftime("%H:%M:%S"),
                    "label": block.label,
                    "type": block.type.value if hasattr(block.type, 'value') else str(block.type),
                    "icon": block.meta.get('icon', 'Calendar'),
                    "note": block.meta.get('note', ''),
                    "rationale": block.meta.get('rationale', ''),
                    "priority": block.meta.get('priority', 'medium'),
                    "energy_requirement": block.meta.get('energy_requirement', 'medium')
                }
                plan_data["blocks"].append(block_data)
            
            # Add unified planning reasoning to metadata
            plan_data["metadata"]["unified_planning"] = {
                "reasoning": reasoning,
                "system_version": "unified_v1",
                "cost_optimized": True
            }
            
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
        brief = get_cached_email_brief(days=1)
        
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

def _get_recent_session_files(days: int = 3) -> List[str]:
    """Helper to get recent session files for session intelligence."""
    logs_dir = Path("logs")
    if not logs_dir.exists():
        return []
    
    cutoff_date = datetime.now() - timedelta(days=days)
    session_files = []
    
    # Look for session files in various formats
    for pattern in ["*.json", "*.md", "*.txt"]:
        for file_path in logs_dir.glob(pattern):
            # Skip if file is too old
            if file_path.stat().st_mtime < cutoff_date.timestamp():
                continue
            
            # Check if it looks like a session file
            filename_lower = file_path.name.lower()
            if any(keyword in filename_lower for keyword in ['session', 'log', 'work', 'notes']):
                session_files.append(str(file_path))
    
    # Sort by modification time (newest first)
    session_files.sort(key=lambda x: Path(x).stat().st_mtime, reverse=True)
    return session_files

@app.post("/context-briefing")
async def get_context_briefing(request: dict = {}):
    """Generate four-panel context briefing with intelligence systems."""
    try:
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        # Check if this is a fresh planning session (user hit "let's do it")
        force_refresh = request.get('force_refresh', False)
        
        # Use session-based caching instead of time-based for planning workflow
        from datetime import datetime as dt
        cache_key = get_cache_key("context_briefing", dt.now().strftime("%Y-%m-%d"))
        
        if not force_refresh:
            cached_result = get_cached_data(CONTEXT_BRIEFING_CACHE, cache_key, CONTEXT_BRIEFING_CACHE_DURATION)
            if cached_result is not None:
                logger.info("Returning cached context briefing for planning session")
                return cached_result
            
        # Initialize Claude client and intelligence systems
        client = _get_claude_client()
        
        email_intelligence = EmailCategorizer(client)
        session_intelligence = SessionNotesAnalyzer(client)
        config_intelligence = ConfigDeadlineExtractor()
        briefing_system = StructuredContextBriefing(client)
        
        # Process Email Intelligence
        email_context = {"information": [], "action_items": [], "response_needed": [], "metadata": {}}
        if email_processor:
            try:
                # Get recent emails (using the correct method name)
                email_data = email_processor.get_emails(days=1)
                email_context = email_intelligence.categorize_emails(email_data)
            except Exception as e:
                logger.warning(f"Failed to process email intelligence: {e}")
        
        # Process Session Intelligence
        session_context = {"pending_items": [], "completed_items": [], "stale_items": [], "metadata": {}}
        try:
            session_files = _get_recent_session_files(days=3)
            session_context = session_intelligence.extract_next_items(session_files)
        except Exception as e:
            logger.warning(f"Failed to process session intelligence: {e}")
        
        # Process Config Intelligence
        config_context = {"deadlines": [], "recurring_events": [], "birthdays": [], "fixed_meetings": [], "metadata": {}}
        try:
            config_context = config_intelligence.get_upcoming_commitments(config, days_ahead=7)
            # Backend config is the single source of truth for reminders
            logger.info(f"Using {len(config_context.get('reminders', []))} reminders from backend config")
        except Exception as e:
            logger.warning(f"Failed to process config intelligence: {e}")
        
        # Generate four-panel briefing
        briefing = briefing_system.build_four_panel_briefing(
            email_context, session_context, config_context
        )
        
        # Format response for API compatibility
        result = {
            "status": "success",
            "executive_summary": briefing["executive_summary"],
            "email_summary": briefing["email_summary"],
            "session_notes": briefing["session_notes"],
            "commitments_deadlines": briefing["commitments_deadlines"],
            "metadata": briefing["metadata"],
            "timestamp": dt.now().isoformat()
        }
        
        # Cache the result
        set_cached_data(CONTEXT_BRIEFING_CACHE, cache_key, result)
        return result
        
    except Exception as e:
        logger.error(f"Error generating context briefing: {e}")
        
        # Return structured error response
        from datetime import datetime as dt
        return {
            "status": "error",
            "executive_summary": f"Context briefing unavailable: {str(e)}",
            "email_summary": {
                "information": [],
                "action_items": [],
                "response_needed": [],
                "metadata": {"error": str(e)}
            },
            "session_notes": {
                "pending_commitments": [],
                "stale_items": [],
                "metadata": {"error": str(e)}
            },
            "commitments_deadlines": {
                "urgent_deadlines": [],
                "upcoming_deadlines": [],
                "todays_events": [],
                "upcoming_birthdays": [],
                "fixed_meetings": [],
                "metadata": {"error": str(e)}
            },
            "metadata": {
                "generated_at": dt.now().isoformat(),
                "panels_generated": 0,
                "error": str(e)
            },
            "timestamp": dt.now().isoformat()
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
                email_brief = get_cached_email_brief(days=1)
            except Exception as e:
                logger.warning(f"Failed to get email context for refinement: {e}")
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Extract user's configured schedule blocks (same as main planning)
        config_fixed_events = []
        if config and hasattr(config, 'weekly_schedule'):
            today_name = datetime.now().strftime('%A').lower()
            today_schedule = config.weekly_schedule.get(today_name, {})
            
            # Extract anchors and fixed blocks
            for block_type in ['anchors', 'fixed']:
                for block in today_schedule.get(block_type, []):
                    task_name = block.get('task', 'Unknown Task')
                    time_range = block.get('time', 'Unknown Time')
                    config_fixed_events.append(f"{task_name} | {time_range}")
        
        # Combine config blocks with manual user input
        all_fixed_events = config_fixed_events + (request.original_request.fixed_events or [])
        
        logger.info(f"Refinement using {len(config_fixed_events)} config blocks + {len(request.original_request.fixed_events or [])} manual events = {len(all_fixed_events)} total fixed events")
        
        # Build the refinement-enhanced planning prompt
        prompt = build_refinement_enhanced_planner_prompt(
            most_important=request.original_request.most_important,
            todos=request.original_request.todos,
            energy_level=request.original_request.energy_level,
            non_negotiables=request.original_request.non_negotiables,
            avoid_today=request.original_request.avoid_today,
            fixed_events=all_fixed_events,
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
            # TODO: Replace OpenAI with Claude Opus for plan generation
            client = _get_openai_client()
            
            # Single-stage: Planner generates refined structure (skip enricher)
            planner_response = _call_llm(client, prompt)
            refined_blocks = parse_planner_response(planner_response)
            
            # Skip enricher stage to reduce API calls
            logger.info("Skipping enricher stage to reduce OpenAI API usage")
            
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
                email_brief = get_cached_email_brief(days=1)
            except Exception as e:
                logger.warning(f"Failed to get email context for auto-plan: {e}")
        
        # Get journal context
        journal_context = get_recent_reflection_context(days=7)
        recent_trends = analyze_energy_mood_trends(days=7)
        
        # Extract user's configured schedule blocks (same as main planning)
        config_fixed_events = []
        if config and hasattr(config, 'weekly_schedule'):
            today_name = datetime.now().strftime('%A').lower()
            today_schedule = config.weekly_schedule.get(today_name, {})
            
            # Extract anchors and fixed blocks
            for block_type in ['anchors', 'fixed']:
                for block in today_schedule.get(block_type, []):
                    task_name = block.get('task', 'Unknown Task')
                    time_range = block.get('time', 'Unknown Time')
                    config_fixed_events.append(f"{task_name} | {time_range}")
        
        logger.info(f"Auto-plan using {len(config_fixed_events)} config blocks")
        
        # Build prompt with default values and email brief
        prompt = build_email_aware_planner_prompt(
            most_important="Focus on high-priority tasks",
            todos=["Complete outstanding work"],
            energy_level="7",
            non_negotiables="Morning routine, lunch break, evening routine",
            avoid_today="Unnecessary meetings, distractions",
            fixed_events=config_fixed_events,
            config=config,
            email_context=email_context,
            journal_context=journal_context[0] if journal_context else None,
            recent_trends=recent_trends,
            email_brief=email_brief
        )
        
        # Call LLM
        # TODO: Replace OpenAI with Claude Opus for plan generation
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

        # Update reminders section
        if request.reminders:
            existing_config["reminders"] = []
            for reminder in request.reminders:
                existing_config["reminders"].append({
                    "id": reminder.id,
                    "title": reminder.title,
                    "description": reminder.description,
                    "date": reminder.due_date,  # config_intelligence expects 'date' field
                    "priority": reminder.priority,
                    "category": reminder.category
                })
            logger.info(f"Saved {len(request.reminders)} reminders to config")
        else:
            # Clear reminders if none provided
            existing_config["reminders"] = []

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
        
        # Check cache first
        cache_key = get_cache_key("config_load", str(config_path.stat().st_mtime) if config_path.exists() else "none")
        cached_result = get_cached_data(CONFIG_CACHE, cache_key, CONFIG_CACHE_DURATION)
        if cached_result is not None:
            return cached_result
        
        if not config_path.exists():
            result = {
                "known_blocks": [],
                "message": "No existing configuration found"
            }
            set_cached_data(CONFIG_CACHE, cache_key, result)
            return result

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
        
        result = {
            "known_blocks": known_blocks,
            "message": f"Loaded {len(known_blocks)} known blocks from existing configuration"
        }
        
        # Cache the result
        set_cached_data(CONFIG_CACHE, cache_key, result)
        return result

    except Exception as e:
        logger.error(f"Error loading configuration: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load configuration: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 