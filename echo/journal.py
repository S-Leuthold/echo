# ==============================================================================
# FILE: echo/journal.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Handles journal entry storage, retrieval, and basic operations.
#   Provides the infrastructure for evening reflection and pattern recognition.
#
# DEPENDS ON:
#   - echo.models (JournalEntry, JournalEntryType)
#
# DEPENDED ON BY:
#   - echo.cli (journal commands)
#   - echo.prompt_engine (journal context for planning)
# ==============================================================================

import json
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any
import yaml

from .models import JournalEntry, JournalEntryType


def get_journal_dir() -> Path:
    """Get the journal directory path."""
    return Path("refs")


def ensure_journal_dir() -> Path:
    """Ensure the journal directory exists and return its path."""
    journal_dir = get_journal_dir()
    journal_dir.mkdir(exist_ok=True)
    (journal_dir / "patterns").mkdir(exist_ok=True)
    return journal_dir


def get_journal_filename(entry_date: date, entry_type: JournalEntryType) -> str:
    """Generate the filename for a journal entry."""
    date_str = entry_date.strftime("%Y-%m-%d")
    return f"{date_str}-{entry_type.value}.md"


def save_journal_entry(entry: JournalEntry) -> Path:
    """
    Save a journal entry to the appropriate file.
    
    Args:
        entry: The journal entry to save
        
    Returns:
        Path to the saved file
        
    Raises:
        ValueError: If the entry is invalid
        IOError: If the file cannot be written
    """
    if not entry.content:
        raise ValueError("Journal entry must have content")
    
    ensure_journal_dir()
    filename = get_journal_filename(entry.date, entry.entry_type)
    file_path = get_journal_dir() / filename
    
    # Create YAML front matter for structured data
    front_matter = {
        "date": entry.date.isoformat(),
        "type": entry.entry_type.value,
        "created_at": entry.created_at.isoformat(),
        "tags": entry.tags,
        "linked_projects": entry.linked_projects,
    }
    
    # Write the file with YAML front matter and content
    with open(file_path, "w", encoding="utf-8") as f:
        f.write("---\n")
        f.write(yaml.dump(front_matter, default_flow_style=False))
        f.write("---\n\n")
        
        # Write content as structured sections
        for key, value in entry.content.items():
            if value.strip():  # Only write non-empty content
                f.write(f"## {key.replace('_', ' ').title()}\n\n")
                f.write(f"{value}\n\n")
    
    return file_path


def load_journal_entry(file_path: Path) -> Optional[JournalEntry]:
    """
    Load a journal entry from a file.
    
    Args:
        file_path: Path to the journal entry file
        
    Returns:
        JournalEntry if successful, None if file doesn't exist or is invalid
    """
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Split front matter and content
        if not content.startswith("---"):
            return None
        
        parts = content.split("---", 2)
        if len(parts) < 3:
            return None
        
        front_matter_text = parts[1].strip()
        content_text = parts[2].strip()
        
        # Parse front matter
        front_matter = yaml.safe_load(front_matter_text)
        
        # Parse content sections
        content_dict = {}
        current_section = None
        current_content = []
        
        for line in content_text.split("\n"):
            if line.startswith("## "):
                # Save previous section
                if current_section and current_content:
                    content_dict[current_section] = "\n".join(current_content).strip()
                
                # Start new section
                current_section = line[3:].lower().replace(" ", "_")
                current_content = []
            elif current_section is not None:
                current_content.append(line)
        
        # Save last section
        if current_section and current_content:
            content_dict[current_section] = "\n".join(current_content).strip()
        
        # Create JournalEntry
        entry = JournalEntry(
            date=datetime.fromisoformat(front_matter["date"]).date(),
            entry_type=JournalEntryType(front_matter["type"]),
            content=content_dict,
            created_at=datetime.fromisoformat(front_matter["created_at"]),
            tags=front_matter.get("tags", []),
            linked_projects=front_matter.get("linked_projects", [])
        )
        
        return entry
        
    except Exception as e:
        print(f"Warning: Could not load journal entry from {file_path}: {e}")
        return None


def load_journal_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    entry_type: Optional[JournalEntryType] = None,
    tags: Optional[List[str]] = None
) -> List[JournalEntry]:
    """
    Load journal entries with optional filtering.
    
    Args:
        start_date: Only include entries from this date onwards
        end_date: Only include entries up to this date
        entry_type: Only include entries of this type
        tags: Only include entries with any of these tags
        
    Returns:
        List of matching journal entries, sorted by date (newest first)
    """
    journal_dir = get_journal_dir()
    if not journal_dir.exists():
        return []
    
    entries = []
    
    for file_path in journal_dir.glob("*.md"):
        if file_path.name == "README.md":  # Skip README files
            continue
            
        entry = load_journal_entry(file_path)
        if entry is None:
            continue
        
        # Apply filters
        if start_date and entry.date < start_date:
            continue
        if end_date and entry.date > end_date:
            continue
        if entry_type and entry.entry_type != entry_type:
            continue
        if tags and not any(tag in entry.tags for tag in tags):
            continue
        
        entries.append(entry)
    
    # Sort by date (newest first)
    entries.sort(key=lambda e: e.date, reverse=True)
    return entries


