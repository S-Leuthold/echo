# ==============================================================================
# FILE: echo/cli.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   The main command-line interface (CLI) for the Echo system. It uses
#   argparse to handle different sub-commands for various workflows like
#   daily planning, starting a work session, and ending a work session.
# ==============================================================================

import argparse
import os
import openai
from datetime import date, datetime

from dotenv import load_dotenv

from . import (
    load_config,
    build_schedule,
    merge_plan,
    push_plan_to_gcal,
    build_planner_prompt,
    parse_planner_response,
    build_enricher_prompt,
    parse_enricher_response,
    write_initial_log,
    append_work_log_entry,
    load_session,
    clear_session,
    SessionState,
)
# We will create this module next
# from .log_reader import get_session_context

def _get_openai_client():
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file.")
    return openai.OpenAI(api_key=api_key)

def _get_current_block(cfg: 'Config') -> 'Block':
    """Finds the current block in the schedule based on the current time."""
    # This is a placeholder for the logic that reads the daily plan
    # and finds the block corresponding to the current system time.
    # For now, we'll return a mock block.
    from .models import Block, BlockType
    return Block(start=datetime.now().time(), end=datetime.now().time(), label="Placeholder | Task", type=BlockType.FLEX)


def run_daily_planning_session(args):
    """Orchestrates the main daily planning session."""
    print("🚀 Starting Echo daily planning session...")
    # This function will contain the logic from our previous run_echo.py
    # ... (omitted for brevity, we'll add it back later)
    print("✅ Daily planning complete.")


def start_work_session(args):
    """Initiates an interactive work session spin-up."""
    print("🚀 Starting a new work session spin-up...")

    # 1. Check for an existing session
    if load_session() is not None:
        print("❌ Error: A work session is already in progress. Use 'echo end' to finish it.")
        return

    # 2. Get User Input
    goal = input("1/3: What is your primary goal for this session? > ")
    tasks_raw = input("2/3: What are the specific tasks to make that possible? (comma-separated) > ")
    obstacle = input("3/3: What's one potential obstacle? > ")
    initial_tasks = [t.strip() for t in tasks_raw.split(',')]

    # 3. Get Context and Enhance with AI
    print("\n🤖 Asking the Wise Cofounder to sharpen the plan...")
    client = _get_openai_client()
    # context = get_session_context() # We'll uncomment this when the log_reader is built
    context = "No historical context available yet."

    # TODO: We need to build the "Session Crafter" persona and call it here.
    # For now, we'll just use the user's initial tasks.
    enhanced_tasks = initial_tasks

    # 4. User Approval & Save State
    print("\n--- Proposed Session Plan ---")
    for task in enhanced_tasks:
        print(f"  - {task}")
    print("--------------------------")
    
    choice = input("Accept this plan? (Y/n) > ").lower()
    if choice in ['y', 'yes', '']:
        current_block = _get_current_block(load_config("tests/fixtures/sample_config.yaml"))
        SessionState.start_new(
            current_block_label=current_block.label,
            session_goal=goal,
            tasks=enhanced_tasks
        )
        print("\n✅ Plan accepted. Session started. Let's get to work.")
    else:
        print("\n❌ Plan rejected. No session started.")


def end_work_session(args):
    """Initiates an interactive work session spin-down."""
    print("⚡️ Ending work session...")

    session = load_session()
    if session is None:
        print("❌ Error: No active work session to end.")
        return

    # TODO: Add spin-down questions, call the "Log Crafter" AI,
    # and append the result to the daily log file.
    print(f"Spinning down session for: {session.current_block_label}")
    
    clear_session()
    print("✅ Session ended and log entry saved.")


def main():
    """The main entry point for the Echo CLI."""
    parser = argparse.ArgumentParser(description="Echo: Your personal AI for thought and planning.")
    subparsers = parser.add_subparsers(dest="command", required=True, help="Available commands")

    # The 'plan' command
    plan_parser = subparsers.add_parser("plan", help="Run the main daily planning and scheduling workflow.")
    plan_parser.set_defaults(func=run_daily_planning_session)

    # The 'start' command
    start_parser = subparsers.add_parser("start", help="Start an interactive work session for the current time block.")
    start_parser.set_defaults(func=start_work_session)

    # The 'end' command
    end_parser = subparsers.add_parser("end", help="End the current interactive work session and log your progress.")
    end_parser.set_defaults(func=end_work_session)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()