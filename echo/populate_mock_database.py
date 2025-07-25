#!/usr/bin/env python3
"""
Populate the session intelligence database with mock data for testing.
This script loads all the mock session logs and weekly syncs into the database.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from echo.database_schema import SessionDatabase, SessionLog
from echo.mock_session_service import MockSessionService
from echo.weekly_sync_generator import WeeklySyncGenerator
import uuid
from datetime import datetime


def populate_database():
    """Populate database with all mock data."""
    print("=== Populating Session Intelligence Database ===\n")
    
    # Initialize database
    db = SessionDatabase("data/session_intelligence.db")
    
    # Generate mock session data
    print("Generating mock session data...")
    session_service = MockSessionService()
    all_sessions = session_service.get_all_sessions()
    
    # Convert MockSessionLog to SessionLog and insert
    print(f"Inserting {len(all_sessions)} session logs...")
    for mock_session in all_sessions:
        session_log = SessionLog(
            id=str(uuid.uuid4()),
            project_id=mock_session.project_name.lower().replace(" ", "_"),
            block_title=mock_session.block_label,
            session_date=mock_session.date,
            duration_minutes=mock_session.actual_duration,
            category=mock_session.category.value,
            generated_log_markdown=mock_session.generated_log_markdown,
            ai_insights=mock_session.ai_insights,
            created_at=mock_session.created_at
        )
        
        success = db.create_session_log(session_log)
        if success:
            print(f"  ✅ {session_log.session_date} - {session_log.block_title}")
        else:
            print(f"  ❌ Failed to insert: {session_log.block_title}")
    
    # Generate weekly sync data
    print(f"\nGenerating weekly sync data...")
    sync_generator = WeeklySyncGenerator()
    all_syncs = sync_generator.sync_logs
    
    print(f"Inserting {len(all_syncs)} weekly syncs...")
    for sync in all_syncs:
        success = db.create_weekly_sync(sync.to_dict())
        if success:
            print(f"  ✅ {sync.week_ending} - {sync.project_name}")
        else:
            print(f"  ❌ Failed to insert sync: {sync.project_name}")
    
    # Display database statistics
    print(f"\n=== Database Population Complete ===")
    stats = db.get_database_stats()
    print(f"Total session logs: {stats['total_session_logs']}")
    print(f"Weekly syncs: {stats['weekly_syncs']}")
    print(f"Active scaffolds: {stats['active_scaffolds']}")
    
    # Test query functionality
    print(f"\n=== Testing Query Functionality ===")
    
    # Test recent session logs for Echo project
    echo_logs = db.get_recent_session_logs("echo", limit=3)
    print(f"Recent Echo sessions: {len(echo_logs)}")
    for log in echo_logs:
        print(f"  • {log.session_date}: {log.block_title}")
    
    # Test recent session logs for research project
    research_logs = db.get_recent_session_logs("soil_carbon_dynamics", limit=2)
    if not research_logs:
        research_logs = db.get_recent_session_logs("microbial_ecology_study", limit=2)
    if not research_logs:
        research_logs = db.get_recent_session_logs("climate_change_impact_study", limit=2)
    if not research_logs:
        research_logs = db.get_recent_session_logs("grant_proposal_-_nsf", limit=2)
    
    print(f"Recent research sessions: {len(research_logs)}")
    for log in research_logs:
        print(f"  • {log.session_date}: {log.block_title}")
    
    # Test weekly syncs
    echo_syncs = db.get_recent_weekly_syncs("Echo", limit=2)
    print(f"Recent Echo weekly syncs: {len(echo_syncs)}")
    for sync in echo_syncs:
        print(f"  • {sync['week_ending']}: {sync['project_momentum']} momentum")
    
    research_syncs = db.get_recent_weekly_syncs("Soil Research Portfolio", limit=2)
    print(f"Recent research weekly syncs: {len(research_syncs)}")
    for sync in research_syncs:
        print(f"  • {sync['week_ending']}: {sync['project_momentum']} momentum")
    
    # Show sample session log content
    if echo_logs:
        print(f"\n=== Sample Session Log Content ===")
        sample_log = echo_logs[0]
        print(f"Session: {sample_log.block_title}")
        print(f"AI Insights keys: {list(sample_log.ai_insights.keys())}")
        print(f"Log preview: {sample_log.generated_log_markdown[:200]}...")
    
    db.close()
    print(f"\n✅ Database population and testing complete!")


if __name__ == "__main__":
    populate_database()