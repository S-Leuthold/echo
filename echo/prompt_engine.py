# ==============================================================================
# FILE: echo/prompt_engine.py
# AUTHOR: Dr. Sam Leuthold 
# PROJECT: Echo
#
# PURPOSE:
#   Handles prompts for two LLM personas:
#   1. The Planner: Fills schedule gaps with raw, structured blocks.
#   2. The Enricher: Adds personality (notes, emojis) to a complete plan.
#
# ==============================================================================

from   __future__ import annotations
import json
import re
from   datetime   import date, time, datetime
from   typing import List, Dict, Any, Optional
from  .models import Block, BlockType, Config
from  .plan_utils import parse_time_span
from  .session import SessionState

## ------------------------------------------------------------------------------
## LLM Prompt 1: Planner Prompt
## ------------------------------------------------------------------------------

PLANNER_PROMPT_TEMPLATE = """\
You are a JSON API that generates a complete daily schedule.

## Rules
1. Return ONLY a valid JSON array of objects.
2. Each object MUST have "start", "end", "title", and "type" keys.
3. "type" must be either "anchor" (for fixed events) or "flex" (for work blocks).
4. The schedule MUST cover every minute from {wake_time} to {sleep_time} with NO gaps.
5. No block may be longer than 120 minutes or shorter than 45 minutes.
6. All block titles MUST use the canonical format: "Project | Block Title" (e.g., "Echo | Prompt Development", "Personal | Morning Routine").
7. Include all fixed events exactly as provided below.
8. Fill the rest of the day with meaningful work blocks, breaking them up as needed to fit the time constraints.

## Fixed Events (do not change):
{fixed_blocks}

## Example Output:
[
  {{"start": "06:00", "end": "08:00", "title": "Personal | Morning Routine", "type": "anchor"}},
  {{"start": "08:00", "end": "10:00", "title": "Echo | Prompt Development", "type": "flex"}},
  ...
]

## Context
- Day: {day_str}
- User's Goal: {guided_planning_notes}
- Wake Time: {wake_time}
- Sleep Time: {sleep_time}

Your Task:
Generate a JSON array of blocks for the entire day, following the rules above.
"""

def build_planner_prompt(
    most_important: str,
    todos: List[str],
    energy_level: str,
    non_negotiables: str,
    avoid_today: str,
    fixed_events: List[Dict],
    config: Config
) -> str:
    """Build the planner prompt with project context."""
    
    # Load project context filtered by user input
    user_input = f"{most_important} {' '.join(todos)}"
    project_context, projects_found, unassigned_tasks = _get_filtered_project_context(config, user_input)
    
    # If no projects found, add a note about project creation
    if not projects_found and unassigned_tasks:
        project_context += f"\n\n## Project Creation Opportunity:\n"
        project_context += f"The following tasks don't have associated projects:\n"
        for task in unassigned_tasks:
            project_context += f"- {task}\n"
        project_context += f"\nConsider creating projects for these tasks to track progress and maintain context."
    
    # Build fixed events string
    fixed_events_str = ""
    if fixed_events:
        fixed_events_str = "\n## Fixed Events (do not change):\n"
        for event in fixed_events:
            fixed_events_str += f"- {event}\n"
    
    # Build todos string
    todos_str = ", ".join(todos) if todos else "None"
    
    prompt = f"""You are a JSON API that generates a complete daily schedule.

## Rules
1. Return ONLY a valid JSON array of objects.
2. Each object MUST have "start", "end", "title", and "type" keys.
3. "type" must be either "anchor" (for fixed events) or "flex" (for work blocks).
4. The schedule MUST cover every minute from 06:00 to 22:00 with NO gaps.
5. No block may be longer than 120 minutes or shorter than 45 minutes.
6. All block titles MUST use the canonical format: "Project | Block Title" (e.g., "Echo | Prompt Development", "Personal | Morning Routine").
7. Include all fixed events exactly as provided below.
8. Schedule the user's most important work as early as possible, unless energy is low.
9. Schedule all user-supplied to-dos, breaking them into blocks as needed.
10. Include at least one "Admin | Email & Admin" block, usually late in the day.
11. Never schedule more than two consecutive 120-minute work blocks.
12. If energy is low, schedule lighter or creative work in the morning.
13. Respect all non-negotiable commitments.
14. Do not leave any gaps in the schedule.
15. Use project context below to suggest relevant work that advances specific projects.

{project_context}

## User's Most Important Work:
{most_important}

## User's To-Dos:
{todos_str}

## User's Energy Level:
{energy_level}

## Non-Negotiables:
{non_negotiables}

## Avoid Today:
{avoid_today}

{fixed_events_str}

## Example Output:
[
  {{"start": "06:00", "end": "08:00", "title": "Personal | Morning Routine", "type": "anchor"}},
  {{"start": "08:00", "end": "10:00", "title": "Echo | Prompt Development", "type": "flex"}},
  ...
]

Your Task:
Generate a JSON array of blocks for the entire day, following the rules above. Use the project context to suggest work that advances specific projects and milestones.
"""
    
    return prompt

# In echo/prompt_engine.py

