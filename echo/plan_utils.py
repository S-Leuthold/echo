from __future__ import annotations
from datetime import time
from typing import List

from .models import Block, BlockType
from .config_validator import ConfigValidationError, _minutes, _assert_no_overlap

def merge_plan(partial: List[Block], extra: List[Block]) -> List[Block]:
    """Combine blocks and ensure no overlaps."""
    merged = sorted([*partial, *extra], key=lambda b: b.start)

    # Re-use validator helper to catch overlaps
    spans = [
        (_minutes(b.start.strftime("%H:%M")), _minutes(b.end.strftime("%H:%M")), b.label)
        for b in merged
    ]
    _assert_no_overlap(spans, "final plan")      # raises ConfigValidationError

    return merged
