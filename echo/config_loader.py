# ==============================================================================
# FILE: echo/config_loader.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Transforms a validated YAML file into the strongly-typed Python dataclasses
#   defined in `echo.models`. This is the single pathway from disk
#   configuration to the in-memory objects used by the rest of the application.
#
# DEPENDS ON:
#   - echo.models (Defines the target dataclasses: Config, Project, etc.)
#   - echo.config_validator (Provides the final validation step)
#
# DEPENDED ON BY:
#   - echo.cli (Uses `load_config` as the entry point for a session)
#   - tests.test_loader (Validates the loading logic)
# ==============================================================================

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Any
from datetime import date
import yaml

from .models import Config, Defaults, Project, Profile, Milestone, ProjectStatus

# This import is deferred to the function scope to prevent potential
# circular dependencies if the validator module were to evolve.
from .config_validator import validate_config

# --------------------------------------------------------------------------- #
# Custom Exceptions for Clear Error Reporting
# --------------------------------------------------------------------------- #

class ConfigLoadError(Exception):
    """Base exception for all configuration loading errors."""
    pass

class ConfigKeyError(ConfigLoadError):
    """Raised when required keys are missing or extra keys are present."""
    pass

class ConfigTypeError(ConfigLoadError):
    """Raised when a key's value has an incorrect or unparsable type."""
    pass

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #

TOP_LEVEL_KEYS: List[str] = [
    "defaults",
    "weekly_schedule",
    "projects",
    "profiles",
]

# --------------------------------------------------------------------------- #
# Private Helper Functions
# --------------------------------------------------------------------------- #

def _assert_keys(obj: Dict, *, ctx: str, required: List[str]) -> None:
    """Ensures an object contains exactly the required set of keys."""
    obj_keys = set(obj.keys())
    req_keys = set(required)
    missing = req_keys - obj_keys
    extra = obj_keys - req_keys
    if missing or extra:
        error_parts = []
        if missing:
            error_parts.append(f"missing keys: {sorted(list(missing))}")
        if extra:
            error_parts.append(f"extra keys: {sorted(list(extra))}")
        raise ConfigKeyError(f"Invalid keys in '{ctx}': " + " and ".join(error_parts))


def _parse_project(pid: str, pdata: Dict[str, Any]) -> Project:
    """Parses a raw dictionary from YAML into a structured Project object."""
    try:
        # 1. Pop and parse structured fields first
        status_str = pdata.pop("status", "active")
        status = ProjectStatus(status_str.lower())

        deadline_str = pdata.pop("deadline", None)
        deadline = date.fromisoformat(deadline_str) if deadline_str else None

        milestones_data = pdata.pop("milestones", [])
        milestones = []
        for i, m_data in enumerate(milestones_data):
            due_date_str = m_data.pop("due_date", None)
            due_date = date.fromisoformat(due_date_str) if due_date_str else None
            milestones.append(Milestone(due_date=due_date, **m_data))

        # 2. The remaining keys should match the dataclass fields
        return Project(
            id=pid,
            status=status,
            deadline=deadline,
            milestones=milestones,
            **pdata # Passes name, current_focus, etc.
        )
    except (TypeError, ValueError) as exc:
        # Catch errors from Enum creation, date parsing, or unexpected kwargs
        raise ConfigTypeError(f"Failed to parse project '{pid}'") from exc


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def load_config(path: str | Path) -> Config:
    """
    Loads a user configuration from a YAML file, instantiates the data models,
    and runs semantic validation.
    """
    ## --------------------------------------------------------
    ## Step 1: Read and Parse the YAML File
    ## --------------------------------------------------------
    path = Path(path).expanduser()
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found at: {path}")

    raw: Dict = yaml.safe_load(path.read_text())
    _assert_keys(raw, ctx="config root", required=TOP_LEVEL_KEYS)

    ## --------------------------------------------------------
    ## Step 2: Build Dataclasses from Raw Dictionaries
    ## --------------------------------------------------------
    try:
        defaults = Defaults(**raw["defaults"])

        projects = {
            pid: _parse_project(pid, pdata)
            for pid, pdata in raw.get("projects", {}).items()
        }

        profiles = {
            name: Profile(name=name, **pdata)
            for name, pdata in raw.get("profiles", {}).items()
        }

    except TypeError as exc:
        # This catches errors like Defaults(non_existent_field="...")
        raise ConfigTypeError("A section contains an unknown field") from exc

    ## --------------------------------------------------------
    ## Step 3: Assemble and Validate the Final Config Object
    ## --------------------------------------------------------
    cfg = Config(
        defaults=defaults,
        weekly_schedule=raw["weekly_schedule"],
        projects=projects,
        profiles=profiles,
    )

    # Run final cross-field validation (e.g., check for time overlaps)
    validate_config(cfg)

    return cfg
