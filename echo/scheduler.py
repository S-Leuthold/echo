# ==============================================================================
# FILE: echo/scheduler.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Constructs the initial, deterministic list of schedule Blocks for a given
#   day based on the user's configuration. This forms the "scaffold" of
#   non-negotiable events (Anchors and Fixed blocks) that the LLM will later
#   fill in with flexible tasks.
#
# DEPENDS ON:
#   - echo.models (Config, Block, BlockType)
#   - echo.plan_utils (For parsing time spans)
#
# DEPENDED ON BY:
#   - echo.cli (To create the initial schedule)
#   - echo.prompt_engine (To get the schedule to include in the prompt)
#   - tests.test_scheduler (For unit testing this module)
# ==============================================================================

from __future__ import annotations
from datetime import date, time
from typing import List, Dict, Any
from .models import Block, BlockType, Config
from .plan_utils import parse_time_span


def _create_blocks_from_config(
    event_list: List[Dict[str, Any]], block_type: BlockType
) -> List[Block]:
    """
    Factory function to create a list of Block objects from a list of raw
    event dictionaries from the user's config.
    """
    blocks = []
    for event_data in event_list:
        start_t, end_t = parse_time_span(event_data["time"])
        blocks.append(
            Block(
                start=start_t,
                end=end_t,
                # The config might use 'task' or 'label', so we check for both.
                label=event_data.get("task") or event_data.get("label"),
                type=block_type,
                # Pass through any other keys as metadata.
                meta={k: v for k, v in event_data.items() if k not in ['time', 'task', 'label']}
            )
        )
    return blocks


def build_schedule(cfg: Config, target_date: date) -> List[Block]:
    """
    Builds the deterministic schedule (anchors and fixed events) for a target date.
    """
    ## --------------------------------------------------------
    ## Step 1: Determine the Correct Day's Configuration
    ## --------------------------------------------------------
    day_key = target_date.strftime("%A").lower()
    day_cfg = cfg.weekly_schedule.get(day_key, {})

    ## --------------------------------------------------------
    ## Step 2: Create Blocks from Anchors and Fixed Events
    ## --------------------------------------------------------
    anchor_blocks = _create_blocks_from_config(
        day_cfg.get("anchors", []), BlockType.ANCHOR
    )
    fixed_blocks = _create_blocks_from_config(
        day_cfg.get("fixed", []), BlockType.FIXED
    )
    
    schedule = anchor_blocks + fixed_blocks

    ## --------------------------------------------------------
    ## Step 3: Sort by Start Time and Return
    ## --------------------------------------------------------
    schedule.sort(key=lambda block: block.start)
    return schedule
