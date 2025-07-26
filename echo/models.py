# ==============================================================================
# FILE: echo/models.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Defines the core, typed data structures used throughout the Echo application.
#   These dataclasses serve as the canonical, in-memory representation of both the
#   user's configuration and the dynamically generated schedule plan. They are the
#   "single source of truth" for what data looks like in the system.
#
# DEPENDS ON:
#   - None (This module has no internal project dependencies)
#
# DEPENDED ON BY:
#   - echo.config_loader (constructs Config, Project, etc. from YAML)
#   - echo.scheduler (uses Config to produce a list of Blocks)
#   - echo.prompt_engine (uses Config and Blocks to build prompts)
#   - echo.cli (orchestrates the flow of these data objects)
#   - tests/* (the test suite heavily validates these models)
# ==============================================================================

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import time, date, datetime
from enum import Enum
from typing import Dict, List, Optional, Any

# Defines the public API for this module.
__all__ = [
    "BlockType",
    "Block",
    "Defaults",
    "Project",
    "Profile",
    "Config",
    "JournalEntryType",
    "JournalEntry",
    "EveningReflection",
    "JournalPlanningContext",
]


class BlockType(str, Enum):
    """
    The canonical set of categories for any element on the schedule.
    Using an Enum here prevents ambiguity and typo-related bugs.
    """
    ANCHOR = "anchor"   # A fixed, non-negotiable event (e.g., wake-up, sleep)
    FIXED  = "fixed"    # A scheduled appointment with a hard start/end time
    FLEX   = "flex"     # A task that can be moved by the LLM (e.g., deep work)


class JournalEntryType(str, Enum):
    """
    The types of journal entries that can be created.
    Each type serves a different purpose in the reflection and planning workflow.
    """
    EVENING_REFLECTION = "evening_reflection"  # Daily evening reflection
    QUICK_NOTE = "quick_note"                  # Quick journal entry
    INSIGHT = "insight"                         # LLM-generated insight
    PATTERN = "pattern"                         # Identified pattern or trend


@dataclass
class JournalEntry:
    """
    Represents a journal entry with structured data for reflection and planning.
    Journal entries provide context for LLM planning and enable pattern recognition.
    """
    date: date
    entry_type: JournalEntryType
    content: Dict[str, str]  # Structured content (e.g., {"what_went_well": "...", "challenges": "..."})
    created_at: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)
    linked_projects: List[str] = field(default_factory=list)  # Project IDs this entry relates to
    
    def to_dict(self) -> Dict:
        """Serializes the JournalEntry into a JSON-safe dictionary."""
        return {
            "date": self.date.isoformat(),
            "entry_type": self.entry_type.value,
            "content": self.content,
            "created_at": self.created_at.isoformat(),
            "tags": self.tags,
            "linked_projects": self.linked_projects,
        }


@dataclass
class EveningReflection:
    """
    Represents a complete evening reflection session including the reflection
    and the planning context for tomorrow.
    """
    reflection: JournalEntry
    tomorrow_plan: List[Block]
    planning_context: Dict[str, str]  # Key planning insights for tomorrow
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        """Serializes the EveningReflection into a JSON-safe dictionary."""
        return {
            "reflection": self.reflection.to_dict(),
            "tomorrow_plan": [block.to_dict() for block in self.tomorrow_plan],
            "planning_context": self.planning_context,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class JournalPlanningContext:
    """
    Extracted planning context from journal entries for use in planning prompts.
    """
    recent_mood: str
    energy_trend: str
    productivity_patterns: List[str] = field(default_factory=list)
    avoid_patterns: List[str] = field(default_factory=list)
    focus_areas: List[str] = field(default_factory=list)
    non_negotiables: List[str] = field(default_factory=list)
    energy_prediction: Optional[str] = None
    mood_prediction: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Serializes the JournalPlanningContext into a JSON-safe dictionary."""
        return {
            "recent_mood": self.recent_mood,
            "energy_trend": self.energy_trend,
            "productivity_patterns": self.productivity_patterns,
            "avoid_patterns": self.avoid_patterns,
            "focus_areas": self.focus_areas,
            "non_negotiables": self.non_negotiables,
            "energy_prediction": self.energy_prediction,
            "mood_prediction": self.mood_prediction,
        }


@dataclass
class Block:
    """
    The fundamental unit of the Echo schedule. A Block represents a single,
    contiguous chunk of time dedicated to a specific activity.
    """
    start: time
    end:   time
    label: str
    type:  BlockType
    meta:  Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        """Serializes the Block into a JSON-safe dictionary."""
        return {
            "start": self.start.isoformat(timespec="minutes"),
            "end":   self.end.isoformat(timespec="minutes"),
            "label": self.label,
            "type":  self.type.value,
            "meta":  self.meta,
        }


@dataclass
class Defaults:
    """
    Global settings that define the boundaries of a typical day. These values
    are the baseline for scheduling unless a specific Profile overrides them.
    """
    wake_time:  str      # Expected wake-up time in "HH:MM" format
    sleep_time: str     # Expected sleep time in "HH:MM" format
    timezone:   str = "America/Chicago" # IANA timezone name

class ProjectStatus(str, Enum):
    """Defines the explicit states a project can be in."""
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    BACKLOG = "backlog"
    COMPLETED = "completed"

@dataclass
class Milestone:
    """Represents a specific, dated goal within a project."""
    description: str
    due_date: Optional[date] = None

@dataclass
class Project:
    """
    A lightweight representation of a user's active project. This provides the
    LLM with structured context to make informed scheduling decisions.
    """
    id:            str
    name:          str
    status:        ProjectStatus = ProjectStatus.ACTIVE
    current_focus: Optional[str] = None
    milestones:    List[Milestone] = field(default_factory=list)
    deadline:      Optional[date] = None


@dataclass
class Profile:
    """
    An override bundle for applying contextual changes to the schedule, such
    as for travel, holidays, or sick days. This allows for quick, temporary
    adjustments without altering the base configuration.
    """
    name: str
    overrides: Dict


@dataclass
class Categories:
    """
    User-defined categories for time tracking and analytics.
    Maps project names to category names for consistent reporting.
    """
    # Default categories that users can override
    default_categories: Dict[str, str] = field(default_factory=lambda: {
        "Echo": "Development",
        "Work": "Development",
        "Personal": "Personal",
        "Admin": "Admin",
        "Health": "Health",
        "Learning": "Learning",
        "Research": "Research",
        "Writing": "Writing",
        "Planning": "Planning"
    })

    # User can override any of these mappings
    custom_mappings: Dict[str, str] = field(default_factory=dict)

    def get_category(self, project_name: str) -> str:
        """Get the category for a project, using custom mappings first, then defaults."""
        # Check custom mappings first
        if project_name in self.custom_mappings:
            return self.custom_mappings[project_name]

        # Check default categories
        if project_name in self.default_categories:
            return self.default_categories[project_name]

        # If no mapping found, use the project name as the category
        return project_name

@dataclass
class Config:
    """Main configuration for Echo."""
    defaults: Defaults
    weekly_schedule: Dict[str, List[Dict[str, Any]]]
    projects: Dict[str, Dict[str, Any]]
    profiles: Dict[str, Dict[str, Any]]
    email: Dict[str, Any] = field(default_factory=dict)
    reminders: List[Dict[str, Any]] = field(default_factory=list)
