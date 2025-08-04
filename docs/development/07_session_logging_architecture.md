# Robust Session Logging Architecture

## Overview
Enhanced session logging that integrates with external tools and prevents LLM hallucination by using structured, factual data.

## Canonical Session Log Format

### Session Log Structure
```yaml
session_id: "2025-07-19-echo-dev-001"
project: "Echo Development"
start_time: "2025-07-19T09:00:00Z"
end_time: "2025-07-19T10:30:00Z"
duration_minutes: 90
block_label: "Echo | Session Logging Architecture"

# User-provided content
user_notes: |
  Working on session logging architecture.
  Need to integrate with external tools.
  Want to prevent LLM hallucination.

# External tool integrations
external_logs:
  - tool: "git"
    data:
      commits: ["feat: add session logging", "fix: emoji handling"]
      files_changed: ["echo/session.py", "echo/models.py"]
      lines_added: 45
      lines_deleted: 12
  
  - tool: "browser"
    data:
      tabs_opened: ["github.com/echo", "docs.swift.org"]
      time_on_sites: {"github.com": 1200, "docs.swift.org": 600}
  
  - tool: "ide"
    data:
      files_edited: ["echo/session.py", "echo/models.py"]
      time_in_files: {"echo/session.py": 1800, "echo/models.py": 900}
      functions_created: ["log_session", "parse_external_data"]
  
  - tool: "calendar"
    data:
      meetings: ["Standup 09:15-09:30"]
      interruptions: 1
  
  - tool: "manual"
    data:
      tasks_completed: ["Session logging design", "External tool research"]
      tasks_started: ["Git integration", "Browser tracking"]
      blockers: ["Need to research browser APIs"]

# LLM analysis (factual, not hallucinated)
llm_analysis:
  actual_accomplishments:
    - "Designed session logging architecture"
    - "Researched external tool integration"
    - "Created data structures for session logs"
  
  productivity_metrics:
    - "90 minutes focused work"
    - "2 commits with 45 lines added"
    - "3 files actively edited"
  
  context_for_next_session:
    - "Continue with git integration implementation"
    - "Research browser extension APIs"
    - "Implement manual task tracking"

# No hallucination zone - only factual data
no_hallucination_rules:
  - "Only include data from external tools"
  - "No assumptions about what was accomplished"
  - "No predictions about future work"
  - "No subjective assessments"
```

## External Tool Data Integration

### Manual Data Entry Approach
Users can paste summaries from external tools during session end prompts. The system will parse and integrate this data.

### 1. Git Summary Entry
```python
def prompt_for_git_summary():
    """Prompt user to paste git activity summary."""
    return {
        "prompt": "Paste your git activity summary (commits, files changed, etc.):",
        "example": """
        Commits: feat: add session logging, fix: emoji handling
        Files: echo/session.py, echo/models.py
        Lines: +45, -12
        Branch: feature/session-logging
        """
    }
```

### 2. Browser Summary Entry
```python
def prompt_for_browser_summary():
    """Prompt user to paste browser activity summary."""
    return {
        "prompt": "Paste your browser activity summary (tabs, time spent, etc.):",
        "example": """
        Tabs: github.com/echo, docs.swift.org, stackoverflow.com
        Time: 20min on GitHub, 10min on docs
        Searches: "session logging architecture", "swiftui external tools"
        """
    }
```

### 3. IDE Summary Entry
```python
def prompt_for_ide_summary():
    """Prompt user to paste IDE activity summary."""
    return {
        "prompt": "Paste your IDE activity summary (files edited, functions, etc.):",
        "example": """
        Files: echo/session.py, echo/models.py, tests/test_session.py
        Functions: log_session(), parse_external_data(), validate_session()
        Time: 45min in session.py, 30min in models.py
        """
    }
```

### 4. Calendar Summary Entry
```python
def prompt_for_calendar_summary():
    """Prompt user to paste calendar activity summary."""
    return {
        "prompt": "Paste your calendar activity summary (meetings, interruptions, etc.):",
        "example": """
        Meetings: Standup 09:15-09:30, 1:1 with Sam 14:00-14:30
        Interruptions: 2 (Slack messages, phone call)
        Breaks: Lunch 12:00-12:30
        """
    }
```

### 5. Manual Task Entry
```python
def prompt_for_manual_summary():
    """Prompt user for manual task and activity summary."""
    return {
        "prompt": "What did you accomplish? What did you start? Any blockers?",
        "example": """
        Completed: Session logging design, External tool research
        Started: Git integration implementation, Browser tracking research
        Blockers: Need to research browser extension APIs
        Energy: High focus, good flow
        """
    }
```

## Anti-Hallucination Measures

### 1. Structured Data Only
- **No free-form LLM generation** about accomplishments
- **Only factual data** from external tools
- **User verification** of any LLM analysis

### 2. Data Validation
```python
def validate_session_data(session_data):
    """Ensure session data is factual and complete."""
    required_fields = ["start_time", "end_time", "project"]
    external_data_sources = ["git", "browser", "ide", "calendar"]
    
    # Validate required fields
    for field in required_fields:
        if field not in session_data:
            raise ValidationError(f"Missing required field: {field}")
    
    # Ensure at least one external data source
    if not any(source in session_data["external_logs"] for source in external_data_sources):
        raise ValidationError("No external data sources found")
    
    return True
```

### 3. LLM Analysis Constraints
```python
def analyze_session_facts(session_data):
    """Analyze session using only factual data."""
    prompt = f"""
    Analyze this session using ONLY the provided factual data.
    Do NOT make assumptions or predictions.
    
    Session Data: {session_data}
    
    Provide analysis of:
    1. What was actually accomplished (based on external data)
    2. Productivity metrics (time, commits, files)
    3. Context for next session (based on started tasks)
    
    Rules:
    - Only use data from external_logs
    - No assumptions about what was "accomplished"
    - No predictions about future work
    - No subjective assessments
    """
    
    return call_llm_with_constraints(prompt)
```

## Implementation Plan

### Phase 1: Basic Integration
- [ ] Git activity capture
- [ ] Manual task entry
- [ ] Session log structure
- [ ] Anti-hallucination validation

### Phase 2: Enhanced Tools
- [ ] Browser activity capture
- [ ] IDE integration
- [ ] Calendar integration
- [ ] LLM analysis constraints

### Phase 3: Advanced Features
- [ ] Cross-tool correlation
- [ ] Productivity insights
- [ ] Pattern recognition
- [ ] Export capabilities

## CLI Integration

### New Commands
```bash
echo session start <project>  # Start session with tracking
echo session end              # End session and capture data
echo session log <tool>       # Manually log tool activity
echo session analyze          # Analyze session with LLM
echo session export           # Export session data
```

### Session Workflow
```bash
# Start session
echo session start "Echo Development"

# Work normally (tools auto-capture)

# End session
echo session end

# Review and add manual notes
echo session log manual

# Get factual analysis
echo session analyze
```

## Benefits

### For Users
- **Accurate tracking**: Factual session data
- **Rich context**: Multiple tool integrations
- **No hallucination**: Only real data
- **Better insights**: Cross-tool correlation

### For Echo
- **Reliable data**: Factual session information
- **Rich analytics**: Multiple data sources
- **User trust**: No false accomplishments
- **Better planning**: Real productivity patterns 