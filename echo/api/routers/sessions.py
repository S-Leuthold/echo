"""
Sessions Router

Endpoint for getting session information and recent session data.
"""

import logging
from typing import List

from fastapi import APIRouter, HTTPException

from echo.api.models.response_models import SessionResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions():
    """Get recent sessions."""
    try:
        # Session loading system not yet implemented
        return []
        
    except Exception as e:
        logger.error(f"Error getting sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))