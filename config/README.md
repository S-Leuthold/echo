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