def search_journal_entries(query: str, days_back: int = 30) -> List[JournalEntry]:
    """
    Search journal entries for specific text.
    
    Args:
        query: Text to search for
        days_back: Number of days to look back
        
    Returns:
        List of matching journal entries
    """
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days_back)
    
    entries = load_journal_entries(start_date=start_date, end_date=end_date)
    matching_entries = []
    
    query_lower = query.lower()
    
    for entry in entries:
        # Search in content
        for key, value in entry.content.items():
            if query_lower in value.lower():
                matching_entries.append(entry)
                break
        
        # Search in tags
        if any(query_lower in tag.lower() for tag in entry.tags):
            matching_entries.append(entry)
            continue
    
    return matching_entries


def get_recent_journal_entries(days: int = 7) -> List[JournalEntry]:
    """
    Get recent journal entries.
    
    Args:
        days: Number of days to look back
        
    Returns:
        List of recent journal entries
    """
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days - 1)  # Include today, so days-1
    
    return load_journal_entries(start_date=start_date, end_date=end_date)


def create_evening_reflection_entry(
    what_went_well: str,
    challenges: str,
    learnings: str,
    energy_level: str,
    mood: str,
    patterns_noticed: str = "",
    tomorrow_focus: str = "",
    tomorrow_energy: str = "",
    non_negotiables: str = "",
    avoid_tomorrow: str = ""
) -> JournalEntry:
    """
    Create a structured evening reflection journal entry.
    
    Args:
        what_went_well: What went well today
        challenges: Challenges faced today
        learnings: What was learned today
        energy_level: Energy level (high/medium/low)
        mood: Overall mood
        patterns_noticed: Any patterns noticed
        tomorrow_focus: Focus for tomorrow
        tomorrow_energy: Expected energy for tomorrow
        non_negotiables: Non-negotiable items for tomorrow
        avoid_tomorrow: Things to avoid tomorrow
        
    Returns:
        JournalEntry with evening reflection content
    """
    content = {
        "what_went_well": what_went_well,
        "challenges": challenges,
        "learnings": learnings,
        "energy_level": energy_level,
        "mood": mood,
    }
    
    if patterns_noticed:
        content["patterns_noticed"] = patterns_noticed
    if tomorrow_focus:
        content["tomorrow_focus"] = tomorrow_focus
    if tomorrow_energy:
        content["tomorrow_energy"] = tomorrow_energy
    if non_negotiables:
        content["non_negotiables"] = non_negotiables
    if avoid_tomorrow:
        content["avoid_tomorrow"] = avoid_tomorrow
    
    return JournalEntry(
        date=date.today(),
        entry_type=JournalEntryType.EVENING_REFLECTION,
        content=content,
        tags=["evening", "reflection", "daily"]
    )


def create_quick_note_entry(note: str, tags: Optional[List[str]] = None) -> JournalEntry:
    """
    Create a quick journal note entry.
    
    Args:
        note: The note content
        tags: Optional tags for the note
        
    Returns:
        JournalEntry with quick note content
    """
    all_tags = tags or []
    all_tags.append("quick_note")  # Always include quick_note tag
    
    return JournalEntry(
        date=date.today(),
        entry_type=JournalEntryType.QUICK_NOTE,
        content={"note": note},
        tags=all_tags
    )


def extract_planning_context_from_reflection(entry: JournalEntry) -> Dict[str, str]:
    """
    Extract planning-relevant context from an evening reflection entry.
    
    Args:
        entry: The evening reflection journal entry
        
    Returns:
        Dictionary of planning context key-value pairs
    """
    context = {}
    
    # Extract tomorrow-specific planning context
    if "tomorrow_focus" in entry.content and entry.content["tomorrow_focus"].strip():
        context["tomorrow_focus"] = entry.content["tomorrow_focus"]
    
    if "tomorrow_energy" in entry.content and entry.content["tomorrow_energy"].strip():
        context["tomorrow_energy"] = entry.content["tomorrow_energy"]
    
    if "non_negotiables" in entry.content and entry.content["non_negotiables"].strip():
        context["non_negotiables"] = entry.content["non_negotiables"]
    
    if "avoid_tomorrow" in entry.content and entry.content["avoid_tomorrow"].strip():
        context["avoid_tomorrow"] = entry.content["avoid_tomorrow"]
    
    if "tomorrow_priorities" in entry.content and entry.content["tomorrow_priorities"].strip():
        context["tomorrow_priorities"] = entry.content["tomorrow_priorities"]
    
    # Extract patterns that might inform tomorrow's planning
    if "patterns_noticed" in entry.content and entry.content["patterns_noticed"].strip():
        context["patterns_noticed"] = entry.content["patterns_noticed"]
    
    # Extract energy and mood for context
    if "energy_level" in entry.content:
        context["today_energy"] = entry.content["energy_level"]
    
    if "mood" in entry.content:
        context["today_mood"] = entry.content["mood"]
    
    # Extract learnings that might affect tomorrow
    if "learnings" in entry.content and entry.content["learnings"].strip():
        context["learnings"] = entry.content["learnings"]
    
    return context


