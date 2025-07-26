"""
Configuration loader for Echo.

Handles loading and validation of user configuration from YAML files.
"""

from pathlib import Path
from datetime import date
import yaml
import sys
from typing import Dict, Any
import os
from dotenv import load_dotenv

from .models import Config, Defaults


def substitute_env_vars(obj):
    """Recursively substitute ${VAR_NAME} in strings with environment variables."""
    if isinstance(obj, dict):
        return {k: substitute_env_vars(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [substitute_env_vars(i) for i in obj]
    elif isinstance(obj, str):
        if obj.startswith('${') and obj.endswith('}'):
            var_name = obj[2:-1]
            return os.environ.get(var_name, obj)
        return obj
    else:
        return obj


def load_config() -> Config:
    """Load configuration from user config file, substituting env vars."""
    # Load .env file
    load_dotenv()
    config_path = Path("config/user_config.yaml")
    
    if not config_path.exists():
        print("❌ Configuration file not found: config/user_config.yaml")
        print("Please create the configuration file using the sample as a template.")
        sys.exit(1)
    
    try:
        with open(config_path, 'r') as f:
            config_data = yaml.safe_load(f)
        
        # Substitute env vars recursively
        config_data = substitute_env_vars(config_data)
        
        # Load defaults
        defaults_data = config_data.get("defaults", {})
        defaults = Defaults(
            wake_time=defaults_data.get("wake_time", "07:00"),
            sleep_time=defaults_data.get("sleep_time", "22:00")
        )

        # Load weekly schedule
        weekly_schedule = config_data.get("weekly_schedule", {})
        
        # Load projects
        projects = config_data.get("projects", {})
        
        # Load profiles
        profiles = config_data.get("profiles", {})
        
        # Load email configuration
        email_config = config_data.get("email", {})
        
        # Load reminders
        reminders = config_data.get("reminders", [])
        
        return Config(
            defaults=defaults,
            weekly_schedule=weekly_schedule,
            projects=projects,
            profiles=profiles,
            email=email_config,
            reminders=reminders
        )
        
    except Exception as e:
        print(f"❌ Error loading configuration: {e}")
        sys.exit(1)
