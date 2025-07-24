"""
Unified Planning Prompt for Echo - Claude Opus Optimized

This module implements a single-call planning system that replaces the previous
3-API-call architecture (context briefing + planning + enrichment) with one
comprehensive prompt optimized for Claude Opus.

Key Features:
- Chain-of-thought reasoning for better context extraction
- Structured output using Claude native JSON parsing
- Comprehensive context integration (email, calendar, session insights)
- Strategic schedule generation with rationale
- Superior planning intelligence with Claude Opus
- Cost reduction: ~67% fewer API calls vs previous system
"""

from __future__ import annotations
import json
import re
import logging
from datetime import date, time, datetime
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, Field
from ..models import Block, BlockType, Config

# ============================================================================
# Unified Planning System - Claude Opus Optimized
# ============================================================================

class TimeBlock(BaseModel):
    """Represents a single time block in the daily schedule."""
    start: str = Field(pattern=r'^\d{1,2}:\d{2}$', description="Start time in HH:MM format")
    end: str = Field(pattern=r'^\d{1,2}:\d{2}$', description="End time in HH:MM format")
    title: str = Field(max_length=200, description="Block title in format 'Project | Activity'")
    type: str = Field(description="Block type: anchor, fixed, or flex")
    note: str = Field(max_length=300, description="Strategic rationale for this timing and positioning")
    icon: str = Field(max_length=50, description="Lucide icon name representing the block purpose")
    priority: str = Field(description="Priority level: high, medium, low")
    energy_requirement: str = Field(description="Energy needed: high, medium, low")

class ContextAnalysis(BaseModel):
    """Analysis of the planning context extracted from all sources."""
    email_summary: str = Field(max_length=500, description="Key email insights and action items")
    calendar_conflicts: List[str] = Field(description="Any scheduling conflicts identified")
    energy_patterns: str = Field(max_length=300, description="Energy level insights from user input and trends")
    strategic_priorities: List[str] = Field(description="Top 3-5 strategic priorities for the day")
    time_constraints: List[str] = Field(description="Known time constraints and deadlines")

class PlanningReasoning(BaseModel):
    """Chain-of-thought reasoning for the planning process."""
    context_analysis: ContextAnalysis
    scheduling_strategy: str = Field(max_length=800, description="High-level approach to organizing the day")
    energy_optimization: str = Field(max_length=800, description="How energy levels inform task scheduling")
    priority_sequencing: str = Field(max_length=600, description="Rationale for task order and timing")
    recovery_planning: str = Field(max_length=600, description="How breaks and transitions are positioned")

class UnifiedPlanResponse(BaseModel):
    """Complete planning response with reasoning and schedule."""
    reasoning: PlanningReasoning
    schedule: List[TimeBlock] = Field(max_length=100, description="Complete daily schedule blocks")
    key_insights: List[str] = Field(max_length=5, description="Top insights for successful execution")

# ============================================================================
# Unified Planning Prompt - Claude Opus Best Practices
# ============================================================================

