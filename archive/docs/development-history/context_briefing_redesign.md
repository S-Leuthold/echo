# Echo Context Briefing Redesign - Development Roadmap

## **Executive Summary**

This document outlines the complete redesign of Echo's context briefing system from a generic, monolithic approach to a structured, four-panel intelligence system that provides actionable daily insights.

## **Current System Problems**

### **Critical Issues**
1. **Generic Output**: Current briefing produces minimal, unhelpful summaries like "Awaiting sample list from Jordon Wade; unknown high urgency email action pending"
2. **Monolithic Architecture**: Single LLM call tries to do everything without proper data categorization
3. **Ignored Intelligence**: Session notes and config deadlines exist but aren't surfaced meaningfully
4. **No Actionability**: User can't act on the information provided
5. **Poor Information Hierarchy**: No distinction between urgent actions vs. background information

### **Technical Debt**
- `build_context_briefing_prompt()` is unfocused and generic
- Email processor dumps all data together without categorization
- Session parsing is basic file reading, not intelligent extraction
- User config deadlines/commitments are not surfaced to user
- Summary-first logic generates summaries before having structured data

## **New System Design**

### **Four-Panel Architecture**
1. **Executive Summary** - 2-4 sentence daily synthesis (generated LAST)
2. **Email Summary** - Categorized into Information, Action Items, Response Needed
3. **Session Notes** - Forward-looking items from recent sessions with completion tracking
4. **Commitments & Deadlines** - User config deadlines, events, birthdays with appropriate lead times

### **Design Principles**
- **Actionable First**: Every item should be actionable or directly relevant to planning
- **Structured Data**: Categorize before summarizing
- **Temporal Intelligence**: Different lead times for different commitment types
- **Completion Tracking**: Track what's been addressed vs. what's still pending
- **Interactive Elements**: Click-through to source material (email threads, session notes)

## **Implementation Roadmap**

---

## **Phase 1: Email Intelligence Redesign** 
**Duration**: 5-7 days  
**Priority**: High (most complex, highest token usage)

### **Objective**
Replace generic email processing with intelligent categorization system that produces actionable insights.

### **Technical Approach**

#### **Step 1.1: Create Email Categorization System** (Days 1-2)

**New File**: `echo/email_intelligence.py`

```python
class EmailCategorizer:
    """Intelligent email categorization for actionable context briefings."""
    
    def __init__(self, openai_client):
        self.client = openai_client
        
    def categorize_emails(self, emails, timeframe_hours=24, sunday_lookback=72):
        """Main entry point for email categorization."""
        filtered_emails = self._filter_by_timeframe(emails, timeframe_hours, sunday_lookback)
        
        return {
            'information': self._extract_information_updates(filtered_emails),
            'action_items': self._extract_action_items(filtered_emails),
            'response_needed': self._extract_response_needed(filtered_emails),
            'metadata': {
                'total_processed': len(filtered_emails),
                'timeframe_hours': timeframe_hours,
                'categories_generated_at': datetime.now().isoformat()
            }
        }
    
    def _filter_by_timeframe(self, emails, hours, sunday_hours):
        """Apply 24hr filter normally, 72hr filter on Sundays."""
        is_sunday = datetime.now().weekday() == 6
        lookback_hours = sunday_hours if is_sunday else hours
        cutoff = datetime.now() - timedelta(hours=lookback_hours)
        
        return [email for email in emails if email['received_time'] > cutoff]
    
    def _extract_information_updates(self, emails):
        """Extract passive information updates (shipped, scheduled, published, etc.)"""
        # LLM prompt focused on: status updates, announcements, FYI items
        # Return: List[{content, person, timestamp, context}]
        
    def _extract_action_items(self, emails):
        """Extract commitments made by user or requests to user"""
        # LLM prompt focused on: "I will...", "Can you...", "Please..."
        # Distinguish between user promises vs. requests to user
        # Return: List[{content, person, due_date, type: 'promised'|'requested', thread_id}]
        
    def _extract_response_needed(self, emails):
        """Extract emails requiring user response"""
        # Focus on: questions, unresponded emails, pending decisions
        # Sort by urgency and days since received
        # Return: List[{content, person, days_old, urgency, thread_id}]
```

