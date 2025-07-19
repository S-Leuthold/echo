# ==============================================================================
# FILE: tests/test_analytics.py
# AUTHOR: Dr. Sam Leuthold & Echo Prime
# PROJECT: Echo
#
# PURPOSE:
#   Comprehensive test suite for the analytics module.
#   Tests the time ledger functionality, categorization, and data persistence.
# ==============================================================================

import pytest
import tempfile
from datetime import date, time, timedelta
from pathlib import Path

from echo.analytics import (
    categorize_block,
    extract_project_from_label,
    calculate_daily_stats,
    format_duration,
    TimeCategory,
    DailyStats
)
from echo.models import Block, BlockType, Config, Categories, Defaults


class TestTimeCategories:
    """Test that all time categories are properly defined."""
    
    def test_all_categories_defined(self):
        """Test that all expected categories are defined."""
        expected_categories = {
            "deep_work", "admin", "planning", "personal", 
            "health", "rest", "research", "development", 
            "writing", "uncategorized"
        }
        
        actual_categories = {cat.value for cat in TimeCategory}
        assert actual_categories == expected_categories


class TestBlockCategorization:
    """Test the block categorization logic."""
    
    @pytest.fixture
    def sample_config(self):
        """Create a sample config for testing."""
        return Config(
            defaults=Defaults(wake_time="06:00", sleep_time="22:00", timezone="America/Chicago"),
            weekly_schedule={},
            projects={},
            profiles={},
            categories=Categories(custom_mappings={
                "Echo Development": "development",
                "Research": "research", 
                "Team": "admin",
                "Personal": "personal"
            })
        )
    
    def test_echo_development_categorization(self, sample_config):
        """Test that Echo Development blocks are categorized as development."""
        block = Block(
            start=time(9, 0),
            end=time(11, 0),
            label="Echo Development | Core Feature Work",
            type=BlockType.FLEX
        )
        
        category = categorize_block(block, sample_config)
        assert category == "development"
    
    def test_research_categorization(self, sample_config):
        """Test that research blocks are categorized correctly."""
        block = Block(
            start=time(14, 0),
            end=time(16, 0),
            label="Research | Literature Review",
            type=BlockType.FLEX
        )
        
        category = categorize_block(block, sample_config)
        assert category == "research"
    
    def test_admin_categorization(self, sample_config):
        """Test that admin tasks are categorized correctly."""
        block = Block(
            start=time(10, 0),
            end=time(10, 30),
            label="Team | Standup Meeting",
            type=BlockType.FIXED
        )
        
        category = categorize_block(block, sample_config)
        assert category == "admin"
    
    def test_personal_categorization(self, sample_config):
        """Test that personal activities are categorized correctly."""
        block = Block(
            start=time(18, 0),
            end=time(19, 0),
            label="Personal | Dinner with Friends",
            type=BlockType.ANCHOR
        )
        
        category = categorize_block(block, sample_config)
        assert category == "personal"
    
    def test_health_categorization(self, sample_config):
        """Test that health activities are categorized correctly."""
        block = Block(
            start=time(15, 0),
            end=time(16, 0),
            label="Personal | Therapy Session",
            type=BlockType.FIXED
        )
        
        category = categorize_block(block, sample_config)
        assert category == "personal"  # Falls back to project categorization
    
    def test_emoji_handling(self, sample_config):
        """Test that blocks with emojis are handled correctly."""
        block = Block(
            start=time(9, 0),
            end=time(11, 0),
            label="🎯 Echo Development | Core Feature Work",
            type=BlockType.FLEX
        )
        
        category = categorize_block(block, sample_config)
        assert category == "development"
    
    def test_fallback_categorization(self, sample_config):
        """Test fallback categorization for unknown blocks."""
        block = Block(
            start=time(9, 0),
            end=time(11, 0),
            label="Unknown Activity",
            type=BlockType.FLEX
        )
        
        category = categorize_block(block, sample_config)
        assert category == "Development"  # Flex blocks default to Development


class TestProjectExtraction:
    """Test the project extraction logic."""
    
    def test_project_extraction_with_pipe(self):
        """Test extracting project from Project | Task format."""
        label = "Echo Development | Core Feature Work"
        project = extract_project_from_label(label)
        assert project == "Echo Development | Core Feature Work"  # Returns full label
    
    def test_project_extraction_without_pipe(self):
        """Test extracting project from simple label."""
        label = "General Task"
        project = extract_project_from_label(label)
        assert project == "General Task"  # Returns full label


