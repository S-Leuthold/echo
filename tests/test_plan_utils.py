# ==============================================================================
# FILE: tests/test_plan_utils.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the shared utility functions in `echo.plan_utils`. Each function
#   is tested in isolation to ensure its correctness.
#
# ==============================================================================

import pytest
from datetime import time

from echo.models import Block, BlockType
from echo.plan_utils import (
    parse_time_span,
    assert_no_overlap,
    merge_plan,
    PlanValidationError,
)

# --- `parse_time_span` Tests ------------------------------------------------

def test_parse_time_span_success():
    """Tests that a valid time span string is parsed correctly."""
    start, end = parse_time_span("09:00 – 10:30")
    assert start == time(9, 0)
    assert end == time(10, 30)

def test_parse_time_span_malformed_raises_error():
    """Tests that a malformed string raises PlanValidationError."""
    with pytest.raises(PlanValidationError, match="Malformed time range"):
        parse_time_span("09:00-10:00") # Uses hyphen instead of en-dash

def test_parse_time_span_inverted_raises_error():
    """Tests that a span where start > end raises PlanValidationError."""
    with pytest.raises(PlanValidationError, match="is not before end"):
        parse_time_span("11:00 – 10:00")

# --- `assert_no_overlap` Tests ----------------------------------------------

@pytest.fixture
def non_overlapping_blocks():
    """A fixture for a list of blocks that do not overlap."""
    return [
        Block(start=time(9, 0), end=time(10, 0), label="A", type=BlockType.FLEX),
        Block(start=time(10, 0), end=time(11, 0), label="B", type=BlockType.FLEX),
    ]

@pytest.fixture
def overlapping_blocks():
    """A fixture for a list of blocks that do overlap."""
    return [
        Block(start=time(9, 0), end=time(10, 0), label="A", type=BlockType.FLEX),
        Block(start=time(9, 30), end=time(10, 30), label="B", type=BlockType.FLEX),
    ]

def test_assert_no_overlap_success(non_overlapping_blocks):
    """Tests that no error is raised for a valid, non-overlapping plan."""
    try:
        assert_no_overlap(non_overlapping_blocks, "test_day")
    except PlanValidationError:
        pytest.fail("assert_no_overlap should not raise an error for a valid plan.")

def test_assert_no_overlap_failure_raises_error(overlapping_blocks):
    """Tests that PlanValidationError is raised for an overlapping plan."""
    with pytest.raises(PlanValidationError, match="Schedule overlap"):
        assert_no_overlap(overlapping_blocks, "test_day")

# --- `merge_plan` Tests -----------------------------------------------------

def test_merge_plan_success(non_overlapping_blocks):
    """Tests that merging two valid lists of blocks works correctly."""
    base_schedule = [Block(start=time(8, 0), end=time(9, 0), label="Base", type=BlockType.FIXED)]
    new_blocks = non_overlapping_blocks # Starts at 9:00, so no overlap
    
    merged = merge_plan(base_schedule, new_blocks)
    
    assert len(merged) == 3
    assert merged[0].label == "Base"
    assert merged[1].label == "A"
    assert merged[2].label == "B"

def test_merge_plan_with_overlap_raises_error(overlapping_blocks):
    """Tests that merging lists that result in an overlap raises an error."""
    base_schedule = [Block(start=time(8, 0), end=time(9, 30), label="Base", type=BlockType.FIXED)]
    # The first block in overlapping_blocks starts at 9:00, creating a conflict.
    with pytest.raises(PlanValidationError, match="Schedule overlap"):
        merge_plan(base_schedule, overlapping_blocks)
