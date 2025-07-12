from __future__ import annotations
from datetime import date, time as _time
from typing import List, Dict

from .models import Block, BlockType, Config

PROMPT_TEMPLATE = """\
You are the Echo Planning Assistant, a deterministic AI that helps a user scaffold their day.
Your primary goal is to create a complete, thoughtful, and realistic daily plan based on a guided Q&A session with the user.

## Your Principles
1.  **Full Day Scaffolding:** Plan the entire day from the first to the last block.
2.  **Incorporate Intention:** Each block needs a clear purpose and a one-sentence "note".
3.  **Use Emojis:** Assign a relevant emoji to each block.
4.  **Respect Anchors:** The user's fixed anchors are non-negotiable.
5.  **Be Realistic:** Automatically add 5-10 minute "Buffer" blocks between substantive tasks.
6.  **Structured Output:** ALWAYS return your response as a single, valid JSON array.

## Today's Context
- **Day:** {day_str}

## Guided Planning Session Notes
This is the user's direct input from their morning reflection. Use this as the primary source of truth for today's goals and mindset.
{guided_planning_notes}

## Known Schedule (Anchors & Fixed Events)
These blocks are already set. You must plan around them.
{existing_blocks}

## Active Projects (Context & Momentum)
This is what the user has been working on the last 3 days. Use this to inform Deep Work block labels and notes.
{project_context}

## Your Task
Based on all the context above, especially the Guided Planning Session, generate a complete schedule.
Fill in the gaps between the known blocks with appropriate tasks.
Return the complete schedule as a JSON array.

## Example of a Perfect Output Format
[
  {{
    "start": "07:00",
    "end":   "08:00",
    "emoji": "🚲",
    "title": "TrainerRoad Ride",
    "note":  "Light aerobic opener.",
    "type":  "anchor",
    "meta":  {{"project_id": null}}
  }},
  {{
    "start": "08:15",
    "end":   "09:45",
    "emoji": "📝",
    "title": "Deep Work — MIR paper",
    "note":  "Draft the methods section.",
    "type":  "flex",
    "meta":  {{"project_id": "MIR"}}
  }}
]

### Task
Fill every gap until 22:00 sleep.  Obey all principles.  Return ONLY the JSON.
"""


def build_prompt(
    cfg: Config,
    partial_plan: List[Block],
    planning_notes: Dict[str, str],
    day: date,
) -> str:
    """Compose the full prompt string sent to the LLM."""
    notes_str = "\n".join(f"- {q}: {a}" for q, a in planning_notes.items()) or "none"

    blocks_str = "\n".join(
        f"- {b.start.strftime('%H:%M')}–{b.end.strftime('%H:%M')} "
        f"{b.label} ({b.type.value})"
        for b in partial_plan
    ) or "none"

    proj_str = "\n".join(
        f"- {p.name} (status: {p.status or 'n/a'})"
        for p in cfg.projects.values()
    ) or "none"

    return PROMPT_TEMPLATE.format(
        day_str=day.strftime("%A, %B %d"),
        guided_planning_notes=notes_str,
        existing_blocks=blocks_str,
        project_context=proj_str,
    )


def parse_response(json_txt: str) -> List[Block]:
    """Convert LLM JSON reply → List[Block]."""
    import json, re
    # Strip ```json fences if present
    json_txt = re.sub(r"^```json|```$", "", json_txt.strip(), flags=re.I).strip()
    data = json.loads(json_txt)

    blocks: List[Block] = []
    for item in data:
        label = f"{item.get('emoji', '').strip()} {item.get('title', 'Untitled')}".strip()
        meta  = {**item.get("meta", {}), "note": item.get("note", "")}
        blocks.append(
            Block(
                start=_time.fromisoformat(item["start"]),
                end=_time.fromisoformat(item["end"]),
                label=label,
                type=BlockType(item.get("type", "flex")),
                meta=meta,
            )
        )
    return blocks
