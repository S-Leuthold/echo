# ==============================================================================
# FILE: echo/log_reader.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Gathers historical context from daily log files and the weekly sync
#   document. This context is used to power the "Session Crafter" persona.
# ==============================================================================

from __future__ import annotations
from pathlib import Path
import re

LOG_DIR = Path("logs")

def get_session_context(project_name: str) -> str:
    """
    Scans the log directory to find the most recent Sunday Sync document and
    relevant entries from the last 3 daily logs for a given project.

    Args:
        project_name: The name of the project to gather context for.

    Returns:
        A single string containing all the found context, or an empty string.
    """
    if not LOG_DIR.exists():
        return ""

    context_parts = []

    # 1. Find the most recent Sunday Sync file
    sync_files = sorted(LOG_DIR.glob("*-sunday-sync.md"), reverse=True)
    if sync_files:
        context_parts.append("## From the Weekly Sync:\n")
        context_parts.append(sync_files[0].read_text(encoding="utf-8"))

    # 2. Find the last 3 daily logs and extract relevant entries
    daily_logs = sorted(LOG_DIR.glob("*-log.md"), reverse=True)[:3]
    project_entries = []

    for log_file in daily_logs:
        content = log_file.read_text(encoding="utf-8")
        # Split the file into individual log entries
        entries = re.split(r"\n\n---\n", content)
        for entry in entries:
            # Check if the entry is for the correct project
            if f"**Project:** {project_name}" in entry:
                project_entries.append(f"### From {log_file.name}:\n{entry}")

    if project_entries:
        context_parts.append("\n\n## From Recent Work Logs:\n")
        # We only want the last few, even if we found more
        context_parts.extend(project_entries[:5])

    return "\n".join(context_parts)