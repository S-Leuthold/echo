# ==============================================================================
# FILE: tests/test_journal.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Tests for the journal functionality including entry creation, storage,
#   retrieval, and search capabilities.
#
# DEPENDS ON:
#   - echo.journal
#   - echo.models
# ==============================================================================

from datetime import date, timedelta, time, datetime
from unittest.mock import Mock, patch
import pytest
from pathlib import Path
import tempfile
import shutil

# Import os for temporary directory tests
import os

from echo.journal import (
    JournalEntry, JournalEntryType, save_journal_entry, load_journal_entries,
    search_journal_entries, create_evening_reflection_entry, create_quick_note_entry,
    extract_planning_context_from_reflection, get_recent_reflection_context,
    analyze_energy_mood_trends, create_enhanced_evening_reflection_entry,
    generate_journal_insights, generate_productivity_analysis, get_insight_summary
)
from echo.models import Block, Config, BlockType, JournalPlanningContext
from echo.cli import run_morning_check_in


class TestJournalDirectory:
    """Test journal directory management."""
    
    def test_get_journal_dir(self):
        """Test getting the journal directory path."""
        from echo.journal import get_journal_dir
        journal_dir = get_journal_dir()
        assert isinstance(journal_dir, Path)
        assert journal_dir.name == "refs"
    
    def test_ensure_journal_dir(self, tmp_path):
        """Test ensuring journal directory exists."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create journal directory
            from echo.journal import ensure_journal_dir
            journal_dir = ensure_journal_dir()
            assert journal_dir.exists()
            assert journal_dir.name == "refs"
            
            # Check patterns subdirectory
            patterns_dir = journal_dir / "patterns"
            assert patterns_dir.exists()
            
        finally:
            os.chdir(original_cwd)
    
    def test_get_journal_filename(self):
        """Test journal filename generation."""
        from echo.journal import get_journal_filename
        test_date = date(2025, 1, 20)
        
        filename = get_journal_filename(test_date, JournalEntryType.EVENING_REFLECTION)
        assert filename == "2025-01-20-evening_reflection.md"
        
        filename = get_journal_filename(test_date, JournalEntryType.QUICK_NOTE)
        assert filename == "2025-01-20-quick_note.md"


class TestJournalEntryCreation:
    """Test journal entry creation functions."""
    
    def test_create_evening_reflection_entry(self):
        """Test creating an evening reflection entry."""
        entry = create_evening_reflection_entry(
            what_went_well="Completed the project",
            challenges="Some technical issues",
            learnings="Better to plan ahead",
            energy_level="medium",
            mood="productive",
            patterns_noticed="I work better in the morning",
            tomorrow_focus="Continue the project",
            tomorrow_energy="high",
            non_negotiables="Exercise",
            avoid_tomorrow="Meetings before 10am"
        )
        
        assert entry.date == date.today()
        assert entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert "what_went_well" in entry.content
        assert "challenges" in entry.content
        assert "learnings" in entry.content
        assert "energy_level" in entry.content
        assert "mood" in entry.content
        assert "patterns_noticed" in entry.content
        assert "tomorrow_focus" in entry.content
        assert "tomorrow_energy" in entry.content
        assert "non_negotiables" in entry.content
        assert "avoid_tomorrow" in entry.content
        assert "evening" in entry.tags
        assert "reflection" in entry.tags
        assert "daily" in entry.tags
    
    def test_create_evening_reflection_entry_minimal(self):
        """Test creating an evening reflection entry with minimal content."""
        entry = create_evening_reflection_entry(
            what_went_well="Good day",
            challenges="None",
            learnings="Nothing new",
            energy_level="high",
            mood="good"
        )
        
        assert entry.date == date.today()
        assert entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert len(entry.content) == 5  # Only the required fields
        assert "patterns_noticed" not in entry.content
    
    def test_create_quick_note_entry(self):
        """Test creating a quick note entry."""
        entry = create_quick_note_entry(
            note="Remember to call the client tomorrow",
            tags=["work", "follow_up"]
        )
        
        assert entry.date == date.today()
        assert entry.entry_type == JournalEntryType.QUICK_NOTE
        assert entry.content["note"] == "Remember to call the client tomorrow"
        assert "work" in entry.tags
        assert "follow_up" in entry.tags
        assert "quick_note" in entry.tags
    
    def test_create_quick_note_entry_default_tags(self):
        """Test creating a quick note entry with default tags."""
        entry = create_quick_note_entry("Simple note")
        
        assert entry.date == date.today()
        assert entry.entry_type == JournalEntryType.QUICK_NOTE
        assert entry.content["note"] == "Simple note"
        assert entry.tags == ["quick_note"]


class TestJournalEntryStorage:
    """Test journal entry storage and retrieval."""
    
    def test_save_and_load_journal_entry(self, tmp_path):
        """Test saving and loading a journal entry."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create a test entry
            entry = create_evening_reflection_entry(
                what_went_well="Test went well",
                challenges="No challenges",
                learnings="Testing is important",
                energy_level="high",
                mood="excellent"
            )
            
            # Save the entry
            from echo.journal import save_journal_entry
            file_path = save_journal_entry(entry)
            assert file_path.exists()
            
            # Load the entry
            from echo.journal import load_journal_entry
            loaded_entry = load_journal_entry(file_path)
            assert loaded_entry is not None
            assert loaded_entry.date == entry.date
            assert loaded_entry.entry_type == entry.entry_type
            assert loaded_entry.content["what_went_well"] == "Test went well"
            assert loaded_entry.content["challenges"] == "No challenges"
            assert loaded_entry.content["learnings"] == "Testing is important"
            assert loaded_entry.content["energy_level"] == "high"
            assert loaded_entry.content["mood"] == "excellent"
            assert loaded_entry.tags == entry.tags
            
        finally:
            os.chdir(original_cwd)
    
    def test_save_journal_entry_invalid(self):
        """Test saving an invalid journal entry."""
        entry = JournalEntry(
            date=date.today(),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={}  # Empty content
        )
        
        with pytest.raises(ValueError, match="Journal entry must have content"):
            save_journal_entry(entry)
    
    def test_load_journal_entry_nonexistent(self):
        """Test loading a non-existent journal entry."""
        from echo.journal import load_journal_entry
        entry = load_journal_entry(Path("nonexistent.md"))
        assert entry is None
    
    def test_load_journal_entry_invalid_format(self, tmp_path):
        """Test loading an invalid journal entry format."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create an invalid file
            invalid_file = Path("invalid.md")
            invalid_file.write_text("This is not a valid journal entry")
            
            from echo.journal import load_journal_entry
            entry = load_journal_entry(invalid_file)
            assert entry is None
            
        finally:
            os.chdir(original_cwd)


class TestJournalEntryRetrieval:
    """Test journal entry retrieval and filtering."""
    
    def test_load_journal_entries_empty(self, tmp_path):
        """Test loading journal entries from empty directory."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            from echo.journal import load_journal_entries
            entries = load_journal_entries()
            assert entries == []
            
        finally:
            os.chdir(original_cwd)
    
    def test_load_journal_entries_with_filtering(self, tmp_path):
        """Test loading journal entries with filtering."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create test entries
            entry1 = create_evening_reflection_entry(
                what_went_well="Day 1 went well",
                challenges="None",
                learnings="Test 1",
                energy_level="high",
                mood="good"
            )
            entry1.date = date.today() - timedelta(days=1)
            
            entry2 = create_quick_note_entry("Note from yesterday", ["work"])
            entry2.date = date.today() - timedelta(days=1)
            
            entry3 = create_evening_reflection_entry(
                what_went_well="Day 2 went well",
                challenges="Some issues",
                learnings="Test 2",
                energy_level="medium",
                mood="okay"
            )
            entry3.date = date.today()
            
            # Save entries
            save_journal_entry(entry1)
            save_journal_entry(entry2)
            save_journal_entry(entry3)
            
            # Test filtering by date range
            from echo.journal import load_journal_entries
            entries = load_journal_entries(
                start_date=date.today() - timedelta(days=1),
                end_date=date.today()
            )
            assert len(entries) == 3
            
            # Test filtering by entry type
            entries = load_journal_entries(entry_type=JournalEntryType.EVENING_REFLECTION)
            assert len(entries) == 2
            
            # Test filtering by tags
            entries = load_journal_entries(tags=["work"])
            assert len(entries) == 1
            
        finally:
            os.chdir(original_cwd)
    
    def test_search_journal_entries(self, tmp_path):
        """Test searching journal entries."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create test entries
            entry1 = create_evening_reflection_entry(
                what_went_well="Project completed successfully",
                challenges="Technical difficulties",
                learnings="Better planning needed",
                energy_level="high",
                mood="satisfied"
            )
            entry1.date = date.today()
            
            entry2 = create_quick_note_entry("Remember to call client about project", ["work", "follow_up"])
            entry2.date = date.today()
            
            # Save entries
            save_journal_entry(entry1)
            save_journal_entry(entry2)
            
            # Search for "project"
            from echo.journal import search_journal_entries
            results = search_journal_entries("project")
            assert len(results) == 2
            
            # Search for "client"
            results = search_journal_entries("client")
            assert len(results) == 1
            
            # Search for "technical"
            results = search_journal_entries("technical")
            assert len(results) == 1
            
            # Search for non-existent term
            results = search_journal_entries("nonexistent")
            assert len(results) == 0
            
        finally:
            os.chdir(original_cwd)
    
    def test_get_recent_journal_entries(self, tmp_path):
        """Test getting recent journal entries."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create test entries for different dates
            for i in range(5):
                entry = create_evening_reflection_entry(
                    what_went_well=f"Day {i} went well",
                    challenges="None",
                    learnings=f"Learning {i}",
                    energy_level="high",
                    mood="good"
                )
                entry.date = date.today() - timedelta(days=i)
                save_journal_entry(entry)
            
            # Get recent entries (last 3 days)
            from echo.journal import get_recent_journal_entries
            recent_entries = get_recent_journal_entries(days=3)
            assert len(recent_entries) == 3
            
            # Verify they're sorted by date (newest first)
            for i in range(len(recent_entries) - 1):
                assert recent_entries[i].date >= recent_entries[i + 1].date
            
        finally:
            os.chdir(original_cwd)


class TestJournalEntryDataStructures:
    """Test journal entry data structures and serialization."""
    
    def test_journal_entry_to_dict(self):
        """Test journal entry serialization."""
        entry = JournalEntry(
            date=date(2025, 1, 20),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={"test": "value"},
            tags=["test"],
            linked_projects=["project1"]
        )
        
        entry_dict = entry.to_dict()
        assert entry_dict["date"] == "2025-01-20"
        assert entry_dict["entry_type"] == "evening_reflection"
        assert entry_dict["content"] == {"test": "value"}
        assert entry_dict["tags"] == ["test"]
        assert entry_dict["linked_projects"] == ["project1"]
    
    def test_journal_entry_type_enum(self):
        """Test journal entry type enum values."""
        assert JournalEntryType.EVENING_REFLECTION.value == "evening_reflection"
        assert JournalEntryType.QUICK_NOTE.value == "quick_note"
        assert JournalEntryType.INSIGHT.value == "insight"
        assert JournalEntryType.PATTERN.value == "pattern"


class TestPlanningContextExtraction:
    """Test planning context extraction from journal entries."""
    
    def test_extract_planning_context_from_reflection(self):
        """Test extracting planning context from a reflection entry."""
        entry = create_evening_reflection_entry(
            what_went_well="Completed the project",
            challenges="Some technical issues",
            learnings="Better to plan ahead",
            energy_level="medium",
            mood="productive",
            patterns_noticed="I work better in the morning",
            tomorrow_focus="Continue the project",
            tomorrow_energy="high",
            non_negotiables="Exercise",
            avoid_tomorrow="Meetings before 10am"
        )
        
        from echo.journal import extract_planning_context_from_reflection
        context = extract_planning_context_from_reflection(entry)
        
        assert "tomorrow_focus" in context
        assert "tomorrow_energy" in context
        assert "non_negotiables" in context
        assert "avoid_tomorrow" in context
        assert "patterns_noticed" in context
        assert "today_energy" in context
        assert "today_mood" in context
        assert "learnings" in context
        
        assert context["tomorrow_focus"] == "Continue the project"
        assert context["tomorrow_energy"] == "high"
        assert context["non_negotiables"] == "Exercise"
        assert context["avoid_tomorrow"] == "Meetings before 10am"
        assert context["today_energy"] == "medium"
        assert context["today_mood"] == "productive"
    
    def test_extract_planning_context_minimal(self):
        """Test extracting planning context from minimal reflection."""
        entry = create_evening_reflection_entry(
            what_went_well="Good day",
            challenges="None",
            learnings="Nothing new",
            energy_level="high",
            mood="good"
        )
        
        context = extract_planning_context_from_reflection(entry)
        
        # Should only extract what's available
        assert "today_energy" in context
        assert "today_mood" in context
        assert "learnings" in context
        
        # Should not have tomorrow-specific context
        assert "tomorrow_focus" not in context
        assert "tomorrow_energy" not in context
        assert "non_negotiables" not in context
        assert "avoid_tomorrow" not in context
    
    def test_get_recent_reflection_context(self, tmp_path):
        """Test getting recent reflection context."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create test reflection entries
            entry1 = create_evening_reflection_entry(
                what_went_well="Day 1 went well",
                challenges="None",
                learnings="Test 1",
                energy_level="high",
                mood="good",
                tomorrow_focus="Continue project",
                tomorrow_energy="high"
            )
            entry1.date = date.today() - timedelta(days=1)
            
            entry2 = create_evening_reflection_entry(
                what_went_well="Day 2 went well",
                challenges="Some issues",
                learnings="Test 2",
                energy_level="medium",
                mood="okay",
                tomorrow_focus="Start new project",
                tomorrow_energy="medium"
            )
            entry2.date = date.today()
            
            # Save entries
            save_journal_entry(entry1)
            save_journal_entry(entry2)
            
            # Get recent context
            from echo.journal import get_recent_reflection_context
            contexts = get_recent_reflection_context(days=7)
            
            assert len(contexts) == 2
            
            # Check that contexts have planning data
            for context in contexts:
                assert "date" in context
                assert "tomorrow_focus" in context
                assert "tomorrow_energy" in context
                assert "today_energy" in context
                assert "today_mood" in context
            
        finally:
            os.chdir(original_cwd)
    
    def test_get_recent_reflection_context_empty(self, tmp_path):
        """Test getting recent reflection context with no entries."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            from echo.journal import get_recent_reflection_context
            contexts = get_recent_reflection_context(days=7)
            assert contexts == []
            
        finally:
            os.chdir(original_cwd)


class TestEnergyMoodTrends:
    """Test energy and mood trend analysis."""
    
    def test_analyze_energy_mood_trends_consistent(self, tmp_path):
        """Test trend analysis with consistent values."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create entries with consistent energy/mood
            for i in range(5):
                entry = create_evening_reflection_entry(
                    what_went_well=f"Day {i} went well",
                    challenges="None",
                    learnings=f"Learning {i}",
                    energy_level="high",
                    mood="good"
                )
                entry.date = date.today() - timedelta(days=i)
                save_journal_entry(entry)
            
            from echo.journal import analyze_energy_mood_trends
            trends = analyze_energy_mood_trends(days=7)
            
            assert trends["energy_trend"] == "consistently high"
            assert trends["mood_trend"] == "consistently good"
            assert trends["recent_energy"] == "high"
            assert trends["recent_mood"] == "good"
            
        finally:
            os.chdir(original_cwd)
    
    def test_analyze_energy_mood_trends_variable(self, tmp_path):
        """Test trend analysis with variable values."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create entries with variable energy/mood
            energies = ["high", "medium", "low", "high", "medium"]
            moods = ["good", "okay", "tired", "good", "okay"]
            
            for i, (energy, mood) in enumerate(zip(energies, moods)):
                entry = create_evening_reflection_entry(
                    what_went_well=f"Day {i} went well",
                    challenges="None",
                    learnings=f"Learning {i}",
                    energy_level=energy,
                    mood=mood
                )
                entry.date = date.today() - timedelta(days=i)
                save_journal_entry(entry)
            
            trends = analyze_energy_mood_trends(days=7)
            
            # With 2 "high" out of 5 values (40%), it should be "mostly high"
            assert trends["energy_trend"] == "mostly high"
            # With 2 "good" out of 5 values (40%), it should be "mostly good"
            assert trends["mood_trend"] == "mostly good"
            assert trends["recent_energy"] == "medium"
            assert trends["recent_mood"] == "okay"
            
        finally:
            os.chdir(original_cwd)
    
    def test_analyze_energy_mood_trends_empty(self, tmp_path):
        """Test trend analysis with no entries."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            trends = analyze_energy_mood_trends(days=7)
            
            assert trends["energy_trend"] == "unknown"
            assert trends["mood_trend"] == "unknown"
            assert "recent_energy" not in trends
            assert "recent_mood" not in trends
            
        finally:
            os.chdir(original_cwd)


