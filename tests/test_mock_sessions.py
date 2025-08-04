#!/usr/bin/env python3
"""
Test script for the mock session service.
Generates and validates comprehensive mock session data.
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from echo.mock_session_service import MockSessionService, ProjectType
import json
from datetime import date


def test_mock_session_generation():
    """Test the mock session service and generate test data."""
    print("=== Mock Session Service Test ===\n")
    
    # Initialize the service
    service = MockSessionService()
    
    # Get all sessions
    all_sessions = service.get_all_sessions()
    print(f"Total sessions generated: {len(all_sessions)}")
    
    # Group by project
    echo_sessions = [s for s in all_sessions if s.project_type == ProjectType.ECHO_DEVELOPMENT]
    research_sessions = [s for s in all_sessions if s.project_type == ProjectType.SOIL_RESEARCH]
    
    print(f"Echo development sessions: {len(echo_sessions)}")
    print(f"Soil research sessions: {len(research_sessions)}")
    print()
    
    # Test project-specific queries
    echo_project_sessions = service.get_sessions_by_project("Echo", limit=3)
    print(f"Recent Echo sessions (limit 3): {len(echo_project_sessions)}")
    
    # Display sample session details
    if echo_project_sessions:
        sample_session = echo_project_sessions[0]
        print(f"\nSample Session Details:")
        print(f"Date: {sample_session.date}")
        print(f"Project: {sample_session.project_name}")
        print(f"Goal: {sample_session.goal}")
        print(f"Productivity Score: {sample_session.productivity_score}/10")
        print(f"Generated Log Length: {len(sample_session.generated_log_markdown)} characters")
        print(f"AI Insights Keys: {list(sample_session.ai_insights.keys())}")
        print()
    
    # Show markdown sample
    if echo_project_sessions:
        print("=== Sample Generated Session Log (Markdown) ===")
        print(echo_project_sessions[0].generated_log_markdown[:500] + "...")
        print()
    
    # Export to files for testing
    output_dir = "logs/mock_sessions"
    os.makedirs(output_dir, exist_ok=True)
    
    # Export individual session files
    for session in all_sessions:
        filename = f"{output_dir}/{session.session_id}.json"
        with open(filename, 'w') as f:
            json.dump(session.to_dict(), f, indent=2, default=str)
    
    # Export consolidated file
    service.export_sessions_json(f"{output_dir}/all_sessions.json")
    
    print(f"Exported {len(all_sessions)} sessions to {output_dir}/")
    print("✅ Mock session service validation complete!")


if __name__ == "__main__":
    test_mock_session_generation()