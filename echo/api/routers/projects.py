"""
Projects Router

Comprehensive project management endpoints with CRUD operations,
hybrid wizard integration, and analytics support.
"""

import logging
import uuid
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import ValidationError

from echo.database_schema import SessionDatabase
from echo.api.models.request_models import (
    ProjectCreateRequest, ProjectUpdateRequest, ProjectFiltersRequest
)
from echo.api.models.response_models import (
    ProjectResponse, ProjectsListResponse, ProjectStatsResponse,
    DailyActivity, WeeklySummary, ProjectRoadmap
)

router = APIRouter()
logger = logging.getLogger(__name__)


def get_database() -> SessionDatabase:
    """Get database connection."""
    return SessionDatabase("data/session_intelligence.db")


def convert_mock_to_project_response(project_data: dict) -> ProjectResponse:
    """Convert mock project data to ProjectResponse model."""
    # Generate mock activity data
    weekly_activity = []
    daily_activity = []
    
    # Generate 8 weeks of activity
    for i in range(8):
        hours = project_data.get('time_spent_this_week', 10) + (i * 2)
        weekly_activity.append(max(0, hours - (i * 0.5)))
    
    # Generate 180 days of activity for heatmap
    base_date = date.today() - timedelta(days=180)
    for i in range(180):
        activity_date = base_date + timedelta(days=i)
        hours = max(0, project_data.get('total_actual_hours', 50) / 180 + (i % 7) * 0.3)
        sessions = max(0, int(hours / 2))
        intensity = min(4, int(hours * 0.8))
        
        daily_activity.append(DailyActivity(
            date=activity_date.isoformat(),
            hours=hours,
            sessions=sessions,
            intensity=intensity
        ))
    
    # Convert milestones to weekly summaries if they exist
    weekly_summaries = []
    if project_data.get('milestones'):
        for i, milestone in enumerate(project_data['milestones'][:3]):  # Last 3 milestones
            week_end = date.today() - timedelta(days=i*7)
            summary = WeeklySummary(
                id=str(uuid.uuid4()),
                project_id=project_data['id'],
                week_ending=week_end.isoformat(),
                hours_invested=project_data.get('time_spent_this_week', 10),
                sessions_count=3,
                summary=f"Worked on {milestone.get('title', 'milestone')}",
                key_accomplishments=[milestone.get('title', 'milestone')],
                decisions_made=[],
                blockers_encountered=[],
                next_week_focus="Continue progress",
                tasks_completed=1,
                generated_at=datetime.now().isoformat(),
                ai_confidence=0.8
            )
            weekly_summaries.append(summary)
    
    # Create roadmap if project has milestones
    roadmap = None
    if project_data.get('milestones'):
        phases = []
        for i, milestone in enumerate(project_data['milestones']):
            phases.append({
                "id": str(uuid.uuid4()),
                "title": milestone.get('title', f'Phase {i+1}'),
                "goal": milestone.get('description', f'Complete phase {i+1}'),
                "order": i,
                "is_current": i == 0,
                "estimated_days": milestone.get('estimated_hours', 40) // 8,
                "due_date": milestone.get('due_date')
            })
        
        roadmap = ProjectRoadmap(
            phases=phases,
            current_phase_id=phases[0]["id"] if phases else None,
            ai_confidence=0.85,
            generated_at=datetime.now().isoformat(),
            user_modified=False
        )
    
    return ProjectResponse(
        id=project_data['id'],
        name=project_data['name'],
        description=project_data['description'],
        type=project_data.get('category', 'software'),  # Map category to type
        status=project_data.get('status', 'active'),
        phase=project_data.get('current_focus', 'execution')[:20],  # Truncate for phase
        objective=project_data.get('current_focus', 'Complete project objectives'),
        current_state=f"Progress: {project_data.get('progress_percentage', 0)}%",
        total_estimated_hours=project_data.get('total_estimated_hours', 40),
        total_actual_hours=project_data.get('total_actual_hours', 20),
        hours_this_week=project_data.get('time_spent_this_week', 10),
        hours_last_week=project_data.get('time_spent_this_week', 8),
        weekly_activity_hours=weekly_activity,
        daily_activity_hours=daily_activity,
        progress_percentage=project_data.get('progress_percentage', 50.0),
        momentum=project_data.get('momentum', 'medium'),
        created_date=project_data.get('created_date', date.today().isoformat()),
        updated_date=project_data.get('updated_at', date.today().isoformat())[:10],
        last_session_date=date.today().isoformat(),
        weekly_summaries=weekly_summaries,
        total_sessions=project_data.get('total_sessions', 15),
        sessions_this_week=project_data.get('sessions_this_week', 3),
        roadmap=roadmap,
        key_deliverables=project_data.get('deliverables', []),
        current_focus=project_data.get('current_focus'),
        time_spent_today=0,
        time_spent_week=int(project_data.get('time_spent_this_week', 10))
    )


