# ==============================================================================
# FILE: echo/database_schema.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Defines the database schema for Claude session intelligence features.
#   Includes tables for session scaffolds, session logs, and related data.
#
# USAGE:
#   This module provides schema definitions and setup functions for the
#   session intelligence database. Uses SQLite for local storage.
# ==============================================================================

import sqlite3
import json
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class SessionScaffold:
    """
    Represents a pre-computed session scaffold generated during post-planning enrichment.
    """
    id: str
    schedule_block_id: str
    generated_at: datetime
    context_briefing_snapshot: Dict[str, Any]
    scaffold_data: Dict[str, Any]
    is_stale: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "schedule_block_id": self.schedule_block_id,
            "generated_at": self.generated_at.isoformat(),
            "context_briefing_snapshot": self.context_briefing_snapshot,
            "scaffold_data": self.scaffold_data,
            "is_stale": self.is_stale
        }


@dataclass
class SessionLog:
    """
    Represents a completed session with AI-synthesized log and insights.
    """
    id: str
    project_id: str
    block_title: str
    session_date: date
    duration_minutes: int
    category: str
    generated_log_markdown: str
    ai_insights: Dict[str, Any]
    ai_keywords: List[str]
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "project_id": self.project_id,
            "block_title": self.block_title,
            "session_date": self.session_date.isoformat(),
            "duration_minutes": self.duration_minutes,
            "category": self.category,
            "generated_log_markdown": self.generated_log_markdown,
            "ai_insights": self.ai_insights,
            "ai_keywords": self.ai_keywords,
            "created_at": self.created_at.isoformat()
        }


