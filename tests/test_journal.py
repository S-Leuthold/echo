# ==============================================================================
# FILE: tests/test_journal.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Tests for the journaling system including evening reflection,
#   morning check-in, and LLM-generated insights.
#
# ==============================================================================

import pytest
from datetime import datetime, date, timedelta
from unittest.mock import Mock, patch, MagicMock
from pathlib import Path
import json
import tempfile
import shutil

from echo.journal import (
    JournalEntry, get_journal_dir, ensure_journal_dir,
    save_journal_entry, load_journal_entry, load_journal_entries,
    search_journal_entries, create_evening_reflection_entry,
    create_quick_note_entry, extract_planning_context_from_reflection,
    analyze_energy_mood_trends, generate_journal_insights,
    generate_productivity_analysis, get_insight_summary
)
from echo.models import Config, Defaults, JournalEntryType


class TestJournalEntry:
    """Test journal entry creation and serialization."""
    
    def test_journal_entry_creation(self):
        """Test creating a basic journal entry."""
        entry = JournalEntry(
            date=date.today(),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={
                "what_went_well": "Today was productive. I completed the core planning feature.",
                "energy_level": "8",
                "mood": "focused"
            },
            tags=["session", "planning"],
            linked_projects=["echo_dev"]
        )
        
        assert entry.date == date.today()
        assert entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert "productive" in entry.content["what_went_well"]
        assert entry.content["energy_level"] == "8"
    
    def test_journal_entry_serialization(self):
        """Test journal entry serialization to dictionary."""
        entry = JournalEntry(
            date=date(2025, 1, 20),
            entry_type=JournalEntryType.QUICK_NOTE,
            content={"note": "Quick note about the session"},
            tags=["session", "planning"]
        )
        
        entry_dict = entry.to_dict()
        
        assert entry_dict["date"] == "2025-01-20"
        assert entry_dict["entry_type"] == "quick_note"
        assert entry_dict["content"]["note"] == "Quick note about the session"
        assert entry_dict["tags"] == ["session", "planning"]
    
    def test_journal_entry_from_dict(self):
        """Test creating journal entry from dictionary."""
        entry_data = {
            "date": "2025-01-20",
            "entry_type": "evening_reflection",
            "content": {"what_went_well": "Reflection content"},
            "tags": ["reflection"]
        }
        
        entry = JournalEntry.from_dict(entry_data)
        
        assert entry.date == date(2025, 1, 20)
        assert entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert entry.content["what_went_well"] == "Reflection content"
        assert entry.tags == ["reflection"]