class TestEnhancedEveningReflection:
    """Test enhanced evening reflection functionality."""
    
    def test_create_enhanced_evening_reflection_entry(self):
        """Test creating an enhanced evening reflection entry."""
        entry = create_enhanced_evening_reflection_entry(
            what_went_well="Completed the project",
            challenges="Some technical issues",
            learnings="Better to plan ahead",
            energy_level="medium",
            mood="productive",
            patterns_noticed="I work better in the morning",
            tomorrow_focus="Continue the project",
            tomorrow_energy="high",
            non_negotiables="Exercise",
            avoid_tomorrow="Meetings before 10am",
            tomorrow_priorities="Finish project, Exercise, Call client"
        )
        
        assert entry.date == date.today()
        assert entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert "what_went_well" in entry.content
        assert "challenges" in entry.content
        assert "learnings" in entry.content
        assert "energy_level" in entry.content
        assert "mood" in entry.content
        assert "patterns_noticed" in entry.content
        assert "tomorrow_focus" in entry.content
        assert "tomorrow_energy" in entry.content
        assert "non_negotiables" in entry.content
        assert "avoid_tomorrow" in entry.content
        assert "tomorrow_priorities" in entry.content
        
        assert "evening" in entry.tags
        assert "reflection" in entry.tags
        assert "daily" in entry.tags
        assert "planning" in entry.tags
    
    def test_create_enhanced_evening_reflection_entry_minimal(self):
        """Test creating an enhanced evening reflection entry with minimal content."""
        entry = create_enhanced_evening_reflection_entry(
            what_went_well="Good day",
            challenges="None",
            learnings="Nothing new",
            energy_level="high",
            mood="good"
        )
        
        assert entry.date == date.today()
        assert entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert len(entry.content) == 5  # Only the required fields
        assert "tomorrow_priorities" not in entry.content
        assert "planning" in entry.tags


