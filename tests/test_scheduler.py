# ==============================================================================
# FILE: tests/test_scheduler.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the `echo.scheduler` module to ensure it correctly constructs a
#   deterministic list of Blocks from a Config object for a given date.
#
# ==============================================================================

import pytest
from pathlib import Path
from datetime import date, time

from echo import load_config, build_schedule, BlockType

# --- Pytest Fixtures --------------------------------------------------------

@pytest.fixture
def cfg():
    """Provides a fully loaded and validated Config object for use in tests."""
    config_path = Path(__file__).parent / "fixtures" / "sample_config.yaml"
    return load_config(config_path)

# --- Test Cases -------------------------------------------------------------

def test_build_schedule_for_monday(cfg):
    """
    Tests building a schedule for a standard day (Monday) with both an anchor
    and a fixed event.
    """
    # Monday, July 14, 2025
    target_date = date(2025, 7, 14)
    plan = build_schedule(cfg, target_date)

    # --- Assertions ---
    assert len(plan) == 2

    # Check the first block (anchor)
    assert plan[0].type == BlockType.ANCHOR
    assert plan[0].label == "Morning Reading"
    assert plan[0].start == time(6, 0)
    assert plan[0].end == time(6, 30)

    # Check the second block (fixed)
    assert plan[1].type == BlockType.FIXED
    assert plan[1].label == "Team Standup"
    assert plan[1].start == time(12, 0)
    assert plan[1].end == time(12, 30)
    assert plan[1].meta.get("source") == "gcal"

def test_build_schedule_for_tuesday(cfg):
    """
    Tests building a schedule for a day (Tuesday) that has an anchor but no
    fixed events.
    """
    # Tuesday, July 15, 2025
    target_date = date(2025, 7, 15)
    plan = build_schedule(cfg, target_date)

    # --- Assertions ---
    assert len(plan) == 1
    assert plan[0].type == BlockType.ANCHOR
    assert plan[0].label == "Morning Reading"

def test_build_schedule_for_empty_day(cfg):
    """
    Tests building a schedule for a day (Wednesday) that has no pre-defined
    anchors or fixed events in the config.
    """
    # Wednesday, July 16, 2025
    target_date = date(2025, 7, 16)
    plan = build_schedule(cfg, target_date)

    # --- Assertions ---
    assert isinstance(plan, list)
    assert len(plan) == 0
