# ==============================================================================
# FILE: echo/__init__.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   This file marks the 'echo' directory as a Python package and defines its
#   public API, making key classes and functions available at the top level.
#
# ==============================================================================

# Core workflow functions
from .config_loader import load_config
from .scheduler import build_schedule
from .plan_utils import merge_plan
from .gcal_writer import push_plan_to_gcal
from .log_writer import write_initial_log, append_work_log_entry
from .session import SessionState, load_session, clear_session # <-- Added

# Import the specialized prompt engine functions
from .prompt_engine import (
    build_planner_prompt,
    parse_planner_response,
    build_enricher_prompt,
    parse_enricher_response,
    build_session_crafter_prompt,
    parse_session_crafter_response
)

# Core data models
from .models import (
    Block,
    BlockType,
    Config,
    Defaults,
    Milestone,
    Profile,
    Project,
    ProjectStatus,
)


# This defines the public API for `from echo import *`
__all__ = [
    # Workflow
    "load_config",
    "build_schedule",
    "merge_plan",
    "push_plan_to_gcal",
    "write_initial_log",
    "append_work_log_entry",
    "build_planner_prompt",
    "parse_planner_response",
    "build_enricher_prompt",
    "parse_enricher_response",
    "build_session_crafter_prompt",
    "parse_session_crafter_response",
    # Session Management
    "SessionState",
    "load_session",
    "clear_session",
    # Models
    "Config",
    "Block",
    "BlockType",
    "Project",
    "Profile",
    "Defaults",
    "Milestone",
    "ProjectStatus",
]