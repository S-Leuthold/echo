# ==============================================================================
# FILE: tests/test_prompt_engine.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the `echo.prompt_engine` module, ensuring that both the Planner
#   and Enricher personas build correct prompts and parse responses reliably.
# ==============================================================================

import pytest
from pathlib import Path
from datetime import date, time
import json

from echo import (
    load_config,
    build_schedule,
    Block,
    BlockType,
    Config,
    build_planner_prompt,
    parse_planner_response,
    build_enricher_prompt,
    parse_enricher_response,
)

# --- Fixtures ---------------------------------------------------------------

@pytest.fixture
def cfg() -> Config:
    """Provides a fully loaded and validated Config object."""
    config_path = str(Path(__file__).parent / "fixtures" / "sample_config.yaml")
    return load_config(config_path)

@pytest.fixture
def partial_plan(cfg: Config) -> list[Block]:
    """Provides a sample partial plan for a standard Monday."""
    target_date = date(2025, 7, 14) # A Monday
    return build_schedule(cfg, target_date)

# --- Planner Persona Tests --------------------------------------------------

def test_build_planner_prompt_structure(cfg):
    """Tests the Planner prompt contains the right sections and an example."""
    prompt = build_planner_prompt(
        most_important="Test the planner",
        todos=["Task 1", "Task 2"],
        energy_level="High",
        non_negotiables="None",
        avoid_today="None",
        fixed_events=[],
        config=cfg
    )
    assert "## Rules" in prompt
    assert "## Example Output:" in prompt
    assert "## User's Most Important Work:" in prompt

def test_parse_planner_response_success():
    """Tests that a valid, minimal JSON from the Planner is parsed correctly."""
    json_text = """
    [
      {
        "start": "09:00",
        "end": "10:30",
        "title": "Deep Work",
        "type": "flex"
      }
    ]
    """
    blocks = parse_planner_response(json_text)
    assert len(blocks) == 1
    assert blocks[0].start == time(9, 0)
    assert blocks[0].end == time(10, 30)
    assert blocks[0].label == "Deep Work"

def test_parse_planner_response_fails_on_missing_key():
    """Tests that the strict planner parser fails if 'start' is missing."""
    json_text = '[{"end": "10:30", "title": "Bad Block"}]'
    with pytest.raises(ValueError, match="Failed to parse Planner LLM response"):
        parse_planner_response(json_text)

# --- Enricher Persona Tests -------------------------------------------------

@pytest.fixture
def full_plan():
    """Provides a sample full plan to be enriched."""
    return [
        Block(start=time(9, 0), end=time(10, 30), label="Deep Work", type=BlockType.FLEX),
        Block(start=time(12, 0), end=time(12, 30), label="Team Standup", type=BlockType.FIXED),
    ]

def test_build_enricher_prompt_structure(full_plan):
    """Tests that the Enricher prompt contains the plan to be enriched."""
    prompt = build_enricher_prompt(full_plan)
    assert "## Your Task" in prompt
    assert "## Schedule to Enrich:" in prompt
    assert '"label": "Deep Work"' in prompt # Check that the plan is in the prompt

def test_parse_enricher_response_success(full_plan):
    """Tests that the enricher's response correctly modifies the original plan."""
    enriched_json_text = json.dumps([
        {
            "start": "09:00", "end": "10:30", "label": "Deep Work", "type": "flex",
            "emoji": "💡", "note": "This is the note for deep work."
        },
        {
            "start": "12:00", "end": "12:30", "label": "Team Standup", "type": "fixed",
            "emoji": "🤝", "note": "This is the note for the standup."
        }
    ])

    # The parse function modifies the list in place
    enriched_plan = parse_enricher_response(enriched_json_text, full_plan)

    assert len(enriched_plan) == 2
    # Check the first block
    assert enriched_plan[0].label == "💡 Deep Work"
    assert enriched_plan[0].meta.get("note") == "This is the note for deep work."
    # Check the second block
    assert enriched_plan[1].label == "🤝 Team Standup"
    assert enriched_plan[1].meta.get("note") == "This is the note for the standup."
