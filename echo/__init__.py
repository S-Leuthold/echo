# ==============================================================================
# FILE: echo/__init__.py
# ==============================================================================

# Core workflow functions
from .config_loader import load_config
from .scheduler import build_schedule
from .plan_utils import merge_plan
from .gcal_writer import push_plan_to_gcal
from .log_writer import (
    write_initial_log, append_work_log_entry
)
from .session import SessionState, load_session, clear_session
from .log_reader import get_session_context

# Import the specialized prompt engine functions
from .prompt_engine import (
    build_planner_prompt, parse_planner_response,
    build_enricher_prompt, parse_enricher_response,
    build_session_crafter_prompt, parse_session_crafter_response,
    build_log_crafter_prompt, parse_log_crafter_response,
    build_journal_aware_planner_prompt,
    build_tomorrow_planning_prompt, parse_tomorrow_planning_response,
    build_morning_adjustment_prompt, parse_morning_adjustment_response,
    build_journal_insights_prompt, parse_journal_insights_response,
    build_productivity_analysis_prompt, parse_productivity_analysis_response,
    build_action_extraction_prompt, parse_action_extraction_response
)

# Journal functions
from .journal import (
    save_journal_entry, load_journal_entries, search_journal_entries,
    create_evening_reflection_entry, create_quick_note_entry,
    extract_planning_context_from_reflection, get_recent_reflection_context,
    analyze_energy_mood_trends, create_enhanced_evening_reflection_entry,
    generate_journal_insights, generate_productivity_analysis, get_insight_summary
)

# Email processing functions
from .email_processor import (
    OutlookEmailProcessor, EmailAction, EmailSummary,
    EmailPriority, EmailStatus
)

# Core data models
from .models import (
    Block, BlockType, Config, Defaults, Milestone, Profile, Project, ProjectStatus,
    JournalEntry, JournalEntryType, EveningReflection, JournalPlanningContext
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
    "build_journal_aware_planner_prompt", "build_tomorrow_planning_prompt",
    "parse_tomorrow_planning_response",
    "build_morning_adjustment_prompt", "parse_morning_adjustment_response",
    # Session
    "SessionState", "load_session", "clear_session",
    # Journal
    "save_journal_entry", "load_journal_entry", "load_journal_entries",
    "search_journal_entries", "get_recent_journal_entries",
    "create_evening_reflection_entry", "create_quick_note_entry",
    "extract_planning_context_from_reflection", "get_recent_reflection_context",
    "analyze_energy_mood_trends", "create_enhanced_evening_reflection_entry",
    # Models
    "Config", "Block", "BlockType", "Project", "Profile", "Defaults", "Milestone", "ProjectStatus",
    "JournalEntry", "JournalEntryType", "EveningReflection", "JournalPlanningContext",
]