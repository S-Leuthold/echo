# Directory Structure Migration Impact Tracking

## Overview
This document tracks all changes and impacts during the directory restructuring of the Echo project.
Goal: Organize the codebase while maintaining 100% functionality.

## Migration Status
- **Started**: 2025-08-03
- **Current Phase**: Phase 0 - Pre-Migration Safety
- **Risk Level**: Low (using gradual migration with compatibility layer)

## Critical Dependencies

### Python Import Paths (50+ files affected)
All files using `from echo.` or `import echo.` patterns:

#### Backend Core Files
- [ ] `api_server.py` - Main API server
- [ ] `api_server_backup.py` - Can be archived
- [ ] `api_server_original_backup.py` - Can be archived

#### Echo Package Modules (echo/*.py)
- [ ] `echo/cli.py` - Main CLI entry point
- [ ] `echo/models.py` - Core data models
- [ ] `echo/config_loader.py` - Configuration management
- [ ] `echo/database_schema.py` - Database definitions
- [ ] `echo/email_processor.py` - Email handling
- [ ] `echo/claude_client.py` - LLM integration
- [ ] `echo/session_intelligence.py` - Session management
- [ ] `echo/structured_briefing.py` - Briefing generation
- [ ] All other modules in echo/

#### API Routers (echo/api/routers/*.py)
- [ ] `projects.py`
- [ ] `today.py`
- [ ] `scaffolds.py`
- [ ] `sessions.py`
- [ ] `analytics.py`
- [ ] `config.py`
- [ ] `reflection.py`

#### Test Files (Need Import Updates)
- [ ] `tests/test_*.py` - All test files in tests/
- [ ] Root level test files (to be moved):
  - [ ] `test_academic_coaching.py`
  - [ ] `test_complete_flow.py`
  - [ ] `test_conversation.py`
  - [ ] `test_conversation_api.py`
  - [ ] `test_conversation_api_v2.py`
  - [ ] `test_debug_conversation.py`
  - [ ] `test_domain_detection_trigger.py`
  - [ ] `test_full_conversation_flow.py`
  - [ ] `test_live_claude_integration.py`
  - [ ] `test_natural_conversation.py`
  - [ ] `test_semantic_integration.py`
  - [ ] `test_session_api_endpoints.py`
  - [ ] `test_three_stage_flow.py`

### Hardcoded File Paths

#### Configuration Paths
- [ ] `config/user_config.yaml` - Used in:
  - `echo/config_loader.py:37`
  - `api_server.py` (multiple locations)
  - **Decision**: KEEP AS-IS for compatibility

#### Data Paths
- [ ] `data/session_intelligence.db` - Used in:
  - `echo/database_schema.py:100`
  - `echo/api/routers/projects.py:36`
  - `echo/populate_mock_database.py:24`
  - **Decision**: KEEP AS-IS for compatibility

- [ ] `data/test_conversation_states.db` - Used in:
  - `echo/conversation_state_manager.py:499`
  - Test files

#### Logs Paths (TO BE MIGRATED)
- [ ] `logs/` → `runtime/logs/` - Used in:
  - `logs/time_ledger.csv` - `echo/analytics.py:210`
  - `logs/sessions/` - `api_server.py:518`
  - `logs/mock_sessions/` - `echo/test_mock_sessions.py:58`
  - `logs/weekly_syncs/` - `echo/weekly_sync_generator.py:327`

#### Plans Paths (TO BE MIGRATED)
- [ ] `plans/` → `runtime/plans/` - Used in:
  - `echo/cli.py:389` - Daily plan generation
  - `api_server.py:846` - Enhanced plan saving
  - Multiple backup locations

### Frontend API Endpoints

#### Files with Hardcoded localhost:8000
- [ ] `src/contexts/PlanningContext.tsx:91`
- [ ] `src/contexts/PlanStatusContext.tsx:47`
- [ ] `src/components/shared/PlanTimeline.tsx:124`
- [ ] `src/app/planning/page.tsx` (multiple lines)
- [ ] `src/app/config-wizard/page.tsx` (multiple lines)
- [ ] `src/app/today/page.tsx:72`
- [ ] `src/app/today/page-original.tsx:72`

**Solution**: Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Files to Clean Up

