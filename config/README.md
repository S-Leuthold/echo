# 🔧 Echo Configuration System

The Echo configuration system is a powerful YAML-based framework that defines your personal scheduling preferences, routines, and project context. This system enables Echo's AI planning engine to generate intelligent, personalized schedules that respect your constraints and optimize for your productivity patterns.

## 📁 Configuration Files

### Core Configuration
- **`user_config.yaml`** - Main configuration file containing all scheduling rules
- **`.token`** - Secure OAuth token storage (auto-managed)
- **`config_schema.md`** - Comprehensive schema documentation

## 🏗️ Configuration Structure

### 1. Defaults Section
```yaml
defaults:
  wake_time: 07:00
  sleep_time: '22:00'
```

Defines your daily structure and fundamental timing preferences:
- **wake_time**: Your typical wake-up time
- **sleep_time**: Your target bedtime (quoted to preserve YAML string format)

### 2. Weekly Schedule
```yaml
weekly_schedule:
  monday:
    anchors:
      - time: "05:30–06:00"
        category: personal
        task: Morning Reading
        description: 'I like to start the day by reading some non-fiction for about 30 minutes.'
    fixed: []
    flex:
      - time: "12:30–13:00"
        category: meals
        task: Lunch
```

The heart of Echo's scheduling system, defining day-specific routines:

#### Anchors
Non-negotiable time blocks that form the backbone of your day:
- **Time ranges**: Use en-dash format (05:30–06:00) for precise scheduling
- **Categories**: personal, exercise, meals, work, transit
- **Rich descriptions**: Context for AI planning optimization
- **Recurring patterns**: Same anchors can repeat across multiple days

#### Fixed Events
Scheduled appointments and meetings:
- **Specific commitments**: Doctor appointments, meetings, calls
- **External constraints**: Events you cannot reschedule
- **Project-specific**: Time blocks dedicated to specific deliverables

#### Flex Time
Adaptable blocks for focused work:
- **Flexible scheduling**: Can be moved within reasonable bounds
- **Category-based**: Grouped by type of work (meetings, deep work, admin)
- **Duration preferences**: Minimum and maximum time allocations

### 3. Projects System
```yaml
projects:
  echo:
    name: Echo Development
    status: active
    current_focus: Email integration testing
  personal:
    name: Personal Projects  
    status: active
    current_focus: General productivity
```

Project metadata that informs AI planning and prioritization:
- **Project lifecycle**: active, on-hold, backlog, completed
- **Current focus**: What you're working on right now
- **Context integration**: Projects influence task prioritization and time allocation

### 4. Profiles System
```yaml
profiles:
  default:
    name: Default Profile
    overrides: {}
  travel:
    name: Travel Mode
    overrides:
      wake_time: 08:00
      weekly_schedule:
        monday:
          anchors: []  # Simplified schedule when traveling
```

Named configuration overrides for different life contexts:
- **Situational adjustments**: Travel, vacation, busy periods
- **Temporary changes**: Override any part of your default config
- **Quick switching**: Activate profiles via CLI commands

## 🌍 Environment Variables

Echo uses environment variables for system configuration, API keys, and feature flags. These are managed through a `.env` file in the project root.

### Core Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit with your values:**
   ```bash
   # Required for basic operation
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   OPENAI_API_KEY=sk-your-openai-key-here
   SECRET_KEY=your-secret-key-here
   ```

3. **Generate secure keys:**
   ```bash
   # Generate SECRET_KEY
   openssl rand -hex 32
   ```

### Environment Variable Categories

#### 🔑 **Required Variables (Core Functionality)**

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key for planning engine | `sk-ant-api03-xxx` |
| `OPENAI_API_KEY` | OpenAI API key for email intelligence | `sk-xxx` |
| `SECRET_KEY` | Session encryption key | `openssl rand -hex 32` |

#### 📧 **Email Integration (Microsoft Graph)**

| Variable | Description | Required |
|----------|-------------|----------|
| `ECHO_GRAPH_CLIENT_ID` | Azure App Registration Client ID | Yes |
| `ECHO_GRAPH_CLIENT_SECRET` | Azure App Registration Secret | Yes |
| `ECHO_GRAPH_TENANT_ID` | Azure AD Tenant ID | Optional |
| `ECHO_GRAPH_REDIRECT_URI` | OAuth callback URL | Optional |

#### 🏗️ **System Configuration**

| Variable | Default | Description |
|----------|---------|-------------|
| `API_HOST` | `127.0.0.1` | API server host |
| `API_PORT` | `8000` | API server port |
| `ECHO_ENV` | `development` | Environment mode |
| `ECHO_DEBUG` | `true` | Enable debug logging |
| `ECHO_LOG_LEVEL` | `INFO` | Logging verbosity |

#### 📂 **Data & Storage**

| Variable | Default | Description |
|----------|---------|-------------|
| `CONFIG_PATH` | `config/user_config.yaml` | Main config file |
| `DATA_DIR` | `data` | Database directory |
| `LOG_DIR` | `runtime/logs` | Log files directory |
| `DATABASE_URL` | `sqlite:///data/session_intelligence.db` | Main database |

