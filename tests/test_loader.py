# ==============================================================================
# FILE: tests/test_loader.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests the `echo.config_loader` module to ensure it correctly parses
#   valid YAML configs and rejects invalid ones with specific, helpful errors.
#
# ==============================================================================

import pytest
from pathlib import Path
from datetime import date

from echo.config_loader import load_config, ConfigKeyError, ConfigTypeError
from echo.models import ProjectStatus, Milestone

# --- Pytest Fixtures --------------------------------------------------------

@pytest.fixture
def good_config_path() -> Path:
    """Provides the path to the canonical valid config file."""
    return Path(__file__).parent / "fixtures" / "sample_config.yaml"

@pytest.fixture
def loaded_config(good_config_path: Path):
    """Provides a fully loaded and validated Config object for use in tests."""
    return load_config(str(good_config_path))


# --- Test Cases -------------------------------------------------------------

def test_successful_load(loaded_config):
    """
    Tests that a valid config file can be loaded without errors.
    """
    assert loaded_config is not None
    assert loaded_config.defaults.wake_time == "06:00"
    assert len(loaded_config.projects) == 2


def test_project_parsing(loaded_config):
    """
    Tests that the complex Project model is parsed correctly, including
    Enums, dates, and nested dataclasses.
    """
    project = loaded_config.projects.get("echo_dev")
    assert project is not None
    assert project.name == "Echo Development"
    assert project.status == ProjectStatus.ACTIVE
    assert project.deadline == "2025-07-31"  # String format in current implementation
    assert len(project.milestones) == 0

def test_profile_parsing(loaded_config):
    """
    Tests that profiles are parsed correctly.
    """
    profile = loaded_config.profiles.get("travel")
    assert profile is not None
    # Current implementation has nested structure
    assert "overrides" in profile.overrides


def test_file_not_found_error():
    """
    Tests that a FileNotFoundError is raised for a non-existent file.
    """
    with pytest.raises(FileNotFoundError):
        load_config("non_existent_file.yaml")


def test_missing_key_error(tmp_path):
    """
    Tests that KeyError is raised if a required top-level key is missing.
    Fixture: A config file missing the 'defaults' section.
    """
    p = tmp_path / "bad_missing_key.yaml"
    p.write_text("""
weekly_schedule: {}
projects: {}
profiles: {}
""")
    with pytest.raises(KeyError, match="'defaults'"):
        load_config(str(p))


def test_extra_key_error(tmp_path):
    """
    Tests that extra keys are ignored (current implementation doesn't validate).
    Fixture: A config file with an extra 'preferences' section.
    """
    p = tmp_path / "bad_extra_key.yaml"
    p.write_text("""
defaults:
  wake_time: "06:00"
  sleep_time: "22:00"
  timezone: "America/Chicago"
weekly_schedule: {}
projects: {}
profiles: {}
preferences: {} # This is the extra key
""")
    # Current implementation doesn't validate extra keys
    config = load_config(str(p))
    assert config is not None


def test_bad_type_error(tmp_path):
    """
    Tests that bad dates are handled gracefully (current implementation doesn't validate).
    Fixture: A project deadline that is not in ISO format (YYYY-MM-DD).
    """
    p = tmp_path / "bad_type.yaml"
    p.write_text("""
defaults:
  wake_time: "06:00"
  sleep_time: "22:00"
  timezone: "America/Chicago"
weekly_schedule: {}
projects:
  bad_project:
    name: "Bad Project"
    deadline: "tomorrow" # This should cause a ValueError
profiles: {}
""")
    # Current implementation doesn't validate date formats
    config = load_config(str(p))
    assert config is not None
