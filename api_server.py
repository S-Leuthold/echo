"""
Echo API Server - Modular Version

This is the new modular version of the API server that gradually replaces the monolithic version.
First phase: Include simple routers, keep complex ones in main file.
"""

# Import the main FastAPI app with all the simple routers
from echo.api.main import app

# Import remaining complex endpoint dependencies  
import asyncio
import json
import logging
import os
import time as time_module
from datetime import datetime, date, time, timedelta
from functools import lru_cache
from pathlib import Path
from typing import List, Dict, Any, Optional, Union

import yaml
from dotenv import load_dotenv
from fastapi import HTTPException, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Echo core imports for complex endpoints
from echo.analytics import calculate_daily_stats, get_recent_stats, categorize_block
from echo.config_loader import load_config
from echo.email_processor import OutlookEmailProcessor
from echo.journal import get_recent_reflection_context, analyze_energy_mood_trends
from echo.models import Block, BlockType, Config
from echo.prompts.unified_planning import UnifiedPlanResponse, build_unified_planning_prompt
from echo.session import SessionState

# Intelligence systems - new four-panel architecture
from echo.claude_client import get_claude_client
from echo.config_intelligence import ConfigDeadlineExtractor
from echo.email_intelligence import EmailCategorizer
from echo.session_intelligence import SessionNotesAnalyzer
from echo.structured_briefing import StructuredContextBriefing

# Claude integration session management services
from echo.scaffold_generator import ScaffoldGenerator, generate_scaffolds_for_daily_plan, get_scaffold_for_block
from echo.session_starter import SessionStarter, start_session_with_checklist, SessionUserInput
from echo.session_logger import SessionLogger, synthesize_session_log, SessionDebriefInput, SessionMetadata
from echo.database_schema import SessionDatabase

# Import models from modular structure
from echo.api.models.request_models import (
    PlanningRequest, ReflectionRequest, PlanRefinementRequest,
    ScaffoldGenerationRequest, SessionStartRequest, SessionCompleteRequest, GetScaffoldRequest
)
from echo.api.models.response_models import (
    PlanRefinementResponse, ScaffoldGenerationResponse, SessionStartResponse, 
    SessionCompleteResponse, GetScaffoldResponse
)
from echo.api.dependencies import _get_claude_client, get_config, get_email_processor
from echo.api.utils import (
    get_cache_key, get_cached_data, set_cached_data, get_cached_email_brief,
    EMAIL_BRIEF_CACHE, EMAIL_BRIEF_CACHE_DURATION,
    CONTEXT_BRIEFING_CACHE, CONTEXT_BRIEFING_CACHE_DURATION
)

# Set up logging
logger = logging.getLogger(__name__)

# Add the reflection router to the existing app
from echo.api.routers import reflection
app.include_router(reflection.router, tags=["reflection"])

# ============================================================================== 
# REMAINING COMPLEX ENDPOINTS - To be modularized in future phases
# ==============================================================================

# These endpoints will be moved to separate routers in the next phase:
# - /plan-v2, /plan, /plan/refine (planning.py)
# - /email-summary, /conversation-intelligence, /daily-email-brief (email.py) 
# - /context-briefing (planning.py)
# - /session/* endpoints (session_management.py)

# For now, keeping them here to ensure system stability during transition

@app.post("/plan-v2")
async def create_plan_v2(request: PlanningRequest):
    """Clean Claude-based plan generation with structured output."""
    try:
        logger.info("🚀 Starting unified planning generation (Claude-powered)")
        
        # Configure Claude client for strategic daily planning
        claude_client = _get_claude_client()
        if not claude_client:
            raise HTTPException(status_code=500, detail="Claude client not available")
        
        # Load user configuration for anchors and constraints
        config = get_config()
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        # Get today's weekday and schedule constraints  
        today = datetime.now()
        weekday = today.strftime('%A').lower()
        today_schedule = config.weekly_schedule.get(weekday, {})
        
        # Extract schedule constraints
        anchors = today_schedule.get('anchors', [])
        fixed_events = today_schedule.get('fixed', [])
        
        # Build unified planning prompt with all context
        # Convert fixed_events from frontend into calendar_events format
        calendar_events = []
        
        try:
            # Handle fixed_events from frontend request
            if hasattr(request, 'fixed_events') and request.fixed_events:
                # Ensure it's a list and handle different formats
                events_list = request.fixed_events if isinstance(request.fixed_events, list) else [request.fixed_events]
                for event in events_list:
                    if isinstance(event, str):
                        calendar_events.append({"event": event, "type": "fixed"})
                    elif isinstance(event, dict):
                        calendar_events.append({
                            "time": event.get("time", ""),
                            "event": event.get("event", event.get("task", str(event))),
                            "type": "fixed"
                        })
            
            # Add anchors from config - ensure they're dictionaries
            if isinstance(anchors, list):
                for anchor in anchors:
                    if isinstance(anchor, dict):
                        calendar_events.append({
                            "time": anchor.get("time", ""),
                            "event": anchor.get("task", anchor.get("event", "")),
                            "type": "anchor"
                        })
                    elif isinstance(anchor, str):
                        calendar_events.append({"event": anchor, "type": "anchor"})
            
            # Add fixed schedule events from config - ensure they're dictionaries  
            if isinstance(fixed_events, list):
                for fixed in fixed_events:
                    if isinstance(fixed, dict):
                        calendar_events.append({
                            "time": fixed.get("time", ""),
                            "event": fixed.get("task", fixed.get("event", "")),
                            "type": "fixed"
                        })
                    elif isinstance(fixed, str):
                        calendar_events.append({"event": fixed, "type": "fixed"})
                        
        except Exception as e:
            logger.error(f"Error processing calendar events: {e}")
            calendar_events = []  # Continue with empty events rather than fail
        
        # Safely extract request parameters with defaults
        try:
            # Extract planning mode and current time for same-day planning
            planning_mode = getattr(request, 'planning_mode', 'tomorrow')
            current_time = getattr(request, 'current_time', None)
            
            # For same-day planning, use current time as schedulable start time
            schedulable_start_time = None
            if planning_mode == 'today' and current_time:
                schedulable_start_time = current_time
            
            prompt_data = build_unified_planning_prompt(
                most_important=getattr(request, 'most_important', ''),
                todos=getattr(request, 'todos', []),
                energy_level=str(getattr(request, 'energy_level', '5')),
                non_negotiables=getattr(request, 'non_negotiables', ''),
                avoid_today=getattr(request, 'avoid_today', ''),
                email_context={},  # TODO: Add email context
                calendar_events=calendar_events,
                session_insights=[],  # TODO: Add session insights
                reminders=[],  # TODO: Add reminders
                config=config,
                routine_overrides=getattr(request, 'routine_overrides', '') or "",
                planning_mode=planning_mode,
                schedulable_start_time=schedulable_start_time
            )
        except Exception as e:
            logger.error(f"Error building unified planning prompt: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid request parameters: {str(e)}")
        
        # Call Claude with strategic daily planning model (Opus)
        logger.info("📡 Calling Claude Opus for strategic schedule generation...")
        
        try:
            message = claude_client.messages.create(
                model="claude-opus-4-20250514",  # Use Claude Opus 4 for superior planning intelligence
                max_tokens=4000,
                temperature=0.3,  # Balance creativity with structure
                messages=[{
                    "role": "user", 
                    "content": prompt_data  # prompt_data is a string, not a dict
                }]
            )
            
            # Parse Claude's response safely
            if not message.content or len(message.content) == 0:
                raise ValueError("Empty response from Claude")
                
            response_text = message.content[0].text.strip()
            logger.info(f"📊 Claude response received ({len(response_text)} chars)")
            
            if not response_text:
                raise ValueError("Empty response text from Claude")
                
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate plan: {str(e)}")
        
        try:
            # Claude's unified planning response contains reasoning + JSON
            # First try to extract JSON from markdown code blocks
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                # Look for JSON object in the response (unified planning uses structured Pydantic output)
                # The response might be just JSON or contain reasoning + JSON
                json_start = response_text.find("{")
                if json_start == -1:
                    # No JSON found - this is likely a pure text response, which shouldn't happen
                    logger.error(f"No JSON found in Claude response: {response_text[:200]}...")
                    raise ValueError("No JSON structure found in Claude response")
                
                # Find the end of the JSON object by counting braces
                brace_count = 0
                json_end = json_start
                for i, char in enumerate(response_text[json_start:], json_start):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                
                json_text = response_text[json_start:json_end]
            
            plan_response = json.loads(json_text)
            
            # Handle both unified planning format (with "schedule") and legacy format (with "blocks")
            if isinstance(plan_response, dict):
                if "schedule" in plan_response:
                    # Convert unified planning format to legacy format for compatibility
                    plan_response["blocks"] = plan_response["schedule"]
                elif "blocks" not in plan_response:
                    raise ValueError("Response missing both 'schedule' and 'blocks' arrays")
            else:
                raise ValueError("Response is not a JSON object")
                
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.error(f"Raw response: {response_text[:500]}...")
            raise HTTPException(status_code=500, detail="Failed to parse Claude response")
        
        # Save plan to persistent storage
        today_str = today.strftime("%Y-%m-%d")
        
        # Use configurable plans directory with fallback
        plans_base_dir = os.getenv("ECHO_PLANS_DIR", "plans")
        plans_dir = Path(plans_base_dir).resolve()
        plans_dir.mkdir(parents=True, exist_ok=True)
        
        plan_file = plans_dir / f"{today_str}-enhanced-plan.json"
        
        # Create backup if plan already exists
        if plan_file.exists():
            backup_file = plans_dir / f"{today_str}-enhanced-plan-backup-{int(time_module.time())}.json"
            plan_file.rename(backup_file)
            logger.info(f"📁 Existing plan backed up to {backup_file}")
        
        # Add metadata to plan
        plan_response["metadata"] = {
            "generated_at": datetime.now().isoformat(),
            "model": "claude-opus-4-20250514",
            "prompt_version": "unified_v2",
            "request_id": f"plan_{int(time_module.time())}"
        }
        
        with open(plan_file, 'w') as f:
            json.dump(plan_response, f, indent=2)
        
        logger.info(f"✅ Plan saved to {plan_file}")
        logger.info(f"📋 Generated {len(plan_response.get('blocks', []))} schedule blocks")
        
        return plan_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in unified planning generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Add remaining complex endpoints here...
