# ==============================================================================
# FILE: tests/test_loader.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Tests for the configuration loader functionality.
#
# ==============================================================================

import pytest
from pathlib import Path
from unittest.mock import patch, mock_open
import tempfile
import shutil

from echo.config_loader import load_config, substitute_env_vars
from echo.models import Config, Defaults


class TestConfigLoader:
    """Test configuration loading functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.config_dir.mkdir()
    
    def teardown_method(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
    
    def test_substitute_env_vars(self):
        """Test environment variable substitution."""
        # Test with environment variable
        with patch.dict('os.environ', {'TEST_VAR': 'test_value'}):
            result = substitute_env_vars("${TEST_VAR}")
            assert result == "test_value"
        
        # Test with non-existent variable
        result = substitute_env_vars("${NON_EXISTENT}")
        assert result == "${NON_EXISTENT}"
        
        # Test with regular string
        result = substitute_env_vars("regular_string")
        assert result == "regular_string"
        
        # Test with dictionary
        test_dict = {
            "key1": "${TEST_VAR}",
            "key2": "regular_value",
            "nested": {
                "key3": "${TEST_VAR}"
            }
        }
        
        with patch.dict('os.environ', {'TEST_VAR': 'test_value'}):
            result = substitute_env_vars(test_dict)
            assert result["key1"] == "test_value"
            assert result["key2"] == "regular_value"
            assert result["nested"]["key3"] == "test_value"
        
        # Test with list
        test_list = ["${TEST_VAR}", "regular_value"]
        
        with patch.dict('os.environ', {'TEST_VAR': 'test_value'}):
            result = substitute_env_vars(test_list)
            assert result[0] == "test_value"
            assert result[1] == "regular_value"
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_config_success(self, mock_file, mock_exists):
        """Test successful configuration loading."""
        mock_exists.return_value = True
        
        config_content = """
defaults:
  wake_time: "07:00"
  sleep_time: "22:00"

weekly_schedule:
  monday:
    anchors:
      - time: "06:00-06:30"
        task: "Morning Reading"

projects:
  echo_dev:
    name: "Echo Development"
    status: "active"

profiles:
  travel:
    overrides:
      defaults:
        wake_time: "08:00"

email:
  important_senders: ["ceo@company.com"]
  urgent_keywords: ["urgent", "asap"]
"""
        
        mock_file.return_value.read.return_value = config_content
        
        config = load_config()
        
        assert isinstance(config, Config)
        assert config.defaults.wake_time == "07:00"
        assert config.defaults.sleep_time == "22:00"
        assert "monday" in config.weekly_schedule
        assert "echo_dev" in config.projects
        assert "travel" in config.profiles
        assert "important_senders" in config.email
    
    @patch('pathlib.Path.exists')
    def test_load_config_file_not_found(self, mock_exists):
        """Test handling of missing configuration file."""
        mock_exists.return_value = False
        
        with pytest.raises(SystemExit):
            load_config()
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_config_with_env_vars(self, mock_file, mock_exists):
        """Test configuration loading with environment variable substitution."""
        mock_exists.return_value = True
        
        config_content = """
defaults:
  wake_time: "${WAKE_TIME}"
  sleep_time: "22:00"

email:
  client_id: "${EMAIL_CLIENT_ID}"
"""
        
        mock_file.return_value.read.return_value = config_content
        
        with patch.dict('os.environ', {
            'WAKE_TIME': '06:00',
            'EMAIL_CLIENT_ID': 'test-client-id'
        }):
            config = load_config()
            
            assert config.defaults.wake_time == "06:00"
            assert config.defaults.sleep_time == "22:00"
            assert config.email["client_id"] == "test-client-id"
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_config_minimal(self, mock_file, mock_exists):
        """Test loading minimal configuration."""
        mock_exists.return_value = True
        
        config_content = """
defaults:
  wake_time: "07:00"
  sleep_time: "22:00"
"""
        
        mock_file.return_value.read.return_value = config_content
        
        config = load_config()
        
        assert isinstance(config, Config)
        assert config.defaults.wake_time == "07:00"
        assert config.defaults.sleep_time == "22:00"
        assert config.weekly_schedule == {}
        assert config.projects == {}
        assert config.profiles == {}
        assert config.email == {}
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_config_with_complex_schedule(self, mock_file, mock_exists):
        """Test loading configuration with complex weekly schedule."""
        mock_exists.return_value = True
        
        config_content = """
defaults:
  wake_time: "07:00"
  sleep_time: "22:00"