def parse_planner_response(json_text: str) -> List[Block]:
    """Parses the Planner's JSON response into a list of new Block objects."""
    print(f"\nDEBUG: Parsing planner response (length: {len(json_text)})")
    print(f"DEBUG: Raw response: {json_text[:500]}...")
    
    try:
        # First, try to find a JSON array.
        match = re.search(r"\[.*\]", json_text, re.DOTALL)
        if not match:
            # If no array, try to find a single JSON object.
            match = re.search(r"\{.*\}", json_text, re.DOTALL)

        if not match:
            print("DEBUG: No JSON array or object found in response")
            raise ValueError("No JSON array or object found in the response.")

        clean_json_text = match.group(0)
        print(f"DEBUG: Extracted JSON: {clean_json_text}")
        
        # Remove any markdown code block markers
        if clean_json_text.startswith("```json"):
            clean_json_text = clean_json_text[7:]
        if clean_json_text.endswith("```"):
            clean_json_text = clean_json_text[:-3]
        clean_json_text = clean_json_text.strip()
        
        data = json.loads(clean_json_text)
        print(f"DEBUG: Parsed JSON data type: {type(data)}")

        # If the LLM returned a single object, wrap it in a list.
        if isinstance(data, dict):
            data = [data]
            print("DEBUG: Wrapped single object in list")

        print(f"DEBUG: Processing {len(data)} blocks")
        blocks = []
        for i, item in enumerate(data):
            print(f"DEBUG: Processing item {i+1}: {item}")
            blocks.append(
                Block(
                    start=time.fromisoformat(item["start"]),
                    end=time.fromisoformat(item["end"]),
                    label=item.get("title", "Untitled Task"),
                    type=BlockType(item.get("type", "flex")),
                )
            )
        
        print(f"DEBUG: Successfully created {len(blocks)} blocks")
        return blocks
    except (json.JSONDecodeError, KeyError, TypeError, ValueError, AttributeError) as e:
        print(f"DEBUG: Error parsing planner response: {e}")
        raise ValueError(f"Failed to parse Planner LLM response: {e}") from e

# --- PERSONA 2: The Enricher ---
ENRICHER_PROMPT_TEMPLATE = """\
You are "The Wise Cofounder," an AI partner. Your tone is direct and respects the work. No bullshit.
## Your Task
You will be given a schedule as a JSON array. Add an insightful "note" and a relevant "emoji" to EACH object.
You MUST return a JSON array with the exact same number of objects you received. Do not alter any other fields.

## Note Guidelines
- Explain why this block is strategically important for the day's momentum
- Connect to broader goals or project advancement
- Provide specific motivation for why this time slot matters
- Be direct and actionable - no fluff

## Example of a valid output object:
{{
  "start": "09:00", "end": "10:30", "label": "Echo Development | Refactor", "type": "flex", "meta": {{}},
  "emoji": "💡", "note": "This is the session that moves the needle. Lock in."
}}
## Schedule to Enrich:
{plan_to_enrich_json}
"""
def build_enricher_prompt(plan: List[Block]) -> str:
    plan_as_dicts = [block.to_dict() for block in plan]
    return ENRICHER_PROMPT_TEMPLATE.format(plan_to_enrich_json=json.dumps(plan_as_dicts, indent=2))

# In echo/prompt_engine.py

def parse_enricher_response(json_text: str, original_plan: List[Block]) -> List[Block]:
    """
    Parses the Enricher's response and merges the new notes and emojis
    back into the original list of Block objects.
    """
    try:
        # First, try to find a JSON array.
        match = re.search(r"\[.*\]", json_text, re.DOTALL)
        if not match:
            # If no array, try to find a single JSON object.
            match = re.search(r"\{.*\}", json_text, re.DOTALL)

        if not match:
            raise ValueError("No JSON array or object found in the response.")

        clean_json_text = match.group(0)
        enriched_data = json.loads(clean_json_text)

        # If the LLM returned a single object, wrap it in a list.
        if isinstance(enriched_data, dict):
            enriched_data = [enriched_data]

        # Use a dictionary for robust matching by start time
        enriched_map = {item.get("start"): item for item in enriched_data}

        for block in original_plan:
            start_key = block.start.strftime("%H:%M")
            if start_key in enriched_map:
                enriched_block = enriched_map[start_key]
                block.meta["note"] = enriched_block.get("note", "")
                block.label = f"{enriched_block.get('emoji', '').strip()} {block.label}".strip()

        return original_plan
    except (json.JSONDecodeError, KeyError, TypeError, ValueError, AttributeError) as e:
        raise ValueError(f"Failed to parse Enricher LLM response: {e}") from e

# ==============================================================================
# --- Helper Functions ---
# ==============================================================================

def _format_planning_notes(notes: Dict[str, str]) -> str:
    if not notes: return "No specific notes provided."
    return "\n".join(f"- {q}: {a}" for q, a in notes.items())

def _format_existing_blocks(blocks: List[Block]) -> str:
    if not blocks: return "The day is a blank slate."
    return "\n".join(f"- {b.start.strftime('%H:%M')}–{b.end.strftime('%H:%M')}: {b.label}" for b in blocks)

def _get_historical_context() -> str:
    """Gathers historical context from recent logs and weekly sync."""
    from .log_reader import get_session_context
    
    # Get context for a general overview (not project-specific)
    context_parts = []
    
    # Get recent work logs (last 3 days)
    from pathlib import Path
    log_dir = Path("logs")
    if log_dir.exists():
        daily_logs = sorted(log_dir.glob("*-log.md"), reverse=True)[:3]
        if daily_logs:
            context_parts.append("## Recent Work (Last 3 Days):")
            for log_file in daily_logs:
                content = log_file.read_text(encoding="utf-8")
                # Extract work session entries (after --- delimiter)
                entries = content.split("---")
                if len(entries) > 1:
                    work_entries = entries[1:]  # Skip the initial plan
                    if work_entries:
                        context_parts.append(f"\n### {log_file.stem}:")
                        context_parts.append("".join(work_entries[:2]))  # Last 2 work entries
    
    # Get weekly sync if available
    sync_files = sorted(log_dir.glob("*-sunday-sync.md"), reverse=True)
    if sync_files:
        context_parts.append("\n## Weekly Overview:")
        context_parts.append(sync_files[0].read_text(encoding="utf-8"))
    
    return "\n".join(context_parts) if context_parts else "No recent historical context available."

