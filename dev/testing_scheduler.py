from datetime import date
from echo.config_loader import load_config
from echo.scheduler import build_schedule

cfg = load_config("config/sample_config.yaml")
plan = build_schedule(cfg, date(2025, 6, 16))   # Monday
for blk in plan:
    print(blk.start, blk.end, blk.label)
