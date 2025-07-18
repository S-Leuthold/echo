# ==============================================================================
# FILE: echo/cli.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   The main command-line interface (CLI) for the Echo system. Handles
#   sub-commands for daily planning and interactive work sessions.
# ==============================================================================

import argparse
import os
import openai
from datetime import date, datetime, time
from typing import Optional
from pathlib import Path

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
    build_session_crafter_prompt, 
    parse_session_crafter_response,
    get_session_context,  
    build_log_crafter_prompt, 
    parse_log_crafter_response,
    Block
)

from .models import Config

def _get_openai_client():
    
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file.")
    return openai.OpenAI(api_key=api_key)

def _call_llm(client: openai.OpenAI, prompt: str) -> str:
    """Helper function to make the API call to the LLM."""
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    except Exception as e:
        raise ConnectionError(f"API call failed: {e}") from e

def _get_current_block(cfg: Config) -> Optional[Block]:
    """Finds the current block in the schedule based on the current time."""
    now = datetime.now().time()
    todays_plan = build_schedule(cfg, date.today())
    for block in todays_plan:
        if block.start <= now < block.end:
            return block
    return None

# --- Main Commands ---

def run_daily_planning_session(args):
    """Orchestrates the main daily planning session."""
    print("🚀 Starting Echo daily planning session...")
    client = _get_openai_client()
    cfg = load_config(args.config)
    partial_plan = build_schedule(cfg, date.today())
    print(f"✅ Loaded config and built partial plan with {len(partial_plan)} item(s).")

    planning_notes = {"Priority": "Execute the plan for the day."}
    
    print("🤖 Sending prompt to Planner persona...")
    planner_prompt = build_planner_prompt(cfg, partial_plan, planning_notes, date.today())
    planner_response = _call_llm(client, planner_prompt)
    llm_blocks = parse_planner_response(planner_response)
    print(f"✅ Planner returned {len(llm_blocks)} new block(s).")
    
    merged_plan = merge_plan(partial_plan, llm_blocks)
    print("✅ Merged deterministic plan with planner's output.")

    print("🎨 Sending complete plan to Enricher persona...")
    enricher_prompt = build_enricher_prompt(merged_plan)
    enricher_response = _call_llm(client, enricher_prompt)
    final_plan = parse_enricher_response(enricher_response, merged_plan)
    print("✅ Plan enriched with notes and emojis.")

    print("✍️  Writing daily log...")
    write_initial_log(final_plan, cfg, log_dir="logs")
    push_plan_to_gcal(final_plan, cfg)
    print("\n🎉 Echo planning session complete!")


def start_work_session(args):
    """Initiates an interactive work session spin-up."""
    print("🚀 Starting a new work session spin-up...")

    if load_session() is not None:
        print("❌ Error: A work session is already in progress. Use 'echo end' to finish it.")
        return
        
    cfg = load_config(args.config)
    current_block = _get_current_block(cfg)
    if current_block is None:
        print("❌ Error: No scheduled work block found for the current time.")
        return

    print(f"Current Block: {current_block.label}")
    try:
        project_name = current_block.label.split('|')[0].strip()
    except IndexError:
        print(f"⚠️ Warning: Could not parse project from block label '{current_block.label}'. Defaulting to 'General'.")
        project_name = "General"

    goal = input("1/3: What is your primary goal for this session? > ")
    tasks_raw = input("2/3: What are the specific tasks? (comma-separated) > ")
    obstacle = input("3/3: What's one potential obstacle? > ")
    initial_tasks = [t.strip() for t in tasks_raw.split(',')]

    print("\n🤖 Asking the Wise Cofounder to sharpen the plan...")
    context = get_session_context(project_name)
    client = _get_openai_client()
    prompt = build_session_crafter_prompt(goal, initial_tasks, obstacle, context)
    response = _call_llm(client, prompt)
    session_plan = parse_session_crafter_response(response)

    print("\n--- Proposed Session Plan ---")
    print(f"🎯 Goal: {session_plan['session_goal']}")
    print("📝 Tasks:")
    for task in session_plan['tasks']:
        print(f"  - {task}")
    print("🚧 Obstacles:")
    for obs in session_plan['potential_obstacles']:
        print(f"  - {obs}")
    print("--------------------------")
    
    choice = input("Accept this plan? (Y/n) > ").lower()
    if choice in ['y', 'yes', '']:
        SessionState.start_new(
            current_block_label=current_block.label,
            session_goal=session_plan['session_goal'],
            tasks=session_plan['tasks']
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

    print(f"Spinning down session for: {session.current_block_label}")
    project_name = session.current_block_label.split('|')[0].strip()

    # 1. Get User Input for Spin-Down
    accomplishments = input("1/2: What did you accomplish this session? > ")
    surprises = input("2/2: Any surprises or new obstacles? > ")

    # 2. Get Context and Craft Log with AI
    print("\n🤖 Asking the Wise Cofounder to craft the log entry...")
    context = get_session_context(project_name)
    client = _get_openai_client()
    prompt = build_log_crafter_prompt(session, accomplishments, surprises, context)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )
        log_entry_text = response.choices[0].message.content.strip()
    except (ValueError, openai.APIError) as e:
        print(f"❌ Error crafting log entry: {e}")
        return

    # 3. User Approval and Save
    print("\n--- Proposed Log Entry ---")
    print(log_entry_text)
    print("------------------------")

    choice = input("Approve and save this log? (Y/n) > ").lower()
    if choice in ['y', 'yes', '']:
        log_file = Path("logs") / f"{date.today().strftime('%Y-%m-%d')}-log.md"
        if not log_file.exists():
            print(f"⚠️ Warning: Log file for today does not exist. Please run the 'plan' command first.")
            return
        
        append_work_log_entry(
            task_name=session.current_block_label,
            notes=log_entry_text,
            log_file=log_file
        )
        clear_session()
        print("\n✅ Session ended and log entry saved.")
    else:
        print("\n❌ Log entry discarded. Session remains active.")

def main():
    """The main entry point for the Echo CLI."""
    parser = argparse.ArgumentParser(description="Echo: Your personal AI for thought and planning.")
    parser.add_argument(
        '-c', '--config', 
        default="tests/fixtures/sample_config.yaml", 
        help="Path to the configuration file."
    )
    subparsers = parser.add_subparsers(dest="command", required=True, help="Available commands")

    plan_parser = subparsers.add_parser("plan", help="Run the main daily planning and scheduling workflow.")
    plan_parser.set_defaults(func=run_daily_planning_session)

    start_parser = subparsers.add_parser("start", help="Start an interactive work session.")
    start_parser.set_defaults(func=start_work_session)

    end_parser = subparsers.add_parser("end", help="End the current work session and log your progress.")
    end_parser.set_defaults(func=end_work_session)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()