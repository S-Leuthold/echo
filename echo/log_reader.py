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
from typing import List

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

def parse_log_file(log_file: Path) -> List['Block']:
    """Parse a daily log file and extract the schedule blocks."""
    from .models import Block, BlockType
    from datetime import time
    
    blocks = []
    content = log_file.read_text(encoding='utf-8')
    
    # Parse the markdown table format
    # First, join lines that are part of the same table row
    content_lines = content.split('\n')
    table_rows = []
    current_row = ""
    
    for line in content_lines:
        if line.strip().startswith('|') and line.strip().endswith('|'):
            # Complete row
            if current_row:
                table_rows.append(current_row + line)
                current_row = ""
            else:
                table_rows.append(line)
        elif line.strip().startswith('|'):
            # Start of a row
            current_row = line
        elif current_row and line.strip():
            # Continuation of a row
            current_row += " " + line.strip()
    
    for line in table_rows:
        if '|' in line and 'Start' not in line and '---' not in line:
            # Split by | but handle the case where the label contains |
            raw_parts = line.split('|')
            parts = []
            i = 0
            while i < len(raw_parts):
                if i < 3:  # First 3 columns are simple
                    parts.append(raw_parts[i].strip())
                else:  # 4th column (Task & Notes) might contain |
                    # Join all remaining parts as the label
                    label_part = '|'.join(raw_parts[i:]).strip()
                    parts.append(label_part)
                    break
                i += 1
            if len(parts) >= 4:
                try:
                    start_str, end_str = parts[1], parts[2]
                    start_time = time.fromisoformat(start_str)
                    end_time = time.fromisoformat(end_str)
                    
                    # Extract label from the 4th column (Task & Notes)
                    label_part = parts[3]
                    
                    # Extract the text between ** and ** (the actual label)
                    label_match = re.search(r'\*\*(.*?)\*\*', label_part)
                    if label_match:
                        label = label_match.group(1)
                        # Remove emoji from the beginning if present (simple approach)
                        if label and label[0] in "🎯📝🚧🎨🤖✍️🎉⚡️🌅🔨🗺️📚🍽️🚀🔍🎨📝📧🍷🛌🏋️🧘🍴🤝🌐🖋️📊📈🌙🚶‍♂️🛀🍽️🌙":
                            label = label[1:].strip()
                    else:
                        # Fallback: remove markdown formatting and emoji
                        label = re.sub(r'\*\*.*?\*\*', '', label_part)  # Remove **text**
                        label = re.sub(r'<br>.*', '', label)  # Remove <br> and everything after
                        label = re.sub(r'[^\w\s|]', '', label)  # Remove special chars except | and spaces
                        label = label.strip()
                    
                    # Determine type from the 3rd column
                    block_type = BlockType("flex")  # Default
                    if "anchor" in parts[2].lower():
                        block_type = BlockType("anchor")
                    
                    blocks.append(Block(
                        start=start_time,
                        end=end_time,
                        label=label,
                        type=block_type
                    ))
                except Exception as e:
                    print(f"Warning: Could not parse line: {line} - {e}")
    
    return blocks

def get_recent_session_insights(days: int = 3) -> List[dict]:
    """Get insights from recent session logs for context briefing."""
    import json
    from datetime import datetime, timedelta
    
    sessions_dir = LOG_DIR / "sessions"
    if not sessions_dir.exists():
        return []
    
    # Get recent session files from the last N days
    cutoff_date = datetime.now() - timedelta(days=days)
    recent_sessions = []
    
    for session_file in sessions_dir.glob("*.json"):
        try:
            # Parse date from filename: YYYY-MM-DD-session-HHMM-project.json
            date_part = session_file.stem.split('-session-')[0]  # Get YYYY-MM-DD part
            file_date = datetime.strptime(date_part, "%Y-%m-%d")
            
            if file_date >= cutoff_date:
                with open(session_file, 'r') as f:
                    session_data = json.load(f)
                    recent_sessions.append({
                        'date': date_part,
                        'goal': session_data.get('goal', ''),
                        'completed_tasks': session_data.get('completed_tasks', []),
                        'summary': session_data.get('summary', ''),
                        'next_steps': session_data.get('next_steps', []),
                        'project': session_data.get('project', 'Unknown')
                    })
        except Exception as e:
            # Skip files that can't be parsed
            continue
    
    # Sort by date, most recent first
    recent_sessions.sort(key=lambda x: x['date'], reverse=True)
    return recent_sessions[:10]  # Return max 10 recent sessions