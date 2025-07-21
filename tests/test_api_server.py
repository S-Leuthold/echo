"""
Tests for the Echo API Server

Comprehensive test suite for the FastAPI server that powers the macOS app.
Tests all endpoints, error handling, and data validation.
"""

import pytest
import json
from datetime import datetime, date, time
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from pathlib import Path

# Import the API server
import sys
sys.path.append('.')
from api_server import app

client = TestClient(app)


class TestAPIHealth:
    """Test health check endpoint."""
    
    def test_health_check(self):
        """Test that health check returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestTodayEndpoint:
    """Test the /today endpoint."""
    
    @patch('api_server.load_config')
    @patch('api_server.OutlookEmailProcessor')
    def test_get_today_schedule_success(self, mock_email_processor, mock_load_config):
        """Test successful retrieval of today's schedule."""
        # Mock configuration
        mock_config = MagicMock()
        mock_config.projects = {
            "echo": {"name": "Echo Development", "status": "active"},
            "personal": {"name": "Personal", "status": "active"}
        }
        mock_load_config.return_value = mock_config
        
        # Mock email processor
        mock_processor = MagicMock()
        mock_processor.get_email_planning_context.return_value = {
            "total_unresponded": 3,
            "urgent_count": 1,
            "high_priority_count": 2
        }
        mock_processor.get_email_planning_stats.return_value = {
            "total_scheduled": 5,
            "total_completed": 3,
            "completion_rate": 60.0
        }
        mock_email_processor.return_value = mock_processor
        
        # Create a test plan file
        test_plan = {
            "blocks": [
                {
                    "start": "09:00:00",
                    "end": "10:30:00",
                    "label": "Echo Development | API Testing",
                    "type": "flex"
                },
                {
                    "start": "10:30:00",
                    "end": "12:00:00",
                    "label": "Personal | Lunch Break",
                    "type": "anchor"
                }
            ]
        }
        
        with patch('pathlib.Path.exists', return_value=True):
            with patch('builtins.open', create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = json.dumps(test_plan)
                
                # Mock the global config
                with patch('api_server.config', mock_config):
                    with patch('api_server.email_processor', mock_processor):
                        response = client.get("/today")
                        assert response.status_code == 200
                        
                        data = response.json()
                        assert "date" in data
                        assert "current_time" in data
                        assert "blocks" in data
                        assert "email_summary" in data
                        assert "planning_stats" in data
                        
                        # Check blocks
                        blocks = data["blocks"]
                        assert len(blocks) == 2
                        assert blocks[0]["project_name"] == "Echo Development"
                        assert blocks[0]["task_name"] == "API Testing"
                        assert blocks[1]["project_name"] == "Personal"
                        assert blocks[1]["task_name"] == "Lunch Break"
    
    @patch('api_server.load_config')
    def test_get_today_schedule_no_plan_file(self, mock_load_config):
        """Test behavior when no plan file exists."""
        mock_config = MagicMock()
        mock_config.projects = {}
        mock_load_config.return_value = mock_config
        
        with patch('pathlib.Path.exists', return_value=False):
            response = client.get("/today")
            assert response.status_code == 200
            
            data = response.json()
            assert "blocks" in data
            # Should return sample blocks when no plan exists
            assert len(data["blocks"]) > 0
    
    @patch('api_server.load_config')
    def test_get_today_schedule_invalid_plan_file(self, mock_load_config):
        """Test behavior with invalid plan file."""
        mock_config = MagicMock()
        mock_config.projects = {}
        mock_load_config.return_value = mock_config
        
        with patch('pathlib.Path.exists', return_value=True):
            with patch('builtins.open', create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = "invalid json"
                
                response = client.get("/today")
                assert response.status_code == 500


class TestAnalyticsEndpoint:
    """Test the /analytics endpoint."""
    
    @patch('api_server.get_recent_stats')
    def test_get_analytics_success(self, mock_recent_stats):
        """Test successful retrieval of analytics."""
        # Create a mock DailyStats object
        mock_stats = MagicMock()
        mock_stats.date = date.today()  # Use today's date
        mock_stats.total_minutes = 480
        mock_stats.category_breakdown = {
            "deep_work": 360,
            "rest": 60,
            "admin": 60
        }
        mock_stats.project_breakdown = {
            "Echo Development": 240,
            "Personal": 120
        }
        
        mock_recent_stats.return_value = [mock_stats]
        
        response = client.get("/analytics")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_time"] == 480
        assert data["focus_time"] == 360
        assert data["break_time"] == 60
        assert data["productivity_score"] == 75.0  # 360/480 * 100
        assert "categories" in data
        assert "projects" in data
    
    def test_get_analytics_with_date(self):
        """Test analytics with specific date parameter."""
        response = client.get("/analytics?date_str=2025-01-20")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-20"
    
    def test_get_analytics_invalid_date(self):
        """Test analytics with invalid date parameter."""
        response = client.get("/analytics?date_str=invalid-date")
        assert response.status_code == 500


class TestProjectsEndpoint:
    """Test the /projects endpoint."""
    
    @patch('api_server.load_config')
    def test_get_projects_success(self, mock_load_config):
        """Test successful retrieval of projects."""
        mock_config = MagicMock()
        mock_config.projects = {
            "echo": {
                "name": "Echo Development",
                "status": "active",
                "current_focus": "API Server"
            },
            "personal": {
                "name": "Personal",
                "status": "active",
                "current_focus": "Health"
            }
        }
        mock_load_config.return_value = mock_config
        
        # Mock the global config
        with patch('api_server.config', mock_config):
            response = client.get("/projects")
            assert response.status_code == 200
            
            data = response.json()
            assert len(data) == 2
            
            echo_project = next(p for p in data if p["id"] == "echo")
            assert echo_project["name"] == "Echo Development"
            assert echo_project["status"] == "active"
            assert echo_project["current_focus"] == "API Server"
            
            personal_project = next(p for p in data if p["id"] == "personal")
            assert personal_project["name"] == "Personal"
            assert personal_project["status"] == "active"
            assert personal_project["current_focus"] == "Health"
    
    @patch('api_server.load_config')
    def test_get_projects_no_config(self, mock_load_config):
        """Test projects endpoint when config is not loaded."""
        mock_load_config.side_effect = Exception("Config error")
        
        response = client.get("/projects")
        assert response.status_code == 500


class TestSessionsEndpoint:
    """Test the /sessions endpoint."""
    
    def test_get_sessions_empty(self):
        """Test sessions endpoint returns empty list for now."""
        response = client.get("/sessions")
        assert response.status_code == 200
        
        data = response.json()
        assert data == []


class TestPlanEndpoint:
    """Test the /plan endpoint."""
    
    @patch('api_server.load_config')
    @patch('api_server.OutlookEmailProcessor')
    def test_create_plan_success(self, mock_email_processor, mock_load_config):
        """Test successful plan creation."""
        mock_config = MagicMock()
        mock_config.projects = {}
        mock_load_config.return_value = mock_config
        
        mock_processor = MagicMock()
        mock_processor.get_email_planning_context.return_value = {}
        mock_email_processor.return_value = mock_processor
        
        plan_request = {
            "most_important": "Complete API server",
            "todos": ["Test endpoints", "Write documentation"],
            "energy_level": "8",
            "non_negotiables": "No meetings",
            "avoid_today": "Social media",
            "fixed_events": ["Lunch at 12:00"]
        }
        
        # Mock the global config
        with patch('api_server.config', mock_config):
            with patch('api_server.email_processor', mock_processor):
                response = client.post("/plan", json=plan_request)
                assert response.status_code == 200
                
                data = response.json()
                assert data["status"] == "success"
                assert "message" in data
    
    @patch('api_server.load_config')
    def test_create_plan_no_config(self, mock_load_config):
        """Test plan creation when config is not loaded."""
        mock_load_config.side_effect = Exception("Config error")
        
        plan_request = {
            "most_important": "Test",
            "todos": [],
            "energy_level": "5",
            "non_negotiables": "",
            "avoid_today": "",
            "fixed_events": []
        }
        
        response = client.post("/plan", json=plan_request)
        assert response.status_code == 500
    
    def test_create_plan_invalid_request(self):
        """Test plan creation with invalid request data."""
        response = client.post("/plan", json={"invalid": "data"})
        assert response.status_code == 422


class TestErrorHandling:
    """Test error handling across endpoints."""
    
    def test_404_endpoint(self):
        """Test 404 for non-existent endpoint."""
        response = client.get("/nonexistent")
        assert response.status_code == 404
    
    def test_500_server_error(self):
        """Test 500 error handling."""
        # Test that the projects endpoint fails when config is None
        with patch('api_server.config', None):
            response = client.get("/projects")
            assert response.status_code == 500  # Should fail because config is not loaded


class TestDataValidation:
    """Test data validation and response models."""
    
    @patch('api_server.load_config')
    @patch('api_server.OutlookEmailProcessor')
    def test_today_response_structure(self, mock_email_processor, mock_load_config):
        """Test that today endpoint returns correct data structure."""
        mock_config = MagicMock()
        mock_config.projects = {}
        mock_load_config.return_value = mock_config
        
        mock_processor = MagicMock()
        mock_processor.get_email_planning_context.return_value = {}
        mock_processor.get_email_planning_stats.return_value = {}
        mock_email_processor.return_value = mock_processor
        
        with patch('pathlib.Path.exists', return_value=False):
            # Mock the global config
            with patch('api_server.config', mock_config):
                with patch('api_server.email_processor', mock_processor):
                    response = client.get("/today")
                    assert response.status_code == 200
                    
                    data = response.json()
                    
                    # Check required fields
                    required_fields = ["date", "current_time", "blocks", "email_summary", "planning_stats"]
                    for field in required_fields:
                        assert field in data
                    
                    # Check block structure
                    if data["blocks"]:
                        block = data["blocks"][0]
                        block_fields = ["id", "start_time", "end_time", "emoji", "project_name", 
                                      "task_name", "note", "type", "duration", "label", 
                                      "is_current", "progress"]
                        for field in block_fields:
                            assert field in block


class TestIntegration:
    """Integration tests for the API server."""
    
    @patch('api_server.load_config')
    @patch('api_server.OutlookEmailProcessor')
    def test_full_workflow(self, mock_email_processor, mock_load_config):
        """Test a complete workflow through the API."""
        # Setup mocks
        mock_config = MagicMock()
        mock_config.projects = {"echo": {"name": "Echo Development", "status": "active"}}
        mock_load_config.return_value = mock_config
        
        mock_processor = MagicMock()
        mock_processor.get_email_planning_context.return_value = {"total_unresponded": 2}
        mock_processor.get_email_planning_stats.return_value = {"completion_rate": 75.0}
        mock_email_processor.return_value = mock_processor
        
        # Mock the global config
        with patch('api_server.config', mock_config):
            with patch('api_server.email_processor', mock_processor):
                # Test health check
                health_response = client.get("/health")
                assert health_response.status_code == 200
                
                # Test today endpoint
                with patch('pathlib.Path.exists', return_value=False):
                    today_response = client.get("/today")
                    assert today_response.status_code == 200
                    
                    today_data = today_response.json()
                    assert "blocks" in today_data
                    assert "email_summary" in today_data
                
                # Test analytics
                with patch('api_server.get_recent_stats') as mock_stats:
                    mock_stats.return_value = []  # Empty stats for now
                    analytics_response = client.get("/analytics")
                    assert analytics_response.status_code == 200
                
                # Test projects
                projects_response = client.get("/projects")
                assert projects_response.status_code == 200
                
                projects_data = projects_response.json()
                assert len(projects_data) == 1
                assert projects_data[0]["id"] == "echo"


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 