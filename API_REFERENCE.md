# Echo API Reference

## Base URL
```
http://localhost:8000
```

## Authentication
Currently, the API does not require authentication for most endpoints. OAuth 2.0 is used only for Microsoft Graph API integration.

## Response Format
All responses are JSON formatted with appropriate HTTP status codes.

## Table of Contents
- [Health & System](#health--system)
- [Configuration](#configuration)
- [Planning & Scheduling](#planning--scheduling)
- [Projects](#projects)
- [Conversations & Coaching](#conversations--coaching)
- [Analytics](#analytics)
- [Session Intelligence](#session-intelligence)
- [Email Integration](#email-integration)

---

## Health & System

### GET /health
Check system health and status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T10:00:00Z",
  "version": "1.0.0"
}
```

---

## Configuration

### GET /config
Retrieve user configuration settings.

**Response:**
```json
{
  "defaults": {
    "wake_time": "05:30",
    "sleep_time": "22:00",
    "work_hours_start": "09:00",
    "work_hours_end": "17:00"
  },
  "weekly_schedule": {
    "monday": {
      "anchors": [...]
    }
  },
  "projects": [...],
  "email": {
    "important_senders": [...],
    "action_keywords": [...]
  }
}
```

### POST /config/save
Save configuration from the wizard.

**Request Body:**
```json
{
  "wake_time": "05:30",
  "sleep_time": "22:00",
  "work_hours_start": "09:00",
  "work_hours_end": "17:00",
  "weekly_schedule": {...}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration saved successfully"
}
```

### GET /config/load
Load existing configuration or defaults.

**Response:**
```json
{
  "wake_time": "05:30",
  "sleep_time": "22:00",
  "work_hours_start": "09:00",
  "work_hours_end": "17:00",
  "has_existing_config": true
}
```

---

## Planning & Scheduling

### GET /today
Get today's schedule with current status and blocks.

**Response:**
```json
{
  "status": "in_progress",
  "current_time": "10:30",
  "current_block": {
    "id": "block-1",
    "label": "Deep Work",
    "start_time": "09:00",
    "end_time": "11:00",
    "type": "work",
    "progress": 0.75
  },
  "blocks": [
    {
      "id": "block-1",
      "label": "Deep Work",
      "start_time": "09:00",
      "end_time": "11:00",
      "type": "work",
      "category": "deep_work"
    }
  ],
  "email_context": {
    "total_emails": 25,
    "action_items": 5,
    "urgent": 2
  },
  "time_context": {
    "wake_time": "05:30",
    "sleep_time": "22:00"
  }
}
```

### POST /plan-v2
Generate AI-powered daily plan using Claude Opus 4.

**Request Body:**
```json
{
  "date": "2025-01-27",
  "priorities": ["Complete project report", "Review emails"],
  "energy_level": "high",
  "constraints": ["Meeting at 2pm"]
}
```

**Response:**
```json
{
  "blocks": [
    {
      "label": "Morning Routine",
      "start_time": "05:30",
      "end_time": "06:30",
      "type": "anchor",
      "category": "personal"
    },
    {
      "label": "Deep Work - Project Report",
      "start_time": "09:00",
      "end_time": "11:00",
      "type": "flex",
      "category": "deep_work"
    }
  ],
  "metadata": {
    "generated_at": "2025-01-27T05:00:00Z",
    "model": "claude-opus-4-20250514",
    "confidence": 0.92
  }
}
```

### POST /context-briefing
Generate four-panel intelligence briefing.

**Request Body:**
```json
{
  "include_email": true,
  "include_sessions": true,
  "include_commitments": true
}
```

**Response:**
```json
{
  "executive_summary": {
    "content": "Today's focus areas...",
    "highlights": ["Critical deadline", "Important meeting"]
  },
  "email_summary": {
    "total": 25,
    "categorized": {
      "information": 15,
      "action_items": 7,
      "response_needed": 3
    },
    "urgent_items": [...]
  },
  "session_notes": {
    "recent_sessions": [...],
    "commitments": [...]
  },
  "commitments_deadlines": {
    "today": [...],
    "upcoming": [...]
  }
}
```

---

## Projects

### GET /projects
Get all projects with optional filtering.

**Query Parameters:**
- `status` (optional): Filter by status (active, on_hold, completed)
- `search` (optional): Search term for project names
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "projects": [
    {
      "id": "proj-123",
      "name": "Echo Development",
      "description": "AI-powered planning system",
      "status": "active",
      "type": "software",
      "progress": 75,
      "momentum": "increasing",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-27T10:00:00Z",
      "activity_heatmap": [...],
      "metrics": {
        "time_invested": 120,
        "last_activity": "2025-01-27T09:00:00Z"
      }
    }
  ],
  "total": 15,
  "offset": 0,
  "limit": 50
}
```

### GET /projects/{id}
Get a single project by ID.

**Response:**
```json
{
  "id": "proj-123",
  "name": "Echo Development",
  "description": "AI-powered planning system",
  "status": "active",
  "type": "software",
  "progress": 75,
  "momentum": "increasing",
  "roadmap": {
    "milestones": [...],
    "current_phase": "implementation"
  },
  "files": [...],
  "activity_log": [...],
  "weekly_summary": {
    "content": "This week's progress...",
    "generated_at": "2025-01-27T00:00:00Z"
  }
}
```

### POST /projects
Create a new project.

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "type": "software",
  "status": "active",
  "goals": ["Goal 1", "Goal 2"],
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "proj-124",
  "name": "New Project",
  "status": "created",
  "message": "Project created successfully"
}
```

### PUT /projects/{id}
Update an existing project.

**Request Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "status": "on_hold",
  "progress": 80
}
```

**Response:**
```json
{
  "id": "proj-123",
  "status": "updated",
  "message": "Project updated successfully"
}
```

### DELETE /projects/{id}
Delete a project.

**Response:**
```json
{
  "status": "deleted",
  "message": "Project deleted successfully"
}
```

### GET /projects/stats
Get portfolio-wide statistics.

**Response:**
```json
{
  "total_projects": 15,
  "active_projects": 8,
  "completed_projects": 5,
  "on_hold_projects": 2,
  "total_time_invested": 450,
  "average_progress": 68,
  "momentum_breakdown": {
    "increasing": 5,
    "steady": 8,
    "decreasing": 2
  }
}
```

### POST /projects/analyze-conversation
Analyze conversation for project extraction.

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "I want to build a mobile app..."
    },
    {
      "role": "assistant",
      "content": "That sounds interesting..."
    }
  ]
}
```

**Response:**
```json
{
  "extracted_project": {
    "name": "Mobile App Development",
    "type": "software",
    "description": "...",
    "goals": [...],
    "requirements": [...],
    "timeline": {...}
  },
  "confidence": 0.89,
  "suggestions": [...]
}
```

### POST /projects/generate-roadmap
Generate AI-powered project roadmap.

**Request Body:**
```json
{
  "project_id": "proj-123",
  "timeframe": "3_months",
  "include_milestones": true
}
```

**Response:**
```json
{
  "roadmap": {
    "phases": [
      {
        "name": "Planning",
        "duration": "2 weeks",
        "milestones": [...],
        "deliverables": [...]
      }
    ],
    "total_duration": "3 months",
    "confidence": 0.85
  }
}
```

---

## Conversations & Coaching

### POST /conversations
Create a new coaching conversation.

**Request Body:**
```json
{
  "initial_message": "I need help planning my research project",
  "context": {
    "domain": "academic"
  }
}
```

**Response:**
```json
{
  "conversation_id": "conv-456",
  "status": "active",
  "stage": "understanding",
  "next_prompt": "Tell me more about your research topic..."
}
```

### POST /conversations/{id}/message
Send a message in an active conversation.

**Request Body:**
```json
{
  "message": "My research is about climate change impacts..."
}
```

**Response:**
```json
{
  "conversation_id": "conv-456",
  "response": "That's an important topic...",
  "stage": "exploration",
  "extracted_data": {...},
  "suggestions": [...]
}
```

### POST /conversations/{id}/stream
Stream conversation responses (Server-Sent Events).

**Request Body:**
```json
{
  "message": "Tell me more about methodology..."
}
```

**Response:** (SSE Stream)
```
data: {"chunk": "Based on", "type": "content"}
data: {"chunk": " your research", "type": "content"}
data: {"chunk": "...", "type": "content"}
data: {"done": true, "type": "complete"}
```

### GET /conversations/{id}
Get conversation state and history.

**Response:**
```json
{
  "conversation_id": "conv-456",
  "status": "active",
  "stage": "synthesis",
  "messages": [...],
  "extracted_project": {...},
  "domain": "academic",
  "created_at": "2025-01-27T09:00:00Z"
}
```

### POST /conversations/{id}/complete
Complete conversation and create project.

**Request Body:**
```json
{
  "create_project": true,
  "project_overrides": {
    "name": "Custom Project Name"
  }
}
```

**Response:**
```json
{
  "status": "completed",
  "project_created": true,
  "project_id": "proj-125",
  "summary": "Conversation completed successfully"
}
```

---

## Analytics

### GET /analytics
Get daily analytics and time tracking data.

**Query Parameters:**
- `date` (optional): Specific date (YYYY-MM-DD)
- `range` (optional): Date range (week, month, year)

**Response:**
```json
{
  "date": "2025-01-27",
  "total_productive_time": 420,
  "category_breakdown": {
    "deep_work": 180,
    "meetings": 120,
    "email": 60,
    "breaks": 60
  },
  "productivity_score": 0.82,
  "patterns": {
    "peak_hours": ["09:00-11:00", "14:00-16:00"],
    "distraction_periods": ["13:00-14:00"]
  },
  "comparisons": {
    "vs_yesterday": "+15%",
    "vs_week_avg": "+8%"
  }
}
```

### GET /analytics/export
Export analytics data.

**Query Parameters:**
- `format`: Export format (csv, json)
- `start_date`: Start date
- `end_date`: End date

**Response:** (CSV or JSON file download)

---

## Session Intelligence

### POST /scaffolds/generate
Generate session scaffolds for daily plan.

**Request Body:**
```json
{
  "blocks": [
    {
      "id": "block-1",
      "label": "Deep Work",
      "start_time": "09:00",
      "end_time": "11:00"
    }
  ]
}
```

**Response:**
```json
{
  "scaffolds": [
    {
      "block_id": "block-1",
      "content": "Focus on completing the API documentation...",
      "context": [...],
      "suggestions": [...]
    }
  ]
}
```

### GET /scaffolds/block/{id}
Get scaffold for specific block.

**Response:**
```json
{
  "block_id": "block-1",
  "scaffold": {
    "content": "Deep work session context...",
    "goals": [...],
    "resources": [...]
  }
}
```

### DELETE /scaffolds/block/{id}
Delete scaffold for a block.

**Response:**
```json
{
  "status": "deleted",
  "message": "Scaffold deleted successfully"
}
```

### GET /scaffolds/status
Get scaffold system status.

**Response:**
```json
{
  "enabled": true,
  "total_scaffolds": 5,
  "last_generated": "2025-01-27T09:00:00Z",
  "model": "claude-sonnet-4-20250514"
}
```

---

## Email Integration

### POST /email/oauth-callback
Handle OAuth callback from Microsoft.

**Request Body:**
```json
{
  "code": "auth_code_from_microsoft",
  "state": "state_string"
}
```

**Response:**
```json
{
  "status": "authenticated",
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

### GET /email/summary
Get categorized email summary.

**Query Parameters:**
- `hours` (optional): Look back period (default: 24)

**Response:**
```json
{
  "total_emails": 45,
  "categories": {
    "information": {
      "count": 25,
      "emails": [...]
    },
    "action_items": {
      "count": 15,
      "emails": [...]
    },
    "response_needed": {
      "count": 5,
      "emails": [...]
    }
  },
  "urgent_items": [...],
  "important_senders": [...]
}
```

### POST /email/process
Process and categorize emails using AI.

**Request Body:**
```json
{
  "emails": [
    {
      "id": "email-1",
      "subject": "Project Update",
      "sender": "john@example.com",
      "body": "...",
      "received": "2025-01-27T09:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "processed": 1,
  "categorized": {
    "email-1": {
      "category": "action_item",
      "priority": "high",
      "suggested_action": "Review and respond",
      "deadline": "2025-01-28"
    }
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {...}
  },
  "status": 400
}
```

### Common Error Codes
- `400` - Bad Request: Invalid parameters
- `404` - Not Found: Resource doesn't exist
- `409` - Conflict: Resource already exists
- `422` - Unprocessable Entity: Validation error
- `500` - Internal Server Error: Server-side error
- `503` - Service Unavailable: External service down

---

## Rate Limiting

Currently, no rate limiting is implemented. This may change in production deployments.

---

## WebSocket Endpoints

### WS /ws/session
Real-time session updates.

**Message Format:**
```json
{
  "type": "session_update",
  "data": {
    "block_id": "block-1",
    "progress": 0.5,
    "notes": "..."
  }
}
```

---

## Development Notes

### Base URL Configuration
In production, replace `localhost:8000` with your deployed API URL.

### CORS Configuration
The API is configured to accept requests from:
- `http://localhost:3000` (Next.js dev)
- `http://127.0.0.1:3000` (Alternative)

### Environment Variables
Required environment variables:
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
ECHO_GRAPH_CLIENT_ID=...
ECHO_GRAPH_CLIENT_SECRET=...
```

### Testing Endpoints
Use tools like `curl`, `httpie`, or Postman:

```bash
# Health check
curl http://localhost:8000/health

# Get today's schedule
curl http://localhost:8000/today

# Get all projects
curl http://localhost:8000/projects
```

---

## API Versioning

The API currently uses implicit v1. Future versions will use URL versioning:
- v1: `/api/v1/...` (current, implicit)
- v2: `/api/v2/...` (future)

---

## OpenAPI Documentation

When the server is running, interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

These provide interactive testing capabilities for all endpoints.