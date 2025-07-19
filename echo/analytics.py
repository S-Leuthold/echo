# ==============================================================================
# FILE: echo/analytics.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Implements "The Time Ledger" - an analytics engine to track and understand
#   where time is allocated. This module provides the core functionality for
#   calculating daily statistics by tag and managing the persistent time ledger.
#
# DEPENDS ON:
#   - echo.models (Block, Config)
#   - echo.log_reader (for parsing existing logs)
#
# DEPENDED ON BY:
#   - echo.cli (to display daily summary after planning)
#   - tests.test_analytics (for unit testing)
# ==============================================================================

from __future__ import annotations

import csv
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from .models import Block, Config


# ==============================================================================
# CANONICAL TAGS DEFINITION
# ==============================================================================

class TimeCategory(str, Enum):
    """
    The canonical set of categories for time tracking.
    These are the fixed categories that will be used for analytics.
    """
    # Core Work Categories
    DEEP_WORK = "deep_work"           # Focused, uninterrupted work sessions
    ADMIN = "admin"                   # Administrative tasks, emails, meetings
    PLANNING = "planning"             # Strategic planning, goal setting
    
    # Personal Categories  
    PERSONAL = "personal"             # Personal time, relationships, hobbies
    HEALTH = "health"                 # Exercise, wellness, self-care
    REST = "rest"                     # Sleep, relaxation, recovery
    
    # Project-Specific Categories
    RESEARCH = "research"             # Academic research, reading, analysis
    DEVELOPMENT = "development"       # Software development, technical work
    WRITING = "writing"               # Content creation, documentation
    
    # Meta Categories
    UNCATEGORIZED = "uncategorized"   # Fallback for unclassified time


# Mapping from project names to canonical tags
PROJECT_TAG_MAPPING = {
    # Echo Development
    "Echo Development": TimeCategory.DEVELOPMENT,
    "Echo": TimeCategory.DEVELOPMENT,
    
    # Academic/Research
    "Research": TimeCategory.RESEARCH,
    "Grant Proposal": TimeCategory.WRITING,
    "NIH Grant": TimeCategory.WRITING,
    "Paper": TimeCategory.WRITING,
    "Analysis": TimeCategory.RESEARCH,
    
    # Personal
    "Personal": TimeCategory.PERSONAL,
    "Therapy": TimeCategory.HEALTH,
    "Exercise": TimeCategory.HEALTH,
    "Reading": TimeCategory.PERSONAL,
    "Meals": TimeCategory.PERSONAL,
    
    # Default mappings
    "Meeting": TimeCategory.ADMIN,
    "Standup": TimeCategory.ADMIN,
    "Planning": TimeCategory.PLANNING,
    "Review": TimeCategory.PLANNING,
}


@dataclass
class DailyStats:
    """Represents the daily time allocation statistics."""
    date: date
    total_minutes: int
    category_breakdown: Dict[str, int]
    project_breakdown: Dict[str, int]
    
    def to_csv_row(self) -> Dict[str, str]:
        """Converts the daily stats to a CSV row format."""
        row = {
            "date": self.date.isoformat(),
            "total_minutes": str(self.total_minutes),
        }
        
        # Add category columns
        for category in TimeCategory:
            minutes = self.category_breakdown.get(category.value, 0)
            row[f"category_{category.value}"] = str(minutes)
        
        # Add project columns (limited to top projects)
        top_projects = sorted(
            self.project_breakdown.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:5]  # Top 5 projects
        
        for i, (project, minutes) in enumerate(top_projects, 1):
            row[f"project_{i}_name"] = project
            row[f"project_{i}_minutes"] = str(minutes)
        
        return row


# ==============================================================================
# ANALYTICS ENGINE
# ==============================================================================

