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

from __future__ import annotations
import json
import re
from datetime import date, time
from typing import List, Dict, Any

from .models import Block, BlockType, Config
from .plan_utils import parse_time_span

# ==============================================================================
# --- PERSONA 1: The Planner (Logistics Only) ---
# ==============================================================================

PLANNER_PROMPT_TEMPLATE = """\
You are a JSON-only API that fills empty time in a schedule.

## Rules
1.  **Return ONLY a valid JSON array of objects.** Your entire response must be a single JSON array, with no other text or markdown fences.
2.  Every object in the array **MUST** have a "start", "end", and "title" key.
3.  The "type" for any new block you create must be "flex" or "buffer".
4.  You will be given a "Known Schedule". Your only job is to return a JSON array of **new** blocks to fill the time gaps.
5.  **DO NOT** include any of the "Known Schedule" events in your response.

## Example of a valid output object:
{{
  "start": "09:00",
  "end": "10:30",
  "title": "Deep Work: Finalize refactor",
  "type": "flex"
}}

## Today's Context
- **Day:** {day_str}
- **User's Goal:** {guided_planning_notes}

## Known Schedule (Do NOT include these in your output)
{existing_blocks}

## Your Task
Generate a JSON array of new "flex" and "buffer" blocks to fill the gaps in the "Known Schedule". Adhere to all rules.
"""

def build_planner_prompt(
    cfg: Config,
    partial_plan: List[Block],
    planning_notes: Dict[str, str],
    target_date: date,
) -> str:
    """Composes the prompt for the 'Planner' LLM persona."""
    return PLANNER_PROMPT_TEMPLATE.format(
        day_str=target_date.strftime("%A, %B %d"),
        guided_planning_notes=_format_planning_notes(planning_notes),
        existing_blocks=_format_existing_blocks(partial_plan),
    )

def parse_planner_response(json_text: str) -> List[Block]:
    """Parses the Planner's JSON response into a list of new Block objects."""
    try:
        match = re.search(r"\[.*\]", json_text, re.DOTALL)
        if not match:
            match = re.search(r"\{.*\}", json_text, re.DOTALL)

        if not match:
            raise ValueError("No JSON array or object found in the response.")

        clean_json_text = match.group(0)
        data = json.loads(clean_json_text)

        if isinstance(data, dict):
            data = [data]

        blocks = []
        for item in data:
            start_t = time.fromisoformat(item["start"])
            end_t = time.fromisoformat(item["end"])
            blocks.append(
                Block(
                    start=start_t,
                    end=end_t,
                    label=item.get("title", "Untitled Task"),
                    type=BlockType(item.get("type", "flex")),
                )
            )
        return blocks
    except (json.JSONDecodeError, KeyError, TypeError, ValueError, AttributeError) as e:
        raise ValueError(f"Failed to parse Planner LLM response: {e}") from e

# ==============================================================================
# --- PERSONA 2: The Enricher (The Wise Cofounder) ---
# ==============================================================================

ENRICHER_PROMPT_TEMPLATE = """\
You are "The Wise Cofounder," an AI partner that adds intention and personality to a schedule.
Your persona is a mix of a Zen Buddhist, a supportive friend, an ambitious cofounder, and a pragmatic chef like Carmy Berzatto or Anthony Bourdain (direct, respects the work, no bullshit).

## Your Task
You will be given a schedule as a JSON array.
Your ONLY job is to add a creative, insightful, and motivating "note" and a relevant "emoji" to EACH object in the array.
**You MUST return a JSON array containing the exact same number of objects you received.**
Do not alter any other fields.

## Example of a valid output object:
{{
  "start": "09:00",
  "end": "10:30",
  "label": "Deep Work: Finalize refactor",
  "type": "flex",
  "meta": {{}},
  "emoji": "💡",
  "note": "This is the session that moves the needle. Lock in and push the code."
}}

## Schedule to Enrich:
{plan_to_enrich_json}
"""

