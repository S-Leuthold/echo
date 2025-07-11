from __future__ import annotations
from datetime import datetime, time, date
from typing import List
from .models import Block, BlockType, Config

def _parse_span(span: str) -> tuple[time, time]:
    start_s, end_s = [s.strip() for s in span.split("–")]
    return (time.fromisoformat(start_s), time.fromisoformat(end_s))


def build_schedule(cfg: Config, target: date) -> List[Block]:
    """Return a list of Blocks for *target* date (anchors only, v0)."""
    day_key = target.strftime("%A").lower()      # "monday"
    day_cfg = cfg.weekly_schedule.get(day_key)
    if not day_cfg:
        return []

    schedule: List[Block] = []
    for anchor in day_cfg.get("anchors", []):
        start_t, end_t = _parse_span(anchor["time"])
        block = Block(
            start=start_t,
            end=end_t,
            label=anchor["task"],
            type=BlockType.ANCHOR,
            meta={"recurrence": anchor.get("recurrence", "one-off")},
        )
        schedule.append(block)

    schedule.sort(key=lambda b: b.start)
    return schedule
