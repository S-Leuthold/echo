# Echo

<p align="center">
  <img src="dev/logo.png" alt="Echo Logo" width="200"/>
</p>

<p align="center">
  <strong>Intelligent Daily Planning & Productivity System</strong><br>
  AI-powered scheduling with real-time analytics and session management
</p>

## Overview

Echo is a comprehensive productivity system that combines intelligent LLM-powered scheduling with robust time tracking and analytics. It features a sophisticated React TypeScript evening ritual interface and Python CLI for seamless daily planning and execution.

> 📚 **Documentation Updated**: All documentation has been refreshed to reflect the current React TypeScript frontend with evening ritual wizard, complete API reference, and updated configuration system. See [docs/README.md](docs/README.md) for the complete documentation index.

## Key Features

**AI-Powered Planning**
- LLM-generated daily schedules based on priorities, energy levels, and constraints
- Email integration with Microsoft Graph API for action item extraction
- Smart time block allocation (anchor, flex, and fixed blocks)
- Real-time plan status detection and adaptive recommendations

**Modern Web Interface**
- Status-aware Today page with live progress tracking
- Interactive planning interface with email context
- Real-time session management and note-taking
- Comprehensive analytics dashboard with time allocation insights

**Advanced Analytics**
- Detailed time ledger with category and project breakdown  
- Daily statistics with productivity scoring
- Pattern recognition from journal entries and reflection data
- CSV export for trend analysis and reporting

**Session Management**
- Work session tracking with external tool integration
- Session notes with auto-save functionality
- Anti-hallucination logging that prevents LLM data fabrication
- Structured session summaries for project documentation

**Email Integration**
- Microsoft Outlook integration via Graph API with OAuth 2.0
- Automatic response tracking and action item extraction
- Priority filtering by important senders and urgent keywords
- Email-aware planning with contextual scheduling recommendations

## Architecture

### Core Components
- **Python Backend**: FastAPI server with comprehensive planning and analytics APIs
- **Web Interface**: Modern Next.js application with TypeScript and real-time updates
- **LLM Integration**: Two-stage planning system (Planner → Enricher) with strategic reasoning
- **Data Models**: Structured time blocks, projects, sessions, and journal entries

### Technology Stack
- **Backend**: Python 3.11+, FastAPI, OpenAI API, Microsoft Graph API
- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui components  
- **Data**: YAML configuration, JSON persistence, CSV analytics export
- **Authentication**: Microsoft OAuth 2.0 for email integration

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- OpenAI API key
- Microsoft Azure app registration (for email features)

### Installation

1. **Clone and setup Python backend:**
   ```bash
   git clone https://github.com/your-repo/echo.git
   cd echo
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Setup web interface:**
   ```bash
   cd echo-application
   npm install
   ```

3. **Configure environment:**
   ```bash
   # Copy sample configuration
   cp config/sample_config.yaml config/user_config.yaml
   
   # Add to .env file:
   export OPENAI_API_KEY="your-openai-key"
   export ECHO_GRAPH_CLIENT_ID="your-azure-client-id"
   export ECHO_GRAPH_CLIENT_SECRET="your-azure-client-secret"
   ```

4. **Start the system:**
   ```bash
   # Terminal 1: Start API server
   python api_server.py
   
   # Terminal 2: Start web interface  
   cd echo-application && npm run dev
   ```

5. **Access the application:**
   - Web interface: http://localhost:3000
   - API documentation: http://localhost:8000/docs

## Usage

### Daily Planning Workflow

**Morning:**
- Access Today page to see live schedule and current focus
- Review email action items integrated into planning context
- Start work sessions with real-time progress tracking

**During Work:**
- Track sessions with integrated note-taking
- Monitor real-time progress indicators and time remaining
- Switch between tasks with session state management

**Evening:**
- Complete structured reflection with guided prompts
- Review analytics dashboard for productivity insights  
- Generate tomorrow's plan using reflection data and email context

### CLI Commands

```bash
# Email and planning
python -m echo.cli oauth-login          # Authenticate with Microsoft
python -m echo.cli email-summary        # Get email action items
python -m echo.cli plan                 # Generate AI-powered daily plan
python -m echo.cli morning              # Morning check-in workflow
python -m echo.cli end-day              # Evening reflection and planning

# Analytics and insights
python -m echo.cli analytics            # View time allocation analytics
python -m echo.cli insights             # Generate productivity insights
python -m echo.cli session history      # View session history

# Testing and development
python -m echo.cli test-connection      # Test email integration
python -m echo.cli check-token-status   # Verify OAuth tokens
python -m pytest tests/ -v             # Run test suite
```

## Configuration

Echo uses a flexible YAML configuration system:

```yaml
# config/user_config.yaml
schedule:
  wake_time: "06:00"
  sleep_time: "22:00"
  
projects:
  echo:
    name: "Echo Development"
    status: "active"
    focus_areas: ["frontend", "backend", "analytics"]

email:
  important_senders:
    - "manager@company.com"
    - "client@company.com"
  urgent_keywords:
    - "urgent"
    - "deadline" 
    - "asap"
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests with coverage
python -m pytest tests/ --cov=echo --cov-report=html

# Run specific components
python -m pytest tests/test_analytics.py -v
python -m pytest tests/test_planning.py -v
```

## Development Status

**Current Version**: Production-ready core system with comprehensive web interface

**Recently Completed:**
- Status-aware Today page with real-time progress tracking
- Complete backend integration with caching optimization
- Session management infrastructure with note-taking
- Email integration with Microsoft Graph API
- LLM-powered planning with two-stage architecture

**Roadmap:**
- Mobile-responsive design enhancements
- Advanced analytics visualizations
- Team collaboration features
- Calendar sync integrations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)  
3. Run tests (`python -m pytest tests/ -v`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.