### Duplicate/Backup Files (TO BE REMOVED)
- [ ] `api_server_backup.py`
- [ ] `api_server_original_backup.py`
- [ ] `echo-application/src/app/today/page-original.tsx`
- [ ] `echo-application/src/components/today/SessionManager-broken.tsx`
- [ ] `echo-application/src/components/ui/novel-markdown-editor 2.tsx`

### Log Files (TO BE GITIGNORED)
- [ ] `api_debug.log`
- [ ] `api_server.log`
- [ ] `dev.log`
- [ ] `frontend.log`
- [ ] `nextjs.log`
- [ ] `echo-application/api_server.log`
- [ ] `echo-application/dev.log`
- [ ] `echo-application/dev_server.log`
- [ ] `echo-application/nextjs.log`

### Temporary Files (TO BE GITIGNORED)
- [ ] All `__pycache__/` directories
- [ ] All `.DS_Store` files
- [ ] All `*.pyc` files

## New Directory Structure

### Final Target Structure
```
echo/
├── backend/                 # Python backend
│   ├── src/
│   │   └── echo/           # Main package (symlink initially)
│   ├── tests/              # All Python tests
│   ├── scripts/            # CLI and utility scripts
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/               # Next.js app (renamed from echo-application)
│   ├── src/
│   ├── public/
│   ├── tests/
│   └── package.json
├── config/                 # KEEP AS-IS
│   └── user_config.yaml
├── data/                   # KEEP AS-IS
│   └── *.db
├── runtime/                # NEW - Runtime generated files
│   ├── logs/
│   ├── plans/
│   └── exports/
├── docs/                   # Consolidated documentation
├── sessions/               # Development sessions
├── .claude/                # Claude-specific
│   ├── commands/
│   └── CLAUDE.md
└── archive/                # Old/deprecated code
```

## Testing Checklist

### Pre-Migration Tests
- [ ] Run all Python tests: `python -m pytest tests/ -v`
- [ ] Test CLI commands: `python -m echo.cli test-connection`
- [ ] Test API health: `curl http://localhost:8000/health`
- [ ] Test frontend: Load http://localhost:3000
- [ ] Save baselines for comparison

### Post-Change Tests (After Each Phase)
- [ ] Python imports still work
- [ ] CLI commands execute correctly
- [ ] API endpoints respond
- [ ] Frontend connects to API
- [ ] Database connections work
- [ ] File paths resolve correctly

## Rollback Plan

### Backup Location
- [ ] Backup created at: `echo-backup-[timestamp]`

### Rollback Steps
1. Stop all services
2. `git stash` or `git reset --hard`
3. Restore from backup if needed
4. Restart services

## Progress Log

### 2025-08-03
- Created migration-impact.md
- Analyzed all dependencies
- Identified 50+ files with import dependencies
- Identified hardcoded paths in 17+ locations
- Created comprehensive migration plan

### 2025-08-04 - Initial Restructuring
- ✅ Created full backup at `echo-backup-20250804-220158/`
- ✅ Saved test baseline (1 existing import error noted)
- ✅ Created new directory structure:
  - `backend/` with symlinks to echo/ and tests/
  - `frontend/` (renamed from echo-application)
  - `runtime/` for logs, plans, exports
  - `archive/` for old files
- ✅ Moved backup files to archive/
- ✅ Moved test files from root to tests/
- ✅ Updated .gitignore with comprehensive patterns
- ✅ Created STRUCTURE.md documentation
- ✅ Verified CLI still works: `python -m echo.cli test-connection`

### Changes Made
- **Renamed**: `echo-application/` → `frontend/`
- **Moved**: `api_server_backup.py`, `api_server_original_backup.py` → `archive/`
- **Moved**: All `test_*.py` files from root → `tests/`
- **Removed**: All `*.log` files
- **Created**: Symlinks for gradual migration

### Next Steps
1. Update frontend configuration to use new path
2. Migrate logs/ to runtime/logs/
3. Migrate plans/ to runtime/plans/
4. Update hardcoded paths in Python files
5. Update frontend API endpoints to use environment variables

## Notes
- Keep `config/` and `data/` in place for compatibility
- Use symlinks during transition period
- Test after every change
- Document any unexpected issues here