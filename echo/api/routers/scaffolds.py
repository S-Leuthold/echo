"""
Scaffold API Router

Handles post-planning enrichment functionality including scaffold generation
and retrieval for enhanced session spin-up intelligence.
"""

import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from echo.api.models.request_models import ScaffoldGenerationRequest, GetScaffoldRequest
from echo.api.models.response_models import ScaffoldGenerationResponse, GetScaffoldResponse
from echo.scaffold_generator import ScaffoldGenerator, generate_scaffolds_for_daily_plan, get_scaffold_for_block
from echo.database_schema import SessionDatabase
from echo.models import Block

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/scaffolds", tags=["scaffolds"])

# Database dependency
def get_database():
    """Get database connection for scaffold operations."""
    return SessionDatabase()


@router.post("/generate", response_model=ScaffoldGenerationResponse)
async def generate_scaffolds(
    request: ScaffoldGenerationRequest,
    db: SessionDatabase = Depends(get_database)
):
    """
    Generate scaffolds for all work blocks in a daily plan.
    This endpoint triggers the post-planning enrichment process.
    """
    try:
        logger.info(f"Starting scaffold generation for {len(request.daily_plan)} blocks")
        
        # Convert daily plan dict format to Block objects
        blocks = []
        for block_data in request.daily_plan:
            # Create Block object from dict data
            block = Block(
                id=block_data.get('id', ''), 
                start_time=block_data.get('start_time', ''),
                end_time=block_data.get('end_time', ''),
                label=block_data.get('label', ''),
                task_name=block_data.get('task_name', block_data.get('label', '')),
                category=block_data.get('category', 'work'),
                type=block_data.get('type', 'flex'),
                note=block_data.get('note', ''),
                emoji=block_data.get('emoji', '🚀')
            )
            blocks.append(block)
        
        # Use the scaffold generator service
        generator = ScaffoldGenerator(db)
        results = await generator.generate_scaffolds_for_plan(blocks, request.context_briefing)
        
        # Count successful generations
        successful_count = sum(1 for success in results.values() if success)
        total_count = len(results)
        
        logger.info(f"Scaffold generation completed: {successful_count}/{total_count} successful")
        
        return ScaffoldGenerationResponse(
            success=True,
            scaffolds_generated=successful_count,
            total_blocks=total_count,
            generation_results=results,
            message=f"Generated {successful_count} scaffolds for {total_count} work blocks"
        )
        
    except Exception as e:
        logger.error(f"Scaffold generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Scaffold generation failed: {str(e)}"
        )


@router.get("/block/{block_id}", response_model=GetScaffoldResponse)
async def get_scaffold(
    block_id: str,
    db: SessionDatabase = Depends(get_database)
):
    """
    Retrieve the scaffold for a specific schedule block.
    Used during session spin-up to provide enhanced context.
    """
    try:
        logger.info(f"Retrieving scaffold for block: {block_id}")
        
        # Get scaffold from database
        scaffold = get_scaffold_for_block(db, block_id)
        
        if not scaffold:
            logger.warning(f"No scaffold found for block: {block_id}")
            return GetScaffoldResponse(
                success=False,
                scaffold=None,
                message=f"No scaffold found for block {block_id}"
            )
        
        logger.info(f"Retrieved scaffold for block: {block_id}")
        return GetScaffoldResponse(
            success=True,
            scaffold=scaffold.__dict__,  # Convert to dict for JSON response
            message="Scaffold retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to retrieve scaffold for block {block_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve scaffold: {str(e)}"
        )


@router.delete("/block/{block_id}")
async def delete_scaffold(
    block_id: str,
    db: SessionDatabase = Depends(get_database)
):
    """
    Delete the scaffold for a specific block (for debugging/maintenance).
    """
    try:
        logger.info(f"Deleting scaffold for block: {block_id}")
        
        # Delete scaffold from database
        db.delete_scaffold(block_id)
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": f"Scaffold for block {block_id} deleted successfully"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to delete scaffold for block {block_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete scaffold: {str(e)}"
        )


@router.get("/status")
async def get_scaffold_status(db: SessionDatabase = Depends(get_database)):
    """
    Get overall scaffold generation status and statistics.
    """
    try:
        # Get scaffold counts from database
        scaffold_count = db.get_scaffold_count()
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "total_scaffolds": scaffold_count,
                "status": "operational",
                "message": "Scaffold system is operational"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to get scaffold status: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get scaffold status: {str(e)}"
        )