def categorize_block(block: Block, config: Config) -> str:
    """
    Categorizes a block based on its label and user configuration.
    Uses the Project | Task naming convention to extract the project.
    """
    label = block.label.strip()
    
    # Handle blocks with emojis (from enricher) - simple first character drop
    if label and label[0] in "🎯📝🚧🎨🤖✍️🎉⚡️🌅🔨🗺️📚🍽️🚀🔍🎨📝📧🍷🛌🏋️🧘🍴🤝🌐🖋️📊📈🌙🚶‍♂️🛀🍽️🌙":
        label = label[1:].strip()
    
    # Parse Project | Task format
    if "|" in label:
        project_part = label.split("|")[0].strip()
        task_part = label.split("|")[1].strip().lower()

        # Special case: Always categorize 'Admin | Email & Admin' as admin
        if project_part.lower() == "admin" and "email" in task_part:
            return "Admin"
        
        # Use the user's category mapping
        return config.categories.get_category(project_part)
    
    # Fallback categorization based on block type
    if block.type.value == "anchor":
        return "Personal"  # Most anchors are personal routines
    elif block.type.value == "flex":
        return "Development"  # Most flex blocks are deep work
    
    return "Uncategorized"

def extract_project_from_label(label: str) -> str:
    """Extracts the clean block label for analytics granularity."""
    if not label:
        return "General"
    
    # Simple approach: if first character is an emoji, drop it
    clean_label = label.strip()
    if clean_label and clean_label[0] in "🎯📝🚧🎨🤖✍️🎉⚡️🌅🔨🗺️📚🍽️🚀🔍🎨📝📧🍷🛌🏋️🧘🍴🤝🌐🖋️📊📈🌙🚶‍♂️🛀🍽️🌙":
        clean_label = clean_label[1:].strip()
    
    return clean_label


def calculate_daily_stats(blocks: List[Block], config: Config) -> DailyStats:
    """
    Calculates daily statistics from a list of blocks.
    Returns a DailyStats object with category and project breakdowns.
    """
    category_minutes: Dict[str, int] = {}
    project_minutes: Dict[str, int] = {}
    total_minutes = 0
    
    for block in blocks:
        # Calculate duration in minutes
        start_minutes = block.start.hour * 60 + block.start.minute
        end_minutes = block.end.hour * 60 + block.end.minute
        duration = end_minutes - start_minutes
        
        if duration <= 0:
            continue  # Skip invalid blocks
        
        total_minutes += duration
        
        # Categorize the block
        category = categorize_block(block, config)
        category_minutes[category] = category_minutes.get(category, 0) + duration
        
        # Track project breakdown (full block label)
        project = extract_project_from_label(block.label)
        project_minutes[project] = project_minutes.get(project, 0) + duration
    
    return DailyStats(
        date=date.today(),
        total_minutes=total_minutes,
        category_breakdown=category_minutes,
        project_breakdown=project_minutes
    )


# ==============================================================================
# DATA STORE MANAGEMENT
# ==============================================================================

TIME_LEDGER_FILE = Path("logs/time_ledger.csv")


