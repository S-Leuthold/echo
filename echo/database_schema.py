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
        
        # Projects table (enhanced for comprehensive project management)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                type TEXT NOT NULL,                     -- software, research, writing, etc.
                status TEXT NOT NULL,                   -- active, on_hold, completed, etc.
                phase TEXT NOT NULL,                    -- initiation, planning, execution, etc.
                priority TEXT NOT NULL,
                category TEXT NOT NULL,                 -- legacy field, maps to 'type'
                objective TEXT NOT NULL,                -- primary project objective
                current_state TEXT NOT NULL,            -- current project state description
                current_focus TEXT NOT NULL,
                progress_percentage REAL NOT NULL,
                momentum TEXT NOT NULL,                 -- high, medium, low, stalled
                total_estimated_hours INTEGER NOT NULL,
                total_actual_hours INTEGER NOT NULL,
                hours_this_week REAL DEFAULT 0,         -- hours worked this week
                hours_last_week REAL DEFAULT 0,         -- hours worked last week
                total_sessions INTEGER DEFAULT 0,       -- total work sessions
                sessions_this_week INTEGER DEFAULT 0,   -- sessions this week
                created_date DATE NOT NULL,
                updated_date DATE NOT NULL,
                last_session_date DATE,                 -- date of last work session
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
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_project_type_status 
            ON projects (type, status)
        """)
        
        # Project roadmaps table (for hybrid wizard AI-generated roadmaps)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS project_roadmaps (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                phases_data TEXT NOT NULL,              -- JSON array of roadmap phases
                current_phase_id TEXT,                  -- ID of currently active phase
                ai_confidence REAL NOT NULL,           -- AI confidence score (0-1)
                generated_at TIMESTAMP NOT NULL,       -- when roadmap was generated
                user_modified BOOLEAN DEFAULT FALSE,   -- whether user has modified
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        """)
        
        # Daily activities table (for activity heatmaps and analytics)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS daily_activities (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                date DATE NOT NULL,
                hours REAL NOT NULL DEFAULT 0,          -- hours worked on this day
                sessions_count INTEGER NOT NULL DEFAULT 0, -- number of sessions
                intensity INTEGER NOT NULL DEFAULT 0,   -- calculated intensity (0-4)
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, date)  -- one record per project per day
            )
        """)
        
        # Weekly summaries table (AI-generated weekly project summaries)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS weekly_summaries (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                week_ending DATE NOT NULL,              -- Sunday date ending the week
                hours_invested REAL NOT NULL DEFAULT 0,
                sessions_count INTEGER NOT NULL DEFAULT 0,
                summary TEXT NOT NULL,                  -- AI-generated narrative summary
                key_accomplishments TEXT NOT NULL,      -- JSON array of accomplishments
                decisions_made TEXT NOT NULL,           -- JSON array of decisions  
                blockers_encountered TEXT NOT NULL,     -- JSON array of blockers
                next_week_focus TEXT NOT NULL,          -- focus for next week
                tasks_completed INTEGER NOT NULL DEFAULT 0,
                ai_confidence REAL NOT NULL,           -- AI confidence score (0-1)
                generated_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                UNIQUE(project_id, week_ending)  -- one summary per project per week
            )
        """)
        
        # Uploaded files table (for hybrid wizard file context)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id TEXT PRIMARY KEY,
                project_id TEXT,                        -- nullable for files not yet linked to project
                filename TEXT NOT NULL,
                original_filename TEXT NOT NULL,        -- user's original filename
                content_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,             -- size in bytes
                file_path TEXT NOT NULL,                -- storage path on disk
                file_hash TEXT,                         -- SHA-256 hash for deduplication
                project_context TEXT,                   -- user description of how file relates
                processed BOOLEAN DEFAULT FALSE,        -- whether file has been processed for context
                uploaded_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NOT NULL,
                
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
            )
        """)
        
        # Create indexes for new tables
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_roadmap_project 
            ON project_roadmaps (project_id)
        """)
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_daily_activity_project_date 
            ON daily_activities (project_id, date DESC)
        """)
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_weekly_summary_project_week 
            ON weekly_summaries (project_id, week_ending DESC)
        """)
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_uploaded_files_project 
            ON uploaded_files (project_id, uploaded_at DESC)
        """)
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_uploaded_files_hash 
            ON uploaded_files (file_hash)
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
    
    # ===== PROJECT ROADMAPS =====
    
    def create_project_roadmap(self, project_id: str, phases_data: List[Dict], ai_confidence: float) -> str:
        """Create a new project roadmap."""
        try:
            roadmap_id = str(uuid.uuid4())
            now = datetime.now()
            
            self.conn.execute("""
                INSERT INTO project_roadmaps
                (id, project_id, phases_data, ai_confidence, generated_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                roadmap_id, project_id, json.dumps(phases_data), ai_confidence,
                now.isoformat(), now.isoformat(), now.isoformat()
            ))
            self.conn.commit()
            return roadmap_id
        except sqlite3.Error as e:
            print(f"Error creating project roadmap: {e}")
            return ""
    
    def get_project_roadmap(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get roadmap for a project."""
        cursor = self.conn.execute("""
            SELECT * FROM project_roadmaps WHERE project_id = ?
            ORDER BY created_at DESC LIMIT 1
        """, (project_id,))
        
        row = cursor.fetchone()
        if not row:
            return None
            
        return {
            "id": row['id'],
            "project_id": row['project_id'],
            "phases": json.loads(row['phases_data']),
            "current_phase_id": row['current_phase_id'],
            "ai_confidence": row['ai_confidence'],
            "generated_at": row['generated_at'],
            "user_modified": bool(row['user_modified']),
            "created_at": row['created_at'],
            "updated_at": row['updated_at']
        }
    
    def update_project_roadmap(self, roadmap_id: str, phases_data: List[Dict], current_phase_id: str = None) -> bool:
        """Update an existing roadmap."""
        try:
            self.conn.execute("""
                UPDATE project_roadmaps 
                SET phases_data = ?, current_phase_id = ?, user_modified = TRUE, 
                    updated_at = ?
                WHERE id = ?
            """, (json.dumps(phases_data), current_phase_id, datetime.now().isoformat(), roadmap_id))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error updating roadmap: {e}")
            return False
    
    # ===== DAILY ACTIVITIES =====
    
    def update_daily_activity(self, project_id: str, date: date, hours: float, sessions_count: int) -> bool:
        """Update or create daily activity record."""
        try:
            # Calculate intensity based on hours and sessions (0-4 scale)
            intensity = min(4, int((hours * 0.5) + (sessions_count * 0.3)))
            now = datetime.now()
            
            self.conn.execute("""
                INSERT OR REPLACE INTO daily_activities
                (id, project_id, date, hours, sessions_count, intensity, created_at, updated_at)
                VALUES (
                    COALESCE((SELECT id FROM daily_activities WHERE project_id = ? AND date = ?), ?),
                    ?, ?, ?, ?, ?, 
                    COALESCE((SELECT created_at FROM daily_activities WHERE project_id = ? AND date = ?), ?),
                    ?
                )
            """, (
                project_id, date.isoformat(), str(uuid.uuid4()),  # for COALESCE id
                project_id, date.isoformat(), hours, sessions_count, intensity,
                project_id, date.isoformat(), now.isoformat(),  # for COALESCE created_at
                now.isoformat()  # updated_at
            ))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error updating daily activity: {e}")
            return False
    
    def get_daily_activities(self, project_id: str, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Get daily activities for a project within date range."""
        cursor = self.conn.execute("""
            SELECT * FROM daily_activities 
            WHERE project_id = ? AND date BETWEEN ? AND ?
            ORDER BY date ASC
        """, (project_id, start_date.isoformat(), end_date.isoformat()))
        
        activities = []
        for row in cursor.fetchall():
            activities.append({
                "date": row['date'],
                "hours": row['hours'],
                "sessions": row['sessions_count'],
                "intensity": row['intensity']
            })
        return activities
    
    # ===== WEEKLY SUMMARIES =====
    
    def create_weekly_summary(self, project_id: str, week_ending: date, summary_data: Dict[str, Any]) -> str:
        """Create a new weekly summary."""
        try:
            summary_id = str(uuid.uuid4())
            now = datetime.now()
            
            self.conn.execute("""
                INSERT INTO weekly_summaries
                (id, project_id, week_ending, hours_invested, sessions_count, summary,
                 key_accomplishments, decisions_made, blockers_encountered, next_week_focus,
                 tasks_completed, ai_confidence, generated_at, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                summary_id, project_id, week_ending.isoformat(),
                summary_data.get('hours_invested', 0),
                summary_data.get('sessions_count', 0),
                summary_data.get('summary', ''),
                json.dumps(summary_data.get('key_accomplishments', [])),
                json.dumps(summary_data.get('decisions_made', [])),
                json.dumps(summary_data.get('blockers_encountered', [])),
                summary_data.get('next_week_focus', ''),
                summary_data.get('tasks_completed', 0),
                summary_data.get('ai_confidence', 0.8),
                now.isoformat(), now.isoformat(), now.isoformat()
            ))
            self.conn.commit()
            return summary_id
        except sqlite3.Error as e:
            print(f"Error creating weekly summary: {e}")
            return ""
    
    def get_weekly_summaries(self, project_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent weekly summaries for a project."""
        cursor = self.conn.execute("""
            SELECT * FROM weekly_summaries 
            WHERE project_id = ?
            ORDER BY week_ending DESC
            LIMIT ?
        """, (project_id, limit))
        
        summaries = []
        for row in cursor.fetchall():
            summaries.append({
                "id": row['id'],
                "project_id": row['project_id'],
                "week_ending": row['week_ending'],
                "hours_invested": row['hours_invested'],
                "sessions_count": row['sessions_count'],
                "summary": row['summary'],
                "key_accomplishments": json.loads(row['key_accomplishments']),
                "decisions_made": json.loads(row['decisions_made']),
                "blockers_encountered": json.loads(row['blockers_encountered']),
                "next_week_focus": row['next_week_focus'],
                "tasks_completed": row['tasks_completed'],
                "ai_confidence": row['ai_confidence'],
                "generated_at": row['generated_at']
            })
        return summaries
    
    # ===== UPLOADED FILES =====
    
    def create_uploaded_file(self, filename: str, original_filename: str, content_type: str, 
                           file_size: int, file_path: str, file_hash: str = None, 
                           project_id: str = None, project_context: str = None) -> str:
        """Create a new uploaded file record."""
        try:
            file_id = str(uuid.uuid4())
            now = datetime.now()
            
            self.conn.execute("""
                INSERT INTO uploaded_files
                (id, project_id, filename, original_filename, content_type, file_size,
                 file_path, file_hash, project_context, uploaded_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                file_id, project_id, filename, original_filename, content_type,
                file_size, file_path, file_hash, project_context,
                now.isoformat(), now.isoformat()
            ))
            self.conn.commit()
            return file_id
        except sqlite3.Error as e:
            print(f"Error creating uploaded file: {e}")
            return ""
    
    def get_uploaded_files(self, project_id: str = None) -> List[Dict[str, Any]]:
        """Get uploaded files, optionally filtered by project."""
        if project_id:
            cursor = self.conn.execute("""
                SELECT * FROM uploaded_files 
                WHERE project_id = ?
                ORDER BY uploaded_at DESC
            """, (project_id,))
        else:
            cursor = self.conn.execute("""
                SELECT * FROM uploaded_files 
                ORDER BY uploaded_at DESC
            """)
        
        files = []
        for row in cursor.fetchall():
            files.append({
                "id": row['id'],
                "project_id": row['project_id'],
                "filename": row['filename'],
                "original_filename": row['original_filename'],
                "content_type": row['content_type'],
                "file_size": row['file_size'],
                "file_path": row['file_path'],
                "file_hash": row['file_hash'],
                "project_context": row['project_context'],
                "processed": bool(row['processed']),
                "uploaded_at": row['uploaded_at']
            })
        return files
    
    def link_file_to_project(self, file_id: str, project_id: str, project_context: str = None) -> bool:
        """Link an uploaded file to a project."""
        try:
            self.conn.execute("""
                UPDATE uploaded_files 
                SET project_id = ?, project_context = ?
                WHERE id = ?
            """, (project_id, project_context, file_id))
            self.conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error linking file to project: {e}")
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