#### 🔒 **Security & CORS**

| Variable | Description | Production Value |
|----------|-------------|------------------|
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://your-domain.com` |
| `ALLOWED_METHODS` | HTTP methods | `GET,POST,PUT,DELETE` |
| `JWT_SECRET` | JWT signing secret | Generated secure key |
| `TOKEN_EXPIRY_HOURS` | OAuth token refresh | `24` |

#### 🚀 **Performance & Caching**

| Variable | Default | Description |
|----------|---------|-------------|
| `REQUEST_TIMEOUT` | `30` | API timeout (seconds) |
| `MAX_CONCURRENT_REQUESTS` | `10` | Concurrent request limit |
| `RATE_LIMIT_PER_MINUTE` | `100` | API rate limiting |
| `REDIS_URL` | `redis://localhost:6379` | Cache backend |
| `ENABLE_CACHING` | `false` | Enable response caching |

#### 🧪 **Development & Testing**

| Variable | Default | Description |
|----------|---------|-------------|
| `HOT_RELOAD` | `true` | Enable hot reload |
| `API_DOCS` | `true` | Enable /docs endpoint |
| `MOCK_EMAIL_DATA` | `false` | Use mock email data |
| `MOCK_LLM_RESPONSES` | `false` | Use mock AI responses |
| `TEST_DATABASE_URL` | `sqlite:///data/test.db` | Test database |

#### 🎛️ **Feature Flags**

| Feature | Variable | Status |
|---------|----------|--------|
| Email Integration | `ENABLE_EMAIL_INTEGRATION` | ✅ Active |
| Project Management | `ENABLE_PROJECT_MANAGEMENT` | ✅ Active |
| Analytics | `ENABLE_ANALYTICS` | ✅ Active |
| Session Intelligence | `ENABLE_SESSION_INTELLIGENCE` | ✅ Active |
| Meeting Intelligence | `ENABLE_MEETING_INTELLIGENCE` | 🚧 Planned |
| Calendar Sync | `ENABLE_CALENDAR_SYNC` | 🚧 Planned |
| Team Collaboration | `ENABLE_TEAM_COLLABORATION` | 🚧 Future |

### Environment-Specific Configuration

#### Development Environment
```bash
ECHO_ENV=development
ECHO_DEBUG=true
API_HOST=127.0.0.1
HOT_RELOAD=true
API_DOCS=true
```

#### Production Environment
```bash
ECHO_ENV=production
ECHO_DEBUG=false
API_HOST=0.0.0.0
ALLOWED_ORIGINS=https://your-domain.com
SECRET_KEY=your-secure-key
```

#### Testing Environment
```bash
ECHO_ENV=testing
MOCK_EMAIL_DATA=true
MOCK_LLM_RESPONSES=true
TEST_DATABASE_URL=sqlite:///data/test.db
```

### Security Best Practices

1. **Never commit `.env` files** - they contain sensitive information
2. **Use strong, unique keys** - generate with `openssl rand -hex 32`
3. **Rotate keys regularly** - especially in production environments
4. **Limit CORS origins** - only allow necessary domains in production
5. **Use environment-specific values** - different configs for dev/staging/prod

### Troubleshooting Environment Variables

#### Common Issues

**Missing API Keys:**
```bash
# Error: ANTHROPIC_API_KEY not found
export ANTHROPIC_API_KEY=sk-ant-api03-your-key
# Or add to .env file
```

**CORS Errors:**
```bash
# Add frontend URL to allowed origins
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com
```

**Database Connection Errors:**
```bash
# Ensure data directory exists
mkdir -p data
# Check DATABASE_URL format
DATABASE_URL=sqlite:///data/session_intelligence.db
```

#### Validation Commands

```bash
# Check environment loading
python -c "from echo.config import validate_config; validate_config()"

# Test API connection
curl http://localhost:8000/health

# Verify email integration
python -m echo.cli check-token-status
```

### 5. Email Integration
```yaml
email:
  graph_api:
    client_id: ${ECHO_GRAPH_CLIENT_ID}
    client_secret: ${ECHO_GRAPH_CLIENT_SECRET}
    redirect_uri: ${ECHO_GRAPH_REDIRECT_URI}
    scopes:
      - Mail.Read
      - Mail.ReadWrite
      - User.Read
  important_senders:
    - ceo@company.com
    - manager@company.com
    - client@company.com
  urgent_keywords:
    - urgent
    - asap
    - deadline
  action_keywords:
    - please
    - can you
    - need
    - review
```

Email processing and prioritization rules:
- **OAuth Configuration**: Microsoft Graph API credentials
- **VIP Lists**: Important senders get priority in daily briefings
- **Keyword Detection**: Automatic urgency and action item extraction
- **Context Integration**: Email insights inform daily planning

## 🎯 Configuration Usage

### Daily Planning Integration
Your configuration drives Echo's AI planning in multiple ways:

