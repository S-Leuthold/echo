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
- **Session Tracking**: Track work sessions with notes and manual data entry
- **External Tool Data**: Paste summaries from Git, browser, IDE, and calendar
- **Anti-Hallucination**: Robust logging that prevents LLM from filling in missing data
- **Session Summaries**: Generate structured summaries of completed work sessions

### Project Management
- **Project Creation Wizard**: Interactive wizard to create projects for unassigned tasks
- **Project Context**: Rich project information including focus areas, milestones, and deadlines
- **Project Status Tracking**: Active, on-hold, backlog, and completed project states
- **Project Logs**: Persistent logs for each project with session summaries

### Email Integration & Planning
- **Email Processing**: Microsoft Graph API integration for Outlook email processing
- **Response Tracking**: Automatically tracks which emails have been responded to
- **Action Item Extraction**: LLM-powered extraction of actionable items from emails
- **Priority Filtering**: Filters emails by important senders, urgent keywords, and action keywords
- **Planning Integration**: Email action items automatically incorporated into daily planning
- **End-of-Day Workflow**: Process emails and plan tomorrow with email context
- **Morning Check-in**: Review overnight emails and adjust today's plan

### Journaling & Reflection
- **Evening Reflection**: Structured daily reflection with guided prompts
- **Quick Notes**: Simple journal entries for capturing thoughts and ideas
- **Journal Search**: Search through historical journal entries
- **Pattern Recognition**: Identify trends and patterns in your reflections
- **Planning Integration**: Evening reflections inform next-day planning

### Configuration & Customization
- **YAML Configuration**: Flexible configuration system with defaults, projects, and profiles
- **Category Mapping**: Custom mappings from project names to time categories
- **Profile System**: Context-specific overrides for travel, holidays, etc.
- **Weekly Schedule Templates**: Pre-defined schedules for different days

### CLI Commands
- **`plan`**: Generate daily plan with email integration
- **`end_day`**: End-of-day workflow with email processing and tomorrow planning
- **`morning`**: Morning check-in with overnight email review
- **`email_summary`**: Generate daily email summary
- **`oauth_login`**: Microsoft OAuth authentication for email integration

## 🏗️ Architecture

### Core Components
- **`echo.cli`**: Main command-line interface and orchestration
- **`echo.scheduler`**: Generates base schedules from configuration
- **`echo.prompt_engine`**: LLM prompt construction and response parsing
- **`echo.analytics`**: Time tracking and analytics engine
- **`echo.session`**: Session state management and logging
- **`echo.journal`**: Journal entry storage and retrieval
- **`echo.config_loader`**: YAML configuration parsing and validation

### Data Models
- **`Block`**: Fundamental time unit with start/end times, labels, and types
- **`Config`**: Root configuration object with defaults, projects, and schedules
- **`Project`**: Project representation with status, milestones, and focus areas
- **`DailyStats`**: Analytics data structure for time allocation tracking
- **`JournalEntry`**: Journal entry with structured reflection data

### File Structure
```
echo/
├── config/           # Configuration files
├── logs/            # Daily logs and session data
├── refs/            # Journal entries and reflections
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
python -m echo.cli start

# End current session with notes
python -m echo.cli end

# View session history
python -m echo.cli session history
```

### Analytics
```bash
# View time allocation analytics
python -m echo.cli analytics

# View specific number of days
python -m echo.cli analytics --days 14
```

## Journal & Reflection

Echo includes a comprehensive journaling system for evening reflection and planning:

```bash
# Complete end-of-day workflow: reflection + tomorrow planning
echo end_day

# Morning check-in workflow: load and validate today's plan
echo morning

# Evening reflection with planning context
echo journal evening

# Quick journal notes
echo journal quick

# Search journal entries
echo journal search

# View journal insights
echo journal insights
```

### Complete Day Cycle

Echo provides a seamless day cycle from evening to morning:

#### **Evening Workflow** (`echo end_day`)
1. **Evening Reflection** (12 prompts):
   - Daily reflection questions (what went well, challenges, learnings)
   - Energy and mood assessment
   - Pattern recognition
   - Tomorrow planning questions (priorities, focus, energy prediction)
   - Non-negotiables and things to avoid

