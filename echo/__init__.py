# ==============================================================================
# FILE: echo/__init__.py
# ==============================================================================

# Core workflow functions
from .config_loader import load_config
from .scheduler import build_schedule
from .plan_utils import merge_plan
from .gcal_writer import push_plan_to_gcal
from .log_writer import write_initial_log, append_work_log_entry
from .session import SessionState, load_session, clear_session
from .log_reader import get_session_context

# Import the specialized prompt engine functions
from .prompt_engine import (
    build_planner_prompt, parse_planner_response,
    build_enricher_prompt, parse_enricher_response,
    build_session_crafter_prompt, parse_session_crafter_response,
    build_log_crafter_prompt, parse_log_crafter_response,
    append_to_project_log
)

# Core data models
from .models import (
    Block, BlockType, Config, Defaults, Milestone, Profile, Project, ProjectStatus
)


# This defines the public API for `from echo import *`
__all__ = [
    # Workflow
    "load_config", "build_schedule", "merge_plan", "push_plan_to_gcal",
    "write_initial_log", "append_work_log_entry",
    "get_session_context",
    # Prompts
    "build_planner_prompt", "parse_planner_response",
    "build_enricher_prompt", "parse_enricher_response",
    "build_session_crafter_prompt", "parse_session_crafter_response",
    "build_log_crafter_prompt", "parse_log_crafter_response",
    "append_to_project_log",
    # Session
    "SessionState", "load_session", "clear_session",
    # Models
    "Config", "Block", "BlockType", "Project", "Profile", "Defaults", "Milestone", "ProjectStatus",
]