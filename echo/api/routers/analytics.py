"""
Analytics Router

Endpoint for getting analytics data including time breakdowns and productivity scores.
"""

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException

from echo.analytics import get_recent_stats
from echo.api.models.response_models import AnalyticsResponse
from echo.api.utils import (
    get_cache_key, get_cached_data, set_cached_data,
    ANALYTICS_CACHE, ANALYTICS_CACHE_DURATION
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/analytics", response_model=AnalyticsResponse)
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