def ensure_time_ledger_exists() -> None:
    """Creates the time ledger CSV file with headers if it doesn't exist."""
    TIME_LEDGER_FILE.parent.mkdir(parents=True, exist_ok=True)
    
    if not TIME_LEDGER_FILE.exists():
        # Create headers
        headers = ["date", "total_minutes"]
        
        # Add category columns
        for category in TimeCategory:
            headers.append(f"category_{category.value}")
        
        # Add project columns (for top 5 projects)
        for i in range(1, 6):
            headers.extend([f"project_{i}_name", f"project_{i}_minutes"])
        
        with open(TIME_LEDGER_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()


def append_daily_stats(stats: DailyStats) -> None:
    """
    Appends daily statistics to the time ledger CSV file.
    Creates the file if it doesn't exist.
    """
    ensure_time_ledger_exists()
    
    # Check if today's entry already exists
    existing_dates = set()
    if TIME_LEDGER_FILE.exists():
        with open(TIME_LEDGER_FILE, "r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("date"):
                    existing_dates.add(row["date"])
    
    # Only append if today's entry doesn't exist
    if stats.date.isoformat() not in existing_dates:
        with open(TIME_LEDGER_FILE, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=stats.to_csv_row().keys())
            writer.writerow(stats.to_csv_row())
        print(f"✅ Added daily stats to time ledger: {stats.total_minutes} minutes tracked")


def get_recent_stats(days: int = 7) -> List[DailyStats]:
    """
    Retrieves recent daily statistics from the time ledger.
    Returns a list of DailyStats objects for the specified number of days.
    """
    if not TIME_LEDGER_FILE.exists():
        return []
    
    stats_list = []
    cutoff_date = date.today() - timedelta(days=days)
    
    with open(TIME_LEDGER_FILE, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                row_date = date.fromisoformat(row["date"])
                if row_date >= cutoff_date:
                    # Reconstruct DailyStats from CSV row
                    category_breakdown = {}
                    for category in TimeCategory:
                        key = f"category_{category.value}"
                        category_breakdown[category.value] = int(row.get(key, 0))
                    
                    project_breakdown = {}
                    for i in range(1, 6):
                        project_name = row.get(f"project_{i}_name")
                        project_minutes = row.get(f"project_{i}_minutes")
                        if project_name and project_minutes:
                            project_breakdown[project_name] = int(project_minutes)
                    
                    stats = DailyStats(
                        date=row_date,
                        total_minutes=int(row.get("total_minutes", 0)),
                        category_breakdown=category_breakdown,
                        project_breakdown=project_breakdown
                    )
                    stats_list.append(stats)
            except (ValueError, KeyError):
                continue  # Skip malformed rows
    
    return sorted(stats_list, key=lambda s: s.date)


# ==============================================================================
# DISPLAY FUNCTIONS
# ==============================================================================

def format_duration(minutes: int) -> str:
    """Formats minutes into a human-readable duration string."""
    if minutes < 60:
        return f"{minutes}m"
    hours = minutes // 60
    remaining_minutes = minutes % 60
    if remaining_minutes == 0:
        return f"{hours}h"
    return f"{hours}h {remaining_minutes}m"


def display_daily_summary(stats: DailyStats) -> None:
    """Displays a formatted summary of the daily time allocation."""
    print("\n📊 Daily Time Ledger Summary")
    print("=" * 40)
    
    # Total time
    print(f"Total Time: {format_duration(stats.total_minutes)}")
    print()
    
    # Category breakdown
    print("📈 By Category:")
    for category, minutes in sorted(stats.category_breakdown.items(), key=lambda x: x[1], reverse=True):
        if minutes > 0:
            percentage = (minutes / stats.total_minutes * 100) if stats.total_minutes > 0 else 0
            print(f"  {category}: {format_duration(minutes)} ({percentage:.1f}%)")
    
    print()
    
    # Top projects (show full block label)
    print("🎯 Top Projects:")
    top_projects = sorted(
        stats.project_breakdown.items(),
        key=lambda x: x[1],
        reverse=True
    )[:3]  # Show top 3
    
    for project_label, minutes in top_projects:
        percentage = (minutes / stats.total_minutes * 100) if stats.total_minutes > 0 else 0
        print(f"  {project_label}: {format_duration(minutes)} ({percentage:.1f}%)")
    
    print()


def display_weekly_trends(stats_list: List[DailyStats]) -> None:
    """Displays weekly trends from recent statistics."""
    if not stats_list:
        return
    
    print("\n📈 Weekly Trends")
    print("=" * 40)
    
    # Calculate averages
    total_days = len(stats_list)
    avg_total = sum(s.total_minutes for s in stats_list) / total_days
    
    # Category averages
    category_totals = {}
    for stats in stats_list:
        for category, minutes in stats.category_breakdown.items():
            category_totals[category] = category_totals.get(category, 0) + minutes
    
    category_averages = {
        cat: total / total_days 
        for cat, total in category_totals.items()
    }
    
    print(f"Average Daily Time: {format_duration(int(avg_total))}")
    print()
    print("Average Daily Breakdown:")
    for category, avg_minutes in sorted(category_averages.items(), key=lambda x: x[1], reverse=True):
        if avg_minutes > 0:
            percentage = (avg_minutes / avg_total * 100) if avg_total > 0 else 0
            print(f"  {category}: {format_duration(int(avg_minutes))} ({percentage:.1f}%)")
    
    print() 