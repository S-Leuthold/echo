# ==============================================================================
# FILE: echo/cli.py (Simplified)
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   The main command-line interface (CLI) for the Echo system.
# ==============================================================================

import argparse
import os
import openai
from datetime import date, datetime
from typing import Optional, List
from pathlib import Path

from dotenv import load_dotenv

from . import (
    load_config, build_schedule, merge_plan, push_plan_to_gcal,
    build_planner_prompt, parse_planner_response,
    build_enricher_prompt, parse_enricher_response,
    write_initial_log, append_work_log_entry,
    load_session, clear_session, SessionState,
    build_session_crafter_prompt, parse_session_crafter_response,
    get_session_context, build_log_crafter_prompt, parse_log_crafter_response,
    append_to_project_log, Block, Config, Project
)
from .config_loader import save_config
from .models import ProjectStatus
from .analytics import (
    calculate_daily_stats, append_daily_stats, display_daily_summary,
    get_recent_stats, display_weekly_trends
)
from .plan_utils import merge_plan, fill_gaps_with_unplanned

# --- Helper Functions ---

def _get_openai_client():
    load_dotenv()
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file.")
    return openai.OpenAI(api_key=api_key)

def _call_llm(client: openai.OpenAI, prompt: str, is_json: bool = True) -> str:
    """Helper function to make the API call to the LLM."""
    try:
        args = {
            "model": "gpt-4o",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.5,
        }
        # Only force JSON object format for responses that need single objects
        # Planner responses need arrays, so don't force JSON object format
        if is_json and ("json_object" in prompt.lower() or "single json object" in prompt.lower()):
            args["response_format"] = {"type": "json_object"}
        resp = client.chat.completions.create(**args)
        return resp.choices[0].message.content
    except Exception as e:
        raise ConnectionError(f"API call failed: {e}") from e

def _call_planner_llm(client: openai.OpenAI, prompt: str) -> str:
    """Specialized LLM call for the planner that requires JSON arrays."""
    try:
        args = {
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": "You are a JSON API that returns arrays of schedule blocks. You MUST return a JSON array with multiple objects, not a single object."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3,  # Lower temperature for more consistent array output
        }
        resp = client.chat.completions.create(**args)
        return resp.choices[0].message.content
    except Exception as e:
        raise ConnectionError(f"API call failed: {e}") from e

def _get_current_block(cfg: Config) -> Optional[Block]:
    """Finds the current block in the schedule based on the current time."""
    now = datetime.now().time()
    
    # Try to load today's plan from the log file
    log_file = Path("logs") / f"{date.today().strftime('%Y-%m-%d')}-log.md"
    if log_file.exists():
        from .log_reader import parse_log_file
        try:
            todays_plan = parse_log_file(log_file)
            for block in todays_plan:
                if block.start <= now < block.end:
                    return block
        except Exception as e:
            print(f"Warning: Could not parse today's log file: {e}")
    
    # Fallback to config schedule if no log file
    todays_plan = build_schedule(cfg, date.today())
    for block in todays_plan:
        if block.start <= now < block.end:
            return block
    return None

def _run_guided_planning_session() -> dict[str, str]:
    """Runs an interactive Q&A session to get the user's priorities."""
    print("\n🎤 Daily Planning: Let's set your intention for today.")
    questions = [
        ("most_important", "What is the single most important thing you want to move forward today?"),
        ("todos", "List the specific tasks or to-dos you want to accomplish today (comma-separated):"),
        ("energy", "What’s your current energy and focus level? (High/Medium/Low)"),
        ("nonnegotiables", "Are there any non-negotiable commitments or personal needs to protect?"),
        ("avoid", "Is there anything you want to avoid today (e.g., distractions, burnout, meetings)?"),
    ]
    notes = {}
    for key, q in questions:
        answer = input(f"{q} > ")
        notes[key] = answer
    return notes