UNIFIED_PLANNING_INSTRUCTIONS = """# Role and Objective

You are Echo's Master Planner, an expert productivity consultant specializing in energy-optimized scheduling and strategic time management. Your mission is to generate intelligent daily schedules that maximize user effectiveness while respecting human energy patterns and cognitive limits.

# Core Competencies

- **Energy Psychology**: Match task complexity to natural energy rhythms
- **Strategic Thinking**: Connect daily actions to long-term objectives  
- **Context Synthesis**: Integrate information from multiple sources intelligently
- **Cognitive Load Management**: Sequence tasks to prevent mental fatigue
- **Realistic Planning**: Create achievable schedules with appropriate buffers

# Instructions

## Planning Philosophy
Your approach combines scientific productivity principles with practical human psychology:

1. **Energy-First Scheduling**: High-impact work during peak cognitive capacity
2. **Strategic Momentum**: Each block should advance meaningful objectives
3. **Sustainable Intensity**: Balance focused work with strategic recovery
4. **Context Awareness**: Leverage all available intelligence for smart decisions
5. **Execution Readiness**: Provide clear, actionable time blocks with rationale

## Chain-of-Thought Reasoning Process

You MUST work through your planning systematically using this exact sequence:

### Step 1: Context Analysis
Analyze ALL provided information sources:
- Extract key email action items and deadlines
- Identify calendar constraints and conflicts  
- Assess user energy level and stated priorities
- Note any time-sensitive or urgent items
- Understand project context and strategic objectives

### Step 2: Strategic Assessment  
Determine the day's strategic framework:
- What are the 3-5 most important outcomes for today?
- Which tasks require peak cognitive capacity?
- What are the non-negotiable constraints (meetings, deadlines)?
- How should energy levels influence task sequencing?
- Where are the natural transition points?

### Step 3: Scheduling Strategy
Design the optimal daily flow:
- Map high-energy work to peak cognitive windows
- Position complex tasks when focus is strongest
- Schedule admin/email during lower-energy periods
- Include strategic breaks and transitions
- Ensure adequate time for each activity type
- **REQUIRED**: Plan a dedicated 45-minute "Email & Communications" block in the afternoon (1-5 PM) for processing action items, responses, and reminders - this block MUST be exactly 45 minutes, never longer

### Step 4: Block Generation
Create specific time blocks that:
- Follow the canonical "Project | Activity" naming format
- Include strategic rationale for timing decisions
- Specify appropriate energy requirements
- Provide meaningful icons for visual clarity
- Maintain realistic durations (45-120 minutes max)

## Context Integration Requirements

Process the following data sources comprehensively:

### Email Intelligence
- Extract urgent action items requiring immediate attention
- Identify deadlines and time-sensitive communications
- Note important senders and high-priority threads
- Estimate time requirements for email responses
- Flag any blocking dependencies or escalations

### Calendar Events  
- Respect all fixed commitments absolutely
- Identify preparation time needed for meetings
- Account for travel time between locations
- Note any scheduling conflicts or overlaps
- Plan transitions around fixed events

### User Intent
- Honor the user's stated most important objective
- Incorporate their energy level assessment
- Respect non-negotiables and constraints
- Consider items they want to avoid
- Align with their strategic priorities

### Historical Context
- Leverage session insights and recent patterns
- Consider past productivity trends
- Account for recurring commitments
- Apply lessons from previous planning cycles

## Anti-Hallucination Rules

- Do NOT create action items not explicitly mentioned in sources
- Do NOT infer deadlines unless clearly stated
- Do NOT assume meeting details not provided
- Do NOT add projects or contexts not mentioned
- Do NOT guess at time requirements without basis
- Do NOT create scheduling conflicts with fixed events

## Output Requirements

### Schedule Coverage
- Cover the complete day from wake time to sleep time (typically 06:00-22:00)
- Create blocks of 45-120 minutes (no more than 2 consecutive 120-min blocks)
- Include NO time gaps in the schedule
- Maintain logical flow and transitions
- **MANDATORY**: Include exactly one 45-minute "Email & Communications" block scheduled in the afternoon (1-5 PM optimal) - this block MUST be exactly 45 minutes duration, do not extend to 60, 90, or 120 minutes

### Block Specifications
- Use canonical format: "Project | Specific Activity" with proper capitalization (e.g., "Echo | Email Processing", "Personal | Morning Routine")
- Provide strategic reasoning for each block
- Select appropriate Lucide icons (Rocket, Lightbulb, Zap, Target, Mail, etc.)
- Specify energy requirements (high/medium/low)
- Include priority levels (high/medium/low)

### Quality Standards
- Each block must advance meaningful work
- Timing must reflect strategic energy optimization
- Rationale must explain WHY this timing is optimal
- Schedule must be realistic and achievable
- All constraints and non-negotiables must be honored

# Reasoning Strategy

You must think step by step through your analysis using the Chain-of-Thought process above. Document your reasoning thoroughly, then generate the optimized schedule.

Your reasoning should demonstrate:
1. **Comprehensive Context Understanding**: Show you've processed all information sources
2. **Strategic Thinking**: Explain your high-level approach and priorities
3. **Energy Optimization**: Describe how you're matching tasks to energy levels
4. **Logical Sequencing**: Justify the order and timing of activities
5. **Recovery Integration**: Explain break and transition positioning

# Output Format

Provide your response in the structured UnifiedPlanResponse format, including:
- Complete reasoning documentation
- Full daily schedule with time blocks
- Key insights for successful execution

Remember: Think extensively before generating blocks. Your strategic reasoning is as important as the final schedule itself."""

