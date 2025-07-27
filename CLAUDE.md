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

## High-Level Architecture

### Core System Design
Echo is an intelligent daily planning system with four main components:

1. **Python Backend** (`echo/` directory): Core planning engine with LLM integration and four-panel intelligence system
2. **API Server** (`api_server.py`): FastAPI server exposing functionality to frontends  
3. **Next.js Frontend** (`echo-application/`): Web-based planning interface with React components
4. **macOS App** (`archive/macos/`): Native SwiftUI application (legacy)

### Key Data Flow
```
User Input → Config/Email → Four-Panel Intelligence → Daily Planning → Execution
                ↓                      ↓                     ↓
Microsoft Graph API → Context Briefing → Schedule Blocks → Session Tracking
                ↓                      ↓                     ↓
Email Categorization → Executive Summary → Time Allocation → Analytics/Journaling
                ↓                      ↓                     ↓
Session Analysis → Commitments & Deadlines → Evening Reflection → Morning Check-in
```

### Core Data Models (`echo/models.py`)
- **Block**: Fundamental time unit with start/end times, labels, and types (anchor/fixed/flex)
- **Config**: Root configuration with defaults, projects, and schedules
- **Project**: Project representation with status, milestones, and focus areas  
- **JournalEntry**: Structured reflection data for pattern recognition
- **DailyStats**: Analytics data for time allocation tracking

### Four-Panel Intelligence System
Echo's core intelligence system generates structured context briefings with four panels:

1. **Executive Summary** (`echo/structured_briefing.py`): AI-generated synthesis of all intelligence data
2. **Email Summary** (`echo/email_intelligence.py`): Categorized email insights using OpenAI Response API
3. **Session Notes** (`echo/session_intelligence.py`): Forward-looking commitments from work sessions
4. **Commitments & Deadlines** (`echo/config_intelligence.py`): Upcoming deadlines and reminders

**Key Features:**
- **OpenAI Response API Integration**: All intelligence systems use structured outputs with Pydantic models
- **Flowing Memo Design**: Single-column vertical layout with typography hierarchy
- **Real-time Data Integration**: Combines email, session notes, config data, and localStorage reminders
- **Context-Aware Analysis**: Executive summary generated last with full awareness of all panels

### Email Integration Architecture
Echo integrates with Microsoft Outlook via Graph API using structured intelligence:
- OAuth 2.0 authentication with automatic token refresh
- **Structured Email Categorization**: Uses OpenAI Response API to categorize emails into:
  - Information: Passive updates and announcements
  - Action Items: Tasks and commitments requiring action
  - Response Needed: Emails requiring user responses
- Smart scheduling recommendations integrated into daily planning
- Thread-aware processing with conversation tracking

### Planning Engine (`echo/prompts/unified_planning.py`)
- Claude Opus-powered strategic schedule generation with superior intelligence
- Unified single-call system replacing previous 3-API-call architecture
- Context-aware prompts incorporating email, session insights, and energy patterns
- Structured JSON response parsing with Pydantic models
- Integration with user configuration and real-time data sources
- Guaranteed afternoon email blocks and full-day schedule coverage

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
- `echo/`: Core Python modules with intelligence systems
- `echo-application/`: Next.js frontend with React components and planning workflow
- `api_server.py`: FastAPI server bridging frontend and backend
- `logs/`: Daily activity logs and time ledger data  
- `plans/`: Generated daily plans with metadata
- `refs/`: Journal entries and reflection data
- `config/`: User configuration and email settings
- `tests/`: Comprehensive test suite for all modules
- `archive/`: Legacy macOS application

### Development Patterns
- **Pydantic Models** with OpenAI Response API for structured outputs and type safety
- **Four-Panel Intelligence Architecture** with specialized systems for different data sources
- **React Components** with Next.js App Router and TypeScript for frontend development
- **API-First Design** with FastAPI bridging frontend and Python backend
- **Email-first planning** with structured categorization driving schedule priorities
- **Session-based intelligence** extracting forward-looking commitments from work notes
- **Config-driven reminders** with localStorage integration for real-time updates

### Claude Model Usage Strategy
Echo uses a strategic two-model approach to optimize both intelligence and costs:

- **Claude Opus 4** (`claude-opus-4-20250514`): Used for strategic and analytical tasks
  - Strategic daily planning via `/plan-v2` endpoint
  - Executive summary generation in context briefings
  - Superior reasoning for complex scheduling decisions
  - Better context synthesis from multiple data sources
  - Enhanced energy-based task optimization

- **Claude Sonnet 4** (`claude-sonnet-4-20250514`): Used for structured data processing tasks
  - Email intelligence and categorization
  - Session insights extraction  
  - Session start checklist generation
  - Session log synthesis
  - Scaffold generation
  - Faster and more cost-effective for routine processing

**IMPORTANT: Correct Claude Model IDs**
- **Opus Model**: `claude-opus-4-20250514` (NOT claude-3-opus-20240229)
- **Sonnet Model**: `claude-sonnet-4-20250514` (NOT claude-3-5-sonnet-20241022)

These model IDs are used consistently throughout the codebase as of January 2025.

### Key Dependencies
**Backend:**
- `anthropic`: Claude API integration for all LLM calls
- `pydantic`: Data validation and structured JSON parsing
- `fastapi`: API server for frontend integration
- `pyyaml`: Configuration management
- `requests`: HTTP client for Microsoft Graph API integration
- `pytest`: Testing framework