#### **Step 1.2: Add LLM-Powered Category Extraction** (Days 2-3)

**Prompt Templates** for each category:

```python
INFORMATION_EXTRACTION_PROMPT = """
Analyze these emails and extract INFORMATION UPDATES - passive status updates, announcements, and FYI items.

Look for:
- Shipments/deliveries ("samples shipped", "package arrived")
- Scheduling ("meeting moved to", "appointment confirmed")
- Publications/releases ("paper published", "new version available")
- Status updates ("project completed", "review finished")

Format each as:
- Brief description (max 80 chars)
- Person/source
- Timestamp context (e.g., "2 hours ago", "this morning")

AVOID action items or things requiring response.

Emails to analyze:
{emails_text}
"""

ACTION_ITEMS_EXTRACTION_PROMPT = """
Analyze these emails and extract ACTION ITEMS - commitments made or requests received.

Two types:
1. PROMISES I MADE: "I'll send you...", "I will review...", "Let me get back to you..."
2. REQUESTS TO ME: "Can you...", "Please send...", "Would you mind..."

For each item extract:
- Action description
- Person involved
- Due date (if mentioned)
- Type: promised_by_me | requested_of_me

Emails to analyze:
{emails_text}
"""

RESPONSE_NEEDED_PROMPT = """
Analyze these emails and identify which need RESPONSES from me.

Look for:
- Direct questions to me
- Unresponded emails from important people
- Requests awaiting my decision/input
- Follow-ups on previous conversations

For each, provide:
- What needs responding to
- Who is waiting
- How long they've been waiting
- Urgency level

Emails to analyze:
{emails_text}
"""
```

#### **Step 1.3: Integration with Existing Email Processor** (Day 4)

Update `echo/email_processor.py`:

```python
class OutlookEmailProcessor:
    def __init__(self):
        # existing init code
        self.email_intelligence = EmailCategorizer(self._get_openai_client())
    
    def get_categorized_email_context(self, days=1):
        """Replace get_email_planning_context with categorized version."""
        emails = self.get_recent_emails(days)
        return self.email_intelligence.categorize_emails(emails)
```

### **Testing Strategy**
- Unit tests for each extraction function
- Integration test with real email data
- Validation that categories are distinct and comprehensive

### **Success Criteria**
- Email briefing shows 3 distinct categories
- Information items are passive/informational
- Action items clearly distinguish promises vs. requests
- Response needed items are sorted by urgency

---

## **Phase 2: Session Notes Intelligence**
**Duration**: 4-5 days  
**Priority**: Medium (existing session data needs better extraction)

### **Objective**
Mine session notes for forward-looking commitments and track completion across multiple sessions.

### **Technical Approach**

#### **Step 2.1: Create Session Analysis System** (Days 1-2)

**New File**: `echo/session_intelligence.py`

