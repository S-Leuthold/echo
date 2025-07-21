# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Running and Testing
```bash
# Run the main CLI
python -m echo.cli <command>

# Run all tests with verbose output
python -m pytest tests/ -v

# Run specific test categories
python -m pytest tests/test_analytics.py -v
python -m pytest tests/test_journal.py -v

# Run tests with coverage
python -m pytest tests/ --cov=echo --cov-report=html

# Lint and format code
black echo/
ruff echo/

# Start the API server (for macOS app)
python api_server.py
```

### Key CLI Commands
```bash
# Email and planning workflow
python -m echo.cli oauth-login          # Microsoft OAuth authentication
python -m echo.cli email-summary        # Generate email summary
python -m echo.cli plan                 # Generate daily plan with email integration
python -m echo.cli end-day              # End-of-day workflow with reflection
python -m echo.cli morning              # Morning check-in with email priorities

# Testing and development
python -m echo.cli test-connection      # Test email connection
python -m echo.cli test-email-summary   # Test with mock data
python -m echo.cli check-token-status   # Check OAuth token status
```

### macOS App Development
```bash
# Navigate to macOS project
cd archive/macos

# Build and run the SwiftUI app (requires Xcode)
swift run EchoApp

# The app connects to the API server at localhost:8000
```

## High-Level Architecture

### Core System Design
Echo is an intelligent daily planning system with three main components:

1. **Python Backend** (`echo/` directory): Core planning engine with LLM integration
2. **API Server** (`api_server.py`): FastAPI server exposing functionality to frontends  
3. **macOS App** (`archive/macos/`): Native SwiftUI application

### Key Data Flow
```
User Input → Config/Email → LLM Planning → Schedule Blocks → Analytics/Journaling
                ↓
Email Integration (Microsoft Graph API) ← → Daily Planning ← → Session Tracking
                ↓
Evening Reflection → Tomorrow Planning → Morning Check-in → Execution
```

### Core Data Models (`echo/models.py`)
- **Block**: Fundamental time unit with start/end times, labels, and types (anchor/fixed/flex)
- **Config**: Root configuration with defaults, projects, and schedules
- **Project**: Project representation with status, milestones, and focus areas  
- **JournalEntry**: Structured reflection data for pattern recognition
- **DailyStats**: Analytics data for time allocation tracking

### Email Integration Architecture
Echo integrates with Microsoft Outlook via Graph API:
- OAuth 2.0 authentication with automatic token refresh
- Email processing with priority filtering and action item extraction
- Smart scheduling recommendations integrated into daily planning
- Response tracking and completion status management

### Planning Engine (`echo/prompt_engine.py`)
- LLM-powered schedule generation using GPT-4
- Context-aware prompts incorporating email, journal, and energy patterns
- Structured response parsing to generate time blocks
- Integration with user configuration and project data

### Session & Analytics System
- **Session Tracking** (`echo/session.py`): Work session management with external tool integration
- **Analytics Engine** (`echo/analytics.py`): Time ledger with category breakdown and productivity scoring
- **Journal System** (`echo/journal.py`): Evening reflection and pattern recognition

### Configuration System
- **YAML-based config** (`config/user_config.yaml`): Projects, schedules, email filters
- **Environment variables**: API keys and sensitive data
- **Profile system**: Context-specific overrides (travel, holidays, etc.)

### Testing Strategy
- Comprehensive test suite in `tests/` covering all major modules
- Mock data fixtures for consistent testing
- API server integration tests
- Email processing validation with test data

### File Structure Significance
- `echo/`: Core Python modules (single source of truth)
- `logs/`: Daily activity logs and time ledger data  
- `plans/`: Generated daily plans with metadata
- `refs/`: Journal entries and reflection data
- `config/`: User configuration and email settings
- `archive/`: Historical frontends and experimental code

### Development Patterns
- **Dataclass-based models** for type safety and clarity
- **LLM integration** with structured prompts and response parsing
- **Email-first planning** with action items driving schedule priorities
- **Journal-driven insights** feeding into next-day planning
- **Session-based time tracking** with external tool integration

### Key Dependencies
- `pyyaml`: Configuration management
- `openai`: LLM integration for planning
- `fastapi`: API server for frontend integration
- `requests`: HTTP client for email API integration
- `pytest`: Testing framework

### Error Handling & Logging
- Comprehensive logging throughout the system using Python's `logging` module
- OAuth token refresh with automatic retry logic
- Email connection error handling with fallback modes
- LLM API error handling with informative user messages

This architecture enables a seamless workflow from email processing through planning to execution and reflection, with robust data persistence and analytics throughout.