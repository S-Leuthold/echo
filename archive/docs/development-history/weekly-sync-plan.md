# Weekly Sync Implementation Plan

## Overview
The Weekly Sync is Echo's strategic reset mechanism that closes the loop between planning and execution. It reads the past week's progress, updates project briefs based on reality, and creates a strategic scaffold for the upcoming week.

## Core Components

### 1. Data Models

```python
# echo/models.py additions

class WeeklySyncBriefing:
    """AI's analysis of the past week"""
    id: str
    week_ending: date
    created_at: datetime
    
    # Analysis
    summary: str  # "Here's what happened last week..."
    key_accomplishments: List[str]
    missed_targets: List[str]
    emerging_priorities: List[str]
    
    # Proposed changes
    project_diffs: Dict[str, List[ProjectDiff]]
    
class ProjectDiff:
    """A proposed change to a project brief"""
    field: str  # e.g., "deliverables", "timeline", "current_focus"
    operation: Literal["add", "remove", "modify"]
    old_value: Any
    new_value: Any
    reasoning: str  # Why the AI suggests this change
    accepted: Optional[bool] = None
    
class WeeklyScaffold:
    """Strategic plan for the upcoming week"""
    id: str
    week_starting: date
    created_at: datetime
    
    # Daily allocations
    daily_focuses: Dict[str, DayFocus]  # date -> focus
    key_milestones: List[Milestone]
    time_allocations: Dict[str, int]  # project_id -> hours
    
class DayFocus:
    """What to focus on each day"""
    date: date
    primary_project: str
    secondary_projects: List[str]
    key_tasks: List[str]
    energy_allocation: str  # "deep work", "meetings", "admin"
```

### 2. Backend Services

```python
# echo/weekly_sync_service.py

class WeeklySyncService:
    """Orchestrates the weekly sync process"""
    
    async def analyze_past_week(self, user_id: str) -> WeeklySyncBriefing:
        """
        1. Load all project briefs
        2. Load all session logs from past week
        3. Send to Claude Opus for analysis
        4. Generate project diffs
        """
        
    async def apply_accepted_diffs(self, briefing_id: str, accepted_diffs: List[str]):
        """Apply user-accepted changes to project briefs"""
        
    async def create_weekly_scaffold(self, user_id: str, priorities: List[str]) -> WeeklyScaffold:
        """Generate strategic plan for upcoming week"""
```

### 3. API Endpoints

```python
# echo/api/routers/weekly_sync.py

@router.post("/weekly-sync/analyze")
async def analyze_week(request: WeekAnalysisRequest):
    """Trigger weekly analysis"""
    
@router.get("/weekly-sync/briefing/{briefing_id}")
async def get_briefing(briefing_id: str):
    """Get analysis results with diffs"""
    
@router.post("/weekly-sync/apply-diffs")
async def apply_diffs(request: ApplyDiffsRequest):
    """Apply accepted changes"""
    
@router.post("/weekly-sync/create-scaffold")
async def create_scaffold(request: CreateScaffoldRequest):
    """Generate weekly scaffold"""
```

### 4. Frontend Components

```typescript
// Weekly Sync UI Components

// Main weekly sync page
WeeklySyncPage
  ├── WeeklySyncHeader (progress indicator)
  ├── WeeklyReview (past week analysis)
  │   ├── WeeklySummary
  │   └── ProjectDiffView (for each project)
  │       ├── DiffItem (red/green with accept/reject)
  │       └── AcceptAllButton
  ├── WeeklyPriorities (user input for week ahead)
  └── WeeklyScaffoldPreview (generated plan)

// Diff viewer component
interface ProjectDiffViewProps {
  projectName: string;
  diffs: ProjectDiff[];
  onAccept: (diffId: string) => void;
  onReject: (diffId: string) => void;
}

// Visual diff display
<div className="space-y-2">
  {diffs.map(diff => (
    <DiffItem
      key={diff.id}
      field={diff.field}
      oldValue={diff.old_value}
      newValue={diff.new_value}
      reasoning={diff.reasoning}
      onAccept={() => onAccept(diff.id)}
      onReject={() => onReject(diff.id)}
    />
  ))}
</div>
```

### 5. LLM Prompts

```python
# Weekly Review Prompt (Claude Opus)
analyze_week_prompt = """
You are reviewing a week of project work. Analyze progress against stated goals.

Project Briefs:
{project_briefs}

Session Logs from Past Week:
{session_logs}

For each project, identify:
1. What was accomplished vs planned
2. What timeline shifts occurred
3. What new information emerged
4. What priorities have changed

Generate specific, actionable updates to each project brief.
Format as structured diffs with clear reasoning.
"""

# Weekly Scaffold Prompt (Claude Opus)
create_scaffold_prompt = """
Based on updated project briefs and user priorities, create a strategic weekly plan.

Updated Projects:
{updated_briefs}

User's Weekly Priorities:
{user_priorities}

Create a day-by-day allocation that:
1. Respects project timelines
2. Balances deep work with collaboration
3. Accounts for energy patterns
4. Leaves buffer for unexpected work
"""
```

## Implementation Phases

### Phase 1: Data Models & Backend
1. Create WeeklySyncBriefing, ProjectDiff, WeeklyScaffold models
2. Build WeeklySyncService with analysis logic
3. Implement diff generation algorithm
4. Create API endpoints

### Phase 2: UI Components  
1. Build ProjectDiffView component with red/green visualization
2. Create WeeklySyncPage with three-step flow
3. Implement accept/reject interaction
4. Add progress indicators

### Phase 3: Integration
1. Connect to existing project/session systems
2. Update daily planning to use WeeklyScaffold
3. Add "Weekly Sync" navigation item
4. Test full flow end-to-end

## Success Metrics
- Projects stay aligned with reality (briefs evolve)
- Weekly planning takes < 10 minutes
- Daily plans better match weekly intentions
- Reduced planning overhead throughout week