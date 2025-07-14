# ==============================================================================
# FILE: run_echo.py
#
# PURPOSE:
#   An end-to-end script to run a full Echo planning session, from loading
#   the config to calling the LLM and pushing the final plan to Google Calendar.
#
# USAGE:
#   (from the project root with the venv activated)
#   OPENAI_API_KEY="sk-..." python run_echo.py
#
# ==============================================================================

import os
import openai
from datetime import date

# Use our clean, top-level imports
from echo import (
    load_config,
    build_schedule,
    build_prompt,
    parse_response,
    merge_plan
)
from echo.gcal_writer import push_plan_to_gcal

def main():
    """Orchestrates a full end-to-end run of the Echo system."""
    print("🚀 Starting Echo planning session...")

    # --- Step 1: Set up OpenAI Client ---
    # Ensure your API key is set as an environment variable
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ ERROR: OPENAI_API_KEY environment variable not set.")
        return
    client = openai.OpenAI(api_key=api_key)

    # --- Step 2: Load Config & Build Deterministic Schedule ---
    # Use our canonical test fixture config
    config_path = "tests/fixtures/sample_config.yaml"
    cfg = load_config(config_path)
    partial_plan = build_schedule(cfg, date.today())
    print(f"✅ Loaded config and built partial plan with {len(partial_plan)} item(s).")

    # --- Step 3: Build Prompt & Call LLM ---
    # For this test, we'll use a simple note.
    planning_notes = {"Priority": "Finalize the core module refactor and test suite."}
    prompt = build_prompt(cfg, partial_plan, planning_notes, date.today())

    print("🤖 Sending prompt to LLM...")
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        gpt_text = resp.choices[0].message.content
        llm_blocks = parse_response(gpt_text)
        print(f"✅ LLM returned a plan with {len(llm_blocks)} item(s).")
    except Exception as e:
        print(f"❌ ERROR: Failed to get a valid response from the LLM: {e}")
        return

    # --- Step 4: Merge Plans & Push to Calendar ---
    try:
        final_plan = merge_plan(partial_plan, llm_blocks)
        print("✅ Merged LLM plan with deterministic schedule.")
    except Exception as e:
        print(f"❌ ERROR: Failed to merge plans: {e}")
        return

    # Call the updated function with the required `cfg` object
    push_plan_to_gcal(final_plan, cfg)

if __name__ == "__main__":
    main()
