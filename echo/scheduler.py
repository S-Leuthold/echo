# echo/scheduler.py
from __future__ import annotations
from datetime import date, time
from typing import List

from .models import Block, BlockType, Config


def _parse_span(span: str) -> tuple[time, time]:
    start_s, end_s = [s.strip() for s in span.split("–")]
    return (time.fromisoformat(start_s), time.fromisoformat(end_s))


def build_schedule(cfg: Config, target: date) -> List[Block]:
    """Return an ordered list of Blocks (anchors + fixed) for *target*."""
    day_key = target.strftime("%A").lower()          # "monday"
    day_cfg = cfg.weekly_schedule.get(day_key, {})
    sched: List[Block] = []

    # ---- anchors --------------------------------------------------------
    for anchor in day_cfg.get("anchors", []):
        start_t, end_t = _parse_span(anchor["time"])
        sched.append(
            Block(
                start=start_t,
                end=end_t,
                label=anchor["task"],
                type=BlockType.ANCHOR,
                meta={"recurrence": anchor.get("recurrence", "one-off")},
            )
        )

    # ---- fixed ----------------------------------------------------------
    for fixed in day_cfg.get("fixed", []):
        start_t, end_t = _parse_span(fixed["time"])
        sched.append(
            Block(
                start=start_t,
                end=end_t,
                label=fixed["label"],
                type=BlockType.FIXED,
                meta={"source": fixed.get("source", "manual")},
            )
        )

    # Order by start-time
    sched.sort(key=lambda b: b.start)
    return sched
