# Echo Architecture Overview

## 🏗️ System Architecture

Echo is built as a modular, event-driven system with clear separation of concerns. The architecture follows a layered approach with distinct data, business logic, and presentation layers.

### Core Architecture Principles

1. **Single Source of Truth**: All data flows through well-defined models
2. **Event-Driven Design**: Components communicate through events and data flow
3. **Modularity**: Each module has a single responsibility
4. **Testability**: All components are designed for comprehensive testing
5. **Extensibility**: New features can be added without breaking existing functionality

## 📊 Data Flow

```
User Input → CLI → Planning Engine → LLM → Response Parser → Schedule → Analytics → Storage
     ↓
Session Data → Logging → External Tools → Session Summary → Project Logs
     ↓
Analytics Engine → Time Ledger → CSV Storage → Reports
```

### 1. Planning Flow
1. **User Input**: CLI captures user priorities, energy level, and constraints
2. **Context Gathering**: System loads projects, historical data, and configuration
3. **LLM Prompt Construction**: Prompt engine builds structured prompts with context
4. **AI Planning**: LLM generates schedule based on rules and context
5. **Response Parsing**: System parses and validates LLM response
6. **Schedule Creation**: Validated blocks are saved and displayed
7. **Analytics Update**: Time allocation is calculated and stored

### 2. Session Flow
1. **Session Start**: User initiates work session
2. **External Tool Integration**: System captures Git, browser, IDE data
3. **Session Tracking**: Real-time tracking with notes and context
4. **Session End**: User ends session with summary
5. **Data Processing**: Session data is processed and validated
6. **Logging**: Session summary is written to project logs
7. **Analytics Update**: Session data updates time ledger

## 🧩 Core Components

### 1. CLI Interface (`echo.cli`)
**Purpose**: Main entry point and user interaction layer

**Key Responsibilities**:
- Command parsing and routing
- User input validation
- Output formatting and display
- Error handling and user feedback

**Key Commands**:
- `plan`: Generate daily schedule
- `session start/end`: Manage work sessions
- `analytics`: View time tracking data
- `project create/list/show`: Project management

**Dependencies**:
- All other modules for functionality
- Configuration system for settings

### 2. Configuration System (`echo.config_loader`)
**Purpose**: Load and validate user configuration

**Key Responsibilities**:
- YAML configuration parsing
- Data validation and error handling
- Default value management
- Configuration persistence

**Data Structures**:
- `Config`: Root configuration object
- `Project`: Project information and status
- `Profile`: Context-specific overrides
- `Categories`: Time category mappings

**Dependencies**:
- `echo.models` for data structures
- `echo.config_validator` for validation

### 3. Planning Engine (`echo.prompt_engine`)
**Purpose**: LLM interaction and schedule generation

**Key Responsibilities**:
- Prompt construction with context
- LLM response parsing and validation
- Error handling for LLM failures
- Context management and filtering

**Prompt Types**:
- **Planner**: Generates daily schedules
- **Enricher**: Adds personality and notes
- **Session Crafter**: Creates work session plans
- **Log Crafter**: Generates session summaries

**Dependencies**:
- OpenAI API for LLM interaction
- `echo.models` for data structures
- `echo.config_loader` for context

### 4. Analytics Engine (`echo.analytics`)
**Purpose**: Time tracking and analytics processing

**Key Responsibilities**:
- Time allocation calculation
- Category and project breakdown
- CSV data storage and retrieval
- Analytics reporting and display

**Data Flow**:
1. **Input**: List of time blocks from planning
2. **Processing**: Calculate durations and categorize
3. **Storage**: Write to CSV time ledger
4. **Output**: Daily stats and trend analysis

**Key Functions**:
- `categorize_block()`: Assign time categories
- `calculate_daily_stats()`: Process daily data
- `append_daily_stats()`: Store analytics data
- `get_recent_stats()`: Retrieve historical data

**Dependencies**:
- `echo.models` for Block and Config
- CSV file system for storage

### 5. Session Management (`echo.session`)
**Purpose**: Work session tracking and logging

**Key Responsibilities**:
- Session state management
- External tool data integration
- Session logging and persistence
- Anti-hallucination measures

**Session Lifecycle**:
1. **Start**: Initialize session with context
2. **Track**: Monitor external tools and user input
3. **End**: Generate summary and save data
4. **Log**: Write to project logs and analytics

**External Tool Integration**:
- **Git**: Commit history and file changes
- **Browser**: Tab usage and time spent
- **IDE**: File edits and function calls
- **Calendar**: Meeting and interruption data

**Dependencies**:
- External tool APIs
- `echo.analytics` for data storage
- `echo.log_writer` for persistence

### 6. Scheduler (`echo.scheduler`)
**Purpose**: Generate base schedules from configuration

**Key Responsibilities**:
- Weekly schedule template processing
- Fixed event scheduling
- Time block generation
- Schedule validation

**Schedule Types**:
- **Anchor**: Fixed daily routines
- **Fixed**: Scheduled appointments
- **Flex**: Movable work blocks

**Dependencies**:
- `echo.config_loader` for templates
- `echo.models` for Block creation

### 7. Log Management (`echo.log_reader`, `echo.log_writer`)
**Purpose**: Persistent data storage and retrieval

**Key Responsibilities**:
- Daily log file management
- Session data persistence
- Historical data retrieval
- Data validation and error handling

**File Structure**:
```
logs/
├── 2025-01-20.md          # Daily schedule logs
├── sessions/
│   ├── 2025-01-20-09-00.md  # Session logs
│   └── 2025-01-20-14-30.md
├── projects/
│   ├── echo_dev.md           # Project logs
│   └── research.md
└── time_ledger.csv           # Analytics data
```

