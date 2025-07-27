"""
Reflection Router

Endpoint for saving evening reflections to the journal system.
"""

import logging

from fastapi import APIRouter, HTTPException

from echo.api.models.request_models import ReflectionRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/reflection")
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