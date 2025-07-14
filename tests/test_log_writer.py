# ==============================================================================
# FILE: tests/test_log_writer.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the `echo.log_writer` module.
# ==============================================================================

import pytest
from pathlib import Path
from datetime import time

from echo.models import Block, BlockType, Config
from echo.log_writer import write_initial_log, append_work_log_entry

@pytest.fixture
def sample_plan():
    """Provides a simple plan with different block types."""
    return [
        Block(start=time(9, 0), end=time(10, 0), label="💡 Deep Work", type=BlockType.FLEX, meta={"note": "Focus on chapter 1."}),
    ]

@pytest.fixture
def cfg(tmp_path):
    """A mock config object sufficient for the logger tests."""
    # We only need the timezone for now, so we can mock the rest.
    class MockDefaults:
        timezone = "America/Chicago"
    class MockConfig:
        defaults = MockDefaults()
    return MockConfig()


def test_write_initial_log(sample_plan, cfg, tmp_path):
    """
    Tests that the initial log file is created with the correct Markdown table.
    """
    log_file = write_initial_log(sample_plan, cfg, tmp_path)
    assert log_file.exists()
    content = log_file.read_text()
    assert "# Echo Log:" in content
    assert "| **💡 Deep Work**<br>*Focus on chapter 1.* |" in content

def test_append_work_log_entry(tmp_path):
    """
    Tests that a work log entry is correctly appended to an existing file
    with the proper structure and delimiter.
    """
    # Create a dummy initial file to append to
    log_file = tmp_path / "test-log.md"
    log_file.write_text("Initial content.")

    append_work_log_entry(
        task_name="💡 Deep Work",
        notes="- Wrote the first draft.\n- It needs more work.",
        log_file=log_file
    )
    
    content = log_file.read_text()
    assert "---" in content
    assert "### Work Log:" in content
    assert "**Task:** 💡 Deep Work" in content
    assert "- It needs more work." in content