**Dependencies**:
- File system for storage
- Markdown for human-readable logs
- CSV for structured analytics data

## 🔄 Data Models

### Core Models

#### Block
```python
@dataclass
class Block:
    start: time
    end: time
    label: str
    type: BlockType
    meta: Dict[str, str] = field(default_factory=dict)
```
**Purpose**: Fundamental time unit representing a scheduled activity

#### Config
```python
@dataclass
class Config:
    defaults: Defaults
    weekly_schedule: Dict[str, List[Dict]]
    projects: Dict[str, Project]
    profiles: Dict[str, Profile]
    categories: Categories
```
**Purpose**: Root configuration object containing all user settings

#### Project
```python
@dataclass
class Project:
    id: str
    name: str
    status: ProjectStatus
    current_focus: Optional[str]
    milestones: List[Milestone]
    deadline: Optional[date]
```
**Purpose**: Represents a user's active project with context

#### DailyStats
```python
@dataclass
class DailyStats:
    date: date
    total_minutes: int
    category_breakdown: Dict[str, int]
    project_breakdown: Dict[str, int]
```
**Purpose**: Analytics data structure for time allocation tracking

## 🔌 External Integrations

### 1. OpenAI API
**Purpose**: LLM-powered planning and analysis

**Integration Points**:
- Prompt construction in `echo.prompt_engine`
- Response parsing and validation
- Error handling and retry logic

**API Usage**:
- GPT-4o for planning and enrichment
- Structured JSON responses
- Context window management

### 2. External Tools (Planned)
**Purpose**: Enhanced session tracking and data capture

**Git Integration**:
- Commit history and file changes
- Branch and repository information
- Time-based activity patterns

**Browser Integration**:
- Tab usage and time tracking
- Website categorization
- Productivity analysis

**IDE Integration**:
- File edit tracking
- Function and method calls
- Code complexity metrics

**Calendar Integration**:
- Meeting and event data
- Interruption tracking
- Schedule conflict detection

### 3. File System
**Purpose**: Persistent data storage

**Storage Locations**:
- `config/`: User configuration files
- `logs/`: Daily logs and session data
- `refs/`: Reference materials and templates

**File Formats**:
- YAML: Configuration files
- Markdown: Human-readable logs
- CSV: Structured analytics data

## 🧪 Testing Strategy

### Test Pyramid
1. **Unit Tests** (70%): Individual component testing
2. **Integration Tests** (20%): Component interaction testing
3. **End-to-End Tests** (10%): Full workflow testing

### Test Categories

#### Analytics Tests
- Time categorization logic
- Statistics calculation
- Data storage and retrieval
- CSV format validation

#### Planning Tests
- Prompt construction
- LLM response parsing
- Schedule validation
- Error handling

#### Configuration Tests
- YAML parsing
- Data validation
- Default value handling
- Error reporting

#### Session Tests
- Session lifecycle
- External tool integration
- Data persistence
- Anti-hallucination measures

### Test Data Management
- **Fixtures**: Pre-defined test data
- **Mocks**: External API simulation
- **Temporary Files**: Isolated test storage
- **Cleanup**: Automatic test data removal

## 🔒 Security & Privacy

### Data Protection
- **Local Storage**: All data stored locally by default
- **API Keys**: Environment variable management
- **Sensitive Data**: No hardcoded credentials
- **Data Export**: User-controlled data portability

### Privacy Considerations
- **No Cloud Sync**: Data remains on user's device
- **Optional Sharing**: User controls data sharing
- **Data Minimization**: Only necessary data collected
- **User Control**: Full control over data retention

## 🚀 Performance Considerations

### Optimization Strategies
1. **LLM Call Reduction**: One-shot planning approach
2. **Caching**: Frequently accessed data caching
3. **Lazy Loading**: Load data only when needed
4. **Efficient Storage**: Optimized file formats

### Performance Metrics
- **Response Time**: < 2 seconds for planning
- **Memory Usage**: < 100MB for typical usage
- **File I/O**: Minimal disk operations
- **API Calls**: Optimized LLM usage

## 🔮 Future Architecture

### Planned Enhancements

#### 1. API Layer
- **REST API**: HTTP-based interface
- **WebSocket**: Real-time updates
- **GraphQL**: Flexible data queries
- **Authentication**: User management system

#### 2. Cloud Integration
- **Data Sync**: Multi-device synchronization
- **Backup**: Automatic data backup
- **Collaboration**: Team features
- **Analytics**: Cloud-based insights

#### 3. Mobile App
- **Native iOS**: SwiftUI interface
- **Offline Support**: Local data storage
- **Push Notifications**: Real-time alerts
- **Widgets**: Home screen integration

#### 4. Advanced Analytics
- **Machine Learning**: Pattern recognition
- **Predictive Analytics**: Future planning
- **Visualization**: Rich data charts
- **Insights Engine**: AI-powered recommendations

## 📋 Development Guidelines

### Code Standards
- **Type Hints**: Complete type annotation
- **Docstrings**: Comprehensive documentation
- **Error Handling**: Graceful error management
- **Logging**: Structured logging throughout

### Architecture Principles
- **Single Responsibility**: Each module has one purpose
- **Dependency Injection**: Loose coupling between components
- **Event-Driven**: Components communicate through events
- **Testability**: All components are testable

### Data Flow Rules
- **Immutable Data**: Data structures are immutable
- **Validation**: All data is validated at boundaries
- **Error Propagation**: Errors bubble up appropriately
- **Logging**: All significant events are logged

---

This architecture provides a solid foundation for Echo's current functionality while enabling future enhancements and scalability. 