```python
class SessionNotesAnalyzer:
    """Extract forward-looking commitments from session notes."""
    
    def __init__(self, openai_client):
        self.client = openai_client
        
    def extract_next_items(self, session_files, days_back=3):
        """Main entry point for session analysis."""
        sessions = self._load_recent_sessions(session_files, days_back)
        next_items = self._extract_forward_looking_items(sessions)
        completion_status = self._track_completion_across_sessions(next_items, sessions)
        
        return {
            'pending_items': self._filter_unaddressed_items(next_items, completion_status),
            'completed_items': self._filter_completed_items(next_items, completion_status),
            'stale_items': self._identify_stale_items(next_items, completion_status, days_back),
            'metadata': {
                'sessions_analyzed': len(sessions),
                'days_back': days_back,
                'analysis_date': datetime.now().isoformat()
            }
        }
    
    def _load_recent_sessions(self, session_files, days_back):
        """Load and parse recent session files."""
        cutoff_date = datetime.now() - timedelta(days=days_back)
        recent_sessions = []
        
        for file_path in session_files:
            if self._get_file_date(file_path) > cutoff_date:
                content = self._read_session_file(file_path)
                recent_sessions.append({
                    'file_path': file_path,
                    'date': self._get_file_date(file_path),
                    'content': content
                })
        
        return sorted(recent_sessions, key=lambda x: x['date'])
    
    def _extract_forward_looking_items(self, sessions):
        """Use LLM to extract 'next' commitments from session notes."""
        # Aggregate all session content
        all_content = "\n\n".join([s['content'] for s in sessions])
        
        prompt = f"""
        Analyze these session notes and extract FORWARD-LOOKING COMMITMENTS.
        
        Look for patterns like:
        - "Next: ..."
        - "TODO: ..."
        - "Follow up on ..."
        - "Need to ..."
        - "Tomorrow I will ..."
        
        For each item, extract:
        - The commitment/task
        - Which session it came from (date)
        - Any mentioned timeline/deadline
        
        Session notes:
        {all_content}
        """
        
        # Process with LLM and return structured data
        
    def _track_completion_across_sessions(self, next_items, sessions):
        """Track which items were addressed in subsequent sessions."""
        completion_map = {}
        
        for item in next_items:
            item_date = item['session_date']
            item_text = item['commitment']
            
            # Look for mentions of this item in later sessions
            later_sessions = [s for s in sessions if s['date'] > item_date]
            
            completion_indicators = self._find_completion_mentions(item_text, later_sessions)
            completion_map[item['id']] = {
                'mentioned_again': len(completion_indicators) > 0,
                'completion_evidence': completion_indicators,
                'days_since_commitment': (datetime.now() - item_date).days
            }
        
        return completion_map
    
    def _find_completion_mentions(self, item_text, later_sessions):
        """Use semantic similarity to find mentions of completion."""
        # Could use embedding similarity or LLM to match
        # "Finished the literature review" matches "Need to do literature review"
        pass
```

#### **Step 2.2: Completion Tracking Logic** (Days 2-3)

```python
def _identify_stale_items(self, next_items, completion_status, max_days=3):
    """Flag items that keep appearing without completion."""
    stale_items = []
    
    for item in next_items:
        status = completion_status[item['id']]
        
        if (status['days_since_commitment'] > max_days and 
            not status['mentioned_again']):
            stale_items.append({
                **item,
                'days_stale': status['days_since_commitment'],
                'last_mentioned': item['session_date']
            })
    
    return stale_items

def _filter_unaddressed_items(self, next_items, completion_status):
    """Return items that still need attention."""
    return [item for item in next_items 
            if not completion_status[item['id']]['completion_evidence']]
```

#### **Step 2.3: Integration with Log Reader** (Day 4)

Update `echo/log_reader.py`:

```python
def get_session_intelligence(days_back=3):
    """Replace basic session reading with intelligent analysis."""
    session_files = get_recent_session_files(days_back)
    analyzer = SessionNotesAnalyzer(get_openai_client())
    return analyzer.extract_next_items(session_files, days_back)
```

### **Success Criteria**
- Session briefing shows pending commitments from recent sessions
- Stale items (>3 days old) are flagged prominently
- Completed items are properly identified and filtered out

---

## **Phase 3: User Config Deadline/Commitment Extraction**
**Duration**: 2-3 days  
**Priority**: Low (should be straightforward data parsing)

### **Objective**
Surface deadlines, recurring events, and birthdays from user config with appropriate lead times.

### **Technical Approach**

#### **Step 3.1: Config Deadline Parser** (Days 1-2)

**New File**: `echo/config_intelligence.py`

