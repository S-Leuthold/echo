# Echo - Intelligent Daily Planning & Time Tracking

Echo is an intelligent daily planning system that combines LLM-powered scheduling with robust time tracking and analytics. It helps you create structured daily schedules while maintaining detailed logs of your time allocation.

## 🚀 Features

### Core Planning
- **LLM-Powered Scheduling**: AI generates personalized daily schedules based on your priorities, energy levels, and constraints
- **Project Integration**: Automatically incorporates your active projects and milestones into planning
- **Smart Time Blocks**: Creates anchor (fixed), flex (movable), and fixed (appointments) time blocks
- **Canonical Format**: Uses "Project | Task" naming for consistent categorization

### Time Tracking & Analytics
- **The Time Ledger**: Comprehensive analytics engine tracking time by category and project
- **Daily Statistics**: Automatic calculation of time allocation with category breakdown
- **CSV Analytics**: Persistent storage of daily stats for trend analysis
- **Emoji Handling**: Smart cleaning of emojis from labels for consistent analytics

### Session Management
- **Session Tracking**: Track work sessions with notes and external tool integration
- **External Tool Data**: Capture Git activity, browser usage, IDE work, and calendar events
- **Anti-Hallucination**: Robust logging that prevents LLM from filling in missing data
- **Session Summaries**: Generate structured summaries of completed work sessions

### Project Management
- **Project Creation Wizard**: Interactive wizard to create projects for unassigned tasks
- **Project Context**: Rich project information including focus areas, milestones, and deadlines
- **Project Status Tracking**: Active, on-hold, backlog, and completed project states
- **Project Logs**: Persistent logs for each project with session summaries

### Configuration & Customization
- **YAML Configuration**: Flexible configuration system with defaults, projects, and profiles
- **Category Mapping**: Custom mappings from project names to time categories
- **Profile System**: Context-specific overrides for travel, holidays, etc.
- **Weekly Schedule Templates**: Pre-defined schedules for different days

## 🏗️ Architecture

### Core Components
- **`echo.cli`**: Main command-line interface and orchestration
- **`echo.scheduler`**: Generates base schedules from configuration
- **`echo.prompt_engine`**: LLM prompt construction and response parsing
- **`echo.analytics`**: Time tracking and analytics engine
- **`echo.session`**: Session state management and logging
- **`echo.config_loader`**: YAML configuration parsing and validation

### Data Models
- **`Block`**: Fundamental time unit with start/end times, labels, and types
- **`Config`**: Root configuration object with defaults, projects, and schedules
- **`Project`**: Project representation with status, milestones, and focus areas
- **`DailyStats`**: Analytics data structure for time allocation tracking

### File Structure
```
echo/
├── config/           # Configuration files
├── logs/            # Daily logs and session data
├── echo/            # Core Python modules
├── tests/           # Comprehensive test suite
├── dev/             # Development documentation
└── ios/             # SwiftUI iOS app (in development)
```

## 📦 Installation

### Prerequisites
- Python 3.11+
- OpenAI API key
- Virtual environment (recommended)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd echo

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up configuration
cp config/sample_config.yaml config/user_config.yaml
# Edit config/user_config.yaml with your settings
```

### Configuration
1. Copy `config/sample_config.yaml` to `config/user_config.yaml`
2. Add your OpenAI API key to the environment:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```
3. Customize your configuration:
   - Set your wake/sleep times
   - Add your active projects
   - Configure weekly schedule templates
   - Set up category mappings

## 🎯 Usage

### Daily Planning
```bash
# Generate today's schedule
python -m echo.cli plan

# Plan for a specific date
python -m echo.cli plan --date 2025-01-20

# Plan with specific priorities
python -m echo.cli plan --priority "Finish the Echo analytics feature"
```

### Session Tracking
```bash
# Start a work session
python -m echo.cli session start

# End current session with notes
python -m echo.cli session end --notes "Completed the analytics engine"

# View session history
python -m echo.cli session history
```

### Analytics
```bash
# View today's time allocation
python -m echo.cli analytics today

# View weekly trends
python -m echo.cli analytics weekly

# Export analytics data
python -m echo.cli analytics export
```

### Project Management
```bash
# Create a new project
python -m echo.cli project create

# List all projects
python -m echo.cli project list

# View project details
python -m echo.cli project show <project-id>
```

## 🧪 Testing

The project includes a comprehensive test suite covering all major functionality:

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test categories
python -m pytest tests/test_analytics.py -v
python -m pytest tests/test_prompt_engine.py -v

# Run with coverage
python -m pytest tests/ --cov=echo --cov-report=html
```

## 📱 iOS App (In Development)

A native SwiftUI iOS app is under development with:
- **Today View**: Current schedule display with progress tracking
- **Session View**: Work session management with external tool integration
- **Analytics View**: Rich time tracking visualizations
- **Projects View**: Project management and progress tracking

To run the iOS preview:
```bash
cd ios
swift run EchoPreview
```

## 🔮 Roadmap

### Phase 1: Core Features ✅
- [x] LLM-powered daily planning
- [x] Time tracking and analytics
- [x] Project management
- [x] Session logging
- [x] Configuration system

### Phase 2: Advanced Features 🚧
- [ ] **Journaling System**: Evening reflection and next-day planning
- [ ] **Robust Session Logging**: External tool integration (Git, browser, IDE)
- [ ] **Meeting Summarizer**: Pre-meeting prep and post-meeting summaries
- [ ] **Email Integration**: Daily summaries and project updates

### Phase 3: iOS App 🚧
- [ ] **Native iOS App**: SwiftUI-based mobile interface
- [ ] **Real-time Sync**: Cloud synchronization of data
- [ ] **Push Notifications**: Schedule reminders and session prompts
- [ ] **Widgets**: Home screen widgets for quick access

### Phase 4: Advanced Analytics 📊
- [ ] **Trend Analysis**: Long-term pattern recognition
- [ ] **Productivity Insights**: AI-powered productivity recommendations
- [ ] **Goal Tracking**: Milestone and deadline management
- [ ] **Team Collaboration**: Shared projects and team analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `python -m pytest tests/ -v`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with OpenAI GPT-4o for intelligent planning
- SwiftUI for the iOS interface
- YAML for flexible configuration
- CSV for lightweight analytics storage

---

**Echo** - Making daily planning intelligent and time tracking meaningful. 