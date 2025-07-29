"""
Projects Router

Comprehensive project management endpoints with CRUD operations,
hybrid wizard integration, and analytics support.
"""

import logging
import uuid
import json
import asyncio
from datetime import datetime, date, timedelta
from typing import List, Optional, AsyncGenerator

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from echo.database_schema import SessionDatabase
from echo.claude_client import get_claude_client
from echo.api.models.request_models import (
    ProjectCreateRequest, ProjectUpdateRequest, ProjectFiltersRequest,
    ConversationAnalysisRequest, RoadmapGenerationRequest, HybridProjectCreateRequest
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


# ===== HYBRID WIZARD ENDPOINTS =====

@router.post("/projects/analyze-conversation")
async def analyze_conversation(request: ConversationAnalysisRequest):
    """
    Analyze user conversation and extract structured project data using Claude Sonnet.
    This endpoint provides real-time analysis as the user describes their project.
    """
    try:
        logger.info(f"Analyzing conversation message: {request.message[:100]}...")
        
        # Get Claude client configured for structured processing
        claude_client = get_claude_client()
        if not claude_client:
            raise HTTPException(status_code=500, detail="Claude client not available")
        
        # Build conversation context
        conversation_context = ""
        for msg in request.conversation_history[-5:]:  # Last 5 messages for context
            conversation_context += f"{msg.role}: {msg.content}\n"
        
        # Add current message
        conversation_context += f"user: {request.message}\n"
        
        # Build file context if files uploaded
        file_context = ""
        if request.uploaded_files:
            file_context = "\n\nUploaded files context:\n"
            for file in request.uploaded_files:
                file_context += f"- {file.filename} ({file.content_type}): {file.project_context or 'No description'}\n"
        
        # Create structured analysis prompt
        analysis_prompt = f"""
You are an AI project consultant helping to analyze a user's conversation about their project idea. Based on the conversation, extract structured project information with confidence scores.

Conversation history:
{conversation_context}
{file_context}

Current analysis (if any): {request.current_analysis}

Please analyze this conversation and return structured JSON with the following format:

{{
    "project_name": {{
        "value": "extracted project name or null",
        "confidence": 0.0-1.0,
        "reasoning": "why this name was chosen"
    }},
    "project_type": {{
        "value": "software|research|writing|creative|admin|personal or null",
        "confidence": 0.0-1.0,
        "reasoning": "why this type was chosen"
    }},
    "description": {{
        "value": "brief description or null",
        "confidence": 0.0-1.0,
        "reasoning": "description extraction rationale"
    }},
    "objective": {{
        "value": "main objective or null", 
        "confidence": 0.0-1.0,
        "reasoning": "objective extraction rationale"
    }},
    "current_state": {{
        "value": "current project state or null",
        "confidence": 0.0-1.0,
        "reasoning": "state assessment rationale"
    }},
    "key_deliverables": {{
        "value": ["list", "of", "deliverables"] or [],
        "confidence": 0.0-1.0,
        "reasoning": "deliverables extraction rationale"
    }},
    "estimated_duration": {{
        "value": "estimated duration in days or null",
        "confidence": 0.0-1.0,
        "reasoning": "duration estimation rationale"
    }},
    "next_steps": {{
        "value": ["immediate", "next", "steps"] or [],
        "confidence": 0.0-1.0,
        "reasoning": "next steps identification rationale"
    }},
    "response_trigger": {{
        "should_respond": true/false,
        "trigger_type": "clarification|encouragement|summary|none",
        "response_focus": "what to focus the AI response on"
    }},
    "overall_confidence": 0.0-1.0
}}

Guidelines:
- Only extract information that is clearly mentioned or strongly implied
- Use null for fields that cannot be confidently determined
- Confidence scores should reflect how certain you are about each extraction
- Be conservative with confidence scores - better to underestimate than overestimate
- For response_trigger, determine if the AI should respond and what type of response would be helpful
- Extract deliverables as concrete, actionable items
- Estimate duration based on scope and complexity mentioned
"""

        # Call Claude Sonnet for structured analysis
        message = claude_client.messages.create(
            model="claude-sonnet-4-20250514",  # Sonnet for structured processing
            max_tokens=2000,
            temperature=0.3,  # Lower temperature for consistent parsing
            messages=[{
                "role": "user",
                "content": analysis_prompt
            }]
        )
        
        if not message.content or len(message.content) == 0:
            raise ValueError("Empty response from Claude")
        
        response_text = message.content[0].text.strip()
        logger.info(f"Claude analysis response received ({len(response_text)} chars)")
        
        # Parse JSON response
        try:
            # Extract JSON from response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                # Look for JSON object in the response
                json_start = response_text.find("{")
                if json_start == -1:
                    raise ValueError("No JSON found in Claude response")
                
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
            
            import json
            analysis_result = json.loads(json_text)
            
            # Validate required structure
            required_fields = ['project_name', 'project_type', 'description', 'objective', 'overall_confidence']
            for field in required_fields:
                if field not in analysis_result:
                    analysis_result[field] = {"value": None, "confidence": 0.0, "reasoning": "Not found"}
            
            logger.info(f"Successfully analyzed conversation with {analysis_result.get('overall_confidence', 0):.2f} confidence")
            return analysis_result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse Claude analysis response: {e}")
            logger.error(f"Raw response: {response_text[:500]}...")
            
            # Return fallback analysis
            return {
                "project_name": {"value": None, "confidence": 0.0, "reasoning": "Analysis failed"},
                "project_type": {"value": None, "confidence": 0.0, "reasoning": "Analysis failed"},
                "description": {"value": None, "confidence": 0.0, "reasoning": "Analysis failed"},
                "objective": {"value": None, "confidence": 0.0, "reasoning": "Analysis failed"},
                "current_state": {"value": None, "confidence": 0.0, "reasoning": "Analysis failed"},
                "key_deliverables": {"value": [], "confidence": 0.0, "reasoning": "Analysis failed"},
                "estimated_duration": {"value": None, "confidence": 0.0, "reasoning": "Analysis failed"},
                "next_steps": {"value": [], "confidence": 0.0, "reasoning": "Analysis failed"},
                "response_trigger": {"should_respond": True, "trigger_type": "encouragement", "response_focus": "general project discussion"},
                "overall_confidence": 0.0,
                "error": "Failed to parse AI response"
            }
        
    except Exception as e:
        logger.error(f"Error in conversation analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/generate-roadmap")
async def generate_roadmap(request: RoadmapGenerationRequest):
    """
    Generate AI project roadmap using Claude Sonnet for structured generation,
    then Claude Opus for strategic review and refinement.
    """
    try:
        logger.info(f"Generating roadmap for {request.project_brief.get('project_name', {}).get('value', 'unnamed project')}")
        
        # Get Claude client
        claude_client = get_claude_client()
        if not claude_client:
            raise HTTPException(status_code=500, detail="Claude client not available")
        
        # Extract key information from project brief
        project_name = request.project_brief.get('project_name', {}).get('value', 'Untitled Project')
        project_type = request.project_brief.get('project_type', {}).get('value', 'software')
        description = request.project_brief.get('description', {}).get('value', '')
        objective = request.project_brief.get('objective', {}).get('value', '')
        deliverables = request.project_brief.get('key_deliverables', {}).get('value', [])
        estimated_duration = request.estimated_duration or 90  # Default 90 days
        
        # Phase 1: Generate structured roadmap with Sonnet
        roadmap_prompt = f"""
You are an expert project manager creating a detailed roadmap for a {project_type} project.

Project Details:
- Name: {project_name}
- Type: {project_type}
- Description: {description}
- Objective: {objective}
- Key Deliverables: {', '.join(deliverables) if deliverables else 'Not specified'}
- Estimated Duration: {estimated_duration} days

Please create a detailed project roadmap with 4-7 phases. Return structured JSON:

{{
    "phases": [
        {{
            "id": "unique_phase_id",
            "title": "Phase Name",
            "goal": "One sentence describing what this phase achieves",
            "order": 0,
            "is_current": true,
            "estimated_days": 15,
            "due_date": null,
            "key_activities": ["activity1", "activity2"],
            "deliverables": ["deliverable1", "deliverable2"],
            "success_criteria": ["criteria1", "criteria2"]
        }}
    ],
    "total_duration_days": {estimated_duration},
    "critical_path": ["phase_id1", "phase_id2"],
    "risk_factors": ["risk1", "risk2"],
    "success_metrics": ["metric1", "metric2"]
}}

Guidelines:
- Create logical, sequential phases appropriate for {project_type} projects
- Distribute the {estimated_duration} days across phases realistically
- Only mark the first phase as current (is_current: true)
- Each phase should have 2-4 key activities and deliverables
- Phases should build upon each other logically
- Include realistic success criteria for each phase
"""

        # Call Sonnet for structured roadmap generation
        sonnet_message = claude_client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            temperature=0.4,
            messages=[{"role": "user", "content": roadmap_prompt}]
        )
        
        if not sonnet_message.content:
            raise ValueError("Empty response from Claude Sonnet")
        
        sonnet_response = sonnet_message.content[0].text.strip()
        
        # Parse Sonnet's structured roadmap
        try:
            if "```json" in sonnet_response:
                json_start = sonnet_response.find("```json") + 7
                json_end = sonnet_response.find("```", json_start)
                json_text = sonnet_response[json_start:json_end].strip()
            else:
                json_start = sonnet_response.find("{")
                if json_start == -1:
                    raise ValueError("No JSON found in Sonnet response")
                
                brace_count = 0
                json_end = json_start
                for i, char in enumerate(sonnet_response[json_start:], json_start):
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            json_end = i + 1
                            break
                
                json_text = sonnet_response[json_start:json_end]
            
            import json
            roadmap_data = json.loads(json_text)
            
            # Phase 2: Strategic review with Opus
            opus_review_prompt = f"""
You are a senior strategic advisor reviewing a project roadmap for quality and strategic alignment.

Project: {project_name} ({project_type})
Objective: {objective}

Generated Roadmap:
{json.dumps(roadmap_data, indent=2)}

Please review this roadmap strategically and provide:

1. Strategic Assessment: Is this roadmap aligned with the project objective?
2. Phase Quality: Are the phases logical, well-scoped, and buildable?
3. Risk Analysis: What are the key risks and how should they be mitigated?
4. Optimization Suggestions: How can this roadmap be improved?

Provide your response as JSON:

{{
    "strategic_assessment": {{
        "alignment_score": 0.0-1.0,
        "strengths": ["strength1", "strength2"],
        "concerns": ["concern1", "concern2"]
    }},
    "phase_quality": {{
        "quality_score": 0.0-1.0,
        "well_structured_phases": ["phase_id1"],
        "needs_improvement": ["phase_id2"],
        "suggestions": ["suggestion1", "suggestion2"]
    }},
    "risk_analysis": {{
        "critical_risks": ["risk1", "risk2"],
        "mitigation_strategies": ["strategy1", "strategy2"],
        "risk_score": 0.0-1.0
    }},
    "optimizations": {{
        "recommended_changes": ["change1", "change2"],
        "alternative_approaches": ["approach1", "approach2"]
    }},
    "overall_confidence": 0.0-1.0,
    "recommendation": "approve|revise|reject"
}}
"""

            # Call Opus for strategic review
            opus_message = claude_client.messages.create(
                model="claude-opus-4-20250514",  # Opus for strategic analysis
                max_tokens=2000,
                temperature=0.3,
                messages=[{"role": "user", "content": opus_review_prompt}]
            )
            
            opus_response = opus_message.content[0].text.strip()
            
            # Parse Opus review (optional - for metadata)
            strategic_review = {}
            try:
                if "```json" in opus_response:
                    json_start = opus_response.find("```json") + 7
                    json_end = opus_response.find("```", json_start)
                    review_json = opus_response[json_start:json_end].strip()
                    strategic_review = json.loads(review_json)
            except:
                logger.warning("Could not parse Opus strategic review, continuing with Sonnet roadmap")
            
            # Generate unique IDs for phases if not present
            for i, phase in enumerate(roadmap_data.get('phases', [])):
                if 'id' not in phase:
                    phase['id'] = f"phase_{i+1}_{uuid.uuid4().hex[:8]}"
            
            # Combine results
            final_roadmap = {
                "phases": roadmap_data.get('phases', []),
                "current_phase_id": roadmap_data.get('phases', [{}])[0].get('id') if roadmap_data.get('phases') else None,
                "ai_confidence": strategic_review.get('overall_confidence', 0.85),
                "generated_at": datetime.now().isoformat(),
                "user_modified": False,
                "metadata": {
                    "total_duration_days": roadmap_data.get('total_duration_days', estimated_duration),
                    "critical_path": roadmap_data.get('critical_path', []),
                    "risk_factors": roadmap_data.get('risk_factors', []),
                    "success_metrics": roadmap_data.get('success_metrics', []),
                    "strategic_review": strategic_review
                }
            }
            
            logger.info(f"Generated roadmap with {len(final_roadmap['phases'])} phases and {final_roadmap['ai_confidence']:.2f} confidence")
            return final_roadmap
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse roadmap generation response: {e}")
            
            # Return fallback roadmap
            fallback_phases = [
                {
                    "id": f"phase_1_{uuid.uuid4().hex[:8]}",
                    "title": "Project Initiation",
                    "goal": "Set up project foundation and planning",
                    "order": 0,
                    "is_current": True,
                    "estimated_days": estimated_duration // 4,
                    "due_date": None
                },
                {
                    "id": f"phase_2_{uuid.uuid4().hex[:8]}",
                    "title": "Development/Execution",
                    "goal": "Main project work and implementation",
                    "order": 1,
                    "is_current": False,
                    "estimated_days": estimated_duration // 2,
                    "due_date": None
                },
                {
                    "id": f"phase_3_{uuid.uuid4().hex[:8]}",
                    "title": "Completion and Review",
                    "goal": "Finalize deliverables and conduct review",
                    "order": 2,
                    "is_current": False,
                    "estimated_days": estimated_duration // 4,
                    "due_date": None
                }
            ]
            
            return {
                "phases": fallback_phases,
                "current_phase_id": fallback_phases[0]["id"],
                "ai_confidence": 0.6,
                "generated_at": datetime.now().isoformat(),
                "user_modified": False,
                "error": "Used fallback roadmap due to parsing error"
            }
        
    except Exception as e:
        logger.error(f"Error generating roadmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/projects/create-hybrid", response_model=ProjectResponse)
