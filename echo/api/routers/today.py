"""
Today Router

Endpoint for getting today's schedule with current status and email integration.
"""

import json
import logging
import os
from datetime import datetime, date
from pathlib import Path

import aiofiles
from fastapi import APIRouter, HTTPException

from echo.api.dependencies import get_email_processor
from echo.api.models.response_models import TodayResponse, BlockResponse
from echo.api.models.plan_models import safe_parse_plan_file, PlanFileValidationError
from echo.models import Block, BlockType

router = APIRouter()
logger = logging.getLogger(__name__)


def _determine_time_period(hour: int) -> str:
    """Determine time period based on hour for planning context."""
    if 5 <= hour < 12:
        return "morning"
    elif 12 <= hour < 17:
        return "afternoon"
    elif 17 <= hour < 22:
        return "evening"
    else:
        return "night"


def _suggest_planning_mode(hour: int, has_existing_plan: bool) -> str:
    """Suggest whether to use same-day or next-day planning."""
    if has_existing_plan:
        return "follow_existing_plan"
    elif hour < 9:
        return "same_day_planning"  # Early morning, good for same-day planning
    elif hour < 15:
        return "same_day_planning"  # Still plenty of day left
    elif hour < 18:
        return "mixed_planning"     # Consider both same-day and next-day
    else:
        return "next_day_planning"  # Evening, focus on tomorrow


@router.get("/today", response_model=TodayResponse)
async def get_today_schedule():
    """Get today's schedule with current status and email integration."""
    try:
        today = date.today()
        current_time = datetime.now()
        
        # Load today's plan from configurable storage location
        plans_base_dir = os.getenv("ECHO_PLANS_DIR", "plans")
        plans_dir = Path(plans_base_dir).resolve()
        plan_file = plans_dir / f"{today.isoformat()}-enhanced-plan.json"
        
        # Load and validate plan file once, reuse for both blocks and notes
        plan_data = None
        
        if not plan_file.exists():
            # Return empty blocks if no plan exists - don't auto-generate
            blocks = []
        else:
            try:
                # Use validated plan file parsing with async I/O
                async with aiofiles.open(plan_file, 'r') as f:
                    file_content = await f.read()
                
                plan_data = safe_parse_plan_file(file_content)
                blocks = []
                
                # Get validated blocks with proper time data
                valid_blocks = plan_data.get_valid_blocks()
                
                for block_data in valid_blocks:
                    start_str = block_data.get_start_time()
                    end_str = block_data.get_end_time()
                    
                    # Convert HH:MM to HH:MM:SS format if needed
                    if len(start_str.split(':')) == 2:
                        start_str += ":00"
                    if len(end_str.split(':')) == 2:
                        end_str += ":00"
                    
                    try:
                        start_time = datetime.strptime(start_str, "%H:%M:%S").time()
                        end_time = datetime.strptime(end_str, "%H:%M:%S").time()
                        
                        block = Block(
                            start=start_time,
                            end=end_time,
                            label=block_data.get_label(),
                            type=BlockType(block_data.type)
                        )
                        blocks.append(block)
                        
                    except ValueError as e:
                        logger.warning(f"Invalid time format in validated block: {block_data}, error: {e}")
                        continue
                        
            except PlanFileValidationError as e:
                logger.error(f"Plan file validation failed for {plan_file}: {e.message}")
                if e.errors:
                    logger.error(f"Validation errors: {e.errors}")
                # Return empty blocks on validation failure to prevent crashes
                blocks = []
            except Exception as e:
                logger.error(f"Unexpected error reading plan file {plan_file}: {e}")
                blocks = []
        
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
            
            label_lower = (block.label or '').lower()
            icon = 'Calendar'  # default
            for keyword, mapped_icon in icon_map.items():
                if keyword in label_lower:
                    icon = mapped_icon
                    break
            
            note = ""     # Default
            
            # Check if plan data has enricher information for notes (reuse loaded data)
            if plan_data is not None:
                schedule_data = plan_data.get_schedule_data()
                for saved_block in schedule_data:
                    # Compare times in HH:MM format (without seconds)
                    saved_start = saved_block.get_start_time() or ""
                    saved_end = saved_block.get_end_time() or ""
                    block_start = block.start.strftime("%H:%M")
                    block_end = block.end.strftime("%H:%M")
                    
                    if saved_start == block_start and saved_end == block_end:
                        note = saved_block.note or ""
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
        email_processor = get_email_processor()
        if email_processor:
            try:
                email_context = email_processor.get_email_planning_context(days=7)
                planning_stats = email_processor.get_email_planning_stats()
            except Exception as e:
                logger.warning(f"Failed to get email context: {e}")
        
        # Build time context for same-day planning decisions
        time_context = {
            "current_time_24h": current_time.strftime("%H:%M"),
            "current_hour": current_time.hour,
            "current_minute": current_time.minute,
            "time_period": _determine_time_period(current_time.hour),
            "has_existing_plan": plan_file.exists(),
            "remaining_day_hours": max(0, 22 - current_time.hour),  # Assuming 22:00 bedtime
            "planning_mode_suggestion": _suggest_planning_mode(current_time.hour, plan_file.exists()),
            "schedulable_start_time": current_time.strftime("%H:%M"),
            "is_workday": current_time.weekday() < 5,  # Monday = 0, Sunday = 6
            "weekday_name": current_time.strftime("%A").lower()
        }
        
        return TodayResponse(
            date=today.isoformat(),
            current_time=current_time.strftime("%H:%M"),
            current_block=current_block_response,
            blocks=block_responses,
            email_summary=email_context,
            planning_stats=planning_stats,
            time_context=time_context
        )
        
    except Exception as e:
        logger.error(f"Error getting today's schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))