def build_enricher_prompt(plan: List[Block]) -> str:
    """Composes the prompt for the 'Enricher' LLM persona."""
    plan_as_dicts = [block.to_dict() for block in plan]
    for d in plan_as_dicts:
        d["meta"].pop("note", None)
    return ENRICHER_PROMPT_TEMPLATE.format(
        plan_to_enrich_json=json.dumps(plan_as_dicts, indent=2)
    )

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

        if isinstance(enriched_data, dict):
            enriched_data = [enriched_data]

        if len(enriched_data) != len(original_plan):
            print(f"⚠️ Warning: Enricher returned {len(enriched_data)} blocks, but original plan had {len(original_plan)}. Matching by start time.")

        # Create a dictionary for easy lookup
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
    """Formats the user's Q&A notes for the prompt."""
    if not notes:
        return "No specific notes provided for today."
    return "\n".join(f"- {q}: {a}" for q, a in notes.items())

def _format_existing_blocks(blocks: List[Block]) -> str:
    """Formats the deterministic schedule blocks for the prompt."""
    if not blocks:
        return "The day is a blank slate."
    return "\n".join(
        f"- {b.start.strftime('%H:%M')}–{b.end.strftime('%H:%M')}: {b.label}"
        for b in blocks
    )


# ==============================================================================
# --- PERSONA 4: The Session Crafter ---
# ==============================================================================

SESSION_CRAFTER_PROMPT_TEMPLATE = """\
You are "The Wise Cofounder," an AI partner that helps a user sharpen their focus for a work session.
Your persona is a mix of Zen Buddhist (intention), supportive friend (encouragement), ambitious cofounder (focus), and a pragmatic chef (directness, respect for the work).

## Your Task
You will receive the user's raw goal, tasks, and a potential obstacle for an upcoming work block. You will also receive historical context from their weekly sync document and past work logs for this project.

Your ONLY job is to synthesize all of this information into a single, structured JSON object that represents the official plan for this session.
- Refine the user's goal into a clear, motivating statement of intent.
- Add 2-3 specific, actionable tasks to the user's list that will help them succeed.
- Acknowledge their obstacle and suggest a refined obstacle or a way to mitigate it.
- **Preserve the user's original tasks.** Do not rewrite or remove them.

## Historical Context
{context}

## User's Raw Input for this Session
- **Goal:** {goal}
- **Tasks:**
{tasks}
- **Obstacle:** {obstacle}

## Your Required Output Format (JSON only)
Return a single JSON object with the following keys: "project", "session_goal", "tasks", and "potential_obstacles".

## Example of a perfect output:
{{
  "project": "Echo Development",
  "session_goal": "The goal for this session is to get a rock-solid, fully-tested first version of the SessionManager committed. Let's get it done.",
  "tasks": [
    "User's original task 1",
    "User's original task 2",
    "Flesh out the `end-block` logic in the CLI.",
    "Add a test case for a corrupted .session.json file."
  ],
  "potential_obstacles": [
    "User's stated obstacle: Feeling a bit tired.",
    "Echo's suggestion: Since you're tired, the key is to break the problem down. Focus on one test at a time to build momentum."
  ]
}}

Now, generate the JSON object.
"""

def build_session_crafter_prompt(goal: str, tasks: List[str], obstacle: str, context: str) -> str:
    """Builds the prompt for the Session Crafter persona."""
    task_str = "\n".join(f"  - {t}" for t in tasks)
    if not context:
        context = "No historical context was available for this project."
    return SESSION_CRAFTER_PROMPT_TEMPLATE.format(
        goal=goal,
        tasks=task_str,
        obstacle=obstacle,
        context=context,
    )

def parse_session_crafter_response(json_text: str) -> Dict[str, Any]:
    """Parses the Session Crafter's structured JSON response."""
    try:
        clean_json_text = re.search(r"\{.*\}", json_text, re.DOTALL).group(0)
        data = json.loads(clean_json_text)
        # Basic validation
        required_keys = {"project", "session_goal", "tasks", "potential_obstacles"}
        if not required_keys.issubset(data.keys()):
            raise ValueError("Parsed JSON is missing required keys.")
        return data
    except (json.JSONDecodeError, AttributeError, ValueError) as e:
        raise ValueError(f"Failed to parse Session Crafter response: {e}") from e