def get_recent_reflection_context(days: int = 7) -> List[Dict[str, str]]:
    """
    Get planning context from recent evening reflections.
    
    Args:
        days: Number of days to look back
        
    Returns:
        List of planning context dictionaries from recent reflections
    """
    entries = load_journal_entries(
        entry_type=JournalEntryType.EVENING_REFLECTION,
        start_date=date.today() - timedelta(days=days)
    )
    
    contexts = []
    for entry in entries:
        context = extract_planning_context_from_reflection(entry)
        if context:  # Only include entries with planning context
            context["date"] = entry.date.isoformat()
            contexts.append(context)
    
    return contexts


def analyze_energy_mood_trends(days: int = 7) -> Dict[str, str]:
    """
    Analyze energy and mood trends from recent reflections.
    
    Args:
        days: Number of days to analyze
        
    Returns:
        Dictionary with trend analysis
    """
    entries = load_journal_entries(
        entry_type=JournalEntryType.EVENING_REFLECTION,
        start_date=date.today() - timedelta(days=days)
    )
    
    if not entries:
        return {"energy_trend": "unknown", "mood_trend": "unknown"}
    
    # Collect energy and mood data
    energy_levels = []
    moods = []
    
    for entry in entries:
        if "energy_level" in entry.content:
            energy_levels.append(entry.content["energy_level"])
        if "mood" in entry.content:
            moods.append(entry.content["mood"])
    
    # Simple trend analysis
    def analyze_trend(values: List[str]) -> str:
        if not values:
            return "unknown"
        
        # Count occurrences
        value_counts = {}
        for value in values:
            value_counts[value] = value_counts.get(value, 0) + 1
        
        # Find most common
        most_common = max(value_counts.items(), key=lambda x: x[1])
        
        if most_common[1] >= len(values) * 0.6:  # 60% or more
            return f"consistently {most_common[0]}"
        elif most_common[1] >= len(values) * 0.4:  # 40% or more
            return f"mostly {most_common[0]}"
        else:
            return "variable"
    
    return {
        "energy_trend": analyze_trend(energy_levels),
        "mood_trend": analyze_trend(moods),
        "recent_energy": energy_levels[-1] if energy_levels else "unknown",
        "recent_mood": moods[-1] if moods else "unknown"
    }


def create_enhanced_evening_reflection_entry(
    what_went_well: str,
    challenges: str,
    learnings: str,
    energy_level: str,
    mood: str,
    patterns_noticed: str = "",
    tomorrow_focus: str = "",
    tomorrow_energy: str = "",
    non_negotiables: str = "",
    avoid_tomorrow: str = "",
    tomorrow_priorities: str = ""
) -> JournalEntry:
    """
    Create an enhanced evening reflection entry with additional planning context.
    
    Args:
        what_went_well: What went well today
        challenges: Challenges faced today
        learnings: What was learned today
        energy_level: Energy level (high/medium/low)
        mood: Overall mood
        patterns_noticed: Any patterns noticed
        tomorrow_focus: Focus for tomorrow
        tomorrow_energy: Expected energy for tomorrow
        non_negotiables: Non-negotiable items for tomorrow
        avoid_tomorrow: Things to avoid tomorrow
        tomorrow_priorities: Top priorities for tomorrow
        
    Returns:
        JournalEntry with enhanced evening reflection content
    """
    content = {
        "what_went_well": what_went_well,
        "challenges": challenges,
        "learnings": learnings,
        "energy_level": energy_level,
        "mood": mood,
    }
    
    if patterns_noticed:
        content["patterns_noticed"] = patterns_noticed
    if tomorrow_focus:
        content["tomorrow_focus"] = tomorrow_focus
    if tomorrow_energy:
        content["tomorrow_energy"] = tomorrow_energy
    if non_negotiables:
        content["non_negotiables"] = non_negotiables
    if avoid_tomorrow:
        content["avoid_tomorrow"] = avoid_tomorrow
    if tomorrow_priorities:
        content["tomorrow_priorities"] = tomorrow_priorities
    
    return JournalEntry(
        date=date.today(),
        entry_type=JournalEntryType.EVENING_REFLECTION,
        content=content,
        tags=["evening", "reflection", "daily", "planning"]
    )