# (For brevity, I'll include a few key ones and indicate where others would go)

@app.post("/context-briefing")
async def get_context_briefing(request: dict = {}):
    """Generate four-panel context briefing with intelligence systems."""
    try:
        # Extract parameters from request
        planning_mode = request.get('mode', 'tomorrow')  # 'today' or 'tomorrow'
        current_time = request.get('current_time', None)  # For same-day planning
        
        logger.info(f"🧠 Starting four-panel context briefing generation (mode: {planning_mode})")
        
        # Build cache key with planning mode for proper cache separation
        cache_key_suffix = f"{planning_mode}-{current_time}" if current_time else planning_mode
        cache_key = get_cache_key("context_briefing", f"{datetime.now().strftime('%Y-%m-%d-%H')}-{cache_key_suffix}")
        cached_result = get_cached_data(CONTEXT_BRIEFING_CACHE, cache_key, CONTEXT_BRIEFING_CACHE_DURATION)
        if cached_result is not None:
            logger.info("📦 Using cached context briefing")
            return cached_result
        
        # Initialize intelligence systems with Claude client
        claude_client = _get_claude_client()
        if not claude_client:
            raise HTTPException(status_code=500, detail="Claude client not available")
        
        briefing_generator = StructuredContextBriefing(claude_client)
        
        # Generate comprehensive context briefing with planning mode
        logger.info("🎯 Generating structured context briefing...")
        
        # Initialize all intelligence systems
        email_categorizer = EmailCategorizer(claude_client)
        session_analyzer = SessionNotesAnalyzer(claude_client)
        config_extractor = ConfigDeadlineExtractor()
        
        # Get context data from all intelligence systems
        config = get_config()
        
        # Generate email context
        email_processor = get_email_processor()
        if email_processor:
            # Get recent emails from processor (1 day lookback)
            recent_emails = email_processor.get_emails(days=1, include_conversation_data=True)
            email_context = email_categorizer.categorize_emails(recent_emails)
        else:
            email_context = {}
        
        # Generate session context (get recent session files)
        from pathlib import Path
        logs_dir = Path("logs")
        session_files = []
        if logs_dir.exists():
            # Get recent session files (last 7 days)
            for log_file in logs_dir.glob("*.md"):
                try:
                    # Check if file is recent enough based on name or modification time
                    file_date = datetime.fromtimestamp(log_file.stat().st_mtime)
                    if (datetime.now() - file_date).days <= 7:
                        session_files.append(str(log_file))
                except:
                    continue
        
        session_context = session_analyzer.extract_next_items(session_files)
        
        # Generate config context with planning mode awareness
        config_context = config_extractor.get_upcoming_commitments(
            config=config,
            planning_mode=planning_mode,
            current_time=current_time
        )
        
        # Generate four-panel briefing
        briefing_data = briefing_generator.build_four_panel_briefing(
            email_context=email_context,
            session_context=session_context, 
            config_context=config_context
        )
        
        # Cache the result (if caching is enabled)
        if CONTEXT_BRIEFING_CACHE_DURATION > 0:
            set_cached_data(CONTEXT_BRIEFING_CACHE, cache_key, briefing_data)
        
        logger.info("✅ Context briefing generation complete")
        return briefing_data
        
    except Exception as e:
        logger.error(f"Error generating context briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# The remaining endpoints would be added here:
# - Email endpoints (/email-summary, /conversation-intelligence, /daily-email-brief)
# - Session management endpoints (/session/*)
# - Plan refinement (/plan/refine)
# - Legacy planning (/plan)

if __name__ == "__main__":
    import uvicorn
    # Configure timeouts for Claude API calls which can take 15-30+ seconds
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        timeout_keep_alive=120,  # Keep connections alive for 2 minutes
        timeout_graceful_shutdown=30,  # Graceful shutdown timeout
        access_log=True,
        log_level="info"
    )