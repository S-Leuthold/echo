# Meeting Summarizer Architecture

## Overview
Intelligent meeting preparation and summarization that learns from recurring meetings and provides structured prep documents and summaries.

## Core Workflow

### Pre-Meeting Preparation
```
┌─────────────────────────────────────────────────────────┐
│ Meeting Prep Wizard                                    │
├─────────────────────────────────────────────────────────┤
│ 1. Meeting Context                                     │
│    • Meeting type (1:1, standup, review, etc.)        │
│    • Participants and roles                            │
│    • Previous meeting date                             │
│                                                       │
│ 2. Historical Analysis                                 │
│    • Previous action items                             │
│    • Recurring topics                                 │
│    • Participant patterns                              │
│    • Meeting effectiveness trends                      │
│                                                       │
│ 3. Prep Document Generation                            │
│    • Action item checklist                            │
│    • Discussion topics                                │
│    • Questions to ask                                 │
│    • Context from previous meetings                   │
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