def generate_journal_insights(days: int = 30) -> Dict[str, Any]:
    """
    Generate LLM-powered insights from journal data.
    
    Args:
        days: Number of days to analyze
        
    Returns:
        Dictionary containing patterns, insights, and recommendations
    """
    from .prompt_engine import build_journal_insights_prompt, parse_journal_insights_response
    from .cli import _get_openai_client, _call_llm
    
    # Load recent journal entries
    entries = load_journal_entries(
        start_date=date.today() - timedelta(days=days)
    )
    
    if not entries:
        return {
            "patterns": [],
            "insights": [],
            "recommendations": [],
            "summary": "No journal entries found for analysis."
        }
    
    # Convert entries to dictionary format for prompt
    entries_data = []
    for entry in entries:
        entry_dict = {
            "date": entry.date.isoformat(),
            "entry_type": entry.entry_type.value,
            "content": entry.content,
            "tags": entry.tags
        }
        entries_data.append(entry_dict)
    
    # Build insights prompt
    prompt = build_journal_insights_prompt(entries_data, days)
    
    # Call LLM
    client = _get_openai_client()
    response = _call_llm(client, prompt)
    
    try:
        insights = parse_journal_insights_response(response)
        return insights
    except ValueError as e:
        print(f"Error generating insights: {e}")
        return {
            "patterns": [],
            "insights": [],
            "recommendations": [],
            "summary": f"Error generating insights: {e}"
        }


def generate_productivity_analysis(days: int = 14) -> Dict[str, Any]:
    """
    Generate detailed productivity analysis from recent journal data.
    
    Args:
        days: Number of days to analyze
        
    Returns:
        Dictionary containing productivity analysis
    """
    from .prompt_engine import build_productivity_analysis_prompt, parse_productivity_analysis_response
    from .cli import _get_openai_client, _call_llm
    
    # Load recent entries
    entries = load_journal_entries(
        entry_type=JournalEntryType.EVENING_REFLECTION,
        start_date=date.today() - timedelta(days=days)
    )
    
    if not entries:
        return {
            "energy_analysis": {"pattern": "No data available", "optimal_times": "Unknown", "recommendations": []},
            "mood_analysis": {"pattern": "No data available", "productivity_impact": "Unknown", "recommendations": []},
            "productivity_insights": [],
            "optimization_plan": {"short_term": [], "long_term": [], "priority": "No data available"}
        }
    
    # Get energy and mood trends
    energy_trends = analyze_energy_mood_trends(days)
    
    # Convert entries to dictionary format
    entries_data = []
    for entry in entries:
        entry_dict = {
            "date": entry.date.isoformat(),
            "content": entry.content
        }
        entries_data.append(entry_dict)
    
    # Build analysis prompt
    prompt = build_productivity_analysis_prompt(entries_data, energy_trends, energy_trends)
    
    # Call LLM
    client = _get_openai_client()
    response = _call_llm(client, prompt)
    
    try:
        analysis = parse_productivity_analysis_response(response)
        return analysis
    except ValueError as e:
        print(f"Error generating productivity analysis: {e}")
        return {
            "energy_analysis": {"pattern": "Error in analysis", "optimal_times": "Unknown", "recommendations": []},
            "mood_analysis": {"pattern": "Error in analysis", "productivity_impact": "Unknown", "recommendations": []},
            "productivity_insights": [],
            "optimization_plan": {"short_term": [], "long_term": [], "priority": "Error in analysis"}
        }


def get_insight_summary(days: int = 30) -> str:
    """
    Get a quick summary of key insights from journal data.
    
    Args:
        days: Number of days to analyze
        
    Returns:
        Summary string of key insights
    """
    insights = generate_journal_insights(days)
    
    if not insights.get("patterns") and not insights.get("insights"):
        return "No significant patterns found in recent journal entries."
    
    summary_parts = []
    
    # Add patterns summary
    if insights.get("patterns"):
        summary_parts.append("📊 **Key Patterns:**")
        for pattern in insights["patterns"][:3]:  # Top 3 patterns
            summary_parts.append(f"  • {pattern['description']} ({pattern['frequency']})")
    
    # Add insights summary
    if insights.get("insights"):
        summary_parts.append("\n💡 **Key Insights:**")
        for insight in insights["insights"][:3]:  # Top 3 insights
            summary_parts.append(f"  • {insight['insight']}")
    
    # Add recommendations summary
    if insights.get("recommendations"):
        summary_parts.append("\n🎯 **Top Recommendations:**")
        for rec in insights["recommendations"][:3]:  # Top 3 recommendations
            summary_parts.append(f"  • {rec['recommendation']} (Priority: {rec['priority']})")
    
    return "\n".join(summary_parts) 