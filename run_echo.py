# ==============================================================================
# FILE: run_echo.py
#
# PURPOSE:
#   An end-to-end script to run a full Echo planning session, using a two-step
#   'Generate then Enrich' AI workflow.
#
# USAGE:
#   (from the project root with the venv activated)
#   python run_echo.py
#
# ==============================================================================

import os
import openai
from datetime import date
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import our specialized prompt engine functions
from echo import (
    load_config,
    build_schedule,
    merge_plan,
    push_plan_to_gcal,
    build_planner_prompt,
    parse_planner_response,
    build_enricher_prompt,
    parse_enricher_response,
    write_initial_log,
)

def call_llm(client: openai.OpenAI, prompt: str) -> str:
    """Helper function to make the API call to the LLM."""
    try:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content
    except Exception as e:
        print(f"❌ ERROR: API call failed: {e}")
        return ""

def main():
    """Orchestrates a full end-to-end run of the Echo system."""
    print("🚀 Starting Echo planning session...")

    # --- Step 1: Setup ---
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    config_path = "tests/fixtures/sample_config.yaml"
    cfg = load_config(config_path)
    partial_plan = build_schedule(cfg, date.today())
    planning_notes = {"Priority": "Finalize the new 'Generate then Enrich' architecture."}
    print(f"✅ Loaded config and built partial plan with {len(partial_plan)} item(s).")

    # --- Step 2: The Planner ---
    print("🤖 Sending prompt to Planner persona...")
    planner_prompt = build_planner_prompt(cfg, partial_plan, planning_notes, date.today())
    planner_response = call_llm(client, planner_prompt)
    if not planner_response: return

    try:
        llm_blocks = parse_planner_response(planner_response)
        print(f"✅ Planner returned {len(llm_blocks)} new block(s).")
    except ValueError as e:
        print(f"❌ ERROR: Could not parse planner response: {e}")
        print(f"--- Planner Raw Response ---\n{planner_response}\n--------------------")
        return

    # --- Step 3: Merge the Logical Plan ---
    merged_plan = merge_plan(partial_plan, llm_blocks)
    print("✅ Merged deterministic plan with planner's output.")

    # --- Step 4: The Enricher (The Wise Cofounder) ---
    print("🎨 Sending complete plan to Enricher persona...")
    enricher_prompt = build_enricher_prompt(merged_plan)
    enricher_response = call_llm(client, enricher_prompt)
    if not enricher_response: return

    try:
        final_plan = parse_enricher_response(enricher_response, merged_plan)
        print("✅ Plan enriched with notes and emojis.")
    except (ValueError, IndexError) as e:
        print(f"❌ ERROR: Could not parse enricher response: {e}")
        print(f"--- Enricher Raw Response ---\n{enricher_response}\n--------------------")
        return
        
    # --- Step 5: Write log and Push to Calendar ---
    write_initial_log(final_plan, cfg, log_dir="logs")
    push_plan_to_gcal(final_plan, cfg)
    print("\n🎉 Echo planning session complete!")

if __name__ == "__main__":
    main()