def _prompt_for_project_creation(unassigned_tasks: List[str]) -> bool:
    """Prompts user about creating projects for unassigned tasks."""
    if not unassigned_tasks:
        return False
    
    print(f"\n🔍 Found {len(unassigned_tasks)} task(s) without associated projects:")
    for i, task in enumerate(unassigned_tasks, 1):
        print(f"  {i}. {task}")
    
    while True:
        response = input(f"\nWould you like to create projects for these tasks? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            return True
        elif response in ['n', 'no']:
            return False
        else:
            print("Please enter 'y' or 'n'.")


def _run_project_creation_wizard(unassigned_tasks: List[str]) -> None:
    """Runs the interactive project creation wizard."""
    print("\n🎯 Project Creation Wizard")
    print("=" * 40)
    
    # Load current config
    config = load_config()
    
    for task in unassigned_tasks:
        print(f"\n📝 Task: {task}")
        
        # Get project name
        while True:
            project_name = input("Enter project name (or 'skip' to skip): ").strip()
            if project_name.lower() == 'skip':
                break
            if project_name:
                break
            print("Please enter a project name.")
        
        if project_name.lower() == 'skip':
            continue
        
        # Get project description
        description = input("Enter project description (optional): ").strip()
        
        # Get category
        print("\nAvailable categories:")
        default_categories = list(config.categories.default_categories.values())
        for i, category in enumerate(default_categories, 1):
            print(f"  {i}. {category}")
        
        while True:
            try:
                cat_choice = input(f"Select category (1-{len(default_categories)}) or 'new': ").strip()
                if cat_choice.lower() == 'new':
                    new_category = input("Enter new category name: ").strip()
                    if new_category:
                        category = new_category
                        break
                else:
                    cat_idx = int(cat_choice) - 1
                    if 0 <= cat_idx < len(default_categories):
                        category = default_categories[cat_idx]
                        break
                    else:
                        print(f"Please enter a number between 1 and {len(default_categories)}")
            except ValueError:
                print("Please enter a valid number or 'new'")
        
        # Create project
        new_project = Project(
            id=project_name.lower().replace(' ', '_'),
            name=project_name,
            status=ProjectStatus.ACTIVE
        )
        
        # Add to config
        config.projects[new_project.id] = new_project
        
        # Create project log file
        project_log_path = Path("projects") / f"{project_name.lower().replace(' ', '_')}.md"
        project_log_path.parent.mkdir(exist_ok=True)
        
        project_content = f"""# {project_name}

## Overview
{description or "No description provided."}

## Category
{category}

## Status
Active

## Milestones
- [ ] Initial setup complete

## Recent Progress
- Created on {date.today().isoformat()}

## Session Logs
<!-- Session logs will be appended here -->
"""
        
        with open(project_log_path, "w", encoding="utf-8") as f:
            f.write(project_content)
        
        print(f"✅ Created project: {project_name}")
        print(f"📁 Project log: {project_log_path}")
    
    # Save updated config
    save_config(config)
    print(f"\n✅ Project creation complete! Updated config saved.")

# --- Main Commands ---

def run_daily_planning_session(args):
    """Orchestrates the main daily planning session."""
    print("🚀 Starting Echo daily planning session...")
    planning_notes = _run_guided_planning_session()
    print("✅ Guided planning complete.")

    client = _get_openai_client()
    cfg = load_config(args.config)
    partial_plan = build_schedule(cfg, date.today())
    print(f"✅ Loaded config and built partial plan with {len(partial_plan)} item(s).")

    print("\n🤖 Sending prompt to Planner to generate full schedule...")
    
    # Build fixed events from partial plan
    fixed_events = []
    for block in partial_plan:
        if block.type.value == "anchor":
            fixed_events.append({
                'start': block.start.strftime('%H:%M'),
                'end': block.end.strftime('%H:%M'),
                'title': block.label,
                'type': 'anchor'
            })
    
    # Check for unassigned tasks and prompt for project creation
    user_input = f"{planning_notes.get('most_important', '')} {' '.join(planning_notes.get('todos', '').split(','))}"
    from echo.prompt_engine import _get_filtered_project_context
    _, projects_found, unassigned_tasks = _get_filtered_project_context(cfg, user_input)
    
    if not projects_found and unassigned_tasks:
        if _prompt_for_project_creation(unassigned_tasks):
            _run_project_creation_wizard(unassigned_tasks)
            print("🚀 Project creation wizard complete. Continuing with planning...")
    
    planner_prompt = build_planner_prompt(
        most_important=planning_notes.get("most_important", ""),
        todos=planning_notes.get("todos", "").split(",") if planning_notes.get("todos") else [],
        energy_level=planning_notes.get("energy", ""),
        non_negotiables=planning_notes.get("nonnegotiables", ""),
        avoid_today=planning_notes.get("avoid", ""),
        fixed_events=fixed_events,
        config=cfg
    )
    print("\n" + "="*50)
    print("DEBUG: PLANNER PROMPT")
    print("="*50)
    print(planner_prompt)
    print("="*50)

    planner_response = _call_planner_llm(client, planner_prompt)
    print("\n" + "="*50)
    print("DEBUG: PLANNER LLM RESPONSE")
    print("="*50)
    print(planner_response)
    print("="*50)

    try:
        llm_blocks = parse_planner_response(planner_response)
        print(f"✅ Planner returned {len(llm_blocks)} block(s).")
        print("\n" + "="*50)
        print("DEBUG: PARSED PLANNER BLOCKS")
        print("="*50)
        for i, block in enumerate(llm_blocks):
            print(f"Block {i+1}: {block.start.strftime('%H:%M')}-{block.end.strftime('%H:%M')} | {block.label} | {block.type.value}")
        print("="*50)
    except ValueError as e:
        print(f"❌ ERROR: Could not parse planner response: {e}\n--- Raw Response ---\n{planner_response}\n--------------------")
        return

    # --- Post-processing: enforce canonical naming, block length, and full coverage ---
    from echo.plan_utils import enforce_block_constraints
    processed_plan = enforce_block_constraints(llm_blocks, cfg.defaults.wake_time, cfg.defaults.sleep_time)

    print("\n" + "="*50)
    print("DEBUG: FINAL PLAN AFTER POST-PROCESSING")
    print("="*50)
    for i, block in enumerate(processed_plan):
        print(f"Block {i+1}: {block.start.strftime('%H:%M')}-{block.end.strftime('%H:%M')} | {block.label} | {block.type.value}")
    print("="*50)

    print("🎨 Sending to Enricher...")
    enricher_prompt = build_enricher_prompt(processed_plan)
    print("\n" + "="*50)
    print("DEBUG: ENRICHER PROMPT")
    print("="*50)
    print(enricher_prompt)
    print("="*50)
    enricher_response = _call_llm(client, enricher_prompt)
    print("\n" + "="*50)
    print("DEBUG: ENRICHER LLM RESPONSE")
    print("="*50)
    print(enricher_response)
    print("="*50)
    try:
        final_plan = parse_enricher_response(enricher_response, processed_plan)
        print("✅ Plan enriched.")
    except ValueError as e:
        print(f"❌ ERROR: Could not parse enricher response: {e}\n--- Raw Response ---\n{enricher_response}\n--------------------")
        return
    print("✍️  Writing daily log and pushing to calendar...")
    write_initial_log(final_plan, cfg, log_dir="logs")
    push_plan_to_gcal(final_plan, cfg)
    # Calculate and display daily analytics
    print("\n📊 Calculating daily time allocation...")
    daily_stats = calculate_daily_stats(final_plan, cfg)
    append_daily_stats(daily_stats)
    display_daily_summary(daily_stats)
    recent_stats = get_recent_stats(days=7)
    if len(recent_stats) > 1:
        display_weekly_trends(recent_stats)
    print("\n🎉 Echo planning session complete!")


def start_work_session(args):
    """Initiates an interactive work session spin-up."""
    print("🚀 Starting a new work session spin-up...")
    if load_session() is not None:
        print("❌ Error: A work session is already in progress. Use 'echo end'.")
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
        print(f"⚠️ Warning: Could not parse project from block label. Defaulting to 'General'.")
        project_name = "General"

    goal = input("1/3: Goal for this session? > ")
    tasks_raw = input("2/3: Specific tasks? (comma-separated) > ")
    obstacle = input("3/3: Potential obstacle? > ")
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
    for task in session_plan['tasks']: print(f"  - {task}")
    print("🚧 Obstacles:")
    for obs in session_plan['potential_obstacles']: print(f"  - {obs}")
    print("--------------------------")
    
    choice = input("Accept this plan? (Y/n) > ").lower()
    if choice in ['y', 'yes', '']:
        SessionState.start_new(
            current_block_label=current_block.label,
            session_goal=session_plan['session_goal'],
            tasks=session_plan['tasks']
        )
        print("\n✅ Plan accepted. Session started.")
    else:
        print("\n❌ Plan rejected.")

def end_work_session(args):
    """Initiates an interactive work session spin-down."""
    print("⚡️ Ending work session...")
    session = load_session()
    if session is None:
        print("❌ Error: No active work session to end.")
        return

    print(f"Spinning down: {session.current_block_label}")
    project_name = session.current_block_label.split('|')[0].strip()

    accomplishments = input("1/2: What did you accomplish? > ")
    surprises = input("2/2: Any surprises? > ")

    print("\n🤖 Asking the Wise Cofounder to craft the log entry...")
    context = get_session_context(project_name)
    client = _get_openai_client()
    prompt = build_log_crafter_prompt(session, accomplishments, surprises, context)
    log_entry_text = _call_llm(client, prompt, is_json=False)

    print("\n--- Proposed Log Entry ---")
    print(log_entry_text)
    print("------------------------")

    choice = input("Approve and save this log? (Y/n) > ").lower()
    if choice in ['y', 'yes', '']:
        log_file = Path("logs") / f"{date.today().strftime('%Y-%m-%d')}-log.md"
        if not log_file.exists():
            print(f"⚠️ Warning: Log file for today does not exist. Run the 'plan' command first.")
            return
        
        append_work_log_entry(
            task_name=session.current_block_label,
            notes=log_entry_text,
            log_file=log_file
        )
        
        # Also append to project log
        try:
            project_id = project_name.lower().replace(' ', '_')
            project_summary = f"- **Session Goal**: {session.session_goal}\n- **Accomplishments**: {accomplishments}\n- **Surprises**: {surprises}\n- **Log Entry**: {log_entry_text}"
            append_to_project_log(project_id, project_summary)
        except Exception as e:
            print(f"⚠️ Warning: Could not update project log: {e}")
        
        clear_session()
        print("\n✅ Session ended and log entry saved.")
    else:
        print("\n❌ Log entry discarded. Session remains active.")


def view_analytics(args):
    """Displays time allocation analytics and trends."""
    print("📊 Echo Analytics Dashboard")
    print("=" * 40)
    
    # Get recent stats
    recent_stats = get_recent_stats(days=args.days)
    
    if not recent_stats:
        print(f"No analytics data found for the past {args.days} days.")
        print("Run 'echo plan' to generate your first daily plan and analytics.")
        return
    
    # Display trends
    display_weekly_trends(recent_stats)
    
    # Show individual day breakdowns if requested
    if args.days <= 7:
        print("📅 Daily Breakdowns:")
        for stats in recent_stats:
            print(f"\n{stats.date.strftime('%A, %B %d')}:")
            display_daily_summary(stats)


def main():
    """The main entry point for the Echo CLI."""
    parser = argparse.ArgumentParser(description="Echo: Your personal AI for thought and planning.")
    parser.add_argument('-c', '--config', default="tests/fixtures/sample_config.yaml", help="Path to the configuration file.")
    subparsers = parser.add_subparsers(dest="command", required=True, help="Available commands")

    plan_parser = subparsers.add_parser("plan", help="Run the main daily planning and scheduling workflow.")
    plan_parser.set_defaults(func=run_daily_planning_session)

    start_parser = subparsers.add_parser("start", help="Start an interactive work session.")
    start_parser.set_defaults(func=start_work_session)

    end_parser = subparsers.add_parser("end", help="End the current work session and log your progress.")
    end_parser.set_defaults(func=end_work_session)

    analytics_parser = subparsers.add_parser("analytics", help="View time allocation analytics and trends.")
    analytics_parser.add_argument("--days", type=int, default=7, help="Number of days to analyze (default: 7)")
    analytics_parser.set_defaults(func=view_analytics)

    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__":
    main()