2. **Automatic Tomorrow Planning**:
   - Uses your reflection insights to generate tomorrow's schedule
   - Analyzes recent energy and mood trends
   - Creates a personalized plan based on your patterns
   - Saves and pushes the plan to your calendar

#### **Morning Workflow** (`echo morning`)
1. **Plan Loading**: Automatically loads yesterday's evening plan
2. **Morning Assessment**: Energy, mood, and readiness evaluation
3. **Plan Validation**: Option to adjust the plan based on morning energy
4. **Smart Adjustments**: LLM-powered plan modifications based on current state
5. **Ready to Execute**: Seamless transition to work sessions

This creates the perfect **evening reflection → morning execution** cycle.

### End of Day Workflow

The `echo end_day` command provides a seamless end-of-day experience:

1. **Evening Reflection** (12 prompts):
   - Daily reflection questions (what went well, challenges, learnings)
   - Energy and mood assessment
   - Pattern recognition
   - Tomorrow planning questions (priorities, focus, energy prediction)
   - Non-negotiables and things to avoid

2. **Automatic Tomorrow Planning**:
   - Uses your reflection insights to generate tomorrow's schedule
   - Analyzes recent energy and mood trends
   - Creates a personalized plan based on your patterns
   - Saves and pushes the plan to your calendar

This creates the perfect evening workflow: **reflection → planning → ready for tomorrow**.

### Morning Check-In Workflow

The `echo morning` command provides a smart morning experience:

1. **Plan Loading**: Automatically loads yesterday's evening plan
2. **Morning Assessment**: 
   - Energy level evaluation
   - Mood assessment
   - Readiness rating (1-10)
3. **Smart Adjustments**: 
   - Option to adjust plan based on morning energy
   - LLM-powered modifications for optimal performance
   - Maintains work volume while optimizing timing
4. **Ready to Execute**: Seamless transition to work sessions

This completes the cycle: **evening planning → morning validation → execution**.

### Evening Reflection Workflow

The enhanced evening reflection (`echo journal evening`) guides you through 12 comprehensive prompts:

1. **Daily Reflection** (6 prompts):
   - What went well today?
   - What challenges did you face?
   - What did you learn today?
   - What was your energy level?
   - How would you describe your mood?
   - Any patterns you noticed?

2. **Tomorrow Planning** (6 prompts):
   - What are your top 3 priorities for tomorrow?
   - What should be your main focus tomorrow?
   - What's your energy prediction for tomorrow?
   - Any non-negotiables for tomorrow?
   - What should you avoid tomorrow?
   - Any context for tomorrow?

After completing the reflection, Echo automatically offers to plan tomorrow using your insights and recent patterns.

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
python -m pytest tests/test_journal.py -v

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

## Roadmap

### ✅ Phase 1: Core Journaling System (Complete)
- [x] Journal entry data models and storage
- [x] Evening reflection and quick note creation
- [x] Journal search and retrieval
- [x] CLI commands for journaling workflows
- [x] Comprehensive test coverage

### ✅ Phase 2A: Enhanced Evening Reflection & Planning Bridge (Complete)
- [x] Enhanced evening reflection with 12 comprehensive prompts
- [x] Planning context extraction from reflections
- [x] Energy and mood trend analysis
- [x] Tomorrow planning with journal context
- [x] Automatic planning integration in evening workflow
- [x] Journal-aware planning prompts
- [x] Comprehensive test coverage for new functionality

### ✅ Phase 2B: Morning Workflow Integration (Complete)
- [x] Morning check-in workflow (`echo morning`)
- [x] Load and validate previous evening's plan
- [x] Morning energy and mood assessment
- [x] Smart plan adjustments based on morning state
- [x] LLM-powered plan modifications
- [x] Seamless morning session start
- [x] Complete evening-to-morning cycle

## **Phase 2C: LLM-Generated Insights** ✅

**Status: Complete**

### **New Commands:**
- `echo insights [--days 30]` - Generate comprehensive insights from journal data
- `echo productivity [--days 14]` - Detailed productivity analysis
- `echo insight_summary [--days 30]` - Quick summary of key insights