def _get_project_context(cfg: Config) -> str:
    """Gathers context about active projects and their status, plus project logs."""
    context_parts = []
    
    # Add project definitions from config
    if cfg.projects:
        context_parts.append("## Active Projects:")
        for project_id, project in cfg.projects.items():
            if project.status == "active":
                context_parts.append(f"\n### {project.name}")
                if project.current_focus:
                    context_parts.append(f"**Current Focus:** {project.current_focus}")
                if project.deadline:
                    context_parts.append(f"**Deadline:** {project.deadline}")
                if project.milestones:
                    context_parts.append("**Milestones:**")
                    for milestone in project.milestones[:3]:  # Top 3 milestones
                        due_str = f" (due {milestone.due_date})" if milestone.due_date else ""
                        context_parts.append(f"- {milestone.description}{due_str}")
    else:
        context_parts.append("## Active Projects:")
        context_parts.append("No active projects defined.")
    
    # Load project logs from projects directory
    from pathlib import Path
    projects_dir = Path("projects")
    if projects_dir.exists():
        context_parts.append("\n## Project Logs:")
        for file_path in projects_dir.glob("*.md"):
            try:
                content = file_path.read_text(encoding='utf-8')
                # Take first 800 chars as context (more for project logs)
                preview = content[:800].replace('\n', ' ').strip()
                if preview:
                    project_name = file_path.stem.replace('_', ' ').title()
                    context_parts.append(f"\n### {project_name}")
                    context_parts.append(f"{preview}...")
            except Exception as e:
                print(f"Warning: Could not read {file_path}: {e}")
    
    return "\n".join(context_parts)

def _get_filtered_project_context(cfg: Config, user_input: str) -> tuple[str, bool, list[str]]:
    """Gathers context about projects mentioned in user input, plus relevant project logs.
    Returns: (context, projects_found, unassigned_tasks)"""
    context_parts = []
    
    # Extract mentioned projects from user input
    mentioned_projects = set()
    user_input_lower = user_input.lower()
    
    # Check for project names in user input
    if cfg.projects:
        for project_id, project in cfg.projects.items():
            if project.status == "active":
                # Check if project name is mentioned in user input
                project_name_lower = project.name.lower()
                if project_name_lower in user_input_lower:
                    mentioned_projects.add(project.name)
                # Also check for common variations and keywords
                project_variations = [
                    project_name_lower,
                    project_name_lower.replace(' ', ''),
                    project_name_lower.replace(' ', '_'),
                ]
                for variation in project_variations:
                    if variation in user_input_lower:
                        mentioned_projects.add(project.name)
                
                # Check for keywords that might indicate the project
                if project.current_focus:
                    focus_keywords = project.current_focus.lower().split()
                    for keyword in focus_keywords:
                        if len(keyword) > 3 and keyword in user_input_lower:
                            mentioned_projects.add(project.name)
                            break
    
    # Extract potential tasks that don't have associated projects
    unassigned_tasks = []
    task_keywords = ['write', 'finish', 'complete', 'develop', 'build', 'create', 'work on', 'do']
    words = user_input_lower.split()
    for i, word in enumerate(words):
        if any(keyword in word for keyword in task_keywords):
            # Look for task names (words after task keywords)
            if i + 1 < len(words):
                potential_task = ' '.join(words[i+1:i+3])  # Take next 2 words as task name
                if potential_task and len(potential_task) > 3:
                    unassigned_tasks.append(potential_task)
    
    # Add project definitions from config for mentioned projects
    if mentioned_projects:
        context_parts.append("## Relevant Projects:")
        for project_id, project in cfg.projects.items():
            if project.name in mentioned_projects:
                context_parts.append(f"\n### {project.name}")
                if project.current_focus:
                    context_parts.append(f"**Current Focus:** {project.current_focus}")
                if project.deadline:
                    context_parts.append(f"**Deadline:** {project.deadline}")
                if project.milestones:
                    context_parts.append("**Milestones:**")
                    for milestone in project.milestones[:3]:  # Top 3 milestones
                        due_str = f" (due {milestone.due_date})" if milestone.due_date else ""
                        context_parts.append(f"- {milestone.description}{due_str}")
    else:
        context_parts.append("## Relevant Projects:")
        context_parts.append("No specific projects mentioned in user input.")
    
    # Load project logs from projects directory for mentioned projects
    from pathlib import Path
    projects_dir = Path("projects")
    if projects_dir.exists():
        context_parts.append("\n## Relevant Project Logs:")
        for file_path in projects_dir.glob("*.md"):
            try:
                project_name = file_path.stem.replace('_', ' ').title()
                # Only include if project is mentioned
                if project_name in mentioned_projects:
                    content = file_path.read_text(encoding='utf-8')
                    # Take first 800 chars as context (more for project logs)
                    preview = content[:800].replace('\n', ' ').strip()
                    if preview:
                        context_parts.append(f"\n### {project_name}")
                        context_parts.append(f"{preview}...")
            except Exception as e:
                print(f"Warning: Could not read {file_path}: {e}")
    
    context = "\n".join(context_parts)
    projects_found = len(mentioned_projects) > 0
    
    return context, projects_found, unassigned_tasks

def _get_recent_progress_for_project(context: str) -> str:
    """Extracts recent accomplishments from the context for session planning."""
    if "No historical context" in context:
        return "No recent progress data available."
    
    # Look for accomplishment patterns in the context
    accomplishments = []
    lines = context.split('\n')
    
    for line in lines:
        if any(keyword in line.lower() for keyword in ['accomplished', 'completed', 'finished', 'wrote', 'built', 'fixed', 'implemented']):
            accomplishments.append(line.strip())
    
    if accomplishments:
        return "## Recent Accomplishments:\n" + "\n".join(accomplishments[:3])  # Top 3
    else:
        return "No specific recent accomplishments identified."

def _get_next_milestones_for_project(context: str) -> str:
    """Extracts upcoming milestones and deadlines from the context."""
    if "No historical context" in context:
        return "No milestone data available."
    
    milestones = []
    lines = context.split('\n')
    
    for line in lines:
        if any(keyword in line.lower() for keyword in ['deadline', 'due', 'milestone', 'target', 'goal']):
            milestones.append(line.strip())
    
    if milestones:
        return "## Next Milestones:\n" + "\n".join(milestones[:3])  # Top 3
    else:
        return "No specific upcoming milestones identified."

