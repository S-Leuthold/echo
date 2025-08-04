# Echo API Reference

The Echo FastAPI server provides a comprehensive REST API for intelligent daily planning, analytics, and configuration management. This document covers all available endpoints, request/response formats, and integration patterns.

## 🚀 Getting Started

### Base URL
```
http://localhost:8000
```

### Authentication
Most endpoints require no authentication. Email integration endpoints use OAuth 2.0 with Microsoft Graph API.

### Content Type
All requests expecting JSON should include:
```
Content-Type: application/json
```

## 📋 Core Endpoints

### Planning

#### `POST /plan`
Generate an intelligent daily schedule using AI planning.

**Request Body:**
```json
{
  "most_important": "Complete quarterly report",
  "todos": ["Review code", "Team meeting", "Update documentation"],
  "energy_level": "7",
  "non_negotiables": "Doctor appointment at 2 PM",
  "avoid_today": "Social media, unnecessary meetings",
  "fixed_events": [
    "05:30: Morning Reading (personal)",
    "07:10: Breakfast (meals)",
    "16:30: Strength Training (exercise)"
  ]
}
```

**Response:**
```json
{
  "blocks": [
    {
      "start": "05:30",
      "end": "06:00",
      "label": "Morning Reading",
      "icon": "BookOpen",
      "category": "personal",
      "type": "anchor",
      "note": "Start the day with non-fiction reading"
    },
    {
      "start": "08:45",
      "end": "10:00",
      "label": "Deep Work: Quarterly Report",
      "icon": "FileText",
      "category": "work",
      "type": "flex",
      "note": "Priority task - most important item"
    }
  ],
  "metadata": {
    "generated_at": "2025-01-23T10:30:00Z",
    "total_blocks": 8,
    "work_hours": 6.5,
    "break_time": 1.5
  }
}
```

#### `GET /today`
Get today's current plan and execution status.

**Response:**
```json
{
  "date": "2025-01-23",
  "blocks": [...],  // Same format as /plan
  "completion_rate": 0.75,
  "current_block": {
    "start": "10:00",
    "end": "11:30",
    "label": "Team Meeting",
    "status": "in_progress"
  }
}
```

### Analytics

#### `GET /analytics`
Retrieve comprehensive daily analytics and time tracking data.

**Query Parameters:**
- `date` (optional): Specific date in YYYY-MM-DD format
- `days` (optional): Number of days to include (default: 1)

**Response:**
```json
{
  "date": "2025-01-23",
  "total_time": 480,  // minutes
  "focus_time": 360,  // minutes of productive work
  "productivity_score": 85,  // percentage
  "categories": {
    "Deep Work": 240,
    "Meetings": 90,
    "Personal": 60,
    "Meals": 90
  },
  "projects": {
    "echo": 180,
    "quarterly_report": 150,
    "personal": 60
  },
  "hourly_breakdown": [
    {"hour": "09:00", "category": "Deep Work", "minutes": 60},
    {"hour": "10:00", "category": "Meetings", "minutes": 60}
  ]
}
```

#### `GET /analytics/trends`
Get trend analysis across multiple days.

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**
```json
{
  "period": "7_days",
  "avg_productivity": 82.3,
  "peak_hours": ["09:00", "10:00", "14:00"],
  "category_trends": {
    "Deep Work": {"trend": "increasing", "change": 15.2},
    "Meetings": {"trend": "stable", "change": -2.1}
  },
  "recommendations": [
    "Schedule more deep work during 9-11 AM peak hours",
    "Consider reducing meeting time on Wednesdays"
  ]
}
```

### Configuration

#### `GET /config/load`
Load current user configuration.

**Response:**
```json
{
  "defaults": {
    "wake_time": "07:00",
    "sleep_time": "22:00"
  },
  "weekly_schedule": {
    "monday": {
      "anchors": [
        {
          "time": "05:30–06:00",
          "category": "personal",
          "task": "Morning Reading",
          "description": "Start the day by reading non-fiction"
        }
      ],
      "fixed": [],
      "flex": [
        {
          "time": "12:30–13:00",
          "category": "meals",
          "task": "Lunch"
        }
      ]
    }
  },
  "projects": {
    "echo": {
      "name": "Echo Development",
      "status": "active",
      "current_focus": "API documentation"
    }
  },
  "profiles": {
    "default": {
      "name": "Default Profile",
      "overrides": {}
    }
  }
}
```

#### `POST /config/save`
Save user configuration changes.

**Request Body:**
```json
{
  "weekly_schedule": {
    "monday": {
      "anchors": [...],
      "fixed": [...],
      "flex": [...]
    }
  },
  "projects": {...},
  "profiles": {...}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration saved successfully",
  "timestamp": "2025-01-23T10:30:00Z"
}
```

