"""
Config Router

Endpoints for configuration management including loading and saving user configs.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

import yaml
from fastapi import APIRouter, HTTPException

from echo.api.dependencies import get_config
from echo.api.models.request_models import ConfigRequest
from echo.api.models.response_models import ConfigResponse
from echo.api.utils import (
    get_cache_key, get_cached_data, set_cached_data, 
    CONFIG_CACHE, CONFIG_CACHE_DURATION
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/config")
async def get_config_endpoint():
    """Get user configuration including wake and sleep times for timeline display."""
    try:
        config = get_config()
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        # Extract wake and sleep times from defaults
        wake_time = config.defaults.wake_time if config.defaults else '06:00'
        sleep_time = config.defaults.sleep_time if config.defaults else '22:00'
        
        return {
            "wake_time": wake_time,
            "sleep_time": sleep_time,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/config/save", response_model=ConfigResponse)
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


@router.get("/config/load")
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