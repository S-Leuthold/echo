# Journaling & Next-Day Planning Architecture

## Overview
Echo becomes a comprehensive daily reflection and planning system where users journal about their day and plan for tomorrow in one integrated session.

## Core Workflow

### Evening Routine (End of Day)
```
┌─────────────────────────────────────────────────────────┐
│ Evening Reflection & Tomorrow's Planning               │
├─────────────────────────────────────────────────────────┤
│ 1. Journal Today's Experience                         │
│    • What went well?                                  │
│    • What challenges did you face?                    │
│    • What did you learn?                              │
│    • How did you feel?                                │
│    • What patterns did you notice?                    │
│                                                       │
│ 2. Plan Tomorrow's Day                                │
│    • What's your main focus?                          │
│    • What tasks need attention?                       │
│    • What energy level do you expect?                 │
│    • Any non-negotiables?                             │
│                                                       │
│ 3. LLM Integration                                    │
│    • Surface patterns from recent days                │
│    • Suggest optimizations                            │
│    • Remember important context                        │
└─────────────────────────────────────────────────────────┘
```

## Data Structure

### Journal Entry Format
```yaml
date: 2025-07-19
type: "evening_reflection"
content:
  what_went_well: "Completed the project creation wizard"
  challenges: "Emoji handling in analytics still needs work"
  learnings: "Users prefer next-day planning over same-day"
  energy_level: "medium"
  mood: "productive"
  patterns_noticed: "I work best in 90-minute blocks"
  tomorrow_focus: "Fix emoji issue and start iOS app"
  tomorrow_energy: "high"
  non_negotiables: "none"
  avoid_tomorrow: "meetings before 10am"
```

### Enhanced Daily Log
```yaml
date: 2025-07-19
planning_session:
  journal_entry: "refs/2025-07-19-evening.md"
  next_day_plan: "logs/2025-07-20-log.md"
  llm_insights: "refs/2025-07-19-insights.md"
execution:
  blocks: [...]
  sessions: [...]
  notes: [...]
```

## LLM Integration Points

### 1. Pattern Recognition
- **Input**: Last 7-30 days of journal entries
- **Output**: Identified patterns, trends, insights
- **Usage**: Surface during planning sessions

### 2. Context Memory
- **Input**: All historical journal entries
- **Output**: Relevant context for current planning
- **Usage**: "Remember when you worked on X..."

### 3. Optimization Suggestions
- **Input**: Recent performance + goals
- **Output**: Scheduling and workflow suggestions
- **Usage**: "Based on your patterns, try..."

## Implementation Plan

### Phase 1: Basic Journaling
- [ ] Add journal prompts to evening planning
- [ ] Store journal entries in `refs/` directory
- [ ] Integrate with existing planning workflow
- [ ] Basic LLM pattern recognition

### Phase 2: Enhanced Integration
- [ ] LLM context memory system
- [ ] Pattern-based suggestions
- [ ] Historical trend analysis
- [ ] Cross-reference with project logs

### Phase 3: Advanced Features
- [ ] Mood and energy tracking
- [ ] Goal progress correlation
- [ ] Predictive planning assistance
- [ ] Export insights and reports

## CLI Integration

### New Commands
```bash
echo journal          # Start evening reflection
echo reflect          # Quick journal entry
echo insights         # View LLM-generated insights
echo patterns         # Show recent patterns
echo remember <query> # Search journal history
```

### Planning Workflow Update
```bash
echo plan             # Evening: journal + plan tomorrow
echo plan --today     # Morning: quick today planning
echo plan --next      # Explicit next-day planning
```

## File Structure
```
echo/
├── logs/                    # Daily execution logs
│   └── 2025-07-19-log.md
├── refs/                    # Journal entries & insights
│   ├── 2025-07-19-evening.md
│   ├── 2025-07-19-insights.md
│   └── patterns/
├── projects/                # Project logs (unchanged)
└── config/                  # Configuration (unchanged)
```

## Benefits

### For Users
- **Reflection**: Structured daily reflection
- **Memory**: LLM remembers important context
- **Patterns**: Surface insights about productivity
- **Optimization**: Data-driven planning improvements

### For Echo
- **Richer context**: More data for better planning
- **Learning system**: Improves over time
- **User engagement**: Daily reflection habit
- **Valuable insights**: Users see real value in journaling 