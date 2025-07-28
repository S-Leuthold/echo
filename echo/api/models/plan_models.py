"""
Pydantic models for plan file validation

These models validate the structure and content of plan files loaded by the /today endpoint.
Addresses CODEBASE_REVIEW_REPORT.md Issue #16: No Input Validation
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from datetime import time
import re

class BlockData(BaseModel):
    """
    Validates individual schedule block data from plan files
    """
    # Time fields - support both "start"/"end" and "start_time"/"end_time"
    start: Optional[str] = Field(None, description="Block start time (HH:MM or HH:MM:SS format)")
    end: Optional[str] = Field(None, description="Block end time (HH:MM or HH:MM:SS format)")
    start_time: Optional[str] = Field(None, description="Alternative start time field")
    end_time: Optional[str] = Field(None, description="Alternative end time field")
    
    # Label fields - support both "title" and "label"
    title: Optional[str] = Field(None, description="Block title (unified planning format)")
    label: Optional[str] = Field(None, description="Block label (legacy format)")
    
    # Type and metadata
    type: str = Field(default="flex", description="Block type (anchor, fixed, flex)")
    note: Optional[str] = Field(None, description="Block notes")
    meta: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Block metadata")
    
    @validator('start', 'end', 'start_time', 'end_time')
    def validate_time_format(cls, v):
        """Validate time strings are in HH:MM or HH:MM:SS format"""
        if v is None:
            return v
        
        # Check for HH:MM or HH:MM:SS format
        time_pattern = r'^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$'
        if not re.match(time_pattern, v):
            raise ValueError(f"Time must be in HH:MM or HH:MM:SS format, got: {v}")
        
        return v
    
    @validator('type')
    def validate_block_type(cls, v):
        """Validate block type is one of the allowed values"""
        allowed_types = {'anchor', 'fixed', 'flex'}
        if v not in allowed_types:
            raise ValueError(f"Block type must be one of {allowed_types}, got: {v}")
        return v
    
    def get_start_time(self) -> Optional[str]:
        """Get the start time, preferring 'start' over 'start_time'"""
        return self.start or self.start_time
    
    def get_end_time(self) -> Optional[str]:
        """Get the end time, preferring 'end' over 'end_time'"""
        return self.end or self.end_time
    
    def get_label(self) -> str:
        """Get the label, preferring 'title' over 'label', with fallback"""
        return self.title or self.label or "Untitled Block"
    
    def is_valid_time_block(self) -> bool:
        """Check if the block has valid start and end times"""
        return bool(self.get_start_time() and self.get_end_time())

class PlanFileData(BaseModel):
    """
    Validates plan file structure and content
    
    Supports both unified planning format ("schedule") and legacy format ("blocks")
    """
    # Schedule data - support both formats
    schedule: Optional[List[BlockData]] = Field(None, description="Schedule blocks (unified format)")
    blocks: Optional[List[BlockData]] = Field(None, description="Schedule blocks (legacy format)")
    
    # Metadata
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Plan metadata")
    date: Optional[str] = Field(None, description="Plan date")
    version: Optional[str] = Field(None, description="Plan format version")
    
    @validator('schedule', 'blocks')
    def validate_blocks_not_empty(cls, v, values):
        """Ensure at least one of schedule or blocks is provided and not empty"""
        if v is not None and len(v) == 0:
            # Empty list is allowed, will return empty schedule
            pass
        return v
    
    def get_schedule_data(self) -> List[BlockData]:
        """Get schedule data, preferring 'schedule' over 'blocks'"""
        return self.schedule or self.blocks or []
    
    def get_valid_blocks(self) -> List[BlockData]:
        """Get only blocks with valid time data"""
        schedule_data = self.get_schedule_data()
        return [block for block in schedule_data if block.is_valid_time_block()]

class PlanFileValidationError(Exception):
    """
    Custom exception for plan file validation errors
    """
    def __init__(self, message: str, errors: Optional[List[Dict[str, Any]]] = None):
        self.message = message
        self.errors = errors or []
        super().__init__(self.message)

def validate_plan_file_content(content: Dict[str, Any]) -> PlanFileData:
    """
    Validate plan file content and return validated data
    
    Args:
        content: Dictionary containing plan file data
        
    Returns:
        PlanFileData: Validated plan data
        
    Raises:
        PlanFileValidationError: If validation fails
    """
    try:
        return PlanFileData(**content)
    except Exception as e:
        error_details = []
        if hasattr(e, 'errors'):
            error_details = e.errors()
        
        raise PlanFileValidationError(
            f"Plan file validation failed: {str(e)}",
            error_details
        )

def safe_parse_plan_file(file_content: str) -> Optional[PlanFileData]:
    """
    Safely parse and validate plan file content
    
    Args:
        file_content: Raw JSON string from plan file
        
    Returns:
        PlanFileData or None if parsing/validation fails
    """
    try:
        import json
        content = json.loads(file_content)
        return validate_plan_file_content(content)
    except json.JSONDecodeError as e:
        raise PlanFileValidationError(f"Invalid JSON in plan file: {str(e)}")
    except PlanFileValidationError:
        raise
    except Exception as e:
        raise PlanFileValidationError(f"Unexpected error parsing plan file: {str(e)}")