**Frontend:**
- `next.js`: React framework with App Router
- `typescript`: Type safety for frontend development
- `tailwindcss`: Utility-first CSS framework
- `lucide-react`: Icon library for UI components

### Error Handling & Logging
- Comprehensive logging throughout the system using Python's `logging` module
- OAuth token refresh with automatic retry logic
- Email connection error handling with fallback modes  
- Claude API error handling with graceful fallbacks
- Structured JSON parsing with error recovery
- Frontend error boundaries for graceful degradation

## Current System Architecture Summary

This architecture enables a seamless workflow from data collection through intelligent analysis to actionable planning:

1. **Data Collection**: Microsoft Graph API integration collects email data, session logging captures work notes, and user configuration provides deadlines/reminders
2. **Four-Panel Intelligence**: Structured analysis using OpenAI Response API generates categorized insights across email, sessions, and commitments
3. **Context Briefing**: Executive summary synthesizes all intelligence into actionable daily context
4. **Planning Integration**: Next.js frontend presents context briefing within daily planning workflow
5. **Execution & Tracking**: Session tracking and analytics close the loop with reflection and pattern recognition

The system emphasizes **structured data flow**, **type safety**, and **modular intelligence systems** that can operate independently while contributing to a unified context briefing experience.

## Current TODOs and Next Steps

### Recently Completed (2025-01-25)
✅ **Today Page Major Overhaul**: Implemented sophisticated two-column layout with dynamic timeline
- Created true CSS Grid layout (70/30 split) replacing previous flex approach
- Fixed full-height calendar using complete viewport height for optimal timeline scaling
- Achieved perfect header alignment with unified grid system throughout the page
- Enhanced timeline aesthetics with hourly labels and outline-based category styling
- Updated session management with gold accent End Session button (replacing destructive red)
- Created shared PlanTimeline component supporting both 'planning' and 'today' contexts
- Implemented dynamic schedule analysis with intelligent time range calculation and 15-minute buffers

✅ **ActiveSessionState Premium Dashboard Transformation**: Converted "generic form" into "premium live dashboard cockpit"
- **Design System Alignment**: Applied "Session Scaffold" design system from SpinUpState as definitive standard
- **Data Flow Fixes**: Eliminated hardcoded times, ensured proper block data flows from SpinUp to Active states
- **Container Architecture**: Implemented structured Card/CardContent system with conditional padding to eliminate dead space
- **Header Vitals Refinement**: Created three-line stacked layout for better hierarchy and scannability
  - Line 1: Session title (large, bold) 
  - Line 2: Time range and category (foreground color, medium prominence)
  - Line 3: Live countdown with inline progress bar (muted color, less prominent)
- **Icon Resolution**: Fixed icon system to use proper timeCategory-based icons (Users for meetings, Target for deep work)
- **UI Polish**: Transformed session notes into permanent fixture, refined spacing throughout, repositioned End Session button
- **Premium Aesthetic**: Achieved consistent "bespoke, intelligent briefing" feel matching SpinUpState design quality

### High Priority Next Steps

#### 1. Timeline Scaling Refinement 🔧 **CRITICAL**
**Issue**: Dynamic timeline system works but doesn't match lived experience patterns
- Current system analyzes schedule data but produces inconsistent timeline length
- User's actual daily pattern: 5:30 AM - 10:00 PM with 15-minute buffers
- Need to balance dynamic analysis with practical daily schedule consistency
- **Target**: Timeline showing 5:15 AM - 10:15 PM range reliably while maintaining mathematical precision

#### 2. Planning Page Integration 🏗️ **HIGH**
**Status**: PlanTimeline component created but planning page integration needs verification
- Ensure planning page continues to work with shared component architecture
- Verify timeline scaling works correctly in planning context vs today context
- Test component behavior across different schedule scenarios and edge cases

#### 3. Mobile Responsiveness 📱 **MEDIUM**
**Gap**: Two-column layout optimized for desktop but mobile experience needs attention
- CSS Grid layout may need responsive breakpoints for mobile/tablet
- Consider collapsible sidebar or stack layout for smaller screens
- Ensure timeline remains usable on mobile devices

### Technical Debt

#### Frontend Architecture
- **Component Consistency**: Standardize timeline components across planning/today/config wizard
- **Height Calculation Logic**: Complex viewport calculations could be simplified with better CSS strategies
- **Icon Resolution Service**: Could benefit from caching and performance optimization

#### Backend Integration
- **Real-time Data Flow**: Today page timeline could benefit from real-time schedule updates
- **Session State Management**: Current session tracking is mock - needs API integration
- **Timeline State Persistence**: User timeline preferences and scaling could be saved

### Future Enhancements
- **Timeline Interaction**: Drag-and-drop schedule editing directly in today timeline
- **Smart Notifications**: Timeline-aware notifications for upcoming sessions
- **Analytics Integration**: Timeline usage patterns feeding back into planning intelligence
- **Calendar Sync**: Two-way sync with external calendar systems for comprehensive schedule view

### Development Notes
- Timeline scaling mathematics proven to work but needs user experience refinement
- Two-column layout architecture solid foundation for future timeline enhancements
- Shared component strategy successful - consider extending to other interface elements
