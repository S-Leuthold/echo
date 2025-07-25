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
from echo.mock_project_service import MockProjectService
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
    
    # Generate project data
    print(f"\nGenerating project portfolio data...")
    project_service = MockProjectService()
    all_projects = project_service.get_all_projects()
    
    print(f"Inserting {len(all_projects)} projects...")
    for project in all_projects:
        success = db.create_project(project)
        if success:
            status_emoji = {"active": "🟢", "planning": "🟡", "on_hold": "🟠", "completed": "✅", "archived": "📦"}.get(project.status.value, "📋")
            priority_emoji = {"critical": "🔥", "high": "⚡", "medium": "📋", "low": "💤"}.get(project.priority.value, "📋")
            print(f"  ✅ {project.name} {status_emoji} {priority_emoji} ({project.progress_percentage:.0f}%)")
        else:
            print(f"  ❌ Failed to insert project: {project.name}")
    
    # Display database statistics
    print(f"\n=== Database Population Complete ===")
    stats = db.get_database_stats()
    print(f"Total session logs: {stats['total_session_logs']}")
    print(f"Weekly syncs: {stats['weekly_syncs']}")
    print(f"Active scaffolds: {stats['active_scaffolds']}")
    print(f"Total projects: {stats['total_projects']}")
    print(f"Active projects: {stats['active_projects']}")
    print(f"High priority projects: {stats['high_priority_projects']}")
    
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
    
    # Test project queries
    print(f"\n=== Testing Project Portfolio ===")
    
    # Test active projects
    active_projects = db.get_projects_by_status("active")
    print(f"Active projects: {len(active_projects)}")
    for project in active_projects[:3]:  # Show first 3
        print(f"  • {project['name']}: {project['progress_percentage']}% ({project['momentum']} momentum)")
    
    # Test development projects
    dev_projects = db.get_projects_by_category("development")
    print(f"Development projects: {len(dev_projects)}")
    for project in dev_projects[:2]:  # Show first 2
        print(f"  • {project['name']}: {project['current_focus']}")
    
    # Test high priority project
    echo_core = db.get_project_by_id("echo_core")
    if echo_core:
        print(f"\n=== Sample Project Data ===")
        print(f"Project: {echo_core['name']}")
        print(f"Progress: {echo_core['progress_percentage']}%")
        print(f"Status: {echo_core['status']} | Priority: {echo_core['priority']}")
        print(f"Focus: {echo_core['current_focus']}")
        print(f"Milestones: {len(echo_core['milestones'])}")
        print(f"Recent wins: {len(echo_core['recent_wins'])}")
    
    db.close()
    print(f"\n✅ Database population and testing complete!")
    print(f"✅ Projects integrated with session management system")


if __name__ == "__main__":
    populate_database()