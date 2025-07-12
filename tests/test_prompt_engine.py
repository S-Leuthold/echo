import json, pytest
from datetime import date
from echo.config_loader import load_config
from echo.scheduler     import build_schedule
from echo.prompt_engine import build_prompt, parse_response

CFG     = load_config("config/sample_config.yaml")
PARTIAL = build_schedule(CFG, date(2025, 6, 16))
NOTES   = {
    "Priority": "Deep work on MIR methods",
    "Energy":   "Feeling fresh after rest day",
    "Constraints": "Call with mom at 19:00",
}

def test_prompt_includes_notes_and_blocks():
    prompt = build_prompt(CFG, PARTIAL, NOTES, date(2025, 6, 16))
    assert "Deep work on MIR methods" in prompt
    assert "Meeting with P. Lewis" in prompt

def test_parse_roundtrip():
    sample = json.dumps([{
        "start":"09:00","end":"10:30","emoji":"📝",
        "title":"Deep Work — MIR","note":"Write abstract","type":"flex"
    }])
    blocks = parse_response(sample)
    assert blocks[0].label.startswith("📝 Deep Work")
    assert blocks[0].meta["note"] == "Write abstract"