class SessionDatabase:
    """
    Database interface for session intelligence features.
    Handles all CRUD operations for scaffolds and session logs.
    """
    
    def __init__(self, db_path: str = "data/session_intelligence.db"):
        """Initialize database connection and create tables if needed."""
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        
        self.conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self.conn.row_factory = sqlite3.Row  # Enable column access by name
        self._create_tables()
    
    def _create_tables(self) -> None:
        """Create database tables for session intelligence."""
        
        # Session scaffolds table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS session_scaffolds (
                id TEXT PRIMARY KEY,
                schedule_block_id TEXT NOT NULL,
                generated_at TIMESTAMP NOT NULL,
                context_briefing_snapshot TEXT NOT NULL,  -- JSON string
                scaffold_data TEXT NOT NULL,              -- JSON string  
                is_stale BOOLEAN DEFAULT FALSE,
                
                FOREIGN KEY (schedule_block_id) REFERENCES schedule_blocks(id)
            )
        """)
        
        # Session logs table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS session_logs (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                block_title TEXT NOT NULL,
                session_date DATE NOT NULL,
                duration_minutes INTEGER NOT NULL,
                category TEXT NOT NULL,
                generated_log_markdown TEXT NOT NULL,
                ai_insights TEXT NOT NULL,               -- JSON string
                ai_keywords TEXT NOT NULL,               -- JSON string array
                created_at TIMESTAMP NOT NULL
            )
        """)
        
        # Add ai_keywords column to existing tables if it doesn't exist
        try:
            self.conn.execute("ALTER TABLE session_logs ADD COLUMN ai_keywords TEXT")
        except sqlite3.OperationalError:
            # Column already exists
            pass
        
        # Create indexes for session logs
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_project_date 
            ON session_logs (project_id, session_date)
        """)
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_session_date 
            ON session_logs (session_date)
        """)
        
        # Weekly sync logs table (for context enrichment)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS weekly_syncs (
                id TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                week_ending DATE NOT NULL,
                duration_minutes INTEGER NOT NULL,
                sync_data TEXT NOT NULL,                 -- JSON string with all sync details
                created_at TIMESTAMP NOT NULL
            )
        """)
        
        # Create index for weekly syncs
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_project_week 
            ON weekly_syncs (project_name, week_ending)
        """)
        
        # Projects table (for project portfolio management)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                category TEXT NOT NULL,
                current_focus TEXT NOT NULL,
                progress_percentage REAL NOT NULL,
                momentum TEXT NOT NULL,
                total_estimated_hours INTEGER NOT NULL,
                total_actual_hours INTEGER NOT NULL,
                created_date DATE NOT NULL,
                project_data TEXT NOT NULL,             -- Full project data as JSON
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL
            )
        """)
        
        # Create indexes for projects
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_project_status 
            ON projects (status, priority)
        """)
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_project_category 
            ON projects (category)
        """)
        
        self.conn.commit()
    
    # ===== SESSION SCAFFOLDS =====
    
    def create_scaffold(self, scaffold: SessionScaffold) -> bool:
        """Create a new session scaffold."""
        try:
            self.conn.execute("""
                INSERT INTO session_scaffolds 
                (id, schedule_block_id, generated_at, context_briefing_snapshot, scaffold_data, is_stale)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                scaffold.id,
                scaffold.schedule_block_id,
                scaffold.generated_at.isoformat(),
                json.dumps(scaffold.context_briefing_snapshot),
                json.dumps(scaffold.scaffold_data),
                scaffold.is_stale
            ))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error creating scaffold: {e}")
            return False
    
    def get_scaffold_by_block_id(self, block_id: str) -> Optional[SessionScaffold]:
        """Get session scaffold for a specific schedule block."""
        cursor = self.conn.execute("""
            SELECT * FROM session_scaffolds 
            WHERE schedule_block_id = ? AND is_stale = FALSE
            ORDER BY generated_at DESC LIMIT 1
        """, (block_id,))
        
        row = cursor.fetchone()
        if not row:
            return None
            
        return SessionScaffold(
            id=row['id'],
            schedule_block_id=row['schedule_block_id'],
            generated_at=datetime.fromisoformat(row['generated_at']),
            context_briefing_snapshot=json.loads(row['context_briefing_snapshot']),
            scaffold_data=json.loads(row['scaffold_data']),
            is_stale=bool(row['is_stale'])
        )
    
    def mark_scaffolds_stale(self, block_ids: List[str]) -> bool:
        """Mark scaffolds as stale when schedule changes."""
        try:
            placeholders = ','.join('?' * len(block_ids))
            self.conn.execute(f"""
                UPDATE session_scaffolds 
                SET is_stale = TRUE 
                WHERE schedule_block_id IN ({placeholders})
            """, block_ids)
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error marking scaffolds stale: {e}")
            return False
    
    def get_scaffold_count(self) -> int:
        """Get total count of active scaffolds."""
        try:
            cursor = self.conn.execute("SELECT COUNT(*) as count FROM session_scaffolds WHERE is_stale = FALSE")
            return cursor.fetchone()['count']
        except sqlite3.Error as e:
            print(f"Error getting scaffold count: {e}")
            return 0
    
    def delete_scaffold(self, block_id: str) -> bool:
        """Delete scaffold for a specific block."""
        try:
            self.conn.execute("DELETE FROM session_scaffolds WHERE schedule_block_id = ?", (block_id,))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error deleting scaffold: {e}")
            return False
    
    # ===== SESSION LOGS =====
    
    def create_session_log(self, session_log: SessionLog) -> bool:
        """Create a new session log."""
        try:
            self.conn.execute("""
                INSERT INTO session_logs
                (id, project_id, block_title, session_date, duration_minutes, 
                 category, generated_log_markdown, ai_insights, ai_keywords, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session_log.id,
                session_log.project_id,
                session_log.block_title,
                session_log.session_date.isoformat(),
                session_log.duration_minutes,
                session_log.category,
                session_log.generated_log_markdown,
                json.dumps(session_log.ai_insights),
                json.dumps(session_log.ai_keywords),
                session_log.created_at.isoformat()
            ))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error creating session log: {e}")
            return False
    
    def get_recent_session_logs(self, project_id: str, limit: int = 3) -> List[SessionLog]:
        """Get recent session logs for a project (for scaffolding context)."""
        cursor = self.conn.execute("""
            SELECT * FROM session_logs 
            WHERE project_id = ?
            ORDER BY session_date DESC, created_at DESC
            LIMIT ?
        """, (project_id, limit))
        
        logs = []
        for row in cursor.fetchall():
            # Handle ai_keywords column that might not exist in older records
            ai_keywords = []
            try:
                if row['ai_keywords']:
                    ai_keywords = json.loads(row['ai_keywords'])
            except (KeyError, json.JSONDecodeError):
                pass
            
            logs.append(SessionLog(
                id=row['id'],
                project_id=row['project_id'],
                block_title=row['block_title'],
                session_date=date.fromisoformat(row['session_date']),
                duration_minutes=row['duration_minutes'],
                category=row['category'],
                generated_log_markdown=row['generated_log_markdown'],
                ai_insights=json.loads(row['ai_insights']),
                ai_keywords=ai_keywords,
                created_at=datetime.fromisoformat(row['created_at'])
            ))
        
        return logs
    
    def get_session_logs_by_date_range(self, start_date: date, end_date: date) -> List[SessionLog]:
        """Get session logs within a date range."""
        cursor = self.conn.execute("""
            SELECT * FROM session_logs 
            WHERE session_date BETWEEN ? AND ?
            ORDER BY session_date DESC, created_at DESC
        """, (start_date.isoformat(), end_date.isoformat()))
        
        logs = []
        for row in cursor.fetchall():
            # Handle ai_keywords column that might not exist in older records
            ai_keywords = []
            try:
                if row['ai_keywords']:
                    ai_keywords = json.loads(row['ai_keywords'])
            except (KeyError, json.JSONDecodeError):
                pass
            
            logs.append(SessionLog(
                id=row['id'],
                project_id=row['project_id'],
                block_title=row['block_title'],
                session_date=date.fromisoformat(row['session_date']),
                duration_minutes=row['duration_minutes'],
                category=row['category'],
                generated_log_markdown=row['generated_log_markdown'],
                ai_insights=json.loads(row['ai_insights']),
                ai_keywords=ai_keywords,
                created_at=datetime.fromisoformat(row['created_at'])
            ))
        
        return logs
    
    # ===== WEEKLY SYNCS =====
    
    def create_weekly_sync(self, sync_data: Dict[str, Any]) -> bool:
        """Store a weekly sync log."""
        try:
            sync_id = str(uuid.uuid4())
            self.conn.execute("""
                INSERT INTO weekly_syncs
                (id, project_name, week_ending, duration_minutes, sync_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                sync_id,
                sync_data['project_name'],
                sync_data['week_ending'],
                sync_data['duration_minutes'],
                json.dumps(sync_data),
                datetime.now().isoformat()
            ))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error creating weekly sync: {e}")
            return False
    
    def get_recent_weekly_syncs(self, project_name: str, limit: int = 2) -> List[Dict[str, Any]]:
        """Get recent weekly syncs for a project."""
        cursor = self.conn.execute("""
            SELECT sync_data FROM weekly_syncs 
            WHERE project_name = ?
            ORDER BY week_ending DESC
            LIMIT ?
        """, (project_name, limit))
        
        syncs = []
        for row in cursor.fetchall():
            syncs.append(json.loads(row['sync_data']))
        
        return syncs
    
    # ===== PROJECTS =====
    
    def create_project(self, project_data) -> bool:
        """Create a new project record."""
        try:
            # Convert project data to JSON if it's a ProjectData object
            if hasattr(project_data, 'to_dict'):
                project_dict = project_data.to_dict()
                project_id = project_data.id
                name = project_data.name
                description = project_data.description
                status = project_data.status.value if hasattr(project_data.status, 'value') else str(project_data.status)
                priority = project_data.priority.value if hasattr(project_data.priority, 'value') else str(project_data.priority)
                category = project_data.category
                current_focus = project_data.current_focus
                progress_percentage = project_data.progress_percentage
                momentum = project_data.momentum
                total_estimated_hours = project_data.total_estimated_hours
                total_actual_hours = project_data.total_actual_hours
                created_date = project_data.created_date.isoformat() if hasattr(project_data.created_date, 'isoformat') else str(project_data.created_date)
                created_at = project_data.created_at.isoformat() if hasattr(project_data.created_at, 'isoformat') else str(project_data.created_at)
                updated_at = project_data.updated_at.isoformat() if hasattr(project_data.updated_at, 'isoformat') else str(project_data.updated_at)
            else:
                # Handle dict input
                project_dict = project_data
                project_id = project_data['id']
                name = project_data['name']
                description = project_data['description']
                status = project_data['status']
                priority = project_data['priority']
                category = project_data['category']
                current_focus = project_data['current_focus']
                progress_percentage = project_data['progress_percentage']
                momentum = project_data['momentum']
                total_estimated_hours = project_data['total_estimated_hours']
                total_actual_hours = project_data['total_actual_hours']
                created_date = project_data['created_date']
                created_at = project_data['created_at']
                updated_at = project_data['updated_at']
            
            self.conn.execute("""
                INSERT INTO projects 
                (id, name, description, status, priority, category, current_focus, 
                 progress_percentage, momentum, total_estimated_hours, total_actual_hours,
                 created_date, project_data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                project_id, name, description, status, priority, category, current_focus,
                progress_percentage, momentum, total_estimated_hours, total_actual_hours,
                created_date, json.dumps(project_dict), created_at, updated_at
            ))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error creating project: {e}")
            return False
    
    def get_all_projects(self) -> List[Dict[str, Any]]:
        """Get all projects."""
        cursor = self.conn.execute("""
            SELECT project_data FROM projects 
            ORDER BY priority DESC, status ASC, name ASC
        """)
        
        projects = []
        for row in cursor.fetchall():
            projects.append(json.loads(row['project_data']))
        
        return projects
    
    def get_project_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific project by ID."""
        cursor = self.conn.execute("""
            SELECT project_data FROM projects WHERE id = ?
        """, (project_id,))
        
        row = cursor.fetchone()
        if row:
            return json.loads(row['project_data'])
        return None
    
    def get_projects_by_status(self, status: str) -> List[Dict[str, Any]]:
        """Get projects filtered by status."""
        cursor = self.conn.execute("""
            SELECT project_data FROM projects 
            WHERE status = ?
            ORDER BY priority DESC, name ASC
        """, (status,))
        
        projects = []
        for row in cursor.fetchall():
            projects.append(json.loads(row['project_data']))
        
        return projects
    
    def get_projects_by_category(self, category: str) -> List[Dict[str, Any]]:
        """Get projects filtered by category."""
        cursor = self.conn.execute("""
            SELECT project_data FROM projects 
            WHERE category = ?
            ORDER BY priority DESC, status ASC, name ASC
        """, (category,))
        
        projects = []
        for row in cursor.fetchall():
            projects.append(json.loads(row['project_data']))
        
        return projects
    
    def update_project(self, project_id: str, project_data) -> bool:
        """Update an existing project."""
        try:
            # Convert project data to JSON if it's a ProjectData object
            if hasattr(project_data, 'to_dict'):
                project_dict = project_data.to_dict()
                updated_at = datetime.now().isoformat()
            else:
                project_dict = project_data
                updated_at = project_data.get('updated_at', datetime.now().isoformat())
            
            self.conn.execute("""
                UPDATE projects 
                SET project_data = ?, updated_at = ?
                WHERE id = ?
            """, (json.dumps(project_dict), updated_at, project_id))
            
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error updating project: {e}")
            return False
    
    # ===== UTILITY METHODS =====
    
    def get_database_stats(self) -> Dict[str, int]:
        """Get database statistics for monitoring."""
        stats = {}
        
        # Count scaffolds
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM session_scaffolds WHERE is_stale = FALSE")
        stats['active_scaffolds'] = cursor.fetchone()['count']
        
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM session_scaffolds WHERE is_stale = TRUE")
        stats['stale_scaffolds'] = cursor.fetchone()['count']
        
        # Count session logs
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM session_logs")
        stats['total_session_logs'] = cursor.fetchone()['count']
        
        # Count weekly syncs
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM weekly_syncs")
        stats['weekly_syncs'] = cursor.fetchone()['count']
        
        # Count projects
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM projects")
        stats['total_projects'] = cursor.fetchone()['count']
        
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM projects WHERE status = 'active'")
        stats['active_projects'] = cursor.fetchone()['count']
        
        cursor = self.conn.execute("SELECT COUNT(*) as count FROM projects WHERE priority IN ('high', 'critical')")
        stats['high_priority_projects'] = cursor.fetchone()['count']
        
        return stats
    
    def close(self) -> None:
        """Close database connection."""
        if self.conn:
            self.conn.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


def initialize_database(db_path: str = "data/session_intelligence.db") -> SessionDatabase:
    """Initialize the session intelligence database."""
    return SessionDatabase(db_path)


if __name__ == "__main__":
    # Test database setup
    print("=== Session Database Test ===")
    
    # Initialize database
    db = initialize_database("data/test_session_intelligence.db")
    
    # Test scaffold creation
    test_scaffold = SessionScaffold(
        id=str(uuid.uuid4()),
        schedule_block_id="test-block-123",
        generated_at=datetime.now(),
        context_briefing_snapshot={"test": "data"},
        scaffold_data={
            "suggested_focus": "Test focus area",
            "potential_tasks": ["Task 1", "Task 2"],
            "relevant_insights": "Test insights"
        }
    )
    
    success = db.create_scaffold(test_scaffold)
    print(f"Created test scaffold: {success}")
    
    # Test scaffold retrieval
    retrieved = db.get_scaffold_by_block_id("test-block-123")
    print(f"Retrieved scaffold: {retrieved is not None}")
    
    # Test session log creation
    test_log = SessionLog(
        id=str(uuid.uuid4()),
        project_id="echo",
        block_title="Test Session",
        session_date=date.today(),
        duration_minutes=90,
        category="deep_work",
        generated_log_markdown="# Test Log\n\nThis is a test.",
        ai_insights={"test": "insights"},
        created_at=datetime.now()
    )
    
    success = db.create_session_log(test_log)
    print(f"Created test session log: {success}")
    
    # Test recent logs retrieval
    recent_logs = db.get_recent_session_logs("echo", limit=1)
    print(f"Retrieved recent logs: {len(recent_logs)}")
    
    # Show stats
    stats = db.get_database_stats()
    print(f"Database stats: {stats}")
    
    db.close()
    print("✅ Database test complete!")