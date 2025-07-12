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
# Time check helper
# ---------------------------------------------------------------------

# replace _assert_hhmm helper
from datetime import time as _time

def _assert_hhmm(hhmm: str, ctx: str) -> None:
    """Ensure *hhmm* is a real 24-hour time like '13:45'."""
    try:
        _time.fromisoformat(hhmm)          # raises ValueError on 24:00 or 13:60
    except ValueError:
        raise ConfigValidationError(f"{ctx}: invalid time '{hhmm}'")

# ---------------------------------------------------------------------
# Overlap helper
# ---------------------------------------------------------------------
def _minutes(t: str) -> int:
    """Convert 'HH:MM' → minutes since midnight."""
    hh, mm = map(int, t.split(":"))
    return hh * 60 + mm


def _assert_no_overlap(spans, day):
    """spans = [(start_min, end_min, label)]"""
    spans.sort(key=lambda s: s[0])            # sort by start
    for i in range(1, len(spans)):
        prev_start, prev_end, prev_lbl = spans[i - 1]
        cur_start,  cur_end,  cur_lbl  = spans[i]
        if cur_start < prev_end:              # overlap
            raise ConfigValidationError(
                f"{day}: '{cur_lbl}' overlaps '{prev_lbl}'"
            )


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------


def validate_config(cfg: Config) -> None:
    """Run all semantic checks. Raises on first failure."""
    # 1. Defaults – wake & sleep ------------------------------------------
    _assert_hhmm(cfg.defaults.wake_time,  "defaults.wake_time")
    _assert_hhmm(cfg.defaults.sleep_time, "defaults.sleep_time")

    # 2. Project IDs unique -----------------------------------------------
    if len(cfg.projects) != len(set(cfg.projects)):
        raise ConfigValidationError("duplicate project IDs detected")

    # 3. Weekly schedule times (anchors + fixed) --------------------------
    for day, day_cfg in cfg.weekly_schedule.items():
        for bucket, blocks in (
            ("anchor", day_cfg.get("anchors", [])),
            ("fixed",  day_cfg.get("fixed",   [])),
        ):
            for blk in blocks:
                span = blk["time"]
                try:
                    start_s, end_s = span.split("–")
                except ValueError:
                    raise ConfigValidationError(
                        f"{day} {bucket} '{blk.get('task', blk.get('label'))}' "
                        "time must use EN-DASH (–) between start and end"
                    )
                _assert_hhmm(start_s.strip(), f"{day} {bucket}.start")
                _assert_hhmm(end_s.strip(),   f"{day} {bucket}.end")
    
    # 4. Overlap check (anchors + fixed) ----------------------------------
    for day, day_cfg in cfg.weekly_schedule.items():
        spans = []
        for bucket, blocks in (
            ("anchor", day_cfg.get("anchors", [])),
            ("fixed",  day_cfg.get("fixed",   [])),
        ):
            for blk in blocks:
                start_s, end_s = [s.strip() for s in blk["time"].split("–")]
                spans.append((_minutes(start_s), _minutes(end_s), blk.get("label") or blk.get("task")))
        _assert_no_overlap(spans, day)