### **Features:**
- **Pattern Recognition**: Identifies recurring energy, mood, and productivity patterns
- **Productivity Insights**: Discovers what works well and what doesn't
- **Actionable Recommendations**: Provides specific, prioritized improvement suggestions
- **Energy & Mood Analysis**: Detailed analysis of energy management and mood impact
- **Optimization Plans**: Short-term and long-term improvement strategies

### **Example Usage:**
```bash
# Generate insights from last 30 days
echo insights

# Detailed productivity analysis from last 14 days
echo productivity --days 14

# Quick summary of key patterns
echo insight_summary
```

### **Sample Output:**
```
📊 **Pattern Recognition**
✅ Alternating high and medium energy levels (every other day)

💡 **Productivity Insights**
🔍 High energy days correlate with better productivity
   Evidence: Consistent pattern of high energy on even days

🎯 **Top Recommendations**
🔥 Schedule important tasks on high energy days (Priority: high)
   Rationale: Better performance on high energy days
```

---

## **Phase 3: Advanced Integrations** 🚧
- [ ] macOS app with notifications
- [ ] Mobile companion app
- [ ] Advanced analytics and reporting
- [ ] Integration with external tools 

## Outlook Email Integration (Microsoft Graph API)

Echo now supports secure, modern email integration using Microsoft Graph API and OAuth 2.0.

### Setup
1. Register an app in the Azure Portal and obtain your Application (client) ID and client secret.
2. Set your redirect URI to `http://localhost:8080/auth/callback`.
3. In your `.env` file, add:
   ```
   ECHO_GRAPH_CLIENT_ID=your-client-id-here
   ECHO_GRAPH_CLIENT_SECRET=your-client-secret-here
   ECHO_GRAPH_REDIRECT_URI=http://localhost:8080/auth/callback
   ```
4. Run the OAuth login flow:
   ```bash
   python -m echo.cli oauth_login
   ```
   Follow the prompts to authenticate and save your token.

### Usage
- To fetch and display a summary of your recent emails:
  ```bash
  python -m echo.cli email_summary
  ```
- The summary will show the subject, sender, and received time for your most recent emails.

### Integration with Daily Planning
- Email summaries can be included in your daily planning and reflection workflows.
- You can extend the CLI or planning scripts to automatically fetch and summarize emails as part of your morning or evening routines.
- Action items and urgent emails can be surfaced for prioritization in your daily plan.

### **Configuration:**
```yaml
# config/user_config.yaml
email:
  outlook_access_token: ""  # Will be added via OAuth
  important_senders:
    - "ceo@company.com"
    - "manager@company.com"
    - "client@company.com"
  urgent_keywords:
    - "urgent"
    - "asap"
    - "deadline"
    - "important"
  action_keywords:
    - "please"
    - "can you"
    - "need"
    - "review"
    - "send"
    - "schedule"
```

### **Example Usage:**
```bash
# Get daily email summary
echo email_summary

# View pending action items
echo email_actions

# Check urgent items only
echo email_urgent

# Process new emails and extract actions
echo email_process
```

### **Sample Output:**
```
📊 **Email Summary for Monday, January 20**
==================================================
📧 Total Emails: 15
🚨 Urgent: 3
✅ Action Items: 7
📅 Meetings: 2
📈 Updates: 4
⏰ Deferred: 1

🚨 **Urgent Emails (3)**
==============================
  • ceo@company.com: Urgent: Project deadline
  • client@company.com: ASAP: Review needed
  • manager@company.com: Critical: Budget approval

✅ **Action Items (7)**
==============================
  🔥 ⏳ Review project report by Friday
     From: ceo@company.com | Subject: Urgent: Project deadline
  ⚡ ⏳ Schedule meeting next week
     From: manager@company.com | Subject: Meeting request
```

### **Integration Points:**
- **Morning Check-in**: Email summary included in morning workflow
- **Admin Blocks**: Email processing tasks added to admin time
- **End-of-Day**: Email processing status in evening reflection
- **Action Tracking**: Persistent action items until completion

---

## **Phase 3B: OAuth Integration** 🚧 