# ===== CORE CRUD ENDPOINTS =====

@router.get("/projects", response_model=ProjectsListResponse)
async def get_projects(
    status: Optional[List[str]] = Query(None),
    type: Optional[List[str]] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("updated_date"),
    sort_order: str = Query("desc"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0)
):
    """
    Get all projects with filtering, search, and pagination.
    Supports multiple status/type filters and full-text search.
    """
    try:
        db = get_database()
        
        # Get all projects from database 
        all_projects = db.get_all_projects()
        logger.info(f"Retrieved {len(all_projects)} projects from database")
        
        # Convert to response models
        projects = []
        for project_data in all_projects:
            try:
                project_response = convert_mock_to_project_response(project_data)
                projects.append(project_response)
            except Exception as e:
                logger.warning(f"Error converting project {project_data.get('id', 'unknown')}: {e}")
                continue
        
        # Apply filters
        if status:
            projects = [p for p in projects if p.status in status]
        
        if type:
            projects = [p for p in projects if p.type in type]
            
        if search:
            search_lower = search.lower()
            projects = [p for p in projects if 
                       search_lower in p.name.lower() or
                       search_lower in p.description.lower() or
                       search_lower in p.objective.lower()]
        
        # Apply sorting
        reverse = sort_order == "desc"
        if sort_by == "name":
            projects.sort(key=lambda x: x.name.lower(), reverse=reverse)
        elif sort_by == "updated_date":
            projects.sort(key=lambda x: x.updated_date, reverse=reverse)
        elif sort_by == "created_date":
            projects.sort(key=lambda x: x.created_date, reverse=reverse)
        elif sort_by == "hours_this_week":
            projects.sort(key=lambda x: x.hours_this_week, reverse=reverse)
        elif sort_by == "progress_percentage":
            projects.sort(key=lambda x: x.progress_percentage, reverse=reverse)
        
        # Apply pagination
        total_count = len(projects)
        paginated_projects = projects[offset:offset + limit]
        
        # Calculate counts
        active_count = len([p for p in projects if p.status == "active"])
        completed_count = len([p for p in projects if p.status == "completed"])
        
        return ProjectsListResponse(
            projects=paginated_projects,
            total_count=total_count,
            active_count=active_count,
            completed_count=completed_count
        )
        
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str):
    """Get a single project by ID."""
    try:
        db = get_database()
        project_data = db.get_project_by_id(project_id)
        
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return convert_mock_to_project_response(project_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects", response_model=ProjectResponse)
async def create_project(request: ProjectCreateRequest):
    """Create a new project."""
    try:
        db = get_database()
        
        # Create project data
        project_id = str(uuid.uuid4())
        now = datetime.now()
        
        project_data = {
            "id": project_id,
            "name": request.name,
            "description": request.description,
            "type": request.type,
            "status": "active",
            "phase": request.initial_phase or "initiation",
            "priority": "medium",  # Default priority
            "category": request.type,  # Map type to category for compatibility
            "objective": request.objective,
            "current_state": request.current_state or "Project just created. Ready to begin work.",
            "current_focus": f"Getting started with {request.name}",
            "progress_percentage": 0.0,
            "momentum": "medium",
            "total_estimated_hours": request.estimated_hours or 40,
            "total_actual_hours": 0,
            "hours_this_week": 0.0,
            "hours_last_week": 0.0,
            "total_sessions": 0,
            "sessions_this_week": 0,
            "created_date": now.date().isoformat(),
            "updated_date": now.date().isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "milestones": [],
            "key_stakeholders": [],
            "success_criteria": [],
            "risks_and_blockers": [],
            "recent_wins": [],
            "tags": [],
            "metadata": {
                "created_via": "api",
                "project_type": request.type
            }
        }
        
        # Save to database
        success = db.create_project(project_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        logger.info(f"Created new project: {project_id} - {request.name}")
        return convert_mock_to_project_response(project_data)
        
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, request: ProjectUpdateRequest):
    """Update an existing project."""
    try:
        db = get_database()
        
        # Get existing project
        existing_project = db.get_project_by_id(project_id)
        if not existing_project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Update fields
        updates = {}
        if request.name is not None:
            updates["name"] = request.name
        if request.description is not None:
            updates["description"] = request.description
        if request.type is not None:
            updates["type"] = request.type
            updates["category"] = request.type  # Keep compatibility
        if request.status is not None:
            updates["status"] = request.status
        if request.phase is not None:
            updates["phase"] = request.phase
        if request.objective is not None:
            updates["objective"] = request.objective
        if request.current_state is not None:
            updates["current_state"] = request.current_state
        if request.progress_percentage is not None:
            updates["progress_percentage"] = request.progress_percentage
        if request.momentum is not None:
            updates["momentum"] = request.momentum
        if request.total_estimated_hours is not None:
            updates["total_estimated_hours"] = request.total_estimated_hours
        
        # Apply updates
        updated_project = {**existing_project, **updates}
        updated_project["updated_date"] = datetime.now().date().isoformat()
        updated_project["updated_at"] = datetime.now().isoformat()
        
        # Save to database
        success = db.update_project(project_id, updated_project)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update project")
        
        logger.info(f"Updated project: {project_id}")
        return convert_mock_to_project_response(updated_project)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    try:
        db = get_database()
        
        # Check if project exists
        existing_project = db.get_project_by_id(project_id)
        if not existing_project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Delete project (this will cascade to related tables due to foreign keys)
        cursor = db.conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=500, detail="Failed to delete project")
        
        db.conn.commit()
        logger.info(f"Deleted project: {project_id}")
        
        return {"message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects/stats", response_model=ProjectStatsResponse)