1. **Time Constraints**: Anchors and fixed events create scheduling boundaries
2. **Project Context**: Active projects influence task prioritization
3. **Personal Patterns**: Wake/sleep times optimize energy-based scheduling
4. **Email Intelligence**: Important communications drive daily priorities

### Real-Time Configuration Loading
The Echo React application loads configuration dynamically:
```typescript
// Example: Loading today's schedule
const configResponse = await fetch('http://localhost:8000/config/load');
const userConfig = await configResponse.json();

const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
const todaySchedule = userConfig.weekly_schedule?.[today] || {};
```

### Configuration Validation
Echo validates your configuration automatically:
- **Time format checking**: Ensures proper time range formats
- **Category validation**: Verifies category consistency
- **Required fields**: Confirms all mandatory configuration is present
- **Conflict detection**: Identifies overlapping time blocks

## 🛠️ Configuration Management

### Manual Editing
Edit `user_config.yaml` directly with any text editor:
```bash
nano config/user_config.yaml  # Linux/macOS
notepad config\user_config.yaml  # Windows
```

### Web-Based Configuration (Coming Soon)
The Echo React application includes a configuration wizard:
- Visual calendar interface for anchor management
- Drag-and-drop time block editing
- Real-time validation and conflict detection
- Auto-save functionality

### CLI Configuration Tools
```bash
# View current configuration
python -m echo.cli config show

# Validate configuration
python -m echo.cli config validate

# Switch profiles
python -m echo.cli config profile travel
```

## 📊 Configuration Best Practices

### Anchor Design Principles
1. **Be Specific**: Include detailed descriptions for better AI planning
2. **Stay Realistic**: Don't over-schedule your day with too many anchors
3. **Build Buffers**: Allow transition time between major activities
4. **Consider Energy**: Place high-energy work during your peak hours

### Project Organization
1. **Keep Active Projects Focused**: Limit to 3-5 active projects maximum
2. **Update Current Focus**: Keep focus statements current and specific
3. **Use Descriptive Names**: Clear project names help AI planning
4. **Track Status Changes**: Update project status as work progresses

### Weekly Schedule Strategy
1. **Start Simple**: Begin with just 2-3 anchors per day
2. **Build Gradually**: Add complexity as you understand your patterns
3. **Different Day Types**: Weekdays vs weekends can have different structures
4. **Leave Flex Time**: Don't schedule every minute - leave room for adaptability

## 🔧 Advanced Configuration

### Environment Variables
Sensitive configuration uses environment variables:
```bash
# Required for email integration
export ECHO_GRAPH_CLIENT_ID="your-client-id"
export ECHO_GRAPH_CLIENT_SECRET="your-client-secret"
export ECHO_GRAPH_REDIRECT_URI="http://localhost:8000/auth/callback"
```

### Custom Categories
You can define custom categories for your specific workflow:
```yaml
# Example: Academic schedule
weekly_schedule:
  monday:
    anchors:
      - time: "09:00–10:30"
        category: teaching
        task: Lecture - Data Structures
      - time: "14:00–16:00"  
        category: research
        task: Lab Work
```

### Multi-Location Support
Different anchors for different locations:
```yaml
weekly_schedule:
  monday:
    anchors:
      - time: "08:15–08:45"
        category: transit
        task: Commute to Guild Row
        description: 'Riding my bike to work.'
      - time: "16:15–16:30"
        category: transit
        task: Commute to the Gym  
        description: 'Ride my bike to Midtown Fitness'
```

## 🚨 Troubleshooting

### Common Configuration Issues

1. **Time Format Errors**
   ```yaml
   # Wrong
   time: "5:30-6:00"
   
   # Correct  
   time: "05:30–06:00"  # Use en-dash and zero-padding
   ```

2. **YAML Syntax Issues**
   ```yaml
   # Wrong
   description: I can't do this
   
   # Correct
   description: 'I can''t do this'  # Escape quotes in YAML
   ```

3. **Category Inconsistency**
   Use consistent category names throughout your configuration

4. **Overlapping Time Blocks**
   Echo will warn about conflicts during validation

### Validation Commands
```bash
# Check configuration syntax
python -m echo.cli config validate

# View parsed configuration
python -m echo.cli config show

# Test email integration
python -m echo.cli test-connection
```

## 🔮 Future Enhancements

### Planned Features
- **Web Configuration Editor**: Visual interface for config management  
- **Template System**: Pre-built configuration templates
- **Configuration Sync**: Multi-device configuration synchronization
- **Advanced Profiles**: Seasonal and contextual profiles
- **Integration Configs**: Calendar sync, task manager integration

### Configuration Schema Evolution
The configuration schema is versioned and will evolve:
- **Backwards Compatibility**: Old configs continue working
- **Migration Tools**: Automatic schema updates
- **Extension Points**: Plugin system for custom configurations

---

**Configuration Version**: v2.1  
**Last Updated**: January 2025  
**Schema Documentation**: See `config_schema.md` for complete reference