```python
class ConfigDeadlineExtractor:
    """Extract and surface commitments from user configuration."""
    
    def get_upcoming_commitments(self, config, days_ahead=7):
        """Main entry point for config-based commitments."""
        return {
            'deadlines': self._extract_deadlines(config, days_ahead),
            'recurring_events': self._extract_recurring_events(config),
            'birthdays': self._extract_birthdays(config, days_ahead=7),  # Week lead time
            'fixed_meetings': self._extract_fixed_meetings(config),
            'metadata': {
                'days_ahead': days_ahead,
                'extracted_at': datetime.now().isoformat()
            }
        }
    
    def _extract_deadlines(self, config, days_ahead):
        """Find upcoming deadlines from config."""
        deadlines = []
        
        # Look in config.deadlines, config.projects[].milestones, etc.
        if hasattr(config, 'deadlines'):
            for deadline in config.deadlines:
                due_date = self._parse_date(deadline.get('due_date'))
                days_until = (due_date - datetime.now().date()).days
                
                if 0 <= days_until <= days_ahead:
                    urgency = self._calculate_urgency(days_until)
                    deadlines.append({
                        'title': deadline.get('title'),
                        'due_date': due_date.isoformat(),
                        'days_until': days_until,
                        'urgency': urgency,
                        'description': deadline.get('description', ''),
                        'project': deadline.get('project')
                    })
        
        return sorted(deadlines, key=lambda x: x['days_until'])
    
    def _extract_birthdays(self, config, days_ahead=7):
        """Find upcoming birthdays with week lead time."""
        birthdays = []
        
        if hasattr(config, 'birthdays'):
            for birthday in config.birthdays:
                next_occurrence = self._calculate_next_birthday(birthday['date'])
                days_until = (next_occurrence - datetime.now().date()).days
                
                if 0 <= days_until <= days_ahead:
                    birthdays.append({
                        'name': birthday['name'],
                        'date': next_occurrence.isoformat(),
                        'days_until': days_until,
                        'age': self._calculate_age(birthday.get('birth_year'), next_occurrence.year)
                    })
        
        return sorted(birthdays, key=lambda x: x['days_until'])
    
    def _extract_recurring_events(self, config):
        """Extract today's recurring events from weekly schedule."""
        today_name = datetime.now().strftime('%A').lower()
        today_schedule = config.weekly_schedule.get(today_name, {})
        
        events = []
        for block_type in ['anchors', 'fixed']:
            for block in today_schedule.get(block_type, []):
                events.append({
                    'title': block.get('task', block.get('label', 'Unknown')),
                    'time': block.get('time', ''),
                    'type': block_type,
                    'category': block.get('category', 'general'),
                    'description': block.get('description', '')
                })
        
        return events
    
    def _calculate_urgency(self, days_until):
        """Calculate urgency based on days until due."""
        if days_until == 0:
            return 'critical'  # Due today
        elif days_until == 1:
            return 'high'      # Due tomorrow
        elif days_until <= 3:
            return 'medium'    # Due this week
        else:
            return 'low'       # Due later
```

### **Success Criteria**
- Commitments panel shows upcoming deadlines with appropriate urgency
- Recurring events for today are displayed
- Birthdays appear with week lead time
- Different urgency levels are visually distinct

---

## **Phase 4: Structured Context Briefing System**
**Duration**: 3-4 days  
**Priority**: High (orchestrates all other phases)

### **Objective**
Replace monolithic context generation with structured, panel-specific system that generates executive summary last.

### **Technical Approach**

#### **Step 4.1: Panel-Specific Prompt System** (Days 1-2)

**Update**: `echo/prompts/context.py`