class TestEveningReflectionDataStructures:
    """Test evening reflection data structures."""
    
    def test_evening_reflection_to_dict(self):
        """Test evening reflection serialization."""
        from echo.models import EveningReflection
        reflection = create_evening_reflection_entry(
            what_went_well="Test",
            challenges="None",
            learnings="Testing",
            energy_level="high",
            mood="good"
        )
        
        from datetime import datetime
        from echo.models import Block, BlockType
        tomorrow_plan = [
            Block(
                start=datetime.strptime("09:00", "%H:%M").time(),
                end=datetime.strptime("10:00", "%H:%M").time(),
                label="Test Block",
                type=BlockType.FLEX
            )
        ]
        
        from echo.models import JournalPlanningContext
        planning_context = JournalPlanningContext(
            recent_mood="good",
            energy_trend="consistently high",
            productivity_patterns=["morning focus", "90-minute blocks"],
            avoid_patterns=["meetings before 10am"],
            focus_areas=["project completion"],
            non_negotiables=["exercise"],
            energy_prediction="high",
            mood_prediction="productive"
        )
        
        evening_reflection = EveningReflection(
            reflection=reflection,
            tomorrow_plan=tomorrow_plan,
            planning_context=planning_context
        )
        
        reflection_dict = evening_reflection.to_dict()
        
        assert "reflection" in reflection_dict
        assert "tomorrow_plan" in reflection_dict
        assert "planning_context" in reflection_dict
        assert "created_at" in reflection_dict
        
        assert reflection_dict["planning_context"]["tomorrow_focus"] == "Testing"
        assert len(reflection_dict["tomorrow_plan"]) == 1
    
    def test_journal_planning_context_to_dict(self):
        """Test journal planning context serialization."""
        from echo.models import JournalPlanningContext
        context = JournalPlanningContext(
            recent_mood="good",
            energy_trend="consistently high",
            productivity_patterns=["morning focus", "90-minute blocks"],
            avoid_patterns=["meetings before 10am"],
            focus_areas=["project completion"],
            non_negotiables=["exercise"],
            energy_prediction="high",
            mood_prediction="productive"
        )
        
        context_dict = context.to_dict()
        
        assert context_dict["recent_mood"] == "good"
        assert context_dict["energy_trend"] == "consistently high"
        assert "morning focus" in context_dict["productivity_patterns"]
        assert "meetings before 10am" in context_dict["avoid_patterns"]
        assert "project completion" in context_dict["focus_areas"]
        assert "exercise" in context_dict["non_negotiables"]
        assert context_dict["energy_prediction"] == "high"
        assert context_dict["mood_prediction"] == "productive"