def _calculate_gaps_to_fill(existing_blocks: List[Block], wake_time: time, sleep_time: time) -> str:
    """Calculates the time periods that need to be filled and formats them as explicit block requirements."""
    gaps = []
    current_start = wake_time
    
    for block in existing_blocks:
        if block.start > current_start:
            gaps.append(f"{current_start.strftime('%H:%M')}–{block.start.strftime('%H:%M')}")
        current_start = block.end
    
    if current_start < sleep_time:
        gaps.append(f"{current_start.strftime('%H:%M')}–{sleep_time.strftime('%H:%M')}")
    
    if not gaps:
        return "No gaps to fill."
    
    # Format as explicit block requirements
    formatted_gaps = []
    for i, gap in enumerate(gaps, 1):
        formatted_gaps.append(f"{i}. Block {i}: {gap}")
    
    return "\n".join(formatted_gaps)

# ==============================================================================
# --- PERSONA 4: The Session Crafter ---
# ==============================================================================

SESSION_CRAFTER_PROMPT_TEMPLATE = """\
You are The Wise Cofounder, an AI partner who helps sharpen a user's focus for a work session. Your tone is direct, pragmatic, and respects the work. No bullshit.

## Your Task
Synthesize the user's raw input and historical context into a single, structured JSON object.
- Refine the user's goal into a clear, direct statement of intent.
- Add 2-3 specific, actionable tasks to the user's list that build on recent progress.
- Acknowledge their obstacle and suggest a concrete way to mitigate it.
- **Preserve the user's original tasks.**

## Historical Context
{context}

## Recent Progress & Momentum
{recent_progress}

## Next Milestones & Deadlines
{next_milestones}

## User's Raw Input
- **Goal:** {goal}
- **Tasks:**
{tasks}
- **Obstacle:** {obstacle}

## Your Required Output Format (JSON only)
Return a single JSON object with the keys: "project", "session_goal", "tasks", and "potential_obstacles".

## Example Output:
{{
  "project": "Echo Development",
  "session_goal": "Get a rock-solid, fully-tested first version of the SessionManager committed. That's the mission.",
  "tasks": [
    "User's original task 1",
    "Flesh out the `end-block` logic in the CLI.",
    "Add a test case for a corrupted .session.json file."
  ],
  "potential_obstacles": [
    "User's stated obstacle: Feeling a bit tired.",
    "Mitigation: Start with the smallest task first to build momentum."
  ]
}}
"""

def build_session_crafter_prompt(goal: str, tasks: List[str], obstacle: str, context: str) -> str:
    """Builds the prompt for the Session Crafter persona."""
    task_str = "\n".join(f"  - {t}" for t in tasks)
    if not context:
        context = "No historical context was available for this project."
    
    # Get recent progress and milestones
    recent_progress = _get_recent_progress_for_project(context)
    next_milestones = _get_next_milestones_for_project(context)
    
    return SESSION_CRAFTER_PROMPT_TEMPLATE.format(
        goal=goal,
        tasks=task_str,
        obstacle=obstacle,
        context=context,
        recent_progress=recent_progress,
        next_milestones=next_milestones,
    )

