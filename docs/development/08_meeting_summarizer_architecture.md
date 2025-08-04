# Meeting Intelligence Architecture

## Overview
A comprehensive meeting system that integrates seamlessly with Echo's project management and session tracking. Combines Notion-style collaborative note-taking with Granola-style live transcription to create rich, contextual meeting documentation that automatically integrates into project workflows.

## Core Philosophy
Meetings should be treated as **special project sessions** that include:
- Pre-meeting context gathering and preparation
- Live transcription with minimal user friction  
- AI-powered synthesis of transcript + user notes
- Automatic integration into project documentation

## Four-Phase Meeting Workflow

### Phase 1: Pre-Meeting Planning (20-30 minutes)
```
┌─────────────────────────────────────────────────────────┐
│ Intelligent Meeting Preparation                        │
├─────────────────────────────────────────────────────────┤
│ 1. Context Gathering (AI-Powered)                     │
│    • Previous meetings with same participants          │
│    • Recent project updates & activity                 │
│    • Outstanding action items                          │
│    • Participant history & preferences                 │
│                                                       │
│ 2. Meeting Classification                              │
│    • All-hands meeting                                 │
│    • One-on-one session                               │
│    • Project-specific discussion                       │
│    • Recurring standup/review                         │
│                                                       │
│ 3. Prep Time Configuration                            │
│    • User-defined prep duration (5-45 min)           │
│    • Meeting type defaults                            │
│    • Skip option for informal meetings                │
│                                                       │
│ 4. Preparation Deliverables                           │
│    • Generated agenda suggestions                      │
│    • Key questions to explore                         │
│    • User's personal meeting goals                    │
│    • Context summary from previous meetings           │
└─────────────────────────────────────────────────────────┘

### Phase 2: Live Meeting Session
```
┌─────────────────────────────────────────────────────────┐
│ Meeting Session (Special Session Type)                 │
├─────────────────────────────────────────────────────────┤
│ 1. System Audio Capture                               │
│    • Background transcription (headphone-compatible)   │
│    • Real-time speech-to-text processing              │
│    • Minimal system resource usage                     │
│                                                       │
│ 2. User Note Interface                                 │
│    • Lightweight note-taking overlay                  │
│    • Quick thought capture                             │
│    • Key moment marking                               │
│    • Action item flagging                             │
│                                                       │
│ 3. Session Management                                  │
│    • Start/pause/end controls                         │
│    • Project association                              │
│    • Participant tracking                             │
│    • Meeting duration logging                         │
└─────────────────────────────────────────────────────────┘

### Phase 3: Post-Meeting Synthesis
```
┌─────────────────────────────────────────────────────────┐
│ AI-Powered Meeting Analysis                            │
├─────────────────────────────────────────────────────────┤
│ 1. Content Processing                                  │
│    • Transcript cleanup & formatting                  │
│    • User note integration                            │
│    • Speaker identification                           │
│    • Topic segmentation                               │
│                                                       │
│ 2. Executive Summary Generation                        │
│    • Key decisions made                               │
│    • Action items assigned                            │
│    • Important discussions                            │
│    • Follow-up items                                  │
│                                                       │
│ 3. Enhanced Meeting Notes                              │
│    • User notes + transcript synthesis                │
│    • Structured meeting summary                       │
│    • Project impact analysis                          │
│    • Next meeting suggestions                         │
└─────────────────────────────────────────────────────────┘

### Phase 4: Project Integration
```
┌─────────────────────────────────────────────────────────┐
│ Automated Project Documentation                        │
├─────────────────────────────────────────────────────────┤
│ 1. Meeting Summaries Repository                       │
│    • Chronological meeting archive                    │
│    • Searchable by participants/topics                │
│    • Direct access to full summaries                  │
│                                                       │
│ 2. Project Integration (Weekly Sync)                  │
│    • "Meeting Insights" section updates               │
│    • Project milestone updates                        │  
│    • Action item integration                          │
│    • Context for future planning                      │
│                                                       │
│ 3. Intelligence Feedback Loop                         │
│    • Meeting effectiveness metrics                    │
│    • Participant interaction patterns                 │
│    • Topic evolution tracking                         │
│    • Preparation improvement suggestions              │
└─────────────────────────────────────────────────────────┘

## Technical Implementation

### System Audio Capture
```python
# Core audio capture system
class MeetingAudioCapture:
    def __init__(self):
        self.audio_source = SystemAudioCapture()  # Platform-specific
        self.transcription = RealtimeTranscriber()
        self.session_manager = MeetingSessionManager()
    
    def start_recording(self, meeting_config):
        # Begin system audio capture (headphone-compatible)
        # Start real-time transcription pipeline
        # Initialize user note interface
        pass
```

**Audio Capture Options:**
- **macOS**: Core Audio with `kAudioUnitProperty_EnableIO`
- **Windows**: WASAPI loopback capture
- **Linux**: PulseAudio/ALSA monitoring
- **Cross-platform**: Consider PortAudio wrapper

### Configuration Integration