async def get_project_stats():
    """Get project portfolio statistics."""
    try:
        db = get_database()
        all_projects = db.get_all_projects()
        
        total_projects = len(all_projects)
        active_projects = len([p for p in all_projects if p.get('status') == 'active'])
        completed_projects = len([p for p in all_projects if p.get('status') == 'completed'])
        
        total_hours_all_time = sum(p.get('total_actual_hours', 0) for p in all_projects)
        total_hours_this_week = sum(p.get('time_spent_this_week', 0) for p in all_projects)
        total_hours_last_week = total_hours_this_week * 0.8  # Mock calculation
        
        # Find most active project this week
        most_active = max(all_projects, key=lambda x: x.get('time_spent_this_week', 0)) if all_projects else None
        most_active_project = {
            "id": most_active.get('id', ''),
            "name": most_active.get('name', ''),
            "hours_this_week": most_active.get('time_spent_this_week', 0)
        } if most_active else {"id": "", "name": "", "hours_this_week": 0}
        
        completion_rate = (completed_projects / total_projects * 100) if total_projects > 0 else 0
        
        return ProjectStatsResponse(
            total_projects=total_projects,
            active_projects=active_projects,
            total_hours_all_time=total_hours_all_time,
            total_hours_this_week=total_hours_this_week,
            total_hours_last_week=total_hours_last_week,
            most_active_project=most_active_project,
            completion_rate=completion_rate
        )
        
    except Exception as e:
        logger.error(f"Error getting project stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))