class TestTomorrowPlanning:
    """Test tomorrow planning functionality."""
    
    def test_build_tomorrow_planning_prompt(self):
        """Test building tomorrow planning prompt with reflection context."""
        from echo.prompt_engine import build_tomorrow_planning_prompt
        from echo.models import Config, Profile, Project, Defaults
        
        # Create a minimal config
        config = Config(
            defaults=Defaults(wake_time="07:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={},
            profiles={}
        )
        
        # Create reflection entry with planning context
        reflection_entry = {
            "tomorrow_focus": "Complete the project",
            "tomorrow_energy": "high",
            "non_negotiables": "Exercise",
            "avoid_tomorrow": "Meetings before 10am",
            "tomorrow_priorities": "Finish project, Exercise, Call client"
        }
        
        # Build prompt
        prompt = build_tomorrow_planning_prompt(
            reflection_entry=reflection_entry,
            config=config
        )
        
        # Check that prompt contains reflection context
        assert "Tomorrow's Focus" in prompt
        assert "Complete the project" in prompt
        assert "Expected Energy Level" in prompt
        assert "high" in prompt
        assert "Non-Negotiables" in prompt
        assert "Exercise" in prompt
        assert "Things to Avoid" in prompt
        assert "Meetings before 10am" in prompt
        assert "Tomorrow's Priorities" in prompt
        assert "Finish project" in prompt
    
    def test_build_tomorrow_planning_prompt_with_trends(self):
        """Test building tomorrow planning prompt with trends."""
        from echo.prompt_engine import build_tomorrow_planning_prompt
        from echo.models import Config, Profile, Project, Defaults
        
        # Create a minimal config
        config = Config(
            defaults=Defaults(wake_time="06:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={"test": Project(id="test", name="Test Project")},
            profiles={}
        )
        
        # Create reflection entry
        reflection_entry = {
            "tomorrow_focus": "Test focus"
        }
        
        # Create trends
        trends = {
            "energy_trend": "consistently high",
            "mood_trend": "mostly good",
            "recent_energy": "high",
            "recent_mood": "good"
        }
        
        # Build prompt
        prompt = build_tomorrow_planning_prompt(
            reflection_entry=reflection_entry,
            config=config,
            recent_trends=trends
        )
        
        # Check that prompt contains trends
        assert "Recent Patterns & Trends" in prompt
        assert "consistently high" in prompt
        assert "mostly good" in prompt
    
    def test_build_journal_aware_planner_prompt(self):
        """Test building journal-aware planner prompt."""
        from echo.prompt_engine import build_journal_aware_planner_prompt
        from echo.models import Config, Profile, Project, Defaults
        
        # Create a minimal config
        config = Config(
            defaults=Defaults(wake_time="06:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={"test": Project(id="test", name="Test Project")},
            profiles={}
        )
        
        # Create journal context
        journal_context = {
            "tomorrow_focus": "Complete the project",
            "tomorrow_energy": "high",
            "non_negotiables": "Exercise",
            "avoid_tomorrow": "Meetings before 10am",
            "patterns_noticed": "I work better in the morning",
            "learnings": "Better to plan ahead"
        }
        
        # Create trends
        trends = {
            "energy_trend": "consistently high",
            "mood_trend": "mostly good"
        }
        
        # Build prompt
        prompt = build_journal_aware_planner_prompt(
            most_important="Test important work",
            todos=["Task 1", "Task 2"],
            energy_level="high",
            non_negotiables="Exercise",
            avoid_today="Meetings",
            fixed_events=[],
            config=config,
            journal_context=journal_context,
            recent_trends=trends
        )
        
        # Check that prompt contains journal context
        assert "Journal-Based Planning Context" in prompt
        assert "Complete the project" in prompt
        assert "Recent Patterns & Trends" in prompt
        assert "consistently high" in prompt
        assert "I work better in the morning" in prompt
        assert "Better to plan ahead" in prompt
    
    def test_parse_tomorrow_planning_response(self):
        """Test parsing tomorrow planning response."""
        from echo.prompt_engine import parse_tomorrow_planning_response
        
        # Test valid JSON response
        json_response = '''[
            {"start": "06:00", "end": "08:00", "title": "Personal | Morning Routine", "type": "anchor"},
            {"start": "08:00", "end": "10:00", "title": "Test Project | Priority Work", "type": "flex"}
        ]'''
        
        blocks = parse_tomorrow_planning_response(json_response)
        
        assert len(blocks) == 2
        assert blocks[0].label == "Personal | Morning Routine"
        assert blocks[0].type == BlockType.ANCHOR
        assert blocks[1].label == "Test Project | Priority Work"
        assert blocks[1].type == BlockType.FLEX
    
    def test_parse_tomorrow_planning_response_invalid(self):
        """Test parsing invalid tomorrow planning response."""
        from echo.prompt_engine import parse_tomorrow_planning_response
        
        # Test invalid JSON
        with pytest.raises(ValueError):
            parse_tomorrow_planning_response("invalid json")
        
        # Test missing required fields
        with pytest.raises(ValueError):
            parse_tomorrow_planning_response('{"start": "06:00"}')


class TestEndDayWorkflow:
    """Test the end_day workflow functionality."""
    
    def test_end_day_workflow_integration(self, tmp_path):
        """Test that end_day workflow integrates reflection and planning."""
        # Change to temp directory
        original_cwd = Path.cwd()
        try:
            os.chdir(tmp_path)
            
            # Create a test reflection entry
            from echo.journal import create_enhanced_evening_reflection_entry
            entry = create_enhanced_evening_reflection_entry(
                what_went_well="Test day went well",
                challenges="Some test challenges",
                learnings="Test learnings",
                energy_level="high",
                mood="good",
                patterns_noticed="Test patterns",
                tomorrow_focus="Test focus",
                tomorrow_energy="medium",
                non_negotiables="Test exercise",
                avoid_tomorrow="Test meetings",
                tomorrow_priorities="Test priorities"
            )
            
            # Save the entry
            from echo.journal import save_journal_entry
            file_path = save_journal_entry(entry)
            
            # Extract planning context
            from echo.journal import extract_planning_context_from_reflection
            planning_context = extract_planning_context_from_reflection(entry)
            
            # Verify planning context was extracted
            assert "tomorrow_focus" in planning_context
            assert "tomorrow_energy" in planning_context
            assert "non_negotiables" in planning_context
            assert "avoid_tomorrow" in planning_context
            assert "tomorrow_priorities" in planning_context
            
            # Verify the entry was saved
            assert file_path.exists()
            
            # Load the entry back
            from echo.journal import load_journal_entry
            loaded_entry = load_journal_entry(file_path)
            assert loaded_entry is not None
            assert loaded_entry.entry_type == JournalEntryType.EVENING_REFLECTION
            
        finally:
            os.chdir(original_cwd)
    
    def test_end_day_workflow_data_flow(self):
        """Test the data flow in end_day workflow."""
        # Test that enhanced evening reflection entry has all required fields
        entry = create_enhanced_evening_reflection_entry(
            what_went_well="Test",
            challenges="Test",
            learnings="Test",
            energy_level="high",
            mood="good",
            patterns_noticed="Test patterns",
            tomorrow_focus="Test focus",
            tomorrow_energy="medium",
            non_negotiables="Test exercise",
            avoid_tomorrow="Test meetings",
            tomorrow_priorities="Test priorities"
        )
        
        # Verify all fields are present
        assert "what_went_well" in entry.content
        assert "challenges" in entry.content
        assert "learnings" in entry.content
        assert "energy_level" in entry.content
        assert "mood" in entry.content
        assert "patterns_noticed" in entry.content
        assert "tomorrow_focus" in entry.content
        assert "tomorrow_energy" in entry.content
        assert "non_negotiables" in entry.content
        assert "avoid_tomorrow" in entry.content
        assert "tomorrow_priorities" in entry.content
        
        # Verify planning context extraction
        planning_context = extract_planning_context_from_reflection(entry)
        assert len(planning_context) > 0
        assert "tomorrow_focus" in planning_context
        assert "tomorrow_energy" in planning_context


class TestMorningCheckIn:
    """Test morning check-in functionality."""
    
    def test_build_morning_adjustment_prompt(self):
        """Test building morning adjustment prompt."""
        from echo.prompt_engine import build_morning_adjustment_prompt
        from echo.models import Config, Profile, Project, Defaults, Block, BlockType
        
        # Create a minimal config
        config = Config(
            defaults=Defaults(wake_time="06:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={"test": Project(id="test", name="Test Project")},
            profiles={}
        )
        
        # Create test blocks
        blocks = [
            Block(
                start=datetime.strptime("08:00", "%H:%M").time(),
                end=datetime.strptime("10:00", "%H:%M").time(),
                label="Test Project | Morning Work",
                type=BlockType.FLEX
            ),
            Block(
                start=datetime.strptime("10:00", "%H:%M").time(),
                end=datetime.strptime("12:00", "%H:%M").time(),
                label="Test Project | Afternoon Work",
                type=BlockType.FLEX
            )
        ]
        
        # Create morning context
        morning_context = {
            "morning_energy": "low",
            "morning_mood": "tired",
            "readiness": "3"
        }
        
        # Build prompt
        prompt = build_morning_adjustment_prompt(
            original_blocks=blocks,
            morning_context=morning_context,
            config=config
        )
        
        # Check that prompt contains morning context
        assert "Morning Assessment" in prompt
        assert "low" in prompt
        assert "tired" in prompt
        assert "3" in prompt
        assert "Original Plan for Today" in prompt
        assert "Morning Work" in prompt
        assert "Afternoon Work" in prompt
    
    def test_build_morning_adjustment_prompt_with_trends(self):
        """Test building morning adjustment prompt with trends."""
        from echo.prompt_engine import build_morning_adjustment_prompt
        from echo.models import Config, Profile, Project, Defaults, Block, BlockType
        
        # Create a minimal config
        config = Config(
            defaults=Defaults(wake_time="06:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={"test": Project(id="test", name="Test Project")},
            profiles={}
        )
        
        # Create test blocks
        blocks = [
            Block(
                start=datetime.strptime("08:00", "%H:%M").time(),
                end=datetime.strptime("10:00", "%H:%M").time(),
                label="Test Project | Work",
                type=BlockType.FLEX
            )
        ]
        
        # Create morning context
        morning_context = {
            "morning_energy": "high",
            "morning_mood": "good",
            "readiness": "8"
        }
        
        # Create trends
        trends = {
            "energy_trend": "consistently high",
            "mood_trend": "mostly good"
        }
        
        # Build prompt
        prompt = build_morning_adjustment_prompt(
            original_blocks=blocks,
            morning_context=morning_context,
            config=config,
            recent_trends=trends
        )
        
        # Check that prompt contains trends
        assert "Recent Patterns & Trends" in prompt
        assert "consistently high" in prompt
        assert "mostly good" in prompt
    
    def test_parse_morning_adjustment_response(self):
        """Test parsing morning adjustment response."""
        from echo.prompt_engine import parse_morning_adjustment_response
        
        # Test valid JSON response
        json_response = '''[
            {"start": "06:00", "end": "08:00", "title": "Personal | Morning Routine", "type": "anchor"},
            {"start": "08:00", "end": "10:00", "title": "Test Project | Adjusted Work", "type": "flex"}
        ]'''
        
        blocks = parse_morning_adjustment_response(json_response)
        
        assert len(blocks) == 2
        assert blocks[0].label == "Personal | Morning Routine"
        assert blocks[0].type == BlockType.ANCHOR
        assert blocks[1].label == "Test Project | Adjusted Work"
        assert blocks[1].type == BlockType.FLEX
    
    def test_parse_morning_adjustment_response_invalid(self):
        """Test parsing invalid morning adjustment response."""
        from echo.prompt_engine import parse_morning_adjustment_response
        
        # Test invalid JSON
        with pytest.raises(ValueError):
            parse_morning_adjustment_response("invalid json")
        
        # Test missing required fields
        with pytest.raises(ValueError):
            parse_morning_adjustment_response('{"start": "06:00"}') 

    # Test morning check-in with plan adjustment
    def test_morning_check_in_with_adjustment(self):
        """Test morning check-in workflow with plan adjustment."""
        # Create test config
        config = Config(
            openai_api_key="test-key",
            journal_dir="test_journal",
            project_logs_dir="test_logs"
        )
        
        # Create test evening reflection
        reflection_content = {
            "energy_level": "medium",
            "mood": "focused",
            "what_went_well": "Completed project planning",
            "challenges": "Some interruptions",
            "learnings": "Need better focus time",
            "patterns_noticed": "More productive in mornings",
            "tomorrow_focus": "Deep work on core project",
            "tomorrow_energy": "high",
            "non_negotiables": ["Team meeting at 2pm"],
            "tomorrow_priorities": ["Finish project proposal", "Review code"]
        }
        
        reflection_entry = JournalEntry(
            date=date.today() - timedelta(days=1),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content=reflection_content,
            tags=["evening", "reflection", "planning"]
        )
        
        # Save reflection
        save_journal_entry(reflection_entry, config)
        
        # Create test plan
        test_plan = [
            Block(
                start=time(9, 0),
                end=time(10, 30),
                label="Deep Work",
                type=BlockType.FLEX
            ),
            Block(
                start=time(14, 0),
                end=time(15, 0),
                label="Team Meeting",
                type=BlockType.FIXED
            )
        ]
        
        # Mock LLM response for morning adjustment
        mock_response = '''{
            "adjusted_blocks": [
                {
                    "start_time": "09:00",
                    "end_time": "11:00",
                    "title": "Extended Deep Work",
                    "description": "Based on high energy, extended focus time",
                    "project": "test-project"
                },
                {
                    "start_time": "14:00",
                    "end_time": "15:00",
                    "title": "Team Meeting",
                    "description": "Weekly sync",
                    "project": "test-project"
                }
            ],
            "adjustment_reason": "Extended morning deep work based on high energy level",
            "energy_assessment": "high",
            "mood_assessment": "focused"
        }'''
        
        with patch('echo.cli._call_llm', return_value=mock_response):
            # Test morning check-in
            with patch('builtins.input', side_effect=['y']):  # Yes to adjustment
                with patch('echo.cli.push_plan_to_gcal') as mock_push:
                    run_morning_check_in(Mock())
                    mock_push.assert_called_once()
    
    # Phase 2C: LLM-Generated Insights Tests
    
    def test_generate_journal_insights(self):
        """Test generating journal insights from entries."""
        # Create test config
        config = Config(
            openai_api_key="test-key",
            journal_dir="test_journal",
            project_logs_dir="test_logs"
        )
        
        # Create test journal entries
        entries = []
        for i in range(5):
            entry = JournalEntry(
                date=date.today() - timedelta(days=i),
                entry_type=JournalEntryType.EVENING_REFLECTION,
                content={
                    "energy_level": "high" if i % 2 == 0 else "medium",
                    "mood": "focused" if i % 2 == 0 else "tired",
                    "what_went_well": f"Completed task {i}",
                    "challenges": f"Challenge {i}",
                    "learnings": f"Learning {i}",
                    "patterns_noticed": f"Pattern {i}"
                },
                tags=["evening", "reflection"]
            )
            entries.append(entry)
            save_journal_entry(entry, config)
        
        # Mock LLM response for insights
        mock_response = '''{
            "patterns": [
                {
                    "type": "energy",
                    "description": "Alternating high and medium energy levels",
                    "frequency": "every other day",
                    "impact": "positive"
                }
            ],
            "insights": [
                {
                    "category": "energy_management",
                    "insight": "High energy days correlate with better productivity",
                    "evidence": "Consistent pattern of high energy on even days",
                    "confidence": "high"
                }
            ],
            "recommendations": [
                {
                    "category": "energy_optimization",
                    "recommendation": "Schedule important tasks on high energy days",
                    "rationale": "Better performance on high energy days",
                    "priority": "high"
                }
            ],
            "summary": "Clear energy patterns with good productivity correlation"
        }'''
        
        with patch('echo.cli._call_llm', return_value=mock_response):
            insights = generate_journal_insights(30)
            
            # Verify insights structure
            self.assertIn("patterns", insights)
            self.assertIn("insights", insights)
            self.assertIn("recommendations", insights)
            self.assertIn("summary", insights)
            
            # Verify pattern data
            self.assertEqual(len(insights["patterns"]), 1)
            pattern = insights["patterns"][0]
            self.assertEqual(pattern["type"], "energy")
            self.assertEqual(pattern["impact"], "positive")
            
            # Verify insight data
            self.assertEqual(len(insights["insights"]), 1)
            insight = insights["insights"][0]
            self.assertEqual(insight["category"], "energy_management")
            self.assertEqual(insight["confidence"], "high")
            
            # Verify recommendation data
            self.assertEqual(len(insights["recommendations"]), 1)
            rec = insights["recommendations"][0]
            self.assertEqual(rec["category"], "energy_optimization")
            self.assertEqual(rec["priority"], "high")
    
    def test_generate_productivity_analysis(self):
        """Test generating detailed productivity analysis."""
        # Create test config
        config = Config(
            openai_api_key="test-key",
            journal_dir="test_journal",
            project_logs_dir="test_logs"
        )
        
        # Create test entries
        entries = []
        for i in range(3):
            entry = JournalEntry(
                date=date.today() - timedelta(days=i),
                entry_type=JournalEntryType.EVENING_REFLECTION,
                content={
                    "energy_level": "high" if i == 0 else "medium",
                    "mood": "focused" if i == 0 else "tired",
                    "what_went_well": f"Task {i} completed",
                    "challenges": f"Challenge {i}"
                },
                tags=["evening", "reflection"]
            )
            entries.append(entry)
            save_journal_entry(entry, config)
        
        # Mock LLM response for productivity analysis
        mock_response = '''{
            "energy_analysis": {
                "pattern": "Declining energy over days",
                "optimal_times": "Morning hours",
                "recommendations": ["Schedule important tasks early", "Take breaks"]
            },
            "mood_analysis": {
                "pattern": "Mood follows energy pattern",
                "productivity_impact": "High mood correlates with better focus",
                "recommendations": ["Optimize morning routine", "Manage energy better"]
            },
            "productivity_insights": [
                {
                    "insight": "Morning productivity is highest",
                    "evidence": "Consistent high energy and focus in mornings",
                    "action": "Schedule critical tasks before noon"
                }
            ],
            "optimization_plan": {
                "short_term": ["Start important tasks early"],
                "long_term": ["Develop consistent morning routine"],
                "priority": "Optimize morning schedule"
            }
        }'''
        
        with patch('echo.cli._call_llm', return_value=mock_response):
            analysis = generate_productivity_analysis(14)
            
            # Verify analysis structure
            self.assertIn("energy_analysis", analysis)
            self.assertIn("mood_analysis", analysis)
            self.assertIn("productivity_insights", analysis)
            self.assertIn("optimization_plan", analysis)
            
            # Verify energy analysis
            energy = analysis["energy_analysis"]
            self.assertEqual(energy["pattern"], "Declining energy over days")
            self.assertEqual(energy["optimal_times"], "Morning hours")
            self.assertEqual(len(energy["recommendations"]), 2)
            
            # Verify mood analysis
            mood = analysis["mood_analysis"]
            self.assertEqual(mood["pattern"], "Mood follows energy pattern")
            self.assertEqual(mood["productivity_impact"], "High mood correlates with better focus")
            self.assertEqual(len(mood["recommendations"]), 2)
            
            # Verify productivity insights
            self.assertEqual(len(analysis["productivity_insights"]), 1)
            insight = analysis["productivity_insights"][0]
            self.assertEqual(insight["insight"], "Morning productivity is highest")
            self.assertEqual(insight["action"], "Schedule critical tasks before noon")
            
            # Verify optimization plan
            plan = analysis["optimization_plan"]
            self.assertEqual(len(plan["short_term"]), 1)
            self.assertEqual(len(plan["long_term"]), 1)
            self.assertEqual(plan["priority"], "Optimize morning schedule")
    
    def test_get_insight_summary(self):
        """Test getting a quick summary of insights."""
        # Create test config
        config = Config(
            openai_api_key="test-key",
            journal_dir="test_journal",
            project_logs_dir="test_logs"
        )
        
        # Create test entries
        for i in range(3):
            entry = JournalEntry(
                date=date.today() - timedelta(days=i),
                entry_type=JournalEntryType.EVENING_REFLECTION,
                content={
                    "energy_level": "high" if i % 2 == 0 else "medium",
                    "mood": "focused" if i % 2 == 0 else "tired",
                    "what_went_well": f"Task {i}",
                    "challenges": f"Challenge {i}"
                },
                tags=["evening", "reflection"]
            )
            save_journal_entry(entry, config)
        
        # Mock LLM response for insights
        mock_response = '''{
            "patterns": [
                {
                    "type": "energy",
                    "description": "Alternating energy pattern",
                    "frequency": "every other day",
                    "impact": "positive"
                }
            ],
            "insights": [
                {
                    "category": "energy_management",
                    "insight": "High energy days are more productive",
                    "evidence": "Pattern of high energy on even days",
                    "confidence": "high"
                }
            ],
            "recommendations": [
                {
                    "category": "energy_optimization",
                    "recommendation": "Schedule important tasks on high energy days",
                    "rationale": "Better performance correlation",
                    "priority": "high"
                }
            ],
            "summary": "Clear energy patterns with productivity correlation"
        }'''
        
        with patch('echo.cli._call_llm', return_value=mock_response):
            summary = get_insight_summary(30)
            
            # Verify summary contains expected sections
            self.assertIn("📊 **Key Patterns:**", summary)
            self.assertIn("💡 **Key Insights:**", summary)
            self.assertIn("🎯 **Top Recommendations:**", summary)
            self.assertIn("Alternating energy pattern", summary)
            self.assertIn("High energy days are more productive", summary)
            self.assertIn("Schedule important tasks on high energy days", summary)
    
    def test_insights_with_no_data(self):
        """Test insights generation with no journal data."""
        # Mock LLM response for no data
        mock_response = '''{
            "patterns": [],
            "insights": [],
            "recommendations": [],
            "summary": "No significant patterns found in recent journal entries."
        }'''
        
        with patch('echo.cli._call_llm', return_value=mock_response):
            insights = generate_journal_insights(30)
            
            # Verify empty insights structure
            self.assertEqual(insights["patterns"], [])
            self.assertEqual(insights["insights"], [])
            self.assertEqual(insights["recommendations"], [])
            self.assertIn("No significant patterns", insights["summary"])
    
    def test_productivity_analysis_with_no_data(self):
        """Test productivity analysis with no journal data."""
        # Mock LLM response for no data
        mock_response = '''{
            "energy_analysis": {
                "pattern": "No data available",
                "optimal_times": "Unknown",
                "recommendations": []
            },
            "mood_analysis": {
                "pattern": "No data available",
                "productivity_impact": "Unknown",
                "recommendations": []
            },
            "productivity_insights": [],
            "optimization_plan": {
                "short_term": [],
                "long_term": [],
                "priority": "No data available"
            }
        }'''
        
        with patch('echo.cli._call_llm', return_value=mock_response):
            analysis = generate_productivity_analysis(14)
            
            # Verify empty analysis structure
            self.assertEqual(analysis["energy_analysis"]["pattern"], "No data available")
            self.assertEqual(analysis["mood_analysis"]["pattern"], "No data available")
            self.assertEqual(analysis["productivity_insights"], [])
            self.assertEqual(analysis["optimization_plan"]["priority"], "No data available")
    
    def test_insight_summary_with_no_data(self):
        """Test insight summary with no journal data."""
        # Mock LLM response for no data
        mock_response = '''{
            "patterns": [],
            "insights": [],
            "recommendations": [],
            "summary": "No significant patterns found in recent journal entries."
        }'''
        
        with patch('echo.cli._call_llm', return_value=mock_response):
            summary = get_insight_summary(30)
            
            # Verify summary for no data
            self.assertIn("No significant patterns found", summary) 