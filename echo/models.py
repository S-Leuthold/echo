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
from datetime import time, date
from enum import Enum
from typing import Dict, List, Optional

# Defines the public API for this module.
__all__ = [
    "BlockType",
    "Block",
    "Defaults",
    "Project",
    "Profile",
    "Config",
]


class BlockType(str, Enum):
    """
    The canonical set of categories for any element on the schedule.
    Using an Enum here prevents ambiguity and typo-related bugs.
    """
    ANCHOR = "anchor"   # A fixed, non-negotiable event (e.g., wake-up, sleep)
    FIXED  = "fixed"    # A scheduled appointment with a hard start/end time
    FLEX   = "flex"     # A task that can be moved by the LLM (e.g., deep work)


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
    """
    The root configuration object for the entire Echo system. It is constructed
    by the `config_loader` and serves as the primary input for all subsequent
    planning and scheduling operations.
    """
    defaults:        Defaults
    weekly_schedule: Dict[str, List[Dict]]
    projects:        Dict[str, Project]
    profiles:        Dict[str, Profile]
    categories:      Categories = field(default_factory=Categories)