async def create_hybrid_project(request: HybridProjectCreateRequest):
    """
    Create a new project from hybrid wizard conversation with AI-generated roadmap.
    This is the final step that combines conversation analysis and roadmap into a complete project.
    """
    try:
        logger.info("Creating hybrid project from conversation analysis")
        
        db = get_database()
        project_id = str(uuid.uuid4())
        now = datetime.now()
        
        # Extract project details from brief
        brief = request.project_brief
        project_name = brief.get('project_name', {}).get('value') or 'Untitled Project'
        project_type = brief.get('project_type', {}).get('value') or 'software'
        description = brief.get('description', {}).get('value') or 'Project created via AI conversation'
        objective = brief.get('objective', {}).get('value') or 'Complete project objectives'
        current_state = brief.get('current_state', {}).get('value') or 'Project created via hybrid wizard'
        key_deliverables = brief.get('key_deliverables', {}).get('value', [])
        
        # Create comprehensive project data
        project_data = {
            "id": project_id,
            "name": project_name,
            "description": description,
            "type": project_type,
            "status": "active",
            "phase": "initiation",
            "priority": "high",  # Hybrid projects get high priority by default
            "category": project_type,  # Map type to category for compatibility
            "objective": objective,
            "current_state": current_state,
            "current_focus": f"Getting started with {project_name}",
            "progress_percentage": 0.0,
            "momentum": "high",  # New projects start with high momentum
            "total_estimated_hours": brief.get('estimated_duration', {}).get('value', 90) * 8 or 320,  # Convert days to hours
            "total_actual_hours": 0,
            "hours_this_week": 0.0,
            "hours_last_week": 0.0,
            "total_sessions": 0,
            "sessions_this_week": 0,
            "created_date": now.date().isoformat(),
            "updated_date": now.date().isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "milestones": [],  # Could convert roadmap phases to milestones
            "key_stakeholders": ["Project Creator"],
            "success_criteria": key_deliverables[:3] if key_deliverables else ["Complete project successfully"],
            "risks_and_blockers": [],
            "recent_wins": ["Project created via AI conversation"],
            "tags": ["ai-generated", "hybrid-wizard", project_type],
            "deliverables": key_deliverables,
            "metadata": {
                "created_via": "hybrid_wizard",
                "conversation_id": str(uuid.uuid4()),
                "ai_confidence": brief.get('overall_confidence', 0.8),
                "conversation_length": len(request.conversation_history),
                "files_uploaded": len(request.uploaded_files),
                "user_refinements": request.user_refinements
            }
        }
        
        # Save project to database
        success = db.create_project(project_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create hybrid project")
        
        # Save roadmap if provided
        if request.roadmap:
            roadmap_success = db.create_project_roadmap(
                project_id=project_id,
                phases_data=request.roadmap.get('phases', []),
                ai_confidence=request.roadmap.get('ai_confidence', 0.8)
            )
            if roadmap_success:
                logger.info(f"Saved roadmap for hybrid project {project_id}")
        
        # Link uploaded files to project
        for file_ref in request.uploaded_files:
            db.link_file_to_project(
                file_id=file_ref.filename,  # Using filename as temporary ID
                project_id=project_id,
                project_context=file_ref.project_context or "Uploaded during project creation"
            )
        
        logger.info(f"Created hybrid project: {project_id} - {project_name}")
        
        # Return the project in the expected format
        return convert_mock_to_project_response(project_data)
        
    except Exception as e:
        logger.error(f"Error creating hybrid project: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== ADAPTIVE EXPERT COACHING CONVERSATION ENDPOINTS =====

@router.post("/conversations/start")
async def start_conversation(user_id: Optional[str] = None):
    """
    Start a new adaptive expert coaching conversation.
    
    Returns:
        Conversation ID and initial state for project creation workflow
    """
    try:
        from echo.conversation_state_manager import create_conversation_manager
        
        manager = create_conversation_manager()
        conversation_state = manager.start_conversation(user_id=user_id)
        
        logger.info(f"Started new conversation: {conversation_state.conversation_id}")
        
        return {
            "conversation_id": conversation_state.conversation_id,
            "stage": conversation_state.current_stage.value,
            "message": "Hi! I'm here to help you create a strategic project plan. Tell me about what you'd like to work on, and I'll guide you through developing a comprehensive project strategy.",
            "created_at": conversation_state.created_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error starting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/message")
async def send_message(conversation_id: str, request: dict):
    """
    Send a message in the adaptive expert coaching conversation.
    
    Args:
        conversation_id: Unique conversation identifier
        request: Message request with user input
        
    Returns:
        AI response with updated conversation state
    """
    try:
        from echo.conversation_state_manager import create_conversation_manager
        from echo.adaptive_coaching_service import AdaptiveCoachingService
        
        user_message = request.get("message", "")
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Get conversation manager and coaching service
        manager = create_conversation_manager()
        coaching_service = AdaptiveCoachingService()
        
        # Add user message to conversation
        conversation_state = manager.add_user_message(
            conversation_id, 
            user_message,
            metadata=request.get("metadata", {})
        )
        
        if not conversation_state:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Process message through adaptive coaching service
        coaching_response = await coaching_service.process_user_message(
            conversation_id,
            user_message
        )
        
        # Add assistant response to conversation
        manager.add_assistant_message(
            conversation_id,
            coaching_response.message,
            metadata={
                "stage": coaching_response.stage.value if coaching_response.stage else None,
                "confidence": coaching_response.confidence,
                "detected_domain": coaching_response.detected_domain,
                "reasoning": getattr(coaching_response, 'reasoning', None)
            }
        )
        
        logger.info(f"Processed message in conversation {conversation_id}")
        
        return {
            "message": coaching_response.message,
            "stage": coaching_response.stage.value if coaching_response.stage else conversation_state.current_stage.value,
            "confidence": coaching_response.confidence,
            "detected_domain": coaching_response.detected_domain,
            "project_summary": conversation_state.project_summary,
            "missing_information": conversation_state.missing_information,
            "conversation_id": conversation_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing message in conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/stream")
async def stream_message(conversation_id: str, request: dict):
    """
    Send a message with streaming response for real-time conversation experience.
    
    Args:
        conversation_id: Unique conversation identifier
        request: Message request with user input
        
    Returns:
        Server-Sent Events stream with real-time AI response
    """
    try:
        from echo.conversation_state_manager import create_conversation_manager
        from echo.adaptive_coaching_service import AdaptiveCoachingService
        
        user_message = request.get("message", "")
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Get conversation manager and coaching service
        manager = create_conversation_manager()
        coaching_service = AdaptiveCoachingService()
        
        # Add user message to conversation
        conversation_state = manager.add_user_message(
            conversation_id, 
            user_message,
            metadata=request.get("metadata", {})
        )
        
        if not conversation_state:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Create streaming response generator
        async def generate_stream():
            """Generate Server-Sent Events for streaming response."""
            
            # Send initial acknowledgment
            yield f"data: {json.dumps({
                'type': 'message_received',
                'conversation_id': conversation_id,
                'user_message': user_message,
                'timestamp': datetime.now().isoformat()
            })}\n\n"
            
            # Send thinking indicator
            yield f"data: {json.dumps({
                'type': 'thinking',
                'message': 'Analyzing your message...',
                'timestamp': datetime.now().isoformat()
            })}\n\n"
            
            # Simulate processing delay (in real implementation, this would be Claude API time)
            await asyncio.sleep(0.5)
            
            try:
                # Process message through adaptive coaching service
                coaching_response = await coaching_service.process_user_message(
                    conversation_id,
                    user_message
                )
                
                # Send stage update if changed
                if coaching_response.should_transition:
                    yield f"data: {json.dumps({
                        'type': 'stage_transition',
                        'new_stage': coaching_response.stage.value if coaching_response.stage else None,
                        'reason': 'Conversation progressed to next stage',
                        'timestamp': datetime.now().isoformat()
                    })}\n\n"
                
                # Send domain detection if available
                if coaching_response.detected_domain:
                    yield f"data: {json.dumps({
                        'type': 'domain_detected',
                        'domain': coaching_response.detected_domain,
                        'confidence': coaching_response.confidence,
                        'timestamp': datetime.now().isoformat()
                    })}\n\n"
                
                # Stream the response message (simulate typing effect)
                response_words = coaching_response.message.split()
                current_message = ""
                
                for i, word in enumerate(response_words):
                    current_message += word + " "
                    
                    # Send partial message every few words
                    if i % 3 == 0 or i == len(response_words) - 1:
                        yield f"data: {json.dumps({
                            'type': 'partial_response',
                            'message': current_message.strip(),
                            'is_complete': i == len(response_words) - 1,
                            'timestamp': datetime.now().isoformat()
                        })}\n\n"
                        
                        # Small delay for typing effect
                        if i < len(response_words) - 1:
                            await asyncio.sleep(0.1)
                
                # Add assistant message to conversation
                manager.add_assistant_message(
                    conversation_id,
                    coaching_response.message,
                    metadata={
                        "stage": coaching_response.stage.value if coaching_response.stage else None,
                        "confidence": coaching_response.confidence,
                        "detected_domain": coaching_response.detected_domain,
                        "reasoning": getattr(coaching_response, 'reasoning', None)
                    }
                )
                
                # Send final completion event
                updated_state = manager.get_conversation(conversation_id)
                yield f"data: {json.dumps({
                    'type': 'response_complete',
                    'conversation_id': conversation_id,
                    'stage': coaching_response.stage.value if coaching_response.stage else updated_state.current_stage.value,
                    'confidence': coaching_response.confidence,
                    'detected_domain': coaching_response.detected_domain,
                    'project_summary': updated_state.project_summary,
                    'missing_information': updated_state.missing_information,
                    'total_exchanges': updated_state.total_exchanges,
                    'timestamp': datetime.now().isoformat()
                })}\n\n"
                
                logger.info(f"Completed streaming response for conversation {conversation_id}")
                
            except Exception as e:
                # Send error event
                yield f"data: {json.dumps({
                    'type': 'error',
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                })}\n\n"
                
                logger.error(f"Error in streaming response: {e}")
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Cache-Control"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting up streaming for conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """
    Get conversation state and history.
    
    Args:
        conversation_id: Unique conversation identifier
        
    Returns:
        Complete conversation state with message history
    """
    try:
        from echo.conversation_state_manager import create_conversation_manager
        
        manager = create_conversation_manager()
        conversation_state = manager.get_conversation(conversation_id)
        
        if not conversation_state:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Format response
        return {
            "conversation_id": conversation_state.conversation_id,
            "stage": conversation_state.current_stage.value,
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.metadata
                }
                for msg in conversation_state.messages
            ],
            "project_summary": conversation_state.project_summary,
            "extracted_data": conversation_state.extracted_data,
            "confidence_score": conversation_state.confidence_score,
            "missing_information": conversation_state.missing_information,
            "current_persona": conversation_state.current_persona,
            "domain_detection": conversation_state.domain_detection.to_dict() if conversation_state.domain_detection else None,
            "total_exchanges": conversation_state.total_exchanges,
            "created_at": conversation_state.created_at.isoformat(),
            "updated_at": conversation_state.updated_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conversations/{conversation_id}/complete")
async def complete_conversation(conversation_id: str, request: dict):
    """
    Complete conversation and create project from extracted data.
    
    Args:
        conversation_id: Unique conversation identifier
        request: Final project data and any user corrections
        
    Returns:
        Created project information
    """
    try:
        from echo.conversation_state_manager import create_conversation_manager
        
        manager = create_conversation_manager()
        conversation_state = manager.get_conversation(conversation_id)
        
        if not conversation_state:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Extract project data from conversation
        project_data = conversation_state.extracted_data
        
        # Apply any final user corrections
        if request.get("corrections"):
            project_data.update(request["corrections"])
        
        # Create project using existing project creation logic
        project_id = str(uuid.uuid4())
        now = datetime.now()
        
        final_project_data = {
            "id": project_id,
            "name": project_data.get("project_name", "Untitled Project"),
            "description": project_data.get("description", "Project created through adaptive coaching"),
            "type": project_data.get("project_type", "personal"),
            "status": "active",
            "phase": "initiation",
            "priority": "medium",
            "category": project_data.get("project_type", "personal"),
            "objective": project_data.get("objective", "Complete project successfully"),
            "current_state": project_data.get("current_state", "Project ready to begin"),
            "current_focus": f"Getting started with {project_data.get('project_name', 'the project')}",
            "progress_percentage": 0.0,
            "momentum": "medium",
            "total_estimated_hours": project_data.get("estimated_hours", 40),
            "total_actual_hours": 0,
            "hours_this_week": 0.0,
            "hours_last_week": 0.0,
            "total_sessions": 0,
            "sessions_this_week": 0,
            "created_date": now.date().isoformat(),
            "updated_date": now.date().isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "key_deliverables": project_data.get("key_deliverables", []),
            "success_criteria": project_data.get("success_criteria", []),
            "risks_and_blockers": project_data.get("risk_factors", []),
            "tags": [conversation_state.current_persona] if conversation_state.current_persona else [],
            "metadata": {
                "created_via": "adaptive_coaching",
                "conversation_id": conversation_id,
                "domain": conversation_state.current_persona,
                "confidence_score": conversation_state.confidence_score
            }
        }
        
        # Save project to database
        db = get_database()
        success = db.create_project(final_project_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to create project")
        
        # Mark conversation as completed
        manager.complete_conversation(conversation_id, project_id)
        
        logger.info(f"Completed conversation {conversation_id} and created project {project_id}")
        
        return {
            "project_id": project_id,
            "project_name": final_project_data["name"],
            "conversation_completed": True,
            "message": f"🎉 Successfully created your project '{final_project_data['name']}'! Your strategic planning session has been completed."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing conversation {conversation_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/analytics")
async def get_conversation_analytics():
    """
    Get analytics data about adaptive coaching conversations.
    
    Returns:
        Analytics data including completion rates, stage distribution, etc.
    """
    try:
        from echo.conversation_state_manager import create_conversation_manager
        
        manager = create_conversation_manager()
        analytics = manager.get_conversation_analytics()
        
        return analytics
        
    except Exception as e:
        logger.error(f"Error getting conversation analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conversations/test-stream")
async def test_streaming():
    """
    Test endpoint for Server-Sent Events streaming functionality.
    Useful for debugging and frontend development.
    """
    async def generate_test_stream():
        """Generate test events for streaming validation."""
        
        # Send connection established
        yield f"data: {json.dumps({
            'type': 'connection_established',
            'message': 'Stream connection successful',
            'timestamp': datetime.now().isoformat()
        })}\n\n"
        
        # Send a series of test events
        test_events = [
            {'type': 'thinking', 'message': 'Processing your request...'},
            {'type': 'partial_response', 'message': 'This is a test', 'is_complete': False},
            {'type': 'partial_response', 'message': 'This is a test streaming', 'is_complete': False},
            {'type': 'partial_response', 'message': 'This is a test streaming response.', 'is_complete': True},
            {'type': 'response_complete', 'message': 'Stream test completed successfully'}
        ]
        
        for i, event in enumerate(test_events):
            await asyncio.sleep(0.5)  # Simulate processing time
            
            event_data = {
                **event,
                'sequence': i + 1,
                'timestamp': datetime.now().isoformat()
            }
            
            yield f"data: {json.dumps(event_data)}\n\n"
        
        logger.info("Completed test streaming response")
    
    return StreamingResponse(
        generate_test_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )