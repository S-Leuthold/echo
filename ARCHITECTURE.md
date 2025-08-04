# Echo System Architecture

## Overview

Echo is a sophisticated AI-powered productivity system that combines intelligent scheduling, real-time analytics, and adaptive coaching to help users optimize their daily planning and execution. The system leverages multiple AI models (Claude Opus 4, Claude Sonnet 4, and OpenAI) to provide context-aware planning and insights.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Interface                              │
├─────────────────────────────────────────────────────────────────────────┤
│                         Next.js Frontend (Port 3000)                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  Today Page  │ │Planning Page │ │Projects Page │ │Analytics Page│  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │               React Components & TypeScript Services              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend (Port 8000)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Planning   │ │  Projects    │ │  Analytics   │ │   Sessions   │  │
│  │   Endpoints  │ │   CRUD API   │ │     API      │ │  Management  │  │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              Four-Panel Intelligence System                       │  │
│  │  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────────┐   │  │
│  │  │Executive│ │  Email  │ │ Session  │ │   Commitments &    │   │  │
│  │  │ Summary │ │ Summary │ │  Notes   │ │     Deadlines      │   │  │
│  │  └─────────┘ └─────────┘ └──────────┘ └────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    AI Services      │ │  External Services  │ │   Data Storage      │
├─────────────────────┤ ├─────────────────────┤ ├─────────────────────┤
│ • Claude Opus 4     │ │ • Microsoft Graph   │ │ • SQLite DBs        │
│ • Claude Sonnet 4   │ │   (Email/Calendar)  │ │ • JSON Files        │
│ • OpenAI Response   │ │ • OAuth 2.0         │ │ • YAML Config       │
│   API               │ │                     │ │ • Session Logs      │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

## Core Components

### 1. Frontend Layer (Next.js + TypeScript)

#### Technology Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: React Context API + Custom Hooks
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React

#### Key Pages & Features

##### Today Page (`/today`)
- **Real-time Schedule Display**: Visual timeline with current block highlighting
- **Session Management**: Start/pause/end work sessions with note-taking
- **Progress Tracking**: Live countdown and progress bars
- **Two-Column Layout**: 70/30 split with schedule and session controls

##### Planning Page (`/planning`)
- **Context Briefing**: Four-panel intelligence display
- **Schedule Generation**: AI-powered plan creation
- **Manual Adjustments**: Edit generated schedules
- **Email Integration**: Action items from inbox

##### Projects Page (`/projects`)
- **Project Portfolio**: Card-based project display
- **Hybrid Wizard**: Conversational project creation
- **Activity Tracking**: Heatmaps and sparklines
- **AI Roadmaps**: Generated project milestones

##### Analytics Page (`/analytics`)
- **Time Tracking**: Category breakdowns
- **Productivity Scoring**: AI-analyzed patterns
- **Export Capabilities**: CSV/JSON data export
- **Visual Charts**: Time allocation insights

### 2. Backend Layer (FastAPI + Python)

#### API Architecture

The backend follows a modular router pattern with clear separation of concerns:

```python
# Main API Structure
api_server.py                    # Entry point
└── echo/api/
    ├── main.py                  # FastAPI app initialization
    └── routers/
        ├── projects.py          # Project CRUD operations
        ├── conversations.py     # Adaptive coaching
        ├── scaffolds.py        # Session intelligence
        └── config.py           # Configuration management
```

#### Core Services

##### Planning Engine
- **Unified Planning** (`/plan-v2`): Single-call Claude Opus 4 integration
- **Schedule Optimization**: Energy-based task allocation
- **Context Integration**: Email, sessions, and config data
- **Structured Output**: Pydantic models for type safety

##### Four-Panel Intelligence System
- **Executive Summary**: AI synthesis of all data sources
- **Email Intelligence**: Categorized action items
- **Session Notes**: Forward-looking commitments
- **Commitments & Deadlines**: Config-based reminders

##### Project Management
- **CRUD Operations**: Full lifecycle management
- **AI Enhancements**: Roadmap generation, weekly summaries
- **Activity Tracking**: Heatmap data, progress metrics
- **File Uploads**: Document association with projects

##### Adaptive Coaching
- **Conversation State Machine**: Multi-stage dialogue flow
- **Domain Detection**: Academic vs general project routing
- **Expert Personas**: Specialized coaching personalities
- **Project Extraction**: AI analysis of conversations

### 3. Data Layer

#### Databases (SQLite)

##### session_intelligence.db
```sql
-- Core Tables
projects            -- Project portfolio
sessions           -- Work session tracking
session_logs       -- AI-synthesized insights
daily_activities   -- Analytics data
weekly_summaries   -- AI-generated summaries
uploaded_files     -- Document management
```