```python
class StructuredContextBriefing:
    """Generate structured four-panel context briefings."""
    
    def __init__(self, openai_client):
        self.client = openai_client
    
    def build_four_panel_briefing(self, email_context, session_context, config_context):
        """Main orchestration method - generates panels in correct order."""
        
        # Generate data panels first (2, 3, 4)
        email_panel = self._generate_email_panel(email_context)
        session_panel = self._generate_session_panel(session_context)
        commitments_panel = self._generate_commitments_panel(config_context)
        
        # Generate executive summary LAST with full context
        executive_summary = self._generate_executive_summary({
            'email_panel': email_panel,
            'session_panel': session_panel,
            'commitments_panel': commitments_panel
        })
        
        return {
            'executive_summary': executive_summary,
            'email_summary': email_panel,
            'session_notes': session_panel,
            'commitments_deadlines': commitments_panel,
            'generated_at': datetime.now().isoformat()
        }
    
    def _generate_email_panel(self, email_context):
        """Generate formatted email panel from categorized data."""
        # Minimal LLM processing - mostly formatting
        # Input: categorized email data
        # Output: formatted panel with up to 5 items per category
        
        formatted_panel = {
            'information': email_context['information'][:5],
            'action_items': email_context['action_items'][:5], 
            'response_needed': email_context['response_needed'][:5],
            'total_emails_processed': email_context['metadata']['total_processed']
        }
        
        # Optional: brief LLM call to improve formatting/summary
        return formatted_panel
    
    def _generate_session_panel(self, session_context):
        """Generate formatted session panel from analyzed data."""
        # Focus on unaddressed items and stale commitments
        return {
            'pending_commitments': session_context['pending_items'],
            'stale_items': session_context['stale_items'],
            'sessions_analyzed': session_context['metadata']['sessions_analyzed'],
            'oldest_pending_days': max([item.get('days_stale', 0) 
                                      for item in session_context['stale_items']], default=0)
        }
    
    def _generate_commitments_panel(self, config_context):
        """Generate commitments panel - minimal processing needed."""
        # Mostly just organization and formatting
        return {
            'urgent_deadlines': [d for d in config_context['deadlines'] 
                               if d['urgency'] in ['critical', 'high']],
            'upcoming_deadlines': [d for d in config_context['deadlines'] 
                                 if d['urgency'] in ['medium', 'low']],
            'todays_events': config_context['recurring_events'],
            'upcoming_birthdays': config_context['birthdays']
        }
    
    def _generate_executive_summary(self, all_panels):
        """Generate 2-4 sentence synthesis using all panel data."""
        
        prompt = f"""
        Generate a 2-4 sentence executive summary for today's context briefing.
        
        Synthesize patterns across these areas:
        
        Email Summary:
        - {len(all_panels['email_panel']['action_items'])} action items
        - {len(all_panels['email_panel']['response_needed'])} responses needed
        - Key information: {all_panels['email_panel']['information'][:2]}
        
        Session Notes:
        - {len(all_panels['session_panel']['pending_commitments'])} pending commitments
        - {len(all_panels['session_panel']['stale_items'])} stale items (>3 days)
        
        Commitments & Deadlines:
        - {len(all_panels['commitments_panel']['urgent_deadlines'])} urgent deadlines
        - {len(all_panels['commitments_panel']['todays_events'])} events today
        
        Focus on:
        1. Overall workload/intensity for today
        2. Most critical items requiring attention
        3. Any concerning patterns (overdue items, accumulating tasks)
        4. Energy/focus recommendations
        
        Keep it actionable and strategic - what should I know to plan my day effectively?
        """
        
        response = self.client.chat.completions.create(
            model="gpt-4.1-2025-04-14",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=400
        )
        
        return response.choices[0].message.content
```

### **Success Criteria**
- Four distinct panels with appropriate data
- Executive summary reflects patterns across all panels
- Generated last with full context awareness
- Each panel is focused and actionable

---

## **Phase 5: API Integration**
**Duration**: 2-3 days  
**Priority**: High (makes new system accessible)

### **Objective**
Update existing context briefing API endpoint to use new structured system.

### **Technical Approach**

#### **Step 5.1: Update Context Briefing Endpoint** (Days 1-2)

**Update**: `api_server.py`

```python
@app.get("/context-briefing")
async def get_context_briefing():
    """Generate four-panel structured context briefing."""
    try:
        # Initialize intelligence systems
        email_intelligence = EmailCategorizer(_get_openai_client())
        session_intelligence = SessionNotesAnalyzer(_get_openai_client())
        config_intelligence = ConfigDeadlineExtractor()
        briefing_system = StructuredContextBriefing(_get_openai_client())
        
        # Gather raw data
        recent_emails = email_processor.get_recent_emails(days=1) if email_processor else []
        session_files = _get_recent_session_files(days=3)
        
        # Process each intelligence area
        email_context = email_intelligence.categorize_emails(recent_emails)
        session_context = session_intelligence.extract_next_items(session_files)
        config_context = config_intelligence.get_upcoming_commitments(config)
        
        # Generate structured briefing
        briefing = briefing_system.build_four_panel_briefing(
            email_context, session_context, config_context
        )
        
        return {
            "status": "success",
            **briefing
        }
        
    except Exception as e:
        logger.error(f"Context briefing generation failed: {e}")
        
        # Graceful fallback
        return {
            "status": "error",
            "executive_summary": f"Context briefing unavailable: {str(e)}",
            "email_summary": {"information": [], "action_items": [], "response_needed": []},
            "session_notes": {"pending_commitments": [], "stale_items": []},
            "commitments_deadlines": {"urgent_deadlines": [], "todays_events": []},
            "error_details": str(e)
        }

def _get_recent_session_files(days=3):
    """Helper to get recent session files."""
    logs_dir = Path("logs/sessions")
    if not logs_dir.exists():
        return []
    
    cutoff_date = datetime.now() - timedelta(days=days)
    session_files = []
    
    for file_path in logs_dir.glob("*.json"):
        if file_path.stat().st_mtime > cutoff_date.timestamp():
            session_files.append(str(file_path))
    
    return sorted(session_files, key=lambda x: Path(x).stat().st_mtime, reverse=True)
```