#### Planning Stage Integration
```yaml
# User config.yaml addition
meetings:
  default_prep_time: 20  # minutes
  meeting_types:
    one_on_one:
      prep_time: 15
      auto_project_link: true
    all_hands:
      prep_time: 30
      context_depth: "high"
    standup:
      prep_time: 5
      template: "standup_template"
```

#### Schedule Block Enhancement
```yaml
blocks:
  - label: "Meeting with John"
    type: "meeting"
    meeting_config:
      type: "one_on_one" 
      project: "Echo Development"
      prep_time: 15
      participants: ["john@example.com"]
```

### Data Models

#### Meeting Session
```python
class MeetingSession(BaseModel):
    session_id: str
    meeting_type: str  # one_on_one, all_hands, project_specific
    project_ids: List[str]
    participants: List[str]
    prep_time_minutes: int
    
    # Pre-meeting
    prep_notes: str
    context_summary: str
    agenda_items: List[str]
    
    # During meeting
    user_notes: str
    audio_duration: int
    key_moments: List[KeyMoment]
    
    # Post-meeting  
    transcript: Optional[str]  # Decide: store or discard?
    executive_summary: str
    action_items: List[ActionItem]
    enhanced_notes: str
    
    # Integration
    project_updates: List[ProjectUpdate]
```

#### Meeting Intelligence
```python
class MeetingIntelligence(BaseModel):
    meeting_id: str
    effectiveness_score: float
    key_topics: List[str]
    decision_points: List[Decision]
    follow_up_suggestions: List[str]
    next_meeting_prep: str
```

## Integration Points

### Calendar Integration
- Auto-detect scheduled meetings
- Trigger prep reminders
- Block meeting prep time
- Post-meeting processing slots

### Project System Integration  
- Automatic project association
- Meeting insights sections
- Action item to task conversion
- Timeline/milestone updates

### Session System Integration
- Meeting sessions as special session type
- Standard session logging format
- Analytics integration
- Weekly summary inclusion

### Weekly Sync Enhancement
```python
# Enhanced weekly sync with meeting intelligence
def generate_weekly_sync(project_id: str, week_range: tuple):
    sessions = get_sessions(project_id, week_range)
    meetings = get_meetings(project_id, week_range)  # New
    
    return {
        "sessions": analyze_sessions(sessions),
        "meetings": analyze_meetings(meetings),  # New
        "combined_insights": synthesize_work_and_meetings(sessions, meetings)  # New
    }
```

## Open Questions & Decisions

### Transcript Storage
**Options:**
1. **Store everything**: Full searchable archive
2. **Summary only**: Discard transcript after processing  
3. **User choice**: Per-meeting storage decision
4. **Time-based**: Keep for 30 days, then discard

**Recommendation**: Start with summary-only, add transcript storage as optional feature

### Privacy & Security
- Local-only processing vs cloud transcription
- Participant consent workflows
- Data retention policies
- Meeting sensitivity classification

### Performance Considerations
- Real-time transcription resource usage
- Large meeting file processing
- Search index optimization
- Background processing queues

## Future Enhancements

### Advanced Features
- Multi-language transcription
- Speaker diarization improvements
- Meeting effectiveness coaching
- Calendar integration automation
- Mobile meeting capture

### AI Capabilities
- Meeting outcome prediction
- Optimal meeting length suggestions
- Participant engagement analysis
- Topic drift detection
- Follow-up reminder intelligence

This architecture positions Echo's meeting system as a comprehensive solution that bridges the gap between live transcription tools and project management systems, creating a unified workflow for meeting preparation, capture, and integration.
└─────────────────────────────────────────────────────────┘
```

### Post-Meeting Processing
```
┌─────────────────────────────────────────────────────────┐
│ Meeting Summary Generation                             │
├─────────────────────────────────────────────────────────┤
│ 1. Transcript Input                                    │
│    • Raw meeting transcript                            │
│    • Audio file (optional)                            │
│    • Meeting notes                                    │
│                                                       │
│ 2. LLM Analysis                                       │
│    • Extract action items                              │
│    • Identify decisions made                           │
│    • Capture key insights                              │
│    • Note follow-up items                             │
│                                                       │
│ 3. Structured Output                                   │
│    • Action items with owners                         │
│    • Decisions and rationale                          │
│    • Key insights and learnings                       │
│    • Next steps and timeline                          │
└─────────────────────────────────────────────────────────┘
```

## Data Structure

### Meeting Template
```yaml
meeting_id: "weekly-standup-2025-07-19"
type: "standup"
participants: ["Sam", "Alice", "Bob"]
project: "Echo Development"
scheduled_time: "2025-07-19T10:00:00Z"
duration_minutes: 30

# Pre-meeting prep
prep_document:
  previous_action_items:
    - "Sam: Fix emoji handling in analytics"
    - "Alice: Review iOS app architecture"
    - "Bob: Set up meeting summarizer"
  
  recurring_topics:
    - "Project progress updates"
    - "Blockers and challenges"
    - "Next week planning"
  
  suggested_questions:
    - "What blockers do you have?"
    - "What's your main focus this week?"
    - "Any dependencies on other team members?"
  
  context_from_history:
    - "Last week: Emoji issue was blocking analytics"
    - "Alice mentioned iOS app complexity concerns"
    - "Bob suggested meeting summarizer feature"

