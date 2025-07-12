# tests/test_validator.py
import pytest                       
from echo.config_loader import load_config
from echo.config_validator import ConfigValidationError

def test_good_config_validates():
    cfg = load_config("config/user_config.yaml")
    assert cfg.defaults.wake_time == "05:25"

def test_invalid_fixed_time_raises():
    with pytest.raises(ConfigValidationError):
        load_config("tests/fixtures/bad_fixed_time.yaml")

def test_overlap_raises():
    with pytest.raises(ConfigValidationError):
        load_config("tests/fixtures/bad_overlap.yaml")
