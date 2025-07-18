# ==============================================================================
# FILE: echo/session.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Manages the state of an active work session using a '.session.json' file.
#   This acts as a short-term memory to track the current block and goals,
#   preventing overlapping sessions and providing context for the spin-down.
#
# ==============================================================================

from __future__ import annotations
import json
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

STATE_FILE = Path(".session.json")

@dataclass
class SessionState:
    """A dataclass to hold the state of the currently active work session."""
    current_block_label: str
    session_start_time_iso: str
    session_goal: str
    tasks: List[str]

    def save(self):
        """Saves the current state to the .session.json file."""
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(asdict(self), f, indent=2)

    @classmethod
    def start_new(cls, current_block_label: str, session_goal: str, tasks: List[str]) -> 'SessionState':
        """Creates a new session state object and saves it."""
        state = cls(
            current_block_label=current_block_label,
            session_start_time_iso=datetime.now().isoformat(),
            session_goal=session_goal,
            tasks=tasks
        )
        state.save()
        return state


def load_session() -> Optional[SessionState]:
    """Loads the active session from the state file, if it exists."""
    if not STATE_FILE.exists():
        return None
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            # Handle empty file case
            content = f.read()
            if not content:
                clear_session()
                return None
            data = json.loads(content)
            return SessionState(**data)
    except (json.JSONDecodeError, TypeError):
        # If the file is corrupted or malformed, treat it as non-existent
        clear_session()
        return None

def clear_session():
    """Removes the state file, effectively ending the session."""
    if STATE_FILE.exists():
        STATE_FILE.unlink()