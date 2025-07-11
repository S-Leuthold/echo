"""
echo.config_loader
==================

Transforms a validated YAML file into strongly-typed Python dataclasses
defined in :pymod:`echo.models`.  This is the *single* pathway from disk
configuration to in-memory objects used by the scheduler, prompt engine,
and future UI layers.

Responsibilities
----------------
1.  Parse YAML safely (no `!!python/object` tags allowed).
2.  Enforce presence and canonical ordering of the four top-level keys:
        defaults → weekly_schedule → projects → profiles
3.  Map raw dictionaries to dataclass instances:
        * Defaults
        * Project
        * Profile
4.  Surface *early* configuration errors via custom exceptions so that
    CLI users receive actionable messages rather than stack traces.

References
----------
* Config Schema              : docs/config_schema.md
* Data Models                : echo.models
* Vision & Operating Principles : docs/01_vision_and_principles.md

Maintenance Notes
-----------------
* Keep `TOP_LEVEL_KEYS` in sync with the linter script (lint_config.py).
* Any new dataclass fields must be populated here **and** documented in
  the schema doc.
* Avoid heavy validation in this loader; structural checks belong in
  :pymod:`echo.config_validator` so unit tests stay focused.

Author:  Sam
Created: 2025-07-12
"""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List

import yaml

from .models import Config, Defaults, Project, Profile

# --------------------------------------------------------------------------- #
# Exceptions
# --------------------------------------------------------------------------- #


class ConfigKeyError(ValueError):
    """Raised when required keys are missing or extra keys are present."""


class ConfigTypeError(ValueError):
    """Raised when a key exists but its value has the wrong Python type."""


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
# Loader helpers
# --------------------------------------------------------------------------- #


def _assert_keys(obj: Dict, *, ctx: str, required: List[str]) -> None:
    """Ensure *obj* contains exactly *required* keys (no more, no less)."""
    missing = [k for k in required if k not in obj]
    extra = [k for k in obj if k not in required]
    if missing or extra:
        raise ConfigKeyError(
            f"{ctx} keys mismatch — missing: {missing}  extra: {extra}"
        )

# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

from .config_validator import validate_config   # keep import at module level


def load_config(path: str | Path) -> Config:
    """Load YAML → Config object and run semantic validation."""
    path = Path(path).expanduser()
    if not path.exists():
        raise FileNotFoundError(path)

    raw: Dict = yaml.safe_load(path.read_text())

    # Enforce canonical top-level keys
    _assert_keys(raw, ctx="config root", required=TOP_LEVEL_KEYS)

    # --- defaults ---------------------------------------------------------- #
    try:
        defaults = Defaults(**raw["defaults"])
    except TypeError as exc:
        raise ConfigTypeError("defaults section error") from exc

    # --- projects ---------------------------------------------------------- #
    projects = {}
    for pid, pdata in raw["projects"].items():
        try:
            projects[pid] = Project(id=pid, **pdata)
        except TypeError as exc:
            raise ConfigTypeError(f"projects[{pid}] section error") from exc

    # --- profiles ---------------------------------------------------------- #
    profiles = {}
    for name, pdata in raw["profiles"].items():
        try:
            profiles[name] = Profile(name=name, **pdata)
        except TypeError as exc:
            raise ConfigTypeError(f"profiles[{name}] section error") from exc

    # Build Config object
    cfg = Config(
        defaults=defaults,
        weekly_schedule=raw["weekly_schedule"],
        projects=projects,
        profiles=profiles,
    )

    # Run semantic validator (raises ConfigValidationError on failure)
    validate_config(cfg)

    return cfg
