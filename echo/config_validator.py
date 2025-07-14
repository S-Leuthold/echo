# ==============================================================================
# FILE: echo/config_validator.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Performs semantic validation checks on a fully-formed `Config` object.
#   This module ensures the configuration is logically consistent and free of
#   errors like overlapping events or invalid time formats that cannot be
#   caught by the initial `config_loader`.
#
# DEPENDS ON:
#   - echo.models (The Config object and its constituent parts)
#
# DEPENDED ON BY:
#   - echo.config_loader (Calls `validate_config` as its final step)
#   - tests.test_validator (Contains unit tests for these functions)
# ==============================================================================

from __future__ import annotations
from datetime import time
from typing import List, Tuple, Dict, Any

from .models import Config

# --------------------------------------------------------------------------- #
# Custom Exception for Clear Error Reporting
# --------------------------------------------------------------------------- #

class ConfigValidationError(ValueError):
    """Raised when a config object fails semantic validation checks."""
    pass

# --------------------------------------------------------------------------- #
# Private Helper Functions
# --------------------------------------------------------------------------- #

def _validate_time_format(time_str: str, context: str) -> time:
    """Ensures a string is a valid 'HH:MM' time, returning a `time` object."""
    try:
        return time.fromisoformat(time_str)
    except ValueError:
        raise ConfigValidationError(f"Invalid time format for {context}: '{time_str}'. Must be HH:MM.")

def _validate_no_overlap(spans: List[Tuple[int, int, str]], day: str) -> None:
    """Checks a list of time spans for any overlaps."""
    # A span is a tuple of (start_minutes, end_minutes, label)
    spans.sort(key=lambda s: s[0])  # Sort by start time

    for i in range(1, len(spans)):
        prev_end = spans[i-1][1]
        curr_start = spans[i][0]
        if curr_start < prev_end:
            prev_label = spans[i-1][2]
            curr_label = spans[i][2]
            raise ConfigValidationError(
                f"Schedule overlap on {day}: '{curr_label}' conflicts with '{prev_label}'."
            )

def _validate_defaults(cfg: Config) -> None:
    """Validates the [defaults] section of the config."""
    _validate_time_format(cfg.defaults.wake_time, "defaults.wake_time")
    _validate_time_format(cfg.defaults.sleep_time, "defaults.sleep_time")
    # We could add a check here to ensure wake_time is before sleep_time if needed.

def _validate_projects(cfg: Config) -> None:
    """Validates the [projects] section of the config."""
    # Currently, we just ensure IDs are unique, which is handled by dict keys.
    # This is a placeholder for future, more complex project validation.
    # For example, ensuring a milestone's due_date is before the project deadline.
    pass

def _validate_weekly_schedule(cfg: Config) -> None:
    """Validates the [weekly_schedule] section for time formats and overlaps."""
    for day, day_config in cfg.weekly_schedule.items():
        spans_for_day = []

        # Combine 'anchors' and 'fixed' blocks for overlap checking
        fixed_events = day_config.get("anchors", []) + day_config.get("fixed", [])

        for event in fixed_events:
            label = event.get("label") or event.get("task", "Untitled Event")
            time_range = event.get("time")

            if not time_range:
                raise ConfigValidationError(f"Missing 'time' for event '{label}' on {day}.")

            try:
                start_str, end_str = [s.strip() for s in time_range.split("–")]
            except ValueError:
                raise ConfigValidationError(
                    f"Event '{label}' on {day} has malformed time range '{time_range}'. "
                    "Must be 'HH:MM – HH:MM' using an en-dash (–)."
                )

            start_t = _validate_time_format(start_str, f"{day} event '{label}' start")
            end_t = _validate_time_format(end_str, f"{day} event '{label}' end")

            if start_t >= end_t:
                raise ConfigValidationError(
                    f"Event '{label}' on {day} has a start time after its end time."
                )

            start_minutes = start_t.hour * 60 + start_t.minute
            end_minutes = end_t.hour * 60 + end_t.minute
            spans_for_day.append((start_minutes, end_minutes, label))

        _validate_no_overlap(spans_for_day, day)


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #

def validate_config(cfg: Config) -> None:
    """
    Runs all semantic checks on the Config object. Raises on first failure.
    """
    ## --------------------------------------------------------
    ## Step 1: Validate [defaults]
    ## --------------------------------------------------------
    _validate_defaults(cfg)

    ## --------------------------------------------------------
    ## Step 2: Validate [projects]
    ## --------------------------------------------------------
    _validate_projects(cfg)

    ## --------------------------------------------------------
    ## Step 3: Validate [weekly_schedule]
    ## --------------------------------------------------------
    _validate_weekly_schedule(cfg)
