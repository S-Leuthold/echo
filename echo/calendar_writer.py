from __future__ import annotations
import pathlib, datetime as _dt, zoneinfo, os, json, pickle
from typing import List

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from .models import Block

SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

def _get_service() -> "googleapiclient.discovery.Resource":
    token_path = pathlib.Path("gcal_token.pickle")
    creds = None
    if token_path.exists():
        creds = pickle.loads(token_path.read_bytes())
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "gcal_credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        token_path.write_bytes(pickle.dumps(creds))
    return build("calendar", "v3", credentials=creds, cache_discovery=False)

def push(plan: List[Block], calendar_id: str = "primary") -> None:
    svc = _get_service()
    tz  = "America/Chicago"

    for blk in plan:
        iso_start = _dt.datetime.combine(
            _dt.date.today(), blk.start
        ).replace(tzinfo=zoneinfo.ZoneInfo(tz)).isoformat()
        iso_end   = _dt.datetime.combine(
            _dt.date.today(), blk.end
        ).replace(tzinfo=zoneinfo.ZoneInfo(tz)).isoformat()

        evt = {
            "summary": blk.label,
            "description": blk.meta.get("note", ""),
            "start": {"dateTime": iso_start, "timeZone": tz},
            "end":   {"dateTime": iso_end,   "timeZone": tz},
        }
        svc.events().insert(calendarId=calendar_id, body=evt).execute()
    print(f"Pushed {len(plan)} events → Google Calendar")