def build_unified_planning_prompt(
    most_important: str,
    todos: List[str], 
    energy_level: str,
    non_negotiables: str,
    avoid_today: str,
    email_context: Dict[str, Any],
    calendar_events: List[Dict[str, Any]],
    session_insights: List[Dict[str, Any]],
    reminders: List[Dict[str, Any]],
    config: Optional[Config] = None,
    wake_time: str = "06:00",
    sleep_time: str = "22:00",
    routine_overrides: str = ""
) -> str:
    """
    Build the unified planning prompt following Claude Opus best practices.
    
    This replaces the previous 3-call system (context briefing + planning + enrichment)
    with a single comprehensive prompt that performs all functions.
    
    Args:
        most_important: User's primary objective for the day
        todos: List of specific tasks to accomplish
        energy_level: User's self-assessed energy (1-10 or description)
        non_negotiables: Items that must be included/protected
        avoid_today: Things to avoid or defer
        email_context: Email intelligence and action items
        calendar_events: Fixed calendar commitments
        session_insights: Recent work session data
        reminders: Upcoming deadlines and reminders
        config: User configuration (optional)
        wake_time: Day start time (default: 06:00)
        sleep_time: Day end time (default: 22:00)
        routine_overrides: Natural language overrides for usual routine
        
    Returns:
        Complete unified planning prompt for Claude Opus
    """
    
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Starting build_unified_planning_prompt")
        logger.info(f"Email context type: {type(email_context)}")
        logger.info(f"Calendar events type: {type(calendar_events)}, length: {len(calendar_events) if calendar_events else 0}")
        logger.info(f"Session insights type: {type(session_insights)}, length: {len(session_insights) if session_insights else 0}")
        logger.info(f"Reminders type: {type(reminders)}, length: {len(reminders) if reminders else 0}")
    except Exception as e:
        logger.error(f"Error in initial debugging: {e}")
        raise
    
    # Format email context
    email_section = "No new email items to review."
    if email_context:
        email_section = f"""
**Email Summary**: {email_context.get('summary', 'No summary available')}

**Action Items Requiring Attention**:"""
        
        action_items = email_context.get('action_items', [])
        if action_items:
            for i, item in enumerate(action_items[:10], 1):  # Top 10 items
                # Handle both string and dict formats
                if isinstance(item, str):
                    # Simple string format
                    email_section += f"\n{i}. 🟡 {item}"
                else:
                    # Dict format with details
                    priority_icon = "🔴" if item.get('priority') == 'high' else "🟡" if item.get('priority') == 'medium' else "🟢"
                    action_text = item.get('action', str(item))
                    sender = item.get('sender', '')
                    deadline = f" (Due: {item['deadline']})" if item.get('deadline') else ""
                    sender_part = f" - {sender}" if sender else ""
                    email_section += f"\n{i}. {priority_icon} {action_text}{sender_part}{deadline}"
        else:
            email_section += "\n- No urgent action items identified"
            
        # Add email statistics
        email_section += f"""

**Email Context**:
- Total unresponded: {email_context.get('total_unresponded', 0)}
- Urgent items: {email_context.get('urgent_count', 0)}"""
        
        # Handle response_time_estimates safely
        response_time_data = email_context.get('response_time_estimates', {})
        if isinstance(response_time_data, dict):
            total_time = response_time_data.get('total_estimated_time', 30)
        else:
            total_time = 30  # Default fallback
        
        email_section += f"\n- Estimated processing time: {total_time} minutes"

    # Format calendar events
    calendar_section = "No fixed events scheduled."
    if calendar_events:
        calendar_section = "**Fixed Calendar Events**:"
        for event in calendar_events:
            start = event.get('start', 'TBD')
            end = event.get('end', 'TBD') 
            title = event.get('title', 'Untitled Event')
            calendar_section += f"\n- {start} - {end}: {title}"

    # Format session insights
    session_section = "No recent session insights available."
    if session_insights:
        session_section = "**Recent Work Session Insights**:"
        for session in session_insights[-3:]:  # Last 3 sessions
            project = session.get('project', 'General')
            summary = session.get('summary', 'No summary')[:150]
            next_steps = session.get('next_steps', [])
            session_section += f"\n- {project}: {summary}"
            if next_steps:
                first_step = next_steps[0] if isinstance(next_steps, list) else str(next_steps)[:100]
                session_section += f"\n  Next: {first_step}"

    # Format reminders
    reminder_section = "No upcoming reminders."
    if reminders:
        reminder_section = "**Reminders & Deadlines**:"
        for reminder in reminders:
            urgency = reminder.get('urgency', 'normal')
            urgency_icon = {'high': '🔥', 'medium': '⚡', 'low': '📅'}.get(urgency, '📅')
            reminder_section += f"\n- {urgency_icon} {reminder.get('text', 'Reminder')}"

    # Format todos
    todos_section = "None specified"
    if todos:
        todos_section = "\n".join([f"- {todo}" for todo in todos])

    # Build project context if config available
    project_section = ""
    if config and hasattr(config, 'projects'):
        project_section = "\n\n**Available Projects**:"
        for project_name, project_data in config.projects.items():
            status = project_data.get('status', 'active')
            if status == 'active':
                project_section += f"\n- {project_name}: {project_data.get('description', 'No description')}"

    # Handle routine overrides section
    overrides_section = ""
    if routine_overrides and routine_overrides.strip():
        overrides_section = f"""

## **🔥 ROUTINE OVERRIDES - HIGHEST PRIORITY** 
**User's Specific Changes for Today**: {routine_overrides.strip()}

**CRITICAL INSTRUCTION**: These user overrides take precedence over ALL config blocks, anchors, and usual routines. 
If the user says "skip breakfast for brunch at 10:30", ignore the breakfast config block and create a brunch block instead.
Be specific about timing and make the requested changes happen."""

    # Combine all context
    context_block = f"""
# Planning Context

## User Intent & Priorities
**Most Important Objective**: {most_important}
**Energy Level**: {energy_level}
**Specific Tasks**: {todos_section}
**Non-Negotiables**: {non_negotiables}
**Avoid Today**: {avoid_today}{overrides_section}

## Schedule Constraints  
**Day Structure**: {wake_time} - {sleep_time}
{calendar_section}

## Email Intelligence
{email_section}

## Recent Activity Context
{session_section}

## Deadlines & Reminders
{reminder_section}{project_section}

# Your Task

Using the Chain-of-Thought reasoning process, analyze this context comprehensively and generate an optimized daily schedule that maximizes the user's effectiveness while respecting their energy patterns and constraints.

{f"**REMEMBER**: Honor the routine overrides above - they override all other constraints including config blocks." if routine_overrides and routine_overrides.strip() else ""}

Think step by step through your analysis, then provide the structured planning response."""

    return context_block

