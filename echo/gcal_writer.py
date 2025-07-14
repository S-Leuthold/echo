# ==============================================================================
# FILE: echo/gcal_writer.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Handles authentication with the Google Calendar API and pushes a completed
#   schedule to the user's calendar. It intelligently checks for existing
#   Echo-managed events to prevent duplicates, asking the user for confirmation
#   before overwriting any data.
#
# DEPENDS ON:
#   - echo.models (Block, Config)
#   - google_auth_oauthlib, googleapiclient (External Google API libraries)
#
# DEPENDED ON BY:
#   - echo.cli (or other top-level orchestration scripts)
# ==============================================================================

from __future__ import annotations
import datetime as dt
import pickle
import hashlib
from pathlib import Path
from typing import List, Dict

from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build, Resource
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .models import Block, Config

# --- Constants ---
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]
TOKEN_PATH = Path("gcal_token.pickle")
CREDS_PATH = Path("gcal_credentials.json")
ECHO_EVENT_ID_KEY = "echo_block_id" # Key for our hidden identifier

def _get_gcal_service() -> Resource | None:
    """Handles the OAuth2 flow to get a valid Google Calendar API service object."""
    creds = None
    if TOKEN_PATH.exists():
        with open(TOKEN_PATH, "rb") as token_file:
            creds = pickle.load(token_file)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_PATH.exists():
                print(f"❌ ERROR: Google Calendar credentials not found at '{CREDS_PATH}'.")
                print("Please download from Google Cloud Console and place it in the project root.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_PATH, "wb") as token_file:
            pickle.dump(creds, token_file)

    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _generate_block_id(block: Block) -> str:
    """Creates a stable, unique ID for a block based on its content."""
    # Using a hash ensures a consistent ID for the same block content.
    block_str = f"{block.start.isoformat()}-{block.end.isoformat()}-{block.label}-{block.type.value}"
    return hashlib.md5(block_str.encode()).hexdigest()


# echo/gcal_writer.py

def _fetch_existing_echo_events(service: Resource, target_date: dt.date, user_tz: ZoneInfo, calendar_id: str) -> Dict[str, str]:
    """
    Fetches all events for a given day and filters them in memory to find
    only the ones managed by Echo.
    """
    start_of_day = dt.datetime.combine(target_date, dt.time.min, tzinfo=user_tz)
    end_of_day = dt.datetime.combine(target_date, dt.time.max, tzinfo=user_tz)

    # Fetch ALL events for the day without the faulty filter.
    events_result = service.events().list(
        calendarId=calendar_id,
        timeMin=start_of_day.isoformat(),
        timeMax=end_of_day.isoformat(),
        singleEvents=True,
    ).execute()

    existing_events = {}
    for event in events_result.get("items", []):
        props = event.get("extendedProperties", {}).get("private", {})
        # This check happens in our code, not in the API call.
        if ECHO_EVENT_ID_KEY in props:
            echo_id = props[ECHO_EVENT_ID_KEY]
            gcal_event_id = event['id']
            existing_events[echo_id] = gcal_event_id
            
    return existing_events


def push_plan_to_gcal(plan: List[Block], cfg: Config, calendar_id: str = "primary") -> None:
    """Pushes a list of Blocks to Google Calendar, handling overwrites."""
    service = _get_gcal_service()
    if not service:
        return

    try:
        user_timezone_str = cfg.defaults.timezone
        user_tz = ZoneInfo(user_timezone_str)
    except ZoneInfoNotFoundError:
        print(f"❌ ERROR: Invalid timezone '{cfg.defaults.timezone}' in config.")
        return

    today = dt.date.today()
    print("Checking for existing events on Google Calendar...")
    existing_events_map = _fetch_existing_echo_events(service, today, user_tz, calendar_id)
    
    events_to_delete = []
    events_to_create = []

    for block in plan:
        block_id = _generate_block_id(block)
        if block_id in existing_events_map:
            # Event already exists, ask the user what to do
            gcal_event_id = existing_events_map[block_id]
            choice = input(f"Event '{block.label}' already exists. Overwrite? (y/N) ").lower()
            if choice == 'y':
                events_to_delete.append(gcal_event_id)
                events_to_create.append(block)
                print(f"  ➡️  Marked '{block.label}' for overwrite.")
            else:
                print(f"  Skipping '{block.label}'.")
        else:
            # This is a new event
            events_to_create.append(block)

    if not events_to_delete and not events_to_create:
        print("No changes to push to Google Calendar.")
        return

    # Execute deletions
    for gcal_event_id in events_to_delete:
        service.events().delete(calendarId=calendar_id, eventId=gcal_event_id).execute()
    if events_to_delete:
        print(f"🗑️  Deleted {len(events_to_delete)} outdated event(s).")
        
    # Execute insertions
    for block in events_to_create:
        block_id = _generate_block_id(block)
        start_dt = dt.datetime.combine(today, block.start, tzinfo=user_tz)
        end_dt = dt.datetime.combine(today, block.end, tzinfo=user_tz)

        event_body = {
            "summary": block.label,
            "description": block.meta.get("note", ""),
            "start": {"dateTime": start_dt.isoformat(), "timeZone": user_timezone_str},
            "end": {"dateTime": end_dt.isoformat(), "timeZone": user_timezone_str},
            "extendedProperties": {
                "private": {
                    ECHO_EVENT_ID_KEY: block_id
                }
            }
        }
        service.events().insert(calendarId=calendar_id, body=event_body).execute()

    if events_to_create:
        print(f"✅ Pushed {len(events_to_create)} new/updated event(s) to Google Calendar.")
