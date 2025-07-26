"""
Echo Prompt Engine - Modular LLM Prompt System

This module provides specialized prompts for different aspects of the Echo planning system:
- Planning: Daily schedule generation and refinement
- Session: Session management and activity logging  
- Context: Context briefing and email intelligence
- Models: Shared Pydantic models and utilities

Key Functions:
- build_planner_prompt: Generate daily schedules
- build_context_briefing_prompt: Extract planning context
- generate_context_briefing_structured: Full context briefing with OpenAI structured outputs
- parse_planner_response: Parse schedule JSON responses
"""

# Import key functions for backward compatibility
# Note: Only importing from modules that exist so far

from .context import (
    build_context_briefing_prompt,
    generate_context_briefing_structured,
    parse_context_briefing_response,
    build_email_summary_prompt,
    parse_email_summary_response,
    build_action_extraction_prompt,
    parse_action_extraction_response
)

from .models import (
    ContextBriefing,
    ScheduleItem,
    Task,
    Suggestion,
    Insight
)

# TODO: Add these imports once planning.py and session.py modules are created
# from .planning import (...)
# from .session import (...)

# Maintain backward compatibility for existing imports
__all__ = [
    # Context & Email (available now)
    "build_context_briefing_prompt",
    "generate_context_briefing_structured",
    "parse_context_briefing_response",
    "build_email_summary_prompt",
    "parse_email_summary_response", 
    "build_action_extraction_prompt",
    "parse_action_extraction_response",
    
    # Models (available now)
    "ContextBriefing",
    "ScheduleItem",
    "Task", 
    "Suggestion",
    "Insight"
    
    # TODO: Add these to __all__ once planning.py and session.py are created
    # "build_planner_prompt",
    # "build_strategic_planner_prompt_with_reasoning", 
    # etc.
]