"""
API Utilities

Utility functions for caching, data processing, and other shared functionality.
"""

import hashlib
import time as time_module
from typing import Any, Dict
from echo.models import Block


# In-memory caches with timestamps
EMAIL_BRIEF_CACHE = {}
CONFIG_CACHE = {}
ANALYTICS_CACHE = {}
CONTEXT_BRIEFING_CACHE = {}

# Cache durations (in seconds)
EMAIL_BRIEF_CACHE_DURATION = 900      # 15 minutes
CONFIG_CACHE_DURATION = 300           # 5 minutes  
ANALYTICS_CACHE_DURATION = 300        # 5 minutes
CONTEXT_BRIEFING_CACHE_DURATION = 0  # No caching during development/planning


def get_cache_key(prefix: str, *args) -> str:
    """Generate a cache key from prefix and arguments."""
    key_data = f"{prefix}:{':'.join(map(str, args))}"
    return hashlib.md5(key_data.encode()).hexdigest()


def is_cache_valid(cache_entry: dict, duration: int) -> bool:
    """Check if a cache entry is still valid."""
    return (time_module.time() - cache_entry['timestamp']) < duration


def get_cached_data(cache: dict, key: str, duration: int) -> Any:
    """Get cached data if valid, None otherwise."""
    if key in cache and is_cache_valid(cache[key], duration):
        return cache[key]['data']
    return None


def set_cached_data(cache: dict, key: str, data: Any) -> None:
    """Set data in cache with current timestamp."""
    cache[key] = {
        'data': data,
        'timestamp': time_module.time()
    }


def get_cached_email_brief(days: int = 1) -> Dict:
    """Get cached email brief if available and valid."""
    cache_key = get_cache_key("email_brief", days)
    cached_data = get_cached_data(EMAIL_BRIEF_CACHE, cache_key, EMAIL_BRIEF_CACHE_DURATION)
    return cached_data or {}


def _add_basic_icons(blocks: list[Block]) -> list[Block]:
    """Add basic icons to blocks based on their content."""
    ICON_MAP = {
        'meal': '🍽️',
        'breakfast': '🥐', 
        'lunch': '🥗',
        'dinner': '🍽️',
        'gym': '💪',
        'workout': '🏃',
        'exercise': '🏋️',
        'meeting': '👥',
        'call': '📞',
        'email': '📧',
        'admin': '📋',
        'planning': '📝',
        'research': '🔬',
        'writing': '✍️',
        'reading': '📖',
        'code': '💻',
        'coding': '💻',
        'programming': '💻',
        'commute': '🚗',
        'drive': '🚗',
        'travel': '✈️',
        'break': '☕',
        'rest': '😴',
        'sleep': '😴',
        'personal': '🏠',
        'family': '👨‍👩‍👧‍👦',
        'social': '🤝',
        'shopping': '🛒',
        'errands': '📦',
        'cleaning': '🧹',
        'chores': '🏠'
    }
    
    for block in blocks:
        if not block.icon or block.icon == '📅':  # Default icon
            block_text = f"{block.label} {block.note}".lower()
            
            # Find matching icon
            for keyword, icon in ICON_MAP.items():
                if keyword in block_text:
                    block.icon = icon
                    break
            else:
                # Category-based fallback
                if block.type == BlockType.ANCHOR.value:
                    block.icon = '⚓'
                elif block.type == BlockType.FIXED.value:
                    block.icon = '📍'
                else:
                    block.icon = '📅'  # Keep default
    
    return blocks