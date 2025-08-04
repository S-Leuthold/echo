# Echo

**AI-Powered Productivity & Planning System**

Echo is a sophisticated productivity platform that combines intelligent AI-driven scheduling with comprehensive analytics and project management. Built with modern web technologies and powered by Claude 4 and OpenAI models, Echo provides a seamless workflow from planning to execution and reflection.

## Core Features

### Intelligent Planning
- **AI-Generated Schedules**: Claude Opus 4-powered daily planning with context awareness
- **Four-Panel Intelligence**: Executive summaries, email categorization, session insights, and deadline tracking
- **Email Integration**: Microsoft Graph API integration with OAuth 2.0 authentication
- **Smart Time Allocation**: Energy-based scheduling with anchor, flex, and fixed block types

### Project Management
- **Adaptive Coaching**: Conversational AI project creation with domain-specific expertise
- **Portfolio Analytics**: Activity heatmaps, progress tracking, and momentum analysis
- **AI Roadmaps**: Automated milestone generation and project timeline planning
- **File Integration**: Document uploads and association with projects

### Session Intelligence
- **Real-Time Tracking**: Live progress monitoring with session state management
- **Scaffold Generation**: AI-powered session context and goal setting
- **Note-Taking**: Structured session documentation with anti-hallucination measures
- **Analytics Integration**: Time categorization and productivity scoring

### Advanced Analytics
- **Comprehensive Metrics**: Category breakdowns, productivity patterns, and trend analysis
- **Visualization**: Interactive charts, heatmaps, and timeline views
- **Export Capabilities**: CSV/JSON data export for external analysis
- **Insight Generation**: AI-powered pattern recognition and recommendations

## Technical Architecture

### Backend (Python + FastAPI)
- **FastAPI Framework**: High-performance async API server
- **Modular Design**: Router-based architecture with clear separation of concerns
- **AI Integration**: Multi-model approach with Claude 4, Sonnet 4, and OpenAI
- **Data Layer**: SQLite databases with YAML configuration management

### Frontend (Next.js + TypeScript)
- **Modern Stack**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui components
- **Responsive Design**: Optimized for desktop and mobile experiences
- **Real-Time Updates**: Live progress tracking and session management
- **Type Safety**: End-to-end TypeScript with Zod validation

### AI Models
- **Claude Opus 4**: Strategic planning and complex reasoning tasks
- **Claude Sonnet 4**: Structured processing and conversation management
- **OpenAI API**: Data extraction and specialized intelligence tasks

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys for OpenAI and Anthropic
- Microsoft Azure app registration (optional, for email features)

### Installation

1. **Backend Setup**
   ```bash
   git clone <repository-url>
   cd echo
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

3. **Configuration**
   ```bash
   # Create environment file
   export OPENAI_API_KEY="your-openai-key"
   export ANTHROPIC_API_KEY="your-anthropic-key"
   export ECHO_GRAPH_CLIENT_ID="your-azure-client-id"  # Optional
   export ECHO_GRAPH_CLIENT_SECRET="your-azure-secret"  # Optional
   
   # Configure user settings
   cp config/sample_config.yaml config/user_config.yaml
   # Edit config/user_config.yaml with your preferences
   ```

4. **Launch System**
   ```bash
   # Terminal 1: Start API server
   python api_server.py
   
   # Terminal 2: Start web interface
   cd frontend && npm run dev
   ```

5. **Access Application**
   - Web Interface: http://localhost:3000
   - API Documentation: http://localhost:8000/docs

## Usage Workflow

### Daily Planning
1. **Morning Context**: Review four-panel intelligence briefing with email, sessions, and deadlines
2. **Plan Generation**: Create AI-powered schedule based on priorities and energy levels
3. **Session Execution**: Start work sessions with scaffolded context and real-time tracking
4. **Evening Reflection**: Complete structured review and generate insights for tomorrow

### Project Management
1. **Conversational Creation**: Use adaptive coaching wizard for natural project setup
2. **AI Enhancement**: Generate roadmaps, milestones, and progress tracking
3. **Activity Monitoring**: Track engagement through heatmaps and analytics
4. **Portfolio Analysis**: Review metrics and momentum across all projects

### Analytics & Insights
1. **Time Tracking**: Automatic categorization of work sessions and activities
2. **Pattern Recognition**: AI analysis of productivity trends and energy patterns
3. **Export & Analysis**: Export data for external reporting and trend analysis
4. **Optimization**: Receive AI-powered recommendations for workflow improvements

## Configuration

Echo uses a flexible YAML-based configuration system:

```yaml
defaults:
  wake_time: "05:30"
  sleep_time: "22:00"
  work_hours_start: "09:00"
  work_hours_end: "17:00"

weekly_schedule:
  monday:
    anchors:
      - time: "05:30"
        task: "Morning Routine"
    fixed:
      - time: "14:00"
        task: "Team Meeting"

projects:
  - name: "Echo Development"
    status: "active"
    type: "software"
    focus_areas: ["frontend", "backend", "ai-integration"]

email:
  important_senders:
    - "manager@company.com"
  urgent_keywords:
    - "urgent"
    - "deadline"
    - "asap"
```

## API Reference

The system provides a comprehensive REST API with the following endpoints:

- **Planning**: `/plan-v2`, `/context-briefing`, `/today`
- **Projects**: `/projects`, `/projects/{id}`, `/projects/analyze-conversation`
- **Conversations**: `/conversations`, `/conversations/{id}/message`
- **Analytics**: `/analytics`, `/analytics/export`
- **Session Intelligence**: `/scaffolds/generate`, `/scaffolds/block/{id}`
- **Email**: `/email/summary`, `/email/process`

Full API documentation available at `/docs` when running the server.

## Testing

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=echo --cov-report=html

# Frontend tests
cd frontend && npm test

# End-to-end tests
cd frontend && npx playwright test
```

## Development

### Project Structure
```
echo/
├── echo/                    # Python backend modules
├── frontend/                # Next.js web application
├── config/                  # Configuration files
├── data/                    # SQLite databases
├── tests/                   # Test suites
├── docs/                    # Documentation
└── api_server.py           # FastAPI entry point
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Run the full test suite
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Echo** - Intelligent productivity through AI-powered planning and analytics.