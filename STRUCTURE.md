# Echo Project Structure

## Overview
Echo is a full-stack intelligent planning system combining a Python FastAPI backend with a Next.js TypeScript frontend, featuring AI-powered scheduling, real-time analytics, and adaptive coaching.

## Directory Layout

```
echo/
├── backend/                 # Python backend (FastAPI) - Symlink structure
│   ├── src/
│   │   └── echo/           # Main package (symlink to /echo)
│   └── tests/              # Python tests (symlink to /tests)
│
├── frontend/               # Next.js 14+ application with TypeScript
│   ├── src/
│   │   ├── app/           # App Router pages (Next.js 14)
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services & utilities
│   │   ├── types/         # TypeScript type definitions
│   │   └── lib/           # Utility functions
│   ├── public/            # Static assets
│   ├── package.json       # Node dependencies
│   └── tsconfig.json      # TypeScript configuration
│
├── echo/                   # Python package (main source)
│   ├── api/               # FastAPI routes
│   │   ├── main.py       # Main FastAPI app
│   │   └── routers/      # Modular route handlers
│   ├── prompts/          # LLM prompt templates
│   ├── models.py         # Pydantic data models
│   ├── cli.py            # Command-line interface
│   └── *.py              # Core modules (30+ modules)
│
├── tests/                  # Python test suite
│   ├── test_*.py          # Unit & integration tests (30+ files)
│   └── conftest.py       # Pytest configuration
│
├── scripts/                # Utility scripts
│   ├── populate_mock_database.py  # Development data seeding
│   └── weekly_sync_generator.py   # Weekly summary generation
│
├── config/                 # User configuration
│   ├── user_config.yaml   # Main configuration file
│   ├── config_schema.md   # Configuration documentation
│   └── README.md          # Config system guide
│
├── data/                   # Persistent data storage
│   ├── session_intelligence.db  # Session & project database
│   ├── conversations.db        # Adaptive coaching data
│   └── quotes.json            # Contextual quotes database
│
├── runtime/                # Runtime-generated files
│   ├── logs/              # Application logs
│   ├── plans/             # Generated daily plans (JSON)
│   └── exports/           # Data exports (CSV, JSON)
│
├── sessions/               # Development session tracking
│   ├── .current-session   # Active session pointer
│   └── YYYY-MM-DD-*.md   # Session log files
│
├── docs/                   # Project documentation
│   ├── README.md          # Documentation index
│   ├── development/       # Development docs
│   ├── References/        # External references
│   └── screenshots/       # UI screenshots
│
├── archive/                # Deprecated/legacy code
│   ├── macos/            # Legacy Swift app
│   ├── projects/         # Old project files
│   └── refs/             # Historical references
│
├── .claude/                # Claude Code configuration
│   ├── CLAUDE.md         # Claude-specific guide
│   └── commands/         # Custom CLI commands
│
├── api_server.py          # Main FastAPI server entry point
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── README.md             # Project overview
```

## Technology Stack

### Backend (Python 3.11+)
- **FastAPI**: Modern async web framework
- **Anthropic Claude**: AI planning & coaching (Opus 4 & Sonnet 4)
- **OpenAI**: Response API for structured outputs
- **SQLite**: Local database with session intelligence
- **Pydantic**: Data validation & serialization
- **Microsoft Graph API**: Email integration

### Frontend (Node.js 18+)
- **Next.js 14+**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Lucide React**: Icon system
- **React Hook Form**: Form management

## Key Commands

### Backend Operations
```bash
# CLI Commands
python -m echo.cli plan              # Generate daily plan
python -m echo.cli morning           # Morning check-in
python -m echo.cli end-day          # Evening reflection
python -m echo.cli email-summary    # Process emails
python -m echo.cli oauth-login      # Microsoft authentication

# API Server
python api_server.py                # Start on port 8000

# Testing
python -m pytest tests/ -v          # Run all tests
python -m pytest tests/ --cov=echo  # With coverage
black echo/                         # Format code
ruff echo/                          # Lint code
```

### Frontend Operations
```bash
cd frontend
npm install                         # Install dependencies
npm run dev                        # Development server (port 3000)
npm run build                      # Production build
npm run lint                       # ESLint check
npm run type-check                 # TypeScript validation
npm test                          # Run tests
```

### Development Workflow
```bash
# Session Management
/project:session-start              # Start development session
/project:session-update            # Log progress
/project:session-end               # End with summary
/project:session-current           # Check status

# Full Stack Development
python api_server.py &             # Backend on :8000
cd frontend && npm run dev &      # Frontend on :3000
```

## API Architecture

### Core Endpoints (26+ endpoints)
- `/health` - System health check
- `/config/*` - Configuration management
- `/today` - Current schedule & status
- `/plan-v2` - AI planning generation
- `/context-briefing` - Four-panel intelligence
- `/projects/*` - Full CRUD operations
- `/conversations/*` - Adaptive coaching
- `/analytics` - Time tracking & insights
- `/scaffolds/*` - Session intelligence

### Database Schema
- **Projects**: Portfolio management with AI roadmaps
- **Sessions**: Work tracking with scaffolds
- **Conversations**: Adaptive coaching states
- **Activities**: Analytics & time ledger
- **Files**: Document management

## Development Status

### ✅ Completed Features
- Four-panel intelligence system
- AI-powered planning with Claude
- Email integration (Microsoft Graph)
- Session tracking & analytics
- Project management CRUD
- Adaptive coaching conversations
- Real-time schedule tracking
- Evening reflection wizard

### 🚧 In Progress
- Projects page frontend integration
- Analytics page backend connection
- Session persistence improvements
- Mobile responsive design

### 📋 Planned
- Calendar synchronization
- Team collaboration features
- Advanced reporting dashboard
- Plugin system architecture

## Migration Notes
The project is transitioning from a flat structure to an organized monorepo. Symlinks in `backend/` maintain backward compatibility during this migration. All new development should follow the modular structure outlined above.