class TestDailyStatsCalculation:
    """Test the daily statistics calculation."""
    
    @pytest.fixture
    def sample_config(self):
        """Create a sample config for testing."""
        return Config(
            defaults=Defaults(wake_time="06:00", sleep_time="22:00", timezone="America/Chicago"),
            weekly_schedule={},
            projects={},
            profiles={},
            categories=Categories(custom_mappings={
                "Echo Development": "development",
                "Team": "admin",
                "Personal": "personal"
            })
        )
    
    def test_basic_stats_calculation(self, sample_config):
        """Test basic daily stats calculation."""
        blocks = [
            Block(
                start=time(9, 0),
                end=time(11, 0),
                label="Echo Development | Core Feature Work",
                type=BlockType.FLEX
            ),
            Block(
                start=time(11, 0),
                end=time(11, 30),
                label="Team | Standup Meeting",
                type=BlockType.FIXED
            ),
            Block(
                start=time(12, 0),
                end=time(13, 0),
                label="Personal | Lunch",
                type=BlockType.FLEX
            )
        ]
        
        stats = calculate_daily_stats(blocks, sample_config)
        
        assert stats.total_minutes == 210  # 2h + 30m + 1h
        assert stats.category_breakdown["development"] == 120
        assert stats.category_breakdown["admin"] == 30
        assert stats.category_breakdown["personal"] == 60
        assert stats.project_breakdown["Echo Development | Core Feature Work"] == 120
        assert stats.project_breakdown["Team | Standup Meeting"] == 30
        assert stats.project_breakdown["Personal | Lunch"] == 60
    
    def test_invalid_block_handling(self, sample_config):
        """Test that invalid blocks are handled gracefully."""
        blocks = [
            Block(
                start=time(11, 0),
                end=time(11, 0),  # Invalid: start == end
                label="Invalid Block",
                type=BlockType.FLEX
            ),
            Block(
                start=time(9, 0),
                end=time(11, 0),
                label="Valid Block",
                type=BlockType.FLEX
            )
        ]
        
        stats = calculate_daily_stats(blocks, sample_config)
        
        assert stats.total_minutes == 120  # Only the valid block
        assert stats.category_breakdown["Development"] == 120  # Flex blocks default to Development


class TestDurationFormatting:
    """Test the duration formatting function."""
    
    def test_minutes_only(self):
        """Test formatting for durations under an hour."""
        assert format_duration(30) == "30m"
        assert format_duration(45) == "45m"
    
    def test_hours_only(self):
        """Test formatting for exact hours."""
        assert format_duration(60) == "1h"
        assert format_duration(120) == "2h"
    
    def test_hours_and_minutes(self):
        """Test formatting for hours and minutes."""
        assert format_duration(90) == "1h 30m"
        assert format_duration(150) == "2h 30m"


class TestDataStore:
    """Test the time ledger data store functionality."""
    
    @pytest.fixture
    def temp_logs_dir(self):
        """Create a temporary logs directory for testing."""
        temp_dir = tempfile.mkdtemp()
        logs_dir = Path(temp_dir) / "logs"
        logs_dir.mkdir()
        
        # Temporarily override the TIME_LEDGER_FILE path
        original_path = Path("logs/time_ledger.csv")
        test_path = logs_dir / "time_ledger.csv"
        
        # Monkey patch the analytics module
        import echo.analytics
        original_file = echo.analytics.TIME_LEDGER_FILE
        echo.analytics.TIME_LEDGER_FILE = test_path
        
        yield logs_dir
        
        # Restore original path
        echo.analytics.TIME_LEDGER_FILE = original_file
    
    def test_ensure_time_ledger_exists(self, temp_logs_dir):
        """Test that the time ledger file is created if it doesn't exist."""
        from echo.analytics import ensure_time_ledger_exists
        
        ledger_file = temp_logs_dir / "time_ledger.csv"
        assert not ledger_file.exists()
        
        ensure_time_ledger_exists()
        assert ledger_file.exists()
        
        # Check that it has the expected headers
        with open(ledger_file, 'r') as f:
            content = f.read()
            assert "date,total_minutes" in content
            assert "category_deep_work" in content
    
    def test_append_daily_stats(self, temp_logs_dir):
        """Test appending daily stats to the ledger."""
        from echo.analytics import append_daily_stats, DailyStats
        
        stats = DailyStats(
            date=date(2024, 1, 15),
            total_minutes=480,
            category_breakdown={"development": 240, "admin": 120, "personal": 120},
            project_breakdown={"Project A": 240, "Project B": 120, "Project C": 120}
        )
        
        append_daily_stats(stats)
        
        ledger_file = temp_logs_dir / "time_ledger.csv"
        assert ledger_file.exists()
        
        # Check that the data was written
        with open(ledger_file, 'r') as f:
            content = f.read()
            assert "2024-01-15" in content
            assert "480" in content
    
    def test_duplicate_prevention(self, temp_logs_dir):
        """Test that duplicate entries for the same date are prevented."""
        from echo.analytics import append_daily_stats, DailyStats
        
        stats1 = DailyStats(
            date=date(2024, 1, 15),
            total_minutes=480,
            category_breakdown={"development": 240},
            project_breakdown={"Project A": 240}
        )
        
        stats2 = DailyStats(
            date=date(2024, 1, 15),  # Same date
            total_minutes=600,
            category_breakdown={"development": 300},
            project_breakdown={"Project A": 300}
        )
        
        append_daily_stats(stats1)
        append_daily_stats(stats2)  # Should overwrite, not append
        
        ledger_file = temp_logs_dir / "time_ledger.csv"
        with open(ledger_file, 'r') as f:
            lines = f.readlines()
            # Should have header + 1 data row (not 2)
            assert len(lines) == 2
    
    def test_get_recent_stats(self, temp_logs_dir):
        """Test retrieving recent statistics from the ledger."""
        from echo.analytics import append_daily_stats, get_recent_stats, DailyStats
        
        # Add some test data with recent dates
        today = date.today()
        for i in range(5):
            stats = DailyStats(
                date=today - timedelta(days=i),
                total_minutes=480 + i * 10,
                category_breakdown={"development": 240},
                project_breakdown={"Project A": 240}
            )
            append_daily_stats(stats)
        
        recent_stats = get_recent_stats(days=3)
        assert len(recent_stats) == 4  # Today + 3 previous days = 4 days
        # Should be sorted by date (oldest first)
        assert recent_stats[0].date == today - timedelta(days=3)
        assert recent_stats[3].date == today 