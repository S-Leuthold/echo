
import pytest, json
from datetime import date, time
from echo.config_loader import load_config
from echo.scheduler       import build_schedule
from echo.prompt_engine   import parse_response
from echo.plan_utils      import merge_plan
from echo.config_validator import ConfigValidationError

CFG     = load_config("config/sample_config.yaml")
PARTIAL = build_schedule(CFG, date(2025, 6, 16))

good_extra_json = """
[
  {"start":"06:00","end":"07:30","label":"Deep work — MIR",
   "emoji":"📝", "title":"Deep work — MIR", "type":"flex"},

  {"start":"09:00","end":"10:00",
   "emoji":"📋", "title":"Admin sweep", "label":"Admin sweep", "type":"flex"}
]
"""


bad_extra_json = """
[
  {"start":"08:05","end":"09:00",
   "emoji":"⚠️", "title":"Overlap block", "type":"flex"}
]
"""


def test_merge_ok():
    extra = parse_response(good_extra_json)
    final = merge_plan(PARTIAL, extra)
    assert final[-1].label.endswith("Admin sweep")


def test_merge_overlap_raises():
    extra = parse_response(bad_extra_json)
    with pytest.raises(ConfigValidationError):
        merge_plan(PARTIAL, extra)
