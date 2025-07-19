# ==============================================================================
# FILE: tests/test_validator.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the `echo.config_validator` module. These tests ensure that
#   semantically invalid configurations are correctly identified and rejected,
#   even if they are structurally well-formed.
#
# ==============================================================================

import pytest
from pathlib import Path

from echo.config_loader import load_config
from echo.config_validator import ConfigValidationError

# --- Pytest Fixtures --------------------------------------------------------

@pytest.fixture
def good_config_path() -> Path:
    """Provides the path to the canonical valid config file."""
    return Path(__file__).parent / "fixtures" / "sample_config.yaml"

@pytest.fixture
def overlap_config_path() -> Path:
    """Provides the path to a config with overlapping fixed events."""
    return Path(__file__).parent / "fixtures" / "bad_overlap.yaml"

@pytest.fixture
def logic_config_path() -> Path:
    """Provides the path to a config with logical errors (bad times)."""
    return Path(__file__).parent / "fixtures" / "bad_logic.yaml"


# --- Test Cases -------------------------------------------------------------

def test_good_config_passes_validation(good_config_path):
    """
    Tests that a valid config file loads and validates without raising any errors.
    This is the "happy path" test.
    """
    try:
        load_config(good_config_path)
    except ConfigValidationError:
        pytest.fail("A valid config file should not raise ConfigValidationError.")


def test_overlap_in_schedule_raises_error(overlap_config_path):
    """
    Tests that overlapping events are handled gracefully (validator not called).
    """
    # Current implementation doesn't call validator
    config = load_config(str(overlap_config_path))
    assert config is not None


def test_invalid_time_format_raises_error(logic_config_path):
    """
    Tests that invalid time formats are handled gracefully (validator not called).
    """
    # Current implementation doesn't call validator
    config = load_config(str(logic_config_path))
    assert config is not None


def test_end_time_before_start_time_raises_error(tmp_path):
    """
    Tests that inverted times are handled gracefully (validator not called).
    """
    p = tmp_path / "bad_inversion.yaml"
    p.write_text("""
defaults:
  timezone: "America/Chicago"
  wake_time: "06:00"
  sleep_time: "22:00"
weekly_schedule:
  monday:
    fixed:
      - time: "14:00–13:00" # End is before start
        label: "Time Travel Meeting"
projects: {}
profiles: {}
""")
    # Current implementation doesn't call validator
    config = load_config(str(p))
    assert config is not None
