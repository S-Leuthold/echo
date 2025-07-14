# ==============================================================================
# FILE: echo/log_writer.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Provides functionality to create and append to daily Markdown log files.
#   This is the core of "Archivist" feature.
#
# ==============================================================================

from __future__ import annotations
from datetime import date, datetime
from pathlib import Path
from typing import List

from .models import Block, Config

LOG_FILE_DELIMITER = "\n\n---\n"

def write_initial_log(plan: List[Block], cfg: Config, log_dir: str | Path) -> Path:
    """
    Creates the initial daily log file with a Markdown table of the plan.
    If the file already exists, it will be overwritten.
    """
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    today = date.today()
    log_filename = log_path / f"{today.strftime('%Y-%m-%d')}-log.md"

    md_content = [f"# Echo Log: {today.strftime('%A, %B %d, %Y')}\n"]
    md_content.append("| Start | End   | Type   | Task & Notes     |\n")
    md_content.append("|:------|:------|:-------|:-----------------|\n")

    for block in plan:
        start_str = block.start.strftime("%H:%M")
        end_str = block.end.strftime("%H:%M")
        type_str = block.type.value.capitalize()
        note_str = block.meta.get("note", "")
        task_str = f"**{block.label}**"
        if note_str:
            task_str += f"<br>*{note_str}*"
        md_content.append(f"| {start_str} | {end_str} | {type_str} | {task_str} |\n")

    with open(log_filename, "w", encoding="utf-8") as f:
        f.write("".join(md_content))
    
    print(f"✅ Wrote initial daily log to: {log_filename}")
    return log_filename

def append_work_log_entry(task_name: str, notes: str, log_file: Path):
    """
    Appends a new, structured work log entry to the specified log file.
    """
    entry_header = f"### Work Log: {datetime.now().strftime('%H:%M:%S')}"
    entry_content = f"**Task:** {task_name}\n\n{notes}"

    full_entry = f"{LOG_FILE_DELIMITER}{entry_header}\n\n{entry_content}"

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(full_entry)
        
    print(f"📝 Appended new entry to log file: {log_file.name}")