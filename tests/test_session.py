# ==============================================================================
# FILE: tests/test_session.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the session state management functions in `echo.session`.
# ==============================================================================

import pytest
import json
from pathlib import Path
from echo.session import SessionState, load_session, clear_session, STATE_FILE

@pytest.fixture(autouse=True)
def ensure_state_file_is_clear():
    """A pytest fixture to automatically clean up the state file after every test."""
    # This runs before each test
    clear_session()
    # 'yield' passes control to the test function
    yield
    # This runs after each test, ensuring a clean slate
    clear_session()


def test_load_session_when_no_file_exists():
    """Tests that load_session returns None when the state file doesn't exist."""
    assert not STATE_FILE.exists()
    assert load_session() is None

def test_save_and_load_session():
    """Tests that a session can be saved and then loaded back correctly."""
    # 1. Create and save a new session
    session = SessionState.start_new(
        current_block_label="Project | Task",
        session_goal="Test the session manager.",
        tasks=["Write save test", "Write load test"]
    )

    # 2. Check that the file was created
    assert STATE_FILE.exists()

    # 3. Load the session from the file
    loaded = load_session()
    assert loaded is not None
    assert isinstance(loaded, SessionState)
    assert loaded.current_block_label == "Project | Task"
    assert loaded.session_goal == "Test the session manager."
    assert loaded.tasks == ["Write save test", "Write load test"]
    assert loaded.session_start_time_iso is not None

def test_clear_session():
    """Tests that clear_session correctly deletes the state file."""
    # 1. Create a session file
    SessionState.start_new("Test", "Test", [])
    assert STATE_FILE.exists()

    # 2. Clear the session
    clear_session()
    assert not STATE_FILE.exists()

def test_load_corrupted_session_file():
    """Tests that a corrupted or empty JSON file is handled gracefully."""
    STATE_FILE.write_text("this is not valid json")
    assert load_session() is None
    # The load function should also delete the corrupted file
    assert not STATE_FILE.exists()