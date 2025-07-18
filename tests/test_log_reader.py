# ==============================================================================
# FILE: tests/test_log_reader.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the context gathering functions in `echo.log_reader`.
# ==============================================================================

import pytest
from pathlib import Path
from echo.log_reader import get_session_context

@pytest.fixture
def mock_log_dir(tmp_path, monkeypatch):
    """Creates a mock log directory with sample files for testing."""
    log_dir = tmp_path / "logs"
    log_dir.mkdir()

    # Create a sample Sunday Sync file
    (log_dir / "2025-07-13-sunday-sync.md").write_text("Weekly Goal: Finish the refactor.")

    # Create a daily log with a relevant entry
    (log_dir / "2025-07-15-log.md").write_text(
        "Initial plan...\n\n---\n### Work Log: 10:00\n**Project:** Echo Development\n\n- Did some work."
    )
    # Create another daily log with an irrelevant entry
    (log_dir / "2025-07-16-log.md").write_text(
        "Initial plan...\n\n---\n### Work Log: 11:00\n**Project:** Other Project\n\n- Did other work."
    )
    # Create an older daily log
    (log_dir / "2025-07-14-log.md").write_text("Older log.")

    # Monkeypatch the LOG_DIR constant in the reader module to point to our temp dir
    import echo.log_reader
    monkeypatch.setattr(echo.log_reader, "LOG_DIR", log_dir)
    return log_dir


def test_get_session_context_gathers_all_data(mock_log_dir):
    """
    Tests that the function correctly reads and assembles context from
    both the Sunday Sync and relevant daily log entries.
    """
    context = get_session_context("Echo Development")

    assert "## From the Weekly Sync:" in context
    assert "Weekly Goal: Finish the refactor." in context
    assert "## From Recent Work Logs:" in context
    assert "From 2025-07-15-log.md:" in context
    assert "**Project:** Echo Development" in context
    # Ensure it did NOT include the irrelevant project
    assert "Other Project" not in context

def test_get_session_context_handles_missing_files(monkeypatch): # <--- FIX 3: This test DOES need monkeypatch
    """
    Tests that the function runs without error and returns an empty string
    when the log directory or files are missing.
    """
    # Make sure the log reader is pointed at a non-existent directory for this test
    import echo.log_reader
    monkeypatch.setattr(echo.log_reader, "LOG_DIR", Path("/non/existent/dir"))
    
    context = get_session_context("Any Project")
    assert context == ""
   