# Post-meeting summary
summary:
  action_items:
    - owner: "Sam"
      item: "Implement git integration for session logging"
      due_date: "2025-07-22"
      priority: "high"
  
  decisions_made:
    - decision: "Use SwiftUI for iOS app"
      rationale: "Better performance and native feel"
      impact: "2-week development timeline"
  
  key_insights:
    - "Team prefers next-day planning over same-day"
    - "Session logging needs external tool integration"
    - "Meeting summarizer is high priority"
  
  next_steps:
    - "Sam: Start iOS app development"
    - "Alice: Research SwiftUI patterns"
    - "Bob: Design meeting summarizer UI"
  
  meeting_effectiveness:
    - "Focused discussion: 8/10"
    - "Action items clear: 9/10"
    - "Time well used: 7/10"
```

## Implementation Components

### 1. Meeting Type Detection
```python
def detect_meeting_type(meeting_data):
    """Detect meeting type from calendar data."""
    meeting_types = {
        "standup": ["standup", "daily", "scrum"],
        "one_on_one": ["1:1", "one on one", "check-in"],
        "review": ["review", "retrospective", "post-mortem"],
        "planning": ["planning", "sprint", "roadmap"],
        "technical": ["technical", "architecture", "design"]
    }
    
    for meeting_type, keywords in meeting_types.items():
        if any(keyword in meeting_data["title"].lower() for keyword in keywords):
            return meeting_type
    
    return "general"
```

### 2. Historical Analysis
```python
def analyze_meeting_history(meeting_type, participants, project):
    """Analyze historical meeting data."""
    # Find similar meetings
    similar_meetings = find_similar_meetings(meeting_type, participants, project)
    
    # Extract patterns
    patterns = {
        "action_items": extract_action_item_patterns(similar_meetings),
        "recurring_topics": extract_topic_patterns(similar_meetings),
        "participant_patterns": extract_participant_patterns(similar_meetings),
        "effectiveness_trends": analyze_effectiveness(similar_meetings)
    }
    
    return patterns
```

### 3. Prep Document Generator
```python
def generate_prep_document(meeting_data, historical_patterns):
    """Generate meeting prep document."""
    prompt = f"""
    Generate a meeting prep document for:
    Meeting: {meeting_data}
    Historical Patterns: {historical_patterns}
    
    Include:
    1. Previous action items that need follow-up
    2. Recurring topics to discuss
    3. Suggested questions based on patterns
    4. Context from previous meetings
    5. Meeting effectiveness insights
    
    Format as structured markdown.
    """
    
    return call_llm(prompt)
```

### 4. Transcript Processor
```python
def process_meeting_transcript(transcript, prep_document):
    """Process meeting transcript into structured summary."""
    prompt = f"""
    Process this meeting transcript into a structured summary.
    
    Prep Document: {prep_document}
    Transcript: {transcript}
    
    Extract:
    1. Action items with owners and due dates
    2. Decisions made with rationale
    3. Key insights and learnings
    4. Next steps and timeline
    5. Meeting effectiveness metrics
    
    Use ONLY information from the transcript.
    Do not hallucinate or assume.
    """
    
    return call_llm(prompt)
```

## CLI Integration

### New Commands
```bash
echo meeting prep <meeting_id>     # Generate prep document
echo meeting summary <transcript>   # Process transcript
echo meeting history <meeting_type> # View meeting history
echo meeting patterns               # Analyze meeting patterns
echo meeting effectiveness          # Meeting effectiveness trends
```

### Meeting Workflow
```bash
# Before meeting
echo meeting prep "weekly-standup"

# After meeting
echo meeting summary "transcript.txt"

# View patterns
echo meeting patterns "standup"
```

## Implementation Plan

### Phase 1: Basic Meeting Support
- [ ] Meeting type detection
- [ ] Basic prep document generation
- [ ] Simple transcript processing
- [ ] Action item extraction

### Phase 2: Historical Analysis
- [ ] Meeting history analysis
- [ ] Pattern recognition
- [ ] Effectiveness tracking
- [ ] Recurring topic identification

### Phase 3: Advanced Features
- [ ] Audio transcript processing
- [ ] Real-time meeting notes
- [ ] Meeting effectiveness predictions
- [ ] Automated follow-up scheduling

## Benefits

### For Users
- **Better preparation**: Structured prep documents
- **Action tracking**: Clear action items with owners
- **Meeting insights**: Pattern recognition and trends
- **Time efficiency**: Focused, effective meetings

### For Echo
- **Meeting intelligence**: Learns from meeting patterns
- **Structured data**: Rich meeting analytics
- **User engagement**: Valuable meeting insights
- **Productivity gains**: Better meeting outcomes

## Technical Considerations

### Data Privacy
- **Local processing**: All data stays on device
- **No cloud storage**: Meeting data remains private
- **User control**: Full control over meeting data

### Integration Points
- **Calendar**: Read meeting details
- **Email**: Send summaries and action items
- **Project management**: Link action items to projects
- **Analytics**: Meeting effectiveness metrics 