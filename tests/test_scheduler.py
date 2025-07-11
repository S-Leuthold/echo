from datetime import date
from echo.config_loader import load_config
from echo.scheduler import build_schedule, BlockType

CFG = load_config("config/sample_config.yaml")

def test_anchor_only():
    plan = build_schedule(CFG, date(2025, 6, 16))   # Monday
    assert plan[0].type is BlockType.ANCHOR
    assert plan[0].label.startswith("Meeting")