#### `GET /config/validate`
Validate current configuration for errors.

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    "Monday has overlapping time blocks: 12:00-13:00 and 12:30-13:30"
  ],
  "suggestions": [
    "Consider adding buffer time between gym and dinner"
  ]
}
```

### Context Intelligence

#### `GET /context-briefing`
Get intelligent daily briefing combining email, calendar, and session data.

**Response:**
```json
{
  "date": "2025-01-23",
  "sections": {
    "email": "3 urgent emails require attention: quarterly budget review from Sarah (due Friday), client feedback on MVP (needs response today), and team standup agenda items. Estimated time: 45 minutes.",
    "calendar": "Two fixed meetings today: 10 AM team sync (30 min) and 2 PM client call (60 min). No conflicts with your anchors.",
    "sessions": "Yesterday's deep work session on API documentation was highly productive (3.2 hours). Continue momentum on technical writing during 9-11 AM peak focus window.",
    "reminders": "Quarterly report deadline is Friday. Budget review meeting prep needed by Thursday morning."
  },
  "priority_actions": [
    {
      "task": "Respond to client MVP feedback",
      "urgency": "high",
      "estimated_time": 20,
      "context": "Client is waiting for response on UI changes"
    },
    {
      "task": "Prepare budget review materials",
      "urgency": "medium", 
      "estimated_time": 45,
      "context": "Meeting with Sarah on Friday"
    }
  ],
  "insights": {
    "energy_forecast": "High energy morning based on sleep data",
    "workload_assessment": "Heavy day - consider moving non-urgent items",
    "focus_recommendation": "Block 9-11 AM for quarterly report work"
  }
}
```

## 📧 Email Integration

### `GET /email/summary`
Get intelligent email summary and action items.

**Query Parameters:**
- `hours` (optional): Hours to look back (default: 24)
- `priority_only` (optional): Only show priority emails (default: false)

**Response:**
```json
{
  "summary": {
    "total_emails": 12,
    "unread_count": 5,
    "priority_count": 3,
    "action_items": 4
  },
  "conversations": [
    {
      "id": "conv_123",
      "subject": "Q1 Budget Review",
      "participants": ["sarah@company.com", "you@company.com"],
      "last_message": "2025-01-23T08:30:00Z",
      "priority": "high",
      "action_required": true,
      "summary": "Sarah needs budget projections by Friday",
      "estimated_time": 30
    }
  ],
  "action_items": [
    {
      "task": "Prepare Q1 budget projections",
      "deadline": "2025-01-25",
      "estimated_time": 45,
      "related_emails": ["conv_123"]
    }
  ]
}
```

### `POST /auth/oauth/initiate`
Initiate OAuth flow for email integration.

**Response:**
```json
{
  "auth_url": "https://login.microsoftonline.com/oauth2/v2.0/authorize?client_id=...",
  "state": "random_state_string"
}
```

### `POST /auth/oauth/callback`
Handle OAuth callback and store tokens.

**Request Body:**
```json
{
  "code": "authorization_code_from_callback",
  "state": "random_state_string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "expires_at": "2025-01-24T10:30:00Z"
}
```

## 📊 Session Management

### `POST /session/start`
Start a new work session.

**Request Body:**
```json
{
  "project": "echo",
  "task": "API documentation",
  "category": "development",
  "estimated_duration": 120  // minutes
}
```

**Response:**
```json
{
  "session_id": "sess_456",
  "started_at": "2025-01-23T10:30:00Z",
  "project": "echo",
  "task": "API documentation"
}
```

### `POST /session/end`
End the current work session.

**Request Body:**
```json
{
  "session_id": "sess_456",
  "notes": "Completed API reference documentation. Ready for review.",
  "completion_status": "completed"
}
```

**Response:**
```json
{
  "session_id": "sess_456",
  "duration": 95,  // actual minutes worked
  "completed_at": "2025-01-23T12:05:00Z",
  "productivity_score": 8.5
}
```

### `GET /sessions`
Get session history and analytics.

**Query Parameters:**
- `days` (optional): Days to look back (default: 7)
- `project` (optional): Filter by project name

**Response:**
```json
{
  "sessions": [
    {
      "id": "sess_456",
      "project": "echo",
      "task": "API documentation",
      "started_at": "2025-01-23T10:30:00Z",
      "ended_at": "2025-01-23T12:05:00Z",
      "duration": 95,
      "productivity_score": 8.5
    }
  ],
  "summary": {
    "total_sessions": 5,
    "total_time": 420,  // minutes
    "avg_productivity": 7.8,
    "most_productive_hours": ["09:00", "10:00"]
  }
}
```

## 📝 Journal & Reflection

### `POST /journal/entry`
Create a new journal entry.

**Request Body:**
```json
{
  "type": "reflection",
  "content": {
    "brain_dump": "Today was productive but felt rushed...",
    "improvements": "Should have blocked more time for deep work",
    "gratitude": "Grateful for team collaboration on the new feature"
  },
  "mood": 7,
  "energy": 6
}
```

**Response:**
```json
{
  "entry_id": "journal_789",
  "created_at": "2025-01-23T22:00:00Z",
  "type": "reflection"
}
```

### `GET /journal/entries`
Retrieve journal entries with optional filtering.

**Query Parameters:**
- `days` (optional): Days to look back (default: 7)
- `type` (optional): Filter by entry type
- `search` (optional): Search in entry content

**Response:**
```json
{
  "entries": [
    {
      "id": "journal_789",
      "date": "2025-01-23",
      "type": "reflection",
      "mood": 7,
      "energy": 6,
      "content": {
        "brain_dump": "Today was productive but felt rushed...",
        "improvements": "Should have blocked more time for deep work",
        "gratitude": "Grateful for team collaboration"
      }
    }
  ],
  "patterns": {
    "avg_mood": 7.2,
    "avg_energy": 6.8,
    "common_themes": ["time management", "team collaboration", "deep work"]
  }
}
```

### `GET /insights`
Get AI-generated insights from journal data.

**Query Parameters:**
- `days` (optional): Days of data to analyze (default: 30)

**Response:**
```json
{
  "insights": {
    "productivity_patterns": "You're most productive during 9-11 AM sessions with 90+ minute blocks",
    "energy_trends": "Energy levels consistently drop after lunch - consider lighter afternoon tasks",
    "mood_correlations": "Higher mood scores correlate with completed morning routines",
    "improvement_opportunities": "Recurring theme of wanting more deep work time - consider blocking 2-hour morning sessions"
  },
  "recommendations": [
    {
      "category": "scheduling",
      "suggestion": "Block 9-11 AM for deep work daily",
      "impact": "high",
      "effort": "low"
    },
    {
      "category": "energy",
      "suggestion": "Schedule lighter tasks after 2 PM",
      "impact": "medium", 
      "effort": "low"
    }
  ],
  "metrics": {
    "analyzed_days": 30,
    "total_entries": 25,
    "pattern_confidence": 0.85
  }
}
```

## 🔧 System Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-23T10:30:00Z",
  "version": "1.0.0",
  "dependencies": {
    "openai_api": "connected",
    "email_api": "connected",
    "config_file": "loaded"
  }
}
```

