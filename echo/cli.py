# ==============================================================================
# FILE: echo/cli.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   This script serves as the primary command-line interface (CLI) for
#   interacting with the Echo system. It handles argument parsing,
#   orchestrates the various components (config loading, scheduling, prompt
#   building), and outputs the final plan.
#
# USAGE:
#   python -m echo.cli --profile config/user_config.yaml
#
# DEPENDS ON:
#   - echo.config_loader
#   - echo.scheduler
#   - echo.prompt_engine
#
# DEPENDED ON BY:
#   - None (This script is an entry point)
# ==============================================================================

import argparse
import json
import sys
from datetime import date

from echo.config_loader import load_config
from echo.prompt_engine import build_prompt
from echo.scheduler import build_schedule


def main():
    
    """
    Orchestrates the main execution flow of the Echo planning session.
    """
    
    ## --------------------------------------------------------
    ## Step 1: Parse Command-Line Arguments
    ## --------------------------------------------------------
    # Sets up the argument parser to accept a configuration profile and optional notes.
    
    ap = argparse.ArgumentParser(description="Run an Echo planning session.")
    ap.add_argument("--profile", default="config/sample_config.yaml", help="Path to the user configuration file.")
    ap.add_argument("--notes", default="{}", help="A JSON string of notes to include in the planning prompt.")
    args = ap.parse_args()

    ## --------------------------------------------------------
    ## Step 2: Load Configuration and User Notes
    ## --------------------------------------------------------
    # Loads the user's settings from the specified YAML file and parses any
    # JSON notes provided via the command line.
    
    cfg   = load_config(args.profile)
    notes = json.loads(args.notes)

    ## --------------------------------------------------------
    ## Step 3: Build the Initial Schedule & Prompt
    ## --------------------------------------------------------
    # Generates the deterministic part of the schedule based on the user's
    # configuration and then constructs the full prompt for the LLM.
    
    partial_schedule = build_schedule(cfg, date.today())
    prompt = build_prompt(cfg, partial_schedule, notes, date.today())

    ## --------------------------------------------------------
    ## Step 4: [TEMP] Bridge Test for End-to-End Flow
    ## --------------------------------------------------------
    # This section is a temporary placeholder. Instead of calling the LLM,
    # we are simply outputting the deterministic schedule to stdout. This
    # allows for testing the full pipeline up to the LLM call.
    #
    # TODO: Replace this with a call to the LLM (e.g., get_llm_response(prompt))
    # TODO: Implement the `merge_plan` function with the LLM response.
    
    plan = [block.to_dict() for block in partial_schedule]
    json.dump(plan, sys.stdout, indent=2)


if __name__ == "__main__":
    main()
