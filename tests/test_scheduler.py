from datetime import date
from echo.config_loader import load_config
from echo.scheduler import build_schedule, BlockType

CFG = load_config("config/sample_config.yaml")

def test_anchor_and_fixed_order():
    plan = build_schedule(CFG, date(2025, 6, 16))   # Monday
    types = [blk.type for blk in plan]
    assert types == [BlockType.ANCHOR, BlockType.FIXED]
    assert plan[1].label.startswith("Meeting with P. Lewis")