weekly_schedule:
  monday:
    anchors:
      - time: "06:00-06:30"
        task: "Morning Reading"
    fixed:
      - time: "12:00-12:30"
        label: "Team Standup"
        meta:
          source: "gcal"
  
  tuesday:
    anchors:
      - time: "06:00-06:30"
        task: "Morning Reading"
    fixed: []
  
  wednesday:
    anchors: []
    fixed: []
"""
        
        mock_file.return_value.read.return_value = config_content
        
        config = load_config()
        
        assert "monday" in config.weekly_schedule
        assert "tuesday" in config.weekly_schedule
        assert "wednesday" in config.weekly_schedule
        
        monday = config.weekly_schedule["monday"]
        assert len(monday["anchors"]) == 1
        assert len(monday["fixed"]) == 1
        assert monday["anchors"][0]["task"] == "Morning Reading"
        assert monday["fixed"][0]["label"] == "Team Standup"
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_config_with_projects(self, mock_file, mock_exists):
        """Test loading configuration with projects."""
        mock_exists.return_value = True
        
        config_content = """
defaults:
  wake_time: "07:00"
  sleep_time: "22:00"

projects:
  echo_dev:
    name: "Echo Development"
    status: "active"
    current_focus: "Build the new 'Work Session' feature"
    deadline: "2025-07-31"
    milestones:
      - description: "Complete core module refactoring"
        due_date: "2025-07-15"
      - description: "Implement 'The Archivist' (logging)"
        due_date: "2025-07-22"
  
  grant_proposal:
    name: "NIH Grant Proposal"
    status: "on_hold"
    current_focus: "Waiting for feedback from collaborators"
"""
        
        mock_file.return_value.read.return_value = config_content
        
        config = load_config()
        
        assert "echo_dev" in config.projects
        assert "grant_proposal" in config.projects
        
        echo_dev = config.projects["echo_dev"]
        assert echo_dev["name"] == "Echo Development"
        assert echo_dev["status"] == "active"
        assert echo_dev["current_focus"] == "Build the new 'Work Session' feature"
        assert echo_dev["deadline"] == "2025-07-31"
        assert len(echo_dev["milestones"]) == 2
        
        grant_proposal = config.projects["grant_proposal"]
        assert grant_proposal["status"] == "on_hold"
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_config_with_profiles(self, mock_file, mock_exists):
        """Test loading configuration with profiles."""
        mock_exists.return_value = True
        
        config_content = """
defaults:
  wake_time: "07:00"
  sleep_time: "22:00"

profiles:
  travel:
    overrides:
      defaults:
        wake_time: "08:00"
        sleep_time: "23:00"
  
  deep_work:
    overrides:
      defaults:
        wake_time: "06:00"
"""
        
        mock_file.return_value.read.return_value = config_content
        
        config = load_config()
        
        assert "travel" in config.profiles
        assert "deep_work" in config.profiles
        
        travel = config.profiles["travel"]
        assert travel["overrides"]["defaults"]["wake_time"] == "08:00"
        assert travel["overrides"]["defaults"]["sleep_time"] == "23:00"
        
        deep_work = config.profiles["deep_work"]
        assert deep_work["overrides"]["defaults"]["wake_time"] == "06:00"
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_load_config_with_email_settings(self, mock_file, mock_exists):
        """Test loading configuration with email settings."""
        mock_exists.return_value = True
        
        config_content = """
defaults:
  wake_time: "07:00"
  sleep_time: "22:00"

email:
  important_senders: ["ceo@company.com", "manager@company.com"]
  urgent_keywords: ["urgent", "asap", "deadline"]
  action_keywords: ["please", "can you", "need", "review"]
  client_id: "${EMAIL_CLIENT_ID}"
  client_secret: "${EMAIL_CLIENT_SECRET}"
"""
        
        mock_file.return_value.read.return_value = config_content
        
        with patch.dict('os.environ', {
            'EMAIL_CLIENT_ID': 'test-client-id',
            'EMAIL_CLIENT_SECRET': 'test-client-secret'
        }):
            config = load_config()
            
            assert "important_senders" in config.email
            assert "urgent_keywords" in config.email
            assert "action_keywords" in config.email
            assert config.email["client_id"] == "test-client-id"
            assert config.email["client_secret"] == "test-client-secret"
            
            assert "ceo@company.com" in config.email["important_senders"]
            assert "urgent" in config.email["urgent_keywords"]
            assert "please" in config.email["action_keywords"]
