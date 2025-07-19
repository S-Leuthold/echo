# ==============================================================================
# FILE: echo/plan_utils.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Provides a collection of shared, reusable utility functions for creating,
#   manipulating, and validating lists of schedule Blocks. This module helps
#   keep other parts of the application DRY (Don't Repeat Yourself).
#
# DEPENDS ON:
#   - echo.models (Block)
#
# DEPENDED ON BY:
#   - echo.config_validator (Uses overlap detection)
#   - echo.scheduler (Uses time parsing)
#   - echo.prompt_engine (Will use merge_plan)
# ==============================================================================

from __future__ import annotations
from datetime import time, datetime, timedelta
from typing import List, Tuple

from .models import Block, BlockType
import re

# --------------------------------------------------------------------------- #
# Custom Exception for Clear Error Reporting
# --------------------------------------------------------------------------- #

class PlanValidationError(ValueError):
    """Raised when a logical error occurs during plan manipulation (e.g., overlap)."""
    pass

# --------------------------------------------------------------------------- #
# Core Utility Functions
# --------------------------------------------------------------------------- #

def parse_time_span(time_range: str) -> Tuple[time, time]:
    """
    Parses a 'HH:MM – HH:MM' string into a tuple of (start_time, end_time).
    """
    # --- Step 1: Try to parse the string ---
    try:
        start_str, end_str = [s.strip() for s in time_range.split("–")]
        start_t = time.fromisoformat(start_str)
        end_t = time.fromisoformat(end_str)
    except (ValueError, IndexError) as e:
        # This block now only catches errors from splitting or isoformat.
        raise PlanValidationError(
            f"Malformed time range '{time_range}'. Must be 'HH:MM – HH:MM' with an en-dash."
        ) from e

    # --- Step 2: Validate the logic AFTER successful parsing ---
    if start_t >= end_t:
        raise PlanValidationError(f"Invalid time span: start '{start_str}' is not before end '{end_str}'.")

    return start_t, end_t


def _minutes_since_midnight(t: time) -> int:
    """Converts a `datetime.time` object to total minutes since midnight."""
    return t.hour * 60 + t.minute


def assert_no_overlap(blocks: List[Block], context_day: str) -> None:
    """
    Checks a list of Block objects for any time overlaps. Raises on failure.
    """
    if not blocks:
        return

    # Create a list of spans: (start_minutes, end_minutes, label)
    spans = [
        (_minutes_since_midnight(b.start), _minutes_since_midnight(b.end), b.label)
        for b in blocks
    ]

    spans.sort(key=lambda s: s[0])  # Sort by start time

    for i in range(1, len(spans)):
        prev_end_minutes = spans[i-1][1]
        curr_start_minutes = spans[i][0]
        if curr_start_minutes < prev_end_minutes:
            prev_label = spans[i-1][2]
            curr_label = spans[i][2]
            raise PlanValidationError(
                f"Schedule overlap on {context_day}: '{curr_label}' conflicts with '{prev_label}'."
            )

# --------------------------------------------------------------------------- #
# High-Level Plan Manipulation
# --------------------------------------------------------------------------- #

def merge_plan(base_schedule: List[Block], new_blocks: List[Block]) -> List[Block]:
    """
    Combines a base schedule with new blocks, sorts them, and validates
    that the resulting plan has no overlaps.
    """
    if not new_blocks:
        return sorted(base_schedule, key=lambda b: b.start)

    combined = base_schedule + new_blocks
    
    # We can use our own utility to check the final merged plan.
    # We pass a generic context since this merge happens after day-specific validation.
    assert_no_overlap(combined, "final plan")

    return sorted(combined, key=lambda b: b.start)


def fill_gaps_with_unplanned(plan: List[Block], wake_time: str, sleep_time: str) -> List[Block]:
    """
    Ensures the plan covers every minute from wake_time to sleep_time.
    If any gaps exist, fills them with an 'Unplanned' flex block.
    """
    if not plan:
        return plan

    # Convert wake/sleep to time objects
    wake = datetime.strptime(wake_time, "%H:%M").time()
    sleep = datetime.strptime(sleep_time, "%H:%M").time()

    # Sort plan by start time
    plan = sorted(plan, key=lambda b: b.start)
    filled_plan = []
    prev_end = wake

    for block in plan:
        if block.start > prev_end:
            # There is a gap
            filled_plan.append(Block(
                start=prev_end,
                end=block.start,
                label="Unplanned",
                type=BlockType.FLEX,
                meta={"note": "No meaningful work suggested for this gap."}
            ))
        filled_plan.append(block)
        prev_end = block.end

    # Check for gap at the end
    if prev_end < sleep:
        filled_plan.append(Block(
            start=prev_end,
            end=sleep,
            label="Unplanned",
            type=BlockType.FLEX,
            meta={"note": "No meaningful work suggested for this gap."}
        ))
    return filled_plan


def enforce_block_constraints(blocks, wake_time, sleep_time):
    """
    Enforce canonical naming, block length (min 45, max 120), and full-day coverage.
    Returns a repaired list of blocks.
    """
    # Convert wake/sleep to time objects if needed
    if isinstance(wake_time, str):
        wake_time = datetime.strptime(wake_time, "%H:%M").time()
    if isinstance(sleep_time, str):
        sleep_time = datetime.strptime(sleep_time, "%H:%M").time()

    # Sort blocks by start time
    blocks = sorted(blocks, key=lambda b: b.start)
    repaired = []
    current = wake_time
    min_len = timedelta(minutes=45)
    max_len = timedelta(minutes=120)

    for block in blocks:
        # Fix canonical naming
        if '|' not in block.label:
            if block.type == BlockType.ANCHOR:
                block.label = f"Personal | {block.label.strip()}"
            else:
                block.label = f"Echo | {block.label.strip()}"
        else:
            # Canonicalize spacing
            parts = [p.strip() for p in block.label.split('|', 1)]
            block.label = f"{parts[0]} | {parts[1]}"

        # Snap start to current if there's a gap
        if block.start > current:
            gap = datetime.combine(datetime.today(), block.start) - datetime.combine(datetime.today(), current)
            while gap >= min_len:
                end = (datetime.combine(datetime.today(), current) + min(max_len, gap)).time()
                repaired.append(Block(start=current, end=end, label="Echo | Unplanned", type=BlockType.FLEX))
                current = end
                gap = datetime.combine(datetime.today(), block.start) - datetime.combine(datetime.today(), current)
        # Truncate block if too long
        block_len = datetime.combine(datetime.today(), block.end) - datetime.combine(datetime.today(), block.start)
        while block_len > max_len:
            mid = (datetime.combine(datetime.today(), block.start) + max_len).time()
            repaired.append(Block(start=block.start, end=mid, label=block.label, type=block.type))
            block.start = mid
            block_len = datetime.combine(datetime.today(), block.end) - datetime.combine(datetime.today(), block.start)
        # Skip blocks that are too short
        if block_len < min_len:
            continue
        # Snap start to current
        block = Block(start=current, end=block.end, label=block.label, type=block.type)
        repaired.append(block)
        current = block.end

    # Fill any remaining time
    while current < sleep_time:
        end = (datetime.combine(datetime.today(), current) + max_len).time()
        if end > sleep_time:
            end = sleep_time
        block_len = datetime.combine(datetime.today(), end) - datetime.combine(datetime.today(), current)
        if block_len >= min_len:
            repaired.append(Block(start=current, end=end, label="Echo | Unplanned", type=BlockType.FLEX))
        current = end

    return repaired