class TestJournalFunctions:
    """Test journal management functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.journal_dir = Path(self.temp_dir) / "refs"
        self.journal_dir.mkdir()
    
    def teardown_method(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
    
    @patch('echo.journal.get_journal_dir')
    def test_save_and_load_entry(self, mock_get_dir):
        """Test saving and loading a journal entry."""
        mock_get_dir.return_value = self.journal_dir
        
        entry = JournalEntry(
            date=date.today(),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={
                "what_went_well": "Test reflection content",
                "energy_level": "8"
            }
        )
        
        # Save entry
        file_path = save_journal_entry(entry)
        
        # Load entry
        loaded_entry = load_journal_entry(file_path)
        
        assert loaded_entry is not None
        assert loaded_entry.content["what_went_well"] == "Test reflection content"
        assert loaded_entry.content["energy_level"] == "8"
    
    @patch('echo.journal.get_journal_dir')
    def test_get_recent_journal_entries(self, mock_get_dir):
        """Test getting recent journal entries."""
        mock_get_dir.return_value = self.journal_dir
        
        # Create test entries
        entry1 = JournalEntry(
            date=date.today(),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={"what_went_well": "Today's reflection"}
        )
        entry2 = JournalEntry(
            date=date.today() - timedelta(days=1),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={"what_went_well": "Yesterday's reflection"}
        )
        
        save_journal_entry(entry1)
        save_journal_entry(entry2)
        
        # Get entries for last 2 days
        entries = load_journal_entries(
            start_date=date.today() - timedelta(days=1),
            end_date=date.today()
        )
        
        assert len(entries) == 2
    
    @patch('echo.journal.get_journal_dir')
    def test_search_entries(self, mock_get_dir):
        """Test searching entries by content."""
        mock_get_dir.return_value = self.journal_dir
        
        entry1 = JournalEntry(
            date=date.today(),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={"what_went_well": "Productive day working on Echo project"}
        )
        entry2 = JournalEntry(
            date=date.today() - timedelta(days=1),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={"what_went_well": "Focused on planning and scheduling"}
        )
        
        save_journal_entry(entry1)
        save_journal_entry(entry2)
        
        # Search for "Echo"
        results = search_journal_entries("Echo")
        assert len(results) == 1
        assert "Echo" in results[0].content["what_went_well"]
        
        # Search for "planning"
        results = search_journal_entries("planning")
        assert len(results) == 1
        assert "planning" in results[0].content["what_went_well"]


class TestEveningReflection:
    """Test evening reflection functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.config = Config(
            defaults=Defaults(wake_time="07:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={},
            profiles={},
            email={}
        )
    
    def test_create_evening_reflection_entry(self):
        """Test creating evening reflection entry."""
        entry = create_evening_reflection_entry(
            what_went_well="Completed planning feature",
            challenges="Some technical debt",
            learnings="Better to plan ahead",
            energy_level="8",
            mood="focused",
            patterns_noticed="Morning sessions are most productive",
            tomorrow_focus="Continue with analytics",
            tomorrow_energy="7",
            non_negotiables="Morning routine",
            avoid_tomorrow="Meetings in deep work time"
        )
        
        assert entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert "planning feature" in entry.content["what_went_well"]
        assert "technical debt" in entry.content["challenges"]
        assert entry.content["energy_level"] == "8"
        assert entry.content["mood"] == "focused"
    
    def test_create_quick_note_entry(self):
        """Test creating quick note entry."""
        entry = create_quick_note_entry(
            note="Quick note about the session",
            tags=["session", "planning"]
        )
        
        assert entry.entry_type == JournalEntryType.QUICK_NOTE
        assert entry.content["note"] == "Quick note about the session"
        assert "session" in entry.tags
        assert "planning" in entry.tags
    
    def test_extract_planning_context_from_reflection(self):
        """Test extracting planning context from reflection."""
        entry = JournalEntry(
            date=date.today(),
            entry_type=JournalEntryType.EVENING_REFLECTION,
            content={
                "what_went_well": "Completed planning feature",
                "tomorrow_focus": "Continue with analytics",
                "energy_level": "8",
                "mood": "focused"
            }
        )
        
        context = extract_planning_context_from_reflection(entry)
        
        assert "planning feature" in context["accomplishments"]
        assert "analytics" in context["tomorrow_focus"]
        assert context["energy_level"] == "8"
        assert context["mood"] == "focused"
    
    @patch('echo.journal._call_llm')
    def test_analyze_energy_mood_trends(self, mock_llm):
        """Test analyzing energy and mood trends."""
        mock_llm.return_value = "Trend: Consistent high energy in mornings"
        
        # Mock recent entries
        entries = [
            JournalEntry(
                date=date.today() - timedelta(days=i),
                entry_type=JournalEntryType.EVENING_REFLECTION,
                content={"energy_level": "8", "mood": "focused"}
            ) for i in range(7)
        ]
        
        with patch('echo.journal.load_journal_entries', return_value=entries):
            trends = analyze_energy_mood_trends(days=7)
            
            assert "energy" in trends.lower()
            assert "trend" in trends.lower()


class TestInsightGeneration:
    """Test LLM-generated insights functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        pass
    
    @patch('echo.journal._call_llm')
    def test_generate_journal_insights(self, mock_llm):
        """Test generating journal insights."""
        mock_llm.return_value = "Productivity Insight: Morning sessions are most effective"
        
        # Mock recent entries
        entries = [
            JournalEntry(
                date=date.today() - timedelta(days=i),
                entry_type=JournalEntryType.EVENING_REFLECTION,
                content={"energy_level": "8", "what_went_well": "Completed planning feature"}
            ) for i in range(30)
        ]
        
        with patch('echo.journal.load_journal_entries', return_value=entries):
            insights = generate_journal_insights(days=30)
            
            assert "morning" in insights["productivity_insights"].lower()
            assert "effective" in insights["productivity_insights"].lower()
    
    @patch('echo.journal._call_llm')
    def test_generate_productivity_analysis(self, mock_llm):
        """Test generating productivity analysis."""
        mock_llm.return_value = "Productivity Analysis: Deep work sessions are most effective"
        
        # Mock recent entries
        entries = [
            JournalEntry(
                date=date.today() - timedelta(days=i),
                entry_type=JournalEntryType.EVENING_REFLECTION,
                content={"energy_level": "8", "what_went_well": "Completed planning feature"}
            ) for i in range(14)
        ]
        
        with patch('echo.journal.load_journal_entries', return_value=entries):
            analysis = generate_productivity_analysis(days=14)
            
            assert "deep work" in analysis["analysis"].lower()
            assert "effective" in analysis["analysis"].lower()
    
    @patch('echo.journal._call_llm')
    def test_get_insight_summary(self, mock_llm):
        """Test getting insight summary."""
        mock_llm.return_value = "Summary: Consistent morning productivity patterns"
        
        # Mock recent entries
        entries = [
            JournalEntry(
                date=date.today() - timedelta(days=i),
                entry_type=JournalEntryType.EVENING_REFLECTION,
                content={"energy_level": "8", "what_went_well": "Completed planning feature"}
            ) for i in range(30)
        ]
        
        with patch('echo.journal.load_journal_entries', return_value=entries):
            summary = get_insight_summary(days=30)
            
            assert "morning" in summary.lower()
            assert "productivity" in summary.lower()


# Integration Tests

class TestJournalIntegration:
    """Test journal system integration."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.journal_dir = Path(self.temp_dir) / "refs"
        self.journal_dir.mkdir()
        
        self.config = Config(
            defaults=Defaults(wake_time="07:00", sleep_time="22:00"),
            weekly_schedule={},
            projects={},
            profiles={},
            email={}
        )
    
    def teardown_method(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir)
    
    @patch('echo.journal.get_journal_dir')
    @patch('echo.journal._call_llm')
    def test_evening_reflection_workflow(self, mock_llm, mock_get_dir):
        """Test complete evening reflection workflow."""
        mock_get_dir.return_value = self.journal_dir
        mock_llm.return_value = "Test response"
        
        # Create evening reflection
        entry = create_evening_reflection_entry(
            what_went_well="Productive day working on Echo",
            challenges="Some technical debt",
            learnings="Better to plan ahead",
            energy_level="8",
            mood="focused"
        )
        
        # Save entry
        file_path = save_journal_entry(entry)
        
        # Load and verify
        loaded_entry = load_journal_entry(file_path)
        
        assert loaded_entry is not None
        assert loaded_entry.entry_type == JournalEntryType.EVENING_REFLECTION
        assert "Echo" in loaded_entry.content["what_went_well"]
        assert loaded_entry.content["energy_level"] == "8" 