##### conversations.db
```sql
-- Conversation Tables
conversations      -- Coaching session states
messages          -- Conversation history
extracted_data    -- AI-extracted project info
```

#### Configuration Files

##### user_config.yaml
```yaml
defaults:
  wake_time: "05:30"
  sleep_time: "22:00"
  
weekly_schedule:
  monday:
    anchors: [...]
    
projects:
  - name: "Echo"
    status: "active"
    
email:
  important_senders: [...]
  action_keywords: [...]
```

### 4. AI Integration Layer

#### Model Strategy

##### Claude Opus 4 (Strategic Tasks)
- Daily planning generation
- Executive summary creation
- Complex reasoning tasks
- Schedule optimization

##### Claude Sonnet 4 (Structured Processing)
- Email categorization
- Session log synthesis
- Scaffold generation
- Conversation analysis

##### OpenAI Response API
- Structured data extraction
- Email intelligence
- Session insights
- Commitment parsing

## Data Flow Patterns

### 1. Planning Flow
```
User Request → Context Collection → AI Planning → Schedule Generation → UI Display
     │              │                    │              │                  │
     └──> Config    └──> Email Data     └──> Claude    └──> Blocks       └──> Timeline
         Settings        Session Notes       Opus 4         JSON             Component
```

### 2. Project Creation Flow
```
User Input → Conversation → AI Analysis → Project Extraction → Database → UI Update
     │           │              │               │                │           │
     └──> Hybrid └──> Domain   └──> Claude    └──> Pydantic   └──> SQLite └──> Cards
         Wizard      Detection      Sonnet 4       Models          Insert      Display
```

### 3. Session Intelligence Flow
```
Session Start → Scaffold Generation → Active Tracking → Session End → Log Synthesis
      │               │                    │               │              │
      └──> Block     └──> AI Context      └──> Notes     └──> Summary  └──> Insights
          Selection       Creation             Capture        Generation     Storage
```

## Security & Authentication

### OAuth 2.0 Integration
- Microsoft Graph API authentication
- Automatic token refresh
- Secure credential storage
- PKCE flow implementation

### API Security
- CORS configuration for frontend access
- Environment variable management
- Input validation with Pydantic
- Error sanitization in production

## Performance Optimizations

### Caching Strategy
- Configuration caching
- Session state persistence
- Icon resolution memoization
- API response caching

### Database Optimization
- Indexed queries for projects
- Batch operations for analytics
- Connection pooling
- Query result caching

### Frontend Optimization
- Component lazy loading
- Image optimization
- Bundle splitting
- CSS purging

## Deployment Architecture

### Development Environment
```bash
# Backend
python api_server.py  # Port 8000

# Frontend
npm run dev          # Port 3000

# Databases
SQLite (local files)
```

### Production Considerations
- Environment-specific configs
- Database migrations
- SSL/TLS termination
- Load balancing strategy
- Monitoring & logging
- Backup procedures

## Error Handling & Resilience

### Backend Error Handling
- Comprehensive try-catch blocks
- Graceful fallbacks
- Detailed logging
- User-friendly error messages

### Frontend Error Boundaries
- Component-level error catching
- Fallback UI components
- Error reporting
- Recovery mechanisms

## Monitoring & Observability

### Logging Strategy
- Structured logging (JSON)
- Log levels (DEBUG/INFO/WARN/ERROR)
- Request/response logging
- Performance metrics

### Analytics Tracking
- User interaction events
- API performance metrics
- Error rate monitoring
- Usage pattern analysis

## Future Architecture Considerations

### Scalability Path
- Microservices migration
- Database sharding
- Message queue integration
- Horizontal scaling

### Feature Expansions
- Real-time collaboration
- Plugin architecture
- Mobile applications
- Third-party integrations

## Architecture Principles

1. **Separation of Concerns**: Clear boundaries between layers
2. **Type Safety**: TypeScript frontend, Pydantic backend
3. **AI-First Design**: LLM integration at core
4. **User-Centric**: Focus on productivity outcomes
5. **Modularity**: Composable components and services
6. **Resilience**: Graceful degradation and fallbacks
7. **Performance**: Optimized for responsive UX
8. **Security**: Defense in depth approach

## Technology Decisions Rationale

### Why FastAPI?
- Modern async Python framework
- Automatic OpenAPI documentation
- Pydantic integration
- High performance

### Why Next.js?
- Server-side rendering
- App Router for better DX
- Built-in optimization
- TypeScript support

### Why SQLite?
- Zero configuration
- Local-first approach
- Sufficient for single-user
- Easy backup/migration

### Why Multiple AI Models?
- Cost optimization
- Task-specific strengths
- Redundancy and fallbacks
- Best tool for each job

This architecture provides a robust foundation for an AI-powered productivity system while maintaining flexibility for future enhancements and scalability.