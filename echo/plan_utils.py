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
from datetime import time
from typing import List, Tuple

from .models import Block

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