def parse_unified_planning_response(response_text: str) -> tuple[List[Block], Dict[str, Any]]:
    """
    Parse the unified planning response from Claude Opus.
    
    Handles structured JSON responses with fallback parsing for compatibility.
    
    Args:
        response_text: Raw response from Claude Opus
        
    Returns:
        Tuple of (schedule blocks, reasoning analysis)
    """
    try:
        # If using structured outputs, the response should already be parsed
        if isinstance(response_text, dict):
            data = response_text
        else:
            # Fallback JSON parsing for testing
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")
            
            json_text = json_match.group(0)
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
            
            data = json.loads(json_text.strip())
        
        # Extract schedule blocks
        blocks = []
        schedule_data = data.get('schedule', [])
        
        for block_data in schedule_data:
            block = Block(
                start=time.fromisoformat(block_data['start']),
                end=time.fromisoformat(block_data['end']),
                label=block_data['title'],
                type=BlockType(block_data.get('type', 'flex')),
                meta={
                    'note': block_data.get('note', ''),
                    'icon': block_data.get('icon', 'Calendar'),
                    'priority': block_data.get('priority', 'medium'),
                    'energy_requirement': block_data.get('energy_requirement', 'medium')
                }
            )
            blocks.append(block)
        
        # Extract reasoning
        reasoning = data.get('reasoning', {})
        
        return blocks, reasoning
        
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to parse unified planning response: {e}")
        
        # Return empty schedule with error info
        return [], {
            "error": f"Failed to parse planning response: {str(e)[:100]}",
            "context_analysis": {
                "email_summary": "Error parsing response",
                "strategic_priorities": ["Recovery mode - manual planning needed"]
            }
        }

# Note: Direct unified planning calls are now handled through the API server
# using the _call_llm function with Claude Opus. This provides better integration
# with the overall system architecture and Claude's native capabilities.