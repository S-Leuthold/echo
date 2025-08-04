"""
API Dependencies

Shared dependencies for the Echo API including Claude client, email processor,
and other stateful objects.
"""

import logging
from typing import Optional
from functools import lru_cache

from echo.claude_client import get_claude_client
from echo.config_loader import load_config
from echo.email_processor import OutlookEmailProcessor
from echo.models import Config

logger = logging.getLogger(__name__)

# Global state (in production, use proper state management)
config: Optional[Config] = None
email_processor: Optional[OutlookEmailProcessor] = None


@lru_cache()
def _get_claude_client():
    """Get a cached Claude client instance."""
    try:
        return get_claude_client()
    except Exception as e:
        logger.error(f"Failed to initialize Claude client: {e}")
        return None


def get_config() -> Optional[Config]:
    """Get the current configuration, loading if necessary."""
    global config
    if config is None:
        try:
            config = load_config()
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            config = None
    return config


def get_email_processor() -> Optional[OutlookEmailProcessor]:
    """Get the email processor, initializing if necessary."""
    global email_processor
    if email_processor is None:
        try:
            email_processor = OutlookEmailProcessor()
        except Exception as e:
            logger.error(f"Failed to initialize email processor: {e}")
            email_processor = None
    return email_processor