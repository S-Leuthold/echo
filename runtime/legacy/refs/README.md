# Echo Journal System

This directory contains journal entries and reflection data for the Echo system.

## File Structure

```
refs/
├── README.md                    # This file
├── patterns/                    # LLM-generated pattern insights
├── YYYY-MM-DD-evening_reflection.md  # Evening reflection entries
├── YYYY-MM-DD-quick_note.md    # Quick journal notes
├── YYYY-MM-DD-insight.md       # LLM-generated insights
└── YYYY-MM-DD-pattern.md       # Identified patterns
```

## Journal Entry Types

### Evening Reflection
Structured daily reflection with prompts for:
- What went well
- Challenges faced
- Learnings
- Energy level and mood
- Patterns noticed
- Tomorrow's focus and energy
- Non-negotiables and things to avoid

### Quick Notes
Simple journal entries for capturing thoughts, ideas, or reminders.

### Insights
LLM-generated insights based on journal patterns and analysis.

### Patterns
Identified patterns and trends from journal entries.

## Usage

### CLI Commands

```bash
# Evening reflection session
echo journal evening

# Quick journal note
echo journal quick

# Search journal entries
echo journal search

# View insights and patterns
echo journal insights
```

### File Format

Journal entries use YAML front matter for metadata and Markdown for content:

```yaml
---
date: 2025-01-20
type: evening_reflection
created_at: 2025-01-20T18:30:00
tags: [evening, reflection, daily]
linked_projects: [echo_dev]
---

## What Went Well

Completed the journal system implementation...

## Challenges

Some test failures initially...

## Learnings

Better to write tests first...
```

## Integration

The journal system integrates with:
- **Planning**: Evening reflections inform next-day planning
- **Analytics**: Journal data enhances productivity insights
- **Projects**: Entries can be linked to specific projects
- **Sessions**: Journal context improves session planning

## Future Features

- LLM-generated insights from journal patterns
- Historical trend analysis
- Mood and energy correlation with productivity
- Goal progress tracking
- Journal-based planning suggestions 