### **Success Criteria**
- API returns structured four-panel data
- Error handling provides graceful fallbacks
- Response format matches frontend expectations

---

## **Phase 6: Frontend Panel System**
**Duration**: 4-5 days  
**Priority**: Medium (makes system user-accessible)

### **Objective**
Create intuitive four-panel interface with interactive elements.

### **Technical Approach**

#### **Step 6.1: Panel Component Architecture** (Days 1-2)

**New Components**: `src/components/context-briefing/`

```typescript
// ExecutiveSummaryPanel.tsx
interface ExecutiveSummaryProps {
  summary: string;
  generatedAt: string;
}

export function ExecutiveSummaryPanel({ summary, generatedAt }: ExecutiveSummaryProps) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Executive Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg leading-relaxed">{summary}</p>
        <p className="text-sm text-muted-foreground mt-4">
          Generated {new Date(generatedAt).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}

// EmailSummaryPanel.tsx
interface EmailSummaryProps {
  information: EmailItem[];
  actionItems: EmailItem[];
  responseNeeded: EmailItem[];
  onItemClick: (threadId: string) => void;
}

export function EmailSummaryPanel({ 
  information, 
  actionItems, 
  responseNeeded, 
  onItemClick 
}: EmailSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <EmailCategory 
          title="Information Updates" 
          items={information}
          icon={<Info className="h-4 w-4" />}
          onItemClick={onItemClick}
        />
        
        <EmailCategory 
          title="Action Items" 
          items={actionItems}
          icon={<CheckSquare className="h-4 w-4" />}
          onItemClick={onItemClick}
          showPersonTags={true}
        />
        
        <EmailCategory 
          title="Response Needed" 
          items={responseNeeded}
          icon={<Reply className="h-4 w-4" />}
          onItemClick={onItemClick}
          showUrgency={true}
        />
        
      </CardContent>
    </Card>
  );
}

// EmailCategory.tsx - Reusable category component
interface EmailCategoryProps {
  title: string;
  items: EmailItem[];
  icon: React.ReactNode;
  onItemClick: (threadId: string) => void;
  showPersonTags?: boolean;
  showUrgency?: boolean;
}

function EmailCategory({ 
  title, 
  items, 
  icon, 
  onItemClick, 
  showPersonTags, 
  showUrgency 
}: EmailCategoryProps) {
  if (items.length === 0) {
    return (
      <div>
        <h3 className="flex items-center gap-2 font-semibold mb-2">
          {icon} {title}
        </h3>
        <p className="text-muted-foreground text-sm">No items</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="flex items-center gap-2 font-semibold mb-3">
        {icon} {title}
      </h3>
      <ul className="space-y-2">
        {items.slice(0, 5).map((item, index) => (
          <li key={index}>
            <button
              onClick={() => onItemClick(item.threadId)}
              className="text-left w-full p-2 rounded hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between">
                <span className="flex-1">{item.content}</span>
                <div className="flex items-center gap-2 ml-2">
                  {showPersonTags && (
                    <Badge variant="outline" className="text-xs">
                      {item.person}
                    </Badge>
                  )}
                  {showUrgency && item.urgency && (
                    <Badge 
                      variant={item.urgency === 'high' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {item.urgency}
                    </Badge>
                  )}
                </div>
              </div>
              {showUrgency && item.daysOld && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.daysOld} days old
                </p>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

#### **Step 6.2: Session Notes and Commitments Panels** (Days 2-3)

```typescript
// SessionNotesPanel.tsx
interface SessionNotesProps {
  pendingCommitments: SessionItem[];
  staleItems: SessionItem[];
  sessionsAnalyzed: number;
}

