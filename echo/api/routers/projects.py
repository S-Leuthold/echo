"""
Projects Router

Endpoint for getting project information with status and time tracking.
"""

import logging
from typing import List

from fastapi import APIRouter, HTTPException

from echo.api.dependencies import get_config
from echo.api.models.response_models import ProjectResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/projects", response_model=List[ProjectResponse])
async def get_projects():
    """Get all projects with their current status and time tracking."""
    try:
        config = get_config()
        if not config:
            raise HTTPException(status_code=500, detail="Configuration not loaded")
        
        projects = []
        for project_id, project_data in config.projects.items():
            # Calculate time spent (analytics integration pending)
            time_spent_today = 0  # Analytics integration needed
            time_spent_week = 0   # Analytics integration needed
            
            project_response = ProjectResponse(
                id=project_id,
                name=project_data.get("name", project_id),
                status=project_data.get("status", "active"),
                current_focus=project_data.get("current_focus"),
                time_spent_today=time_spent_today,
                time_spent_week=time_spent_week,
                progress_percentage=0.0  # Milestone calculation pending
            )
            projects.append(project_response)
        
        return projects
        
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))