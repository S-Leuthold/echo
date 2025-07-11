"""
echo.models
===========

Typed data structures used across Echo’s core engine.

This module defines:

* BlockType  – canonical enum for schedule element categories.
* Block      – runtime representation of a single scaffold block.
* Defaults   – global time and locale settings.
* Project    – lightweight project metadata (deadlines, milestones).
* Profile    – override bundles for travel / special contexts.
* Config     – root object produced by `load_config()`.

References
----------
* Vision & Operating Principles : docs/01_vision_and_principles.md
* Product Requirements Document : docs/02_echo_prd.md
* Config Schema                 : docs/config_schema.md


Maintenance
-----------
Keep dataclass field names in sync with:
    - YAML keys consumed in `echo.config_loader`
    - JSON contract emitted by future mobile/desktop UIs

Author:  Sam Leuthold
Created: 2025-07-11

"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import time
from enum import Enum
from typing import Dict, List, Optional

__all__ = [
    "BlockType",
    "Block",
    "Defaults",
    "Project",
    "Profile",
    "Config",
]


class BlockType(str, Enum):
    """Canonical categories for schedule elements."""

    ANCHOR = "anchor"
    FIXED  = "fixed"
    FLEX   = "flex"
    BUFFER = "buffer"


@dataclass
class Block:
    """Runtime representation of a single scaffold block.

    Fields
    -------
    start : datetime.time
        Local start time of the block.
    end   : datetime.time
        Local end time of the block (non-inclusive).
    label : str
        Human-readable description, e.g. "Deep Work — MIR Stack".
    type  : BlockType
        One of ``BlockType.ANCHOR | FIXED | FLEX | BUFFER``.
    meta  : Dict[str, str], optional
        Arbitrary key/value pairs (e.g. project_id, location).
    """

    start: time
    end: time
    label: str
    type: BlockType
    meta: Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        """Serialize to a JSON-safe dict for CLI or UI layers."""
        return {
            "start": self.start.isoformat(timespec="minutes"),
            "end": self.end.isoformat(timespec="minutes"),
            "label": self.label,
            "type": self.type.value,
            "meta": self.meta,
        }


@dataclass
class Defaults:
    """Global settings that apply unless a profile overrides them.

    Fields
    -------
    wake_time : str
        HH:MM 24-hour string (local timezone).
    sleep_time : str
        HH:MM 24-hour string (local timezone).
    timezone : str, optional
        IANA TZ name, default ``America/Chicago``.
    """

    wake_time:  str
    sleep_time: str
    timezone:   str = "America/Chicago"


@dataclass
class Project:
    """Minimal project metadata for momentum surfacing.

    Fields
    -------
    id : str
        Unique identifier (matches YAML key).
    name : str
        Display name shown in prompts.
    milestones : list[str], optional
        Text descriptions of major deliverables.
    status : str, optional
        Current short status used in planning context.
    """

    id: str
    name: str
    milestones: List[str] = field(default_factory=list)
    status: str = ""


@dataclass
class Profile:
    """Override bundle (e.g. travel mode) applied on demand.

    Fields
    -------
    name : str
        Profile identifier.
    overrides : dict
        Arbitrary YAML tree that deep-merges onto the base config.
    """

    name: str
    overrides: Dict


@dataclass
class Config:
    """Root configuration object produced by ``load_config``."""

    defaults: Defaults
    weekly_schedule: Dict[str, List[Dict]]
    projects: Dict[str, Project]
    profiles: Dict[str, Profile]