export function SessionNotesPanel({ 
  pendingCommitments, 
  staleItems, 
  sessionsAnalyzed 
}: SessionNotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Session Notes
          <Badge variant="outline" className="ml-2">
            {sessionsAnalyzed} sessions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {staleItems.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-destructive mb-2">
              <AlertTriangle className="h-4 w-4" />
              Stale Items ({staleItems.length})
            </h3>
            <ul className="space-y-2">
              {staleItems.map((item, index) => (
                <li key={index} className="p-2 border-l-2 border-l-destructive bg-destructive/5 rounded">
                  <p>{item.commitment}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.daysStale} days old • From {new Date(item.sessionDate).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div>
          <h3 className="flex items-center gap-2 font-semibold mb-2">
            <Clock className="h-4 w-4" />
            Pending Commitments
          </h3>
          {pendingCommitments.length === 0 ? (
            <p className="text-muted-foreground text-sm">All caught up!</p>
          ) : (
            <ul className="space-y-2">
              {pendingCommitments.map((item, index) => (
                <li key={index} className="p-2 border-l-2 border-l-primary bg-primary/5 rounded">
                  <p>{item.commitment}</p>
                  <p className="text-xs text-muted-foreground">
                    From {new Date(item.sessionDate).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        
      </CardContent>
    </Card>
  );
}

// CommitmentsPanel.tsx
interface CommitmentsProps {
  urgentDeadlines: Deadline[];
  upcomingDeadlines: Deadline[];
  todaysEvents: Event[];
  upcomingBirthdays: Birthday[];
}

export function CommitmentsPanel({ 
  urgentDeadlines, 
  upcomingDeadlines, 
  todaysEvents, 
  upcomingBirthdays 
}: CommitmentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Commitments & Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {urgentDeadlines.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              Urgent Deadlines
            </h3>
            <ul className="space-y-2">
              {urgentDeadlines.map((deadline, index) => (
                <li key={index} className="p-2 border-l-2 border-l-destructive bg-destructive/5 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{deadline.title}</p>
                      <p className="text-sm text-muted-foreground">{deadline.description}</p>
                    </div>
                    <Badge variant="destructive">
                      {deadline.daysUntil === 0 ? 'Today' : `${deadline.daysUntil}d`}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {todaysEvents.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-2">
              <Clock className="h-4 w-4" />
              Today's Events
            </h3>
            <ul className="space-y-1">
              {todaysEvents.map((event, index) => (
                <li key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span>{event.title}</span>
                  <span className="text-sm text-muted-foreground">{event.time}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Similar sections for upcoming deadlines and birthdays */}
        
      </CardContent>
    </Card>
  );
}
```

#### **Step 6.3: Main Context Briefing Page** (Days 3-4)

```typescript
// Update existing context briefing page or create new one
'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

export default function ContextBriefingPage() {
  const { data: briefing, error, isLoading } = useSWR(
    '/api/context-briefing',
    (url) => fetch(`http://localhost:8000${url}`).then(res => res.json()),
    { refreshInterval: 300000 } // Refresh every 5 minutes
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Daily Context Briefing</h1>
        <Badge variant="outline">
          Last updated: {briefing?.generatedAt ? new Date(briefing.generatedAt).toLocaleTimeString() : 'Unknown'}
        </Badge>
      </div>
      
      {/* Executive Summary - Full Width */}
      <ExecutiveSummaryPanel 
        summary={briefing?.executive_summary || ''} 
        generatedAt={briefing?.generatedAt || ''} 
      />
      
      {/* Three Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <EmailSummaryPanel 
          information={briefing?.email_summary?.information || []}
          actionItems={briefing?.email_summary?.action_items || []}
          responseNeeded={briefing?.email_summary?.response_needed || []}
          onItemClick={handleEmailClick}
        />
        
        <SessionNotesPanel 
          pendingCommitments={briefing?.session_notes?.pending_commitments || []}
          staleItems={briefing?.session_notes?.stale_items || []}
          sessionsAnalyzed={briefing?.session_notes?.sessions_analyzed || 0}
        />
        
        <CommitmentsPanel 
          urgentDeadlines={briefing?.commitments_deadlines?.urgent_deadlines || []}
          upcomingDeadlines={briefing?.commitments_deadlines?.upcoming_deadlines || []}
          todaysEvents={briefing?.commitments_deadlines?.todays_events || []}
          upcomingBirthdays={briefing?.commitments_deadlines?.upcoming_birthdays || []}
        />
        
      </div>
      
      {/* Email Thread Popup Modal */}
      <EmailThreadModal 
        isOpen={!!selectedThreadId}
        threadId={selectedThreadId}
        onClose={() => setSelectedThreadId(null)}
      />
      
    </div>
  );
}
```

### **Success Criteria**
- Four-panel layout is visually clear and organized
- Interactive elements (email thread popups) work correctly  
- Responsive design works on different screen sizes
- Real-time data updates via SWR

---

## **Testing & Validation Strategy**

### **Phase-by-Phase Testing**
1. **Email Intelligence**: Test with your actual email data, verify categories are distinct
2. **Session Intelligence**: Test with recent session files, verify completion tracking
3. **Config Intelligence**: Test with your user config, verify deadlines surface correctly
4. **Integration**: Test full pipeline with real data
5. **Frontend**: Test interactive elements and responsiveness

### **Success Metrics**
- **Executive Summary**: Actually synthesizes patterns vs. generic text
- **Email Categories**: Clear distinction between information/actions/responses
- **Session Intelligence**: Catches genuinely unaddressed commitments
- **Config Integration**: Surfaces relevant deadlines with appropriate urgency
- **User Experience**: Context briefing drives actionable daily planning

### **Performance Considerations**
- **Token Usage**: Email categorization will be highest usage - monitor costs
- **Caching**: Consider caching results for 15-30 minutes to reduce API calls
- **Fallback Handling**: Graceful degradation when any component fails
- **Sunday Lookback**: Only extend email timeframe on Sundays as specified

---

## **Implementation Timeline**

### **Week 1**: Email Intelligence (Phase 1)
- Days 1-2: Core categorization system
- Days 3-4: LLM prompts and integration
- Day 5: Testing and refinement

### **Week 2**: Session & Config Intelligence (Phases 2-3)
- Days 1-3: Session analysis system
- Days 4-5: Config deadline extraction

### **Week 3**: System Integration (Phases 4-5)
- Days 1-2: Structured briefing orchestration
- Days 3-4: API endpoint updates
- Day 5: End-to-end testing

### **Week 4**: Frontend Implementation (Phase 6)
- Days 1-2: Panel components
- Days 3-4: Main page integration
- Day 5: Polish and responsive design

### **Total Duration**: 4 weeks
### **Estimated Effort**: 20-25 development days

---

## **Risk Mitigation**

### **Technical Risks**
- **LLM Accuracy**: Email categorization may misclassify items
  - *Mitigation*: Extensive testing with real data, user feedback loops
- **Session Parsing**: Session notes may be inconsistent format
  - *Mitigation*: Robust parsing with fallback to simpler extraction
- **Performance**: Multiple LLM calls may be slow
  - *Mitigation*: Implement caching and asynchronous processing

### **Product Risks**
- **Information Overload**: Four panels may be too much information
  - *Mitigation*: Progressive disclosure, collapsible sections
- **Maintenance Burden**: Complex system may be hard to maintain
  - *Mitigation*: Clear separation of concerns, comprehensive testing

---

## **Success Definition**

The redesigned context briefing system succeeds when:

1. **Executive Summary** provides genuinely useful 2-4 sentence daily overview
2. **Email Summary** enables quick action on categorized email items
3. **Session Notes** catches unaddressed commitments from recent work
4. **Commitments Panel** surfaces relevant deadlines with appropriate urgency
5. **Overall Experience** drives better daily planning decisions

The current "Awaiting sample list from Jordon Wade; unknown high urgency email action pending" should become something like:

> "Heavy email day with 3 urgent responses needed including legal contract review (due today). Two commitments from Monday's session remain unaddressed: literature review and budget analysis. Important team meeting at 2pm with prep needed."

This system transforms generic, unhelpful summaries into structured, actionable intelligence that actually improves daily planning effectiveness.