def parse_session_crafter_response(json_text: str) -> Dict[str, Any]:
    """Parses the Session Crafter's structured JSON response."""
    try:
        match = re.search(r"\{.*\}", json_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found in response")
        clean_json_text = match.group(0)
        data = json.loads(clean_json_text)
        # Basic validation
        required_keys = {"project", "session_goal", "tasks", "potential_obstacles"}
        if not required_keys.issubset(data.keys()):
            raise ValueError("Parsed JSON is missing required keys.")
        return data
    except (json.JSONDecodeError, AttributeError, ValueError) as e:
        raise ValueError(f"Failed to parse Session Crafter response: {e}") from e

# ==============================================================================
# --- PERSONA 5: The Log Crafter ---
# ==============================================================================

LOG_CRAFTER_PROMPT_TEMPLATE = """\
You are The Wise Cofounder, an AI partner who helps a user reflect on a completed work session. Your tone is direct and focused on the work. No bullshit.

## Your Task
Synthesize the session plan and the user's report into a concise, insightful Markdown block for their log.
- Start with the original goal.
- List what was accomplished.
- Write a strategic reflection that connects the outcome to the original plan or obstacle.
- Suggest next steps if momentum was gained or obstacles were overcome.

## Reflection Guidelines
- Connect accomplishments to the original goal and broader project momentum
- Note any patterns or insights that could inform future sessions
- If momentum was gained, suggest the logical next steps
- If obstacles emerged, note how they were handled and what that means

## This Session's Plan
- **Goal:** {goal}
- **Tasks:**
{tasks}

## User's Spin-Down Report
- **What was accomplished:** {accomplishments}
- **Surprises or new obstacles:** {surprises}

## Your Required Output Format (Markdown only)
Return a single block of Markdown with clear sections.

## Example Output:
**Session Goal:** Get a rock-solid, fully-tested first version of the SessionManager.
**Accomplishments:**
- Wrote the `save_session` and `load_session` functions.
- Fixed a bug in the corrupted file handling.
**Reflection:**
The corrupted file was a surprise obstacle, but pushing through it made the final code more robust. The session built good momentum - next logical step is to add the CLI integration tests.
"""

def build_log_crafter_prompt(session: SessionState, accomplishments: str, surprises: str, context: str) -> str:
    """Builds the prompt for the Log Crafter persona."""
    task_str = "\n".join(f"  - {t}" for t in session.tasks)
    if not context:
        context = "No historical context was available."
    return LOG_CRAFTER_PROMPT_TEMPLATE.format(
        goal=session.session_goal,
        tasks=task_str,
        accomplishments=accomplishments,
        surprises=surprises,
        context=context,
    )

def parse_log_crafter_response(response_text: str) -> str:
    """Parses the Log Crafter's response to get the final markdown log."""
    return response_text.strip()

def append_to_project_log(project_id: str, session_summary: str) -> None:
    """Append session summary to project log."""
    from pathlib import Path
    
    project_log_path = Path("projects") / f"{project_id}.md"
    if project_log_path.exists():
        with open(project_log_path, "a", encoding="utf-8") as f:
            f.write(f"\n\n## Session Summary - {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
            f.write(session_summary)


def build_journal_aware_planner_prompt(
    most_important: str,
    todos: List[str],
    energy_level: str,
    non_negotiables: str,
    avoid_today: str,
    fixed_events: List[Dict],
    config: Config,
    journal_context: Optional[Dict[str, str]] = None,
    recent_trends: Optional[Dict[str, str]] = None
) -> str:
    """
    Build the planner prompt with journal context for enhanced planning.
    
    Args:
        most_important: User's most important work
        todos: List of todos
        energy_level: User's energy level
        non_negotiables: Non-negotiable commitments
        avoid_today: Things to avoid
        fixed_events: Fixed events from config
        config: User configuration
        journal_context: Planning context from recent reflections
        recent_trends: Energy/mood trends from recent reflections
        
    Returns:
        Enhanced planner prompt with journal context
    """
    
    # Load project context filtered by user input
    user_input = f"{most_important} {' '.join(todos)}"
    project_context, projects_found, unassigned_tasks = _get_filtered_project_context(config, user_input)
    
    # Build fixed events string
    fixed_events_str = ""
    if fixed_events:
        fixed_events_str = "\n## Fixed Events (do not change):\n"
        for event in fixed_events:
            fixed_events_str += f"- {event}\n"
    
    # Build todos string
    todos_str = ", ".join(todos) if todos else "None"
    
    # Build journal context section
    journal_context_str = ""
    if journal_context:
        journal_context_str = "\n## Journal-Based Planning Context:\n"
        if "tomorrow_focus" in journal_context:
            journal_context_str += f"- **Tomorrow's Focus**: {journal_context['tomorrow_focus']}\n"
        if "tomorrow_energy" in journal_context:
            journal_context_str += f"- **Expected Energy**: {journal_context['tomorrow_energy']}\n"
        if "non_negotiables" in journal_context:
            journal_context_str += f"- **Non-Negotiables**: {journal_context['non_negotiables']}\n"
        if "avoid_tomorrow" in journal_context:
            journal_context_str += f"- **Avoid**: {journal_context['avoid_tomorrow']}\n"
        if "tomorrow_priorities" in journal_context:
            journal_context_str += f"- **Top Priorities**: {journal_context['tomorrow_priorities']}\n"
        if "patterns_noticed" in journal_context:
            journal_context_str += f"- **Patterns Noticed**: {journal_context['patterns_noticed']}\n"
        if "learnings" in journal_context:
            journal_context_str += f"- **Recent Learnings**: {journal_context['learnings']}\n"
    
    # Build trends section
    trends_str = ""
    if recent_trends:
        trends_str = "\n## Recent Patterns & Trends:\n"
        if "energy_trend" in recent_trends:
            trends_str += f"- **Energy Trend**: {recent_trends['energy_trend']}\n"
        if "mood_trend" in recent_trends:
            trends_str += f"- **Mood Trend**: {recent_trends['mood_trend']}\n"
        if "recent_energy" in recent_trends:
            trends_str += f"- **Recent Energy**: {recent_trends['recent_energy']}\n"
        if "recent_mood" in recent_trends:
            trends_str += f"- **Recent Mood**: {recent_trends['recent_mood']}\n"
    
    prompt = f"""You are a JSON API that generates a complete daily schedule with enhanced context from the user's recent reflections.

## Rules
1. Return ONLY a valid JSON array of objects.
2. Each object MUST have "start", "end", "title", and "type" keys.
3. "type" must be either "anchor" (for fixed events) or "flex" (for work blocks).
4. The schedule MUST cover every minute from 06:00 to 22:00 with NO gaps.
5. No block may be longer than 120 minutes or shorter than 45 minutes.
6. All block titles MUST use the canonical format: "Project | Block Title" (e.g., "Echo | Prompt Development", "Personal | Morning Routine").
7. Include all fixed events exactly as provided below.
8. Schedule the user's most important work as early as possible, unless energy is low.
9. Schedule all user-supplied to-dos, breaking them into blocks as needed.
10. Include at least one "Admin | Email & Admin" block, usually late in the day.
11. Never schedule more than two consecutive 120-minute work blocks.
12. If energy is low, schedule lighter or creative work in the morning.
13. Respect all non-negotiable commitments.
14. Do not leave any gaps in the schedule.
15. Use project context below to suggest relevant work that advances specific projects.
16. **NEW**: Incorporate journal-based planning context and recent patterns to create a more personalized schedule.

{project_context}

## User's Most Important Work:
{most_important}

## User's To-Dos:
{todos_str}

## User's Energy Level:
{energy_level}

## Non-Negotiables:
{non_negotiables}

## Avoid Today:
{avoid_today}

{journal_context_str}

{trends_str}

{fixed_events_str}

## Example Output:
[
  {{"start": "06:00", "end": "08:00", "title": "Personal | Morning Routine", "type": "anchor"}},
  {{"start": "08:00", "end": "10:00", "title": "Echo | Prompt Development", "type": "flex"}},
  ...
]

Your Task:
Generate a JSON array of blocks for the entire day, following the rules above. Use the project context to suggest work that advances specific projects and milestones. **Pay special attention to the journal-based planning context and recent patterns to create a schedule that aligns with the user's recent insights and preferences.**
"""
    
    return prompt


def build_tomorrow_planning_prompt(
    reflection_entry: Dict[str, str],
    config: Config,
    recent_trends: Optional[Dict[str, str]] = None
) -> str:
    """
    Build a planning prompt specifically for tomorrow based on evening reflection.
    
    Args:
        reflection_entry: Evening reflection entry with planning context
        config: User configuration
        recent_trends: Energy/mood trends from recent reflections
        
    Returns:
        Planning prompt for tomorrow
    """
    
    # Extract planning context from reflection
    tomorrow_focus = reflection_entry.get("tomorrow_focus", "")
    tomorrow_energy = reflection_entry.get("tomorrow_energy", "")
    non_negotiables = reflection_entry.get("non_negotiables", "")
    avoid_tomorrow = reflection_entry.get("avoid_tomorrow", "")
    tomorrow_priorities = reflection_entry.get("tomorrow_priorities", "")
    
    # Build trends section
    trends_str = ""
    if recent_trends:
        trends_str = "\n## Recent Patterns & Trends:\n"
        if "energy_trend" in recent_trends:
            trends_str += f"- **Energy Trend**: {recent_trends['energy_trend']}\n"
        if "mood_trend" in recent_trends:
            trends_str += f"- **Mood Trend**: {recent_trends['mood_trend']}\n"
    
    # Get project context
    user_input = f"{tomorrow_focus} {tomorrow_priorities}"
    project_context, projects_found, unassigned_tasks = _get_filtered_project_context(config, user_input)
    
    prompt = f"""You are a JSON API that generates tomorrow's schedule based on the user's evening reflection.

## Rules
1. Return ONLY a valid JSON array of objects.
2. Each object MUST have "start", "end", "title", and "type" keys.
3. "type" must be either "anchor" (for fixed events) or "flex" (for work blocks).
4. The schedule MUST cover every minute from 06:00 to 22:00 with NO gaps.
5. No block may be longer than 120 minutes or shorter than 45 minutes.
6. All block titles MUST use the canonical format: "Project | Block Title".
7. Schedule based on the user's evening reflection insights.
8. Respect energy predictions and avoid patterns.
9. Include all non-negotiables as fixed blocks.

{project_context}

## Tomorrow's Focus:
{tomorrow_focus}

## Tomorrow's Priorities:
{tomorrow_priorities}

## Expected Energy Level:
{tomorrow_energy}

## Non-Negotiables:
{non_negotiables}

## Things to Avoid:
{avoid_tomorrow}

{trends_str}

## Example Output:
[
  {{"start": "06:00", "end": "08:00", "title": "Personal | Morning Routine", "type": "anchor"}},
  {{"start": "08:00", "end": "10:00", "title": "Project | Priority Work", "type": "flex"}},
  ...
]

Your Task:
Generate a JSON array of blocks for tomorrow, incorporating the user's evening reflection insights and recent patterns. Create a schedule that aligns with their energy predictions, focuses on their stated priorities, and avoids their identified patterns.
"""
    
    return prompt


def parse_tomorrow_planning_response(json_text: str) -> List[Block]:
    """
    Parse the tomorrow planning response into a list of Block objects.
    
    Args:
        json_text: JSON response from LLM
        
    Returns:
        List of Block objects for tomorrow's schedule
    """
    return parse_planner_response(json_text)  # Reuse existing parser


def build_morning_adjustment_prompt(
    original_blocks: List[Block],
    morning_context: Dict[str, str],
    config: Config,
    recent_trends: Optional[Dict[str, str]] = None
) -> str:
    """
    Build a prompt for adjusting today's plan based on morning energy and mood.
    
    Args:
        original_blocks: The original plan blocks for today
        morning_context: Morning energy and mood assessment
        config: User configuration
        recent_trends: Energy/mood trends from recent reflections
        
    Returns:
        Morning adjustment planning prompt
    """
    
    # Format original blocks
    original_blocks_str = ""
    for i, block in enumerate(original_blocks, 1):
        original_blocks_str += f"{i:2d}. {block.start.strftime('%H:%M')}-{block.end.strftime('%H:%M')} | {block.label} | {block.type.value}\n"
    
    # Build trends section
    trends_str = ""
    if recent_trends:
        trends_str = "\n## Recent Patterns & Trends:\n"
        if "energy_trend" in recent_trends:
            trends_str += f"- **Energy Trend**: {recent_trends['energy_trend']}\n"
        if "mood_trend" in recent_trends:
            trends_str += f"- **Mood Trend**: {recent_trends['mood_trend']}\n"
    
    # Get project context
    user_input = "morning adjustment"
    project_context, projects_found, unassigned_tasks = _get_filtered_project_context(config, user_input)
    
    prompt = f"""You are a JSON API that adjusts today's schedule based on the user's morning energy and mood.

## Rules
1. Return ONLY a valid JSON array of objects.
2. Each object MUST have "start", "end", "title", and "type" keys.
3. "type" must be either "anchor" (for fixed events) or "flex" (for work blocks).
4. The schedule MUST cover every minute from 06:00 to 22:00 with NO gaps.
5. No block may be longer than 120 minutes or shorter than 45 minutes.
6. All block titles MUST use the canonical format: "Project | Block Title".
7. Adjust the original plan based on morning energy and mood.
8. If energy is low, move lighter work to the morning.
9. If readiness is low, consider reducing workload or adding breaks.
10. Respect all non-negotiable commitments.

{project_context}

## Original Plan for Today:
{original_blocks_str}

## Morning Assessment:
- **Energy Level**: {morning_context.get('morning_energy', 'unknown')}
- **Mood**: {morning_context.get('morning_mood', 'unknown')}
- **Readiness**: {morning_context.get('readiness', 'unknown')}/10

{trends_str}

## Adjustment Guidelines:
- If energy is LOW: Move lighter/creative work to morning, reduce workload
- If energy is HIGH: Keep challenging work in morning, maintain intensity
- If readiness is LOW (1-4): Add breaks, reduce workload, move tasks
- If readiness is HIGH (7-10): Keep original plan, maybe increase intensity
- If mood is poor: Add mood-lifting activities, reduce pressure
- If mood is good: Leverage positive energy for challenging tasks

## Example Output:
[
  {{"start": "06:00", "end": "08:00", "title": "Personal | Morning Routine", "type": "anchor"}},
  {{"start": "08:00", "end": "10:00", "title": "Project | Adjusted Work", "type": "flex"}},
  ...
]

Your Task:
Generate a JSON array of blocks for today, adjusting the original plan based on the morning energy and mood assessment. Maintain the same total work time but optimize for the user's current state.
"""
    
    return prompt


def parse_morning_adjustment_response(json_text: str) -> List[Block]:
    """
    Parse the morning adjustment response into a list of Block objects.
    
    Args:
        json_text: JSON response from LLM
        
    Returns:
        List of Block objects for the adjusted schedule
    """
    return parse_planner_response(json_text)  # Reuse existing parser


def build_journal_insights_prompt(
    journal_entries: List[Dict[str, Any]],
    days: int = 30
) -> str:
    """
    Build a prompt for generating insights from journal data.
    
    Args:
        journal_entries: List of journal entries with content and metadata
        days: Number of days to analyze
        
    Returns:
        Journal insights prompt
    """
    
    # Format journal entries for analysis
    entries_summary = ""
    for entry in journal_entries[:10]:  # Limit to last 10 entries for prompt size
        date_str = entry.get('date', 'unknown')
        entry_type = entry.get('entry_type', 'unknown')
        content = entry.get('content', {})
        
        entries_summary += f"\n📅 {date_str} - {entry_type}:\n"
        
        # Add key content fields
        if 'energy_level' in content:
            entries_summary += f"   Energy: {content['energy_level']}\n"
        if 'mood' in content:
            entries_summary += f"   Mood: {content['mood']}\n"
        if 'what_went_well' in content:
            entries_summary += f"   Went Well: {content['what_went_well'][:100]}...\n"
        if 'challenges' in content:
            entries_summary += f"   Challenges: {content['challenges'][:100]}...\n"
        if 'learnings' in content:
            entries_summary += f"   Learnings: {content['learnings'][:100]}...\n"
        if 'patterns_noticed' in content:
            entries_summary += f"   Patterns: {content['patterns_noticed'][:100]}...\n"
    
    prompt = f"""You are an AI productivity analyst. Analyze the user's journal entries to identify patterns, insights, and recommendations.

## Your Task
Analyze the journal data and provide:
1. **Pattern Recognition**: Identify recurring themes, energy patterns, and productivity trends
2. **Productivity Insights**: Discover what works well and what doesn't
3. **Recommendations**: Suggest improvements based on the patterns
4. **Actionable Advice**: Provide specific, actionable recommendations

## Journal Data (Last {days} days):
{entries_summary}

## Analysis Guidelines:
- Look for energy patterns (high/medium/low cycles)
- Identify mood trends and their impact on productivity
- Find recurring challenges and their solutions
- Discover what consistently goes well
- Notice patterns in planning effectiveness
- Identify optimal work conditions and timing

## Output Format:
Return a JSON object with the following structure:
{{
  "patterns": [
    {{
      "type": "energy|mood|productivity|planning",
      "description": "Description of the pattern",
      "frequency": "how often this occurs",
      "impact": "positive|negative|neutral"
    }}
  ],
  "insights": [
    {{
      "category": "energy_management|time_management|mood_optimization|planning_strategy",
      "insight": "Specific insight about productivity",
      "evidence": "What data supports this insight",
      "confidence": "high|medium|low"
    }}
  ],
  "recommendations": [
    {{
      "category": "energy_optimization|schedule_adjustment|mood_improvement|planning_enhancement",
      "recommendation": "Specific actionable recommendation",
      "rationale": "Why this recommendation makes sense",
      "priority": "high|medium|low"
    }}
  ],
  "summary": "Brief overall assessment of the user's productivity patterns"
}}

Your Task:
Analyze the journal data and provide comprehensive insights and recommendations.
"""
    
    return prompt


def build_productivity_analysis_prompt(
    recent_entries: List[Dict[str, Any]],
    energy_trends: Dict[str, str],
    mood_trends: Dict[str, str]
) -> str:
    """
    Build a prompt for detailed productivity analysis.
    
    Args:
        recent_entries: Recent journal entries
        energy_trends: Energy trend analysis
        mood_trends: Mood trend analysis
        
    Returns:
        Productivity analysis prompt
    """
    
    # Format recent entries
    entries_text = ""
    for entry in recent_entries[:5]:
        content = entry.get('content', {})
        entries_text += f"\n- Energy: {content.get('energy_level', 'unknown')}"
        entries_text += f", Mood: {content.get('mood', 'unknown')}"
        if 'what_went_well' in content:
            entries_text += f", Went Well: {content['what_went_well'][:50]}..."
        if 'challenges' in content:
            entries_text += f", Challenges: {content['challenges'][:50]}..."
    
    prompt = f"""You are a productivity expert analyzing a user's recent patterns.

## Recent Data:
{entries_text}

## Trend Analysis:
- Energy Trend: {energy_trends.get('energy_trend', 'unknown')}
- Mood Trend: {mood_trends.get('mood_trend', 'unknown')}
- Recent Energy: {energy_trends.get('recent_energy', 'unknown')}
- Recent Mood: {mood_trends.get('recent_mood', 'unknown')}

## Analysis Focus:
1. **Energy Management**: How well does the user manage their energy?
2. **Mood Impact**: How does mood affect productivity?
3. **Pattern Recognition**: What recurring patterns exist?
4. **Optimization Opportunities**: Where can productivity be improved?

## Output Format:
Return a JSON object with:
{{
  "energy_analysis": {{
    "pattern": "description of energy pattern",
    "optimal_times": "when energy is highest",
    "recommendations": ["specific energy optimization tips"]
  }},
  "mood_analysis": {{
    "pattern": "description of mood pattern",
    "productivity_impact": "how mood affects work",
    "recommendations": ["specific mood optimization tips"]
  }},
  "productivity_insights": [
    {{
      "insight": "specific productivity insight",
      "evidence": "supporting data",
      "action": "specific action to take"
    }}
  ],
  "optimization_plan": {{
    "short_term": ["immediate improvements"],
    "long_term": ["sustainable changes"],
    "priority": "highest priority action"
  }}
}}

Your Task:
Provide detailed productivity analysis and actionable recommendations.
"""
    
    return prompt


def parse_journal_insights_response(json_text: str) -> Dict[str, Any]:
    """
    Parse the journal insights response.
    
    Args:
        json_text: JSON response from LLM
        
    Returns:
        Parsed insights dictionary
    """
    try:
        # Clean and parse JSON
        match = re.search(r"\{.*\}", json_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found in response")
        
        clean_json_text = match.group(0)
        data = json.loads(clean_json_text)
        
        # Validate required keys
        required_keys = ["patterns", "insights", "recommendations", "summary"]
        if not all(key in data for key in required_keys):
            raise ValueError("Missing required keys in insights response")
        
        return data
    except (json.JSONDecodeError, AttributeError, ValueError) as e:
        raise ValueError(f"Failed to parse journal insights response: {e}") from e


def parse_productivity_analysis_response(json_text: str) -> Dict[str, Any]:
    """
    Parse the productivity analysis response.
    
    Args:
        json_text: JSON response from LLM
        
    Returns:
        Parsed productivity analysis dictionary
    """
    try:
        # Clean and parse JSON
        match = re.search(r"\{.*\}", json_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON object found in response")
        
        clean_json_text = match.group(0)
        data = json.loads(clean_json_text)
        
        # Validate required keys
        required_keys = ["energy_analysis", "mood_analysis", "productivity_insights", "optimization_plan"]
        if not all(key in data for key in required_keys):
            raise ValueError("Missing required keys in productivity analysis response")
        
        return data
    except (json.JSONDecodeError, AttributeError, ValueError) as e:
        raise ValueError(f"Failed to parse productivity analysis response: {e}") from e


def build_action_extraction_prompt(emails: List[Dict[str, Any]]) -> str:
    """
    Build a prompt for extracting action items from emails.
    
    Args:
        emails: List of email data dictionaries
        
    Returns:
        Action extraction prompt
    """
    
    # Format email data for analysis
    emails_text = ""
    for email in emails:
        emails_text += f"\n📧 **From**: {email.get('sender', 'Unknown')}"
        emails_text += f"\n📋 **Subject**: {email.get('subject', 'No subject')}"
        emails_text += f"\n📅 **Received**: {email.get('received', 'Unknown')}"
        emails_text += f"\n⚡ **Importance**: {email.get('importance', 'normal')}"
        emails_text += f"\n📝 **Content**: {email.get('body', '')[:200]}..."
        emails_text += "\n" + "="*50 + "\n"
    
    prompt = f"""You are an AI assistant that extracts action items from emails. Analyze the emails and identify specific tasks, requests, or actions that need to be taken.

## Your Task
Extract action items from the provided emails. Focus on:
1. **Explicit requests**: "Please send the report", "Can you review this?"
2. **Implicit tasks**: "The deadline is Friday", "We need to schedule a meeting"
3. **Follow-up items**: "Let me know when you're available", "Get back to me on this"
4. **Project-related tasks**: Status updates, milestone requests, deliverables

## Email Data:
{emails_text}

## Analysis Guidelines:
- Look for action-oriented language (please, can you, need to, should)
- Identify deadlines and due dates
- Recognize meeting requests and scheduling needs
- Note project-related tasks and updates
- Consider sender importance and email priority
- Extract specific, actionable items

## Output Format:
Return a JSON array of action items with the following structure:
[
  {{
    "description": "Specific action item description",
    "priority": "urgent|high|medium|low",
    "sender": "email address of sender",
    "email_subject": "original email subject",
    "email_date": "ISO date string",
    "project_context": "related project if applicable",
    "notes": "additional context or notes"
  }}
]

## Priority Guidelines:
- **urgent**: Immediate attention required, deadlines within 24 hours
- **high**: Important tasks, deadlines within a week
- **medium**: Standard tasks, no immediate deadline
- **low**: Nice-to-have items, no specific timeline

Your Task:
Extract all actionable items from the emails and provide them in the specified JSON format.
"""
    
    return prompt


def parse_action_extraction_response(json_text: str) -> List[Dict[str, Any]]:
    """
    Parse the action extraction response.
    
    Args:
        json_text: JSON response from LLM
        
    Returns:
        List of action item dictionaries
    """
    try:
        # Clean and parse JSON
        match = re.search(r"\[.*\]", json_text, re.DOTALL)
        if not match:
            raise ValueError("No JSON array found in response")
        
        clean_json_text = match.group(0)
        data = json.loads(clean_json_text)
        
        # Validate that it's a list
        if not isinstance(data, list):
            raise ValueError("Response is not a JSON array")
        
        # Validate each action item has required fields
        for action in data:
            if not isinstance(action, dict):
                raise ValueError("Action item is not a dictionary")
            
            required_fields = ["description", "priority"]
            if not all(field in action for field in required_fields):
                raise ValueError("Action item missing required fields")
            
            # Validate priority
            if action["priority"] not in ["urgent", "high", "medium", "low"]:
                action["priority"] = "medium"  # Default to medium if invalid
        
        return data
    except (json.JSONDecodeError, AttributeError, ValueError) as e:
        raise ValueError(f"Failed to parse action extraction response: {e}") from e