# ==============================================================================
# FILE: echo/gcal_writer.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Handles pushing the final daily plan to Google Calendar.
#   This module manages the integration between Echo's internal
#   schedule format and Google Calendar's API.
#
# DEPENDS ON:
#   - echo.models (Block, Config)
#   - Google Calendar API (temporarily disabled)
#
# DEPENDED ON BY:
#   - echo.cli (to push plans after planning)
# ==============================================================================

from __future__ import annotations

import datetime as dt
from typing import List, Dict

# Temporarily disable Google Calendar for testing
# from google.auth.transport.requests import Request
# from google.oauth2.credentials import Credentials
# from google_auth_oauthlib.flow import InstalledAppFlow
# from googleapiclient.discovery import build
# from googleapiclient.errors import HttpError

from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .models import Block, Config

# Constants
ECHO_EVENT_ID_KEY = "echo_block_id"
SCOPES = ["https://www.googleapis.com/auth/calendar"]

def push_plan_to_gcal(blocks: List[Block], cfg: Config) -> None:
    """Pushes the final plan to Google Calendar."""
    print("❌ Google Calendar integration temporarily disabled for testing.")
    # TODO: Re-enable when Google dependencies are available
