# echo/config_validator.py
"""
Semantic checks that run *after* load_config() has produced a Config.

Only structural issues that can’t be caught by plain key-presence logic
belong here (invalid times, duplicate IDs, etc.).
"""

from __future__ import annotations
import re
from datetime import time

from .models import Config, BlockType

# ---------------------------------------------------------------------
# Exceptions
# ---------------------------------------------------------------------


class ConfigValidationError(ValueError):
    """Raised when config passes loader but fails semantic checks."""


# ---------------------------------------------------------------------
# Helper regex
# ---------------------------------------------------------------------

TIME_RE = re.compile(r"^\d{2}:\d{2}$")  # HH:MM 24-h


def _assert_hhmm(hhmm: str, ctx: str) -> None:
    """Ensure *hhmm* matches 'HH:MM'."""
    if not TIME_RE.match(hhmm):
        raise ConfigValidationError(f"{ctx}: invalid time '{hhmm}'")


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------


def validate_config(cfg: Config) -> None:
    """Run all semantic checks. Raises on first failure."""
    # 1. Defaults – wake & sleep
    _assert_hhmm(cfg.defaults.wake_time, "defaults.wake_time")
    _assert_hhmm(cfg.defaults.sleep_time, "defaults.sleep_time")

    # 2. Project IDs unique (loader already ensures, but future-proof)
    if len(cfg.projects) != len(set(cfg.projects)):
        raise ConfigValidationError("duplicate project IDs detected")

    # 3. Weekly schedule anchor times (HH:MM–HH:MM)
    for day, day_cfg in cfg.weekly_schedule.items():
        anchors = day_cfg.get("anchors", [])
        for anchor in anchors:
            span = anchor["time"]
            try:
                start_s, end_s = span.split("–")
            except ValueError:
                raise ConfigValidationError(
                    f"{day} anchor '{anchor['task']}' "
                    "time must use EN-DASH (–) between start and end"
                )
            _assert_hhmm(start_s.strip(), f"{day} anchor.start")
            _assert_hhmm(end_s.strip(), f"{day} anchor.end")