### `GET /version`
Get API version information.

**Response:**
```json
{
  "version": "1.0.0",
  "build": "20250123.1030",
  "python_version": "3.11.0",
  "dependencies": {
    "fastapi": "0.104.1",
    "openai": "1.12.0",
    "pydantic": "2.5.0"
  }
}
```

## 🚨 Error Handling

All endpoints follow consistent error response format:

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: most_important",
    "details": {
      "field": "most_important",
      "expected_type": "string"
    }
  },
  "timestamp": "2025-01-23T10:30:00Z",
  "request_id": "req_123"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | External service down |

## 📋 Request Limits

- **Rate Limiting**: 100 requests per minute per IP
- **Request Size**: Maximum 10MB for file uploads
- **Response Size**: Maximum 50MB for large analytics queries
- **Timeout**: 30 seconds for AI planning requests

## 🔐 Security

### CORS Policy
```javascript
{
  "origins": ["http://localhost:3000", "https://echo.yourdomain.com"],
  "methods": ["GET", "POST", "PUT", "DELETE"],
  "headers": ["Content-Type", "Authorization"]
}
```

### Data Privacy
- Personal data is stored locally only
- Email tokens are encrypted at rest
- No analytics data is sent to external services
- Configuration files remain on user's machine

## 🚀 Integration Examples

### React Frontend Integration
```typescript
// Planning API integration
const generatePlan = async (planningData: PlanningRequest) => {
  const response = await fetch('http://localhost:8000/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planningData)
  });
  
  if (!response.ok) {
    throw new Error(`Planning failed: ${response.statusText}`);
  }
  
  return await response.json();
};

// Configuration loading
const loadConfig = async () => {
  const response = await fetch('http://localhost:8000/config/load');
  return await response.json();
};
```

### Python CLI Integration
```python
import requests

# Analytics retrieval
def get_analytics(days=7):
    response = requests.get(
        f'http://localhost:8000/analytics/trends?days={days}'
    )
    return response.json()

# Session management
def start_session(project, task):
    data = {'project': project, 'task': task}
    response = requests.post(
        'http://localhost:8000/session/start',
        json=data
    )
    return response.json()['session_id']
```

---

**API Version**: v1.0.0  
**Last Updated**: January 2025  
**Base URL**: http://localhost:8000