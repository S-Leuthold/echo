```markdown
# Echo – Product Requirements Document (PRD)

## Overview

Echo is a deterministic AI assistant for daily planning, reflection, and documentation. It scaffolds each day through structured routines, nudges, and journaling—anchored by a YAML config and guided by a strict behavioral philosophy. Echo is built for one user: Dr. Sam Leuthold. It is not general-purpose, and it is not a chatbot.

---

## Problem Statement

Sam's work and personal life are governed by complex routines, evolving project deadlines, and deep work requirements. Current tools (Notion, calendar, task managers, ChatGPT) are fragmented and reactive. Echo fills the gap by providing a **proactive, consistent, and legible scaffolding system** that reduces decision fatigue and friction while documenting the shape of each day.

---

## Goals

- Generate a daily scaffold based on user-defined rules, routines, and anchors
- Prompt for intentional planning and reflection in a consistent format
- Surface project status and momentum to inform scheduling decisions
- Maintain a structured personal archive (Markdown + Notion sync)
- Nudge when planning is missing or incomplete
- Never guess or assume intent—always suggest, never command

---

## Non-Goals

- No emotional mimicry or anthropomorphizing
- No general-purpose chat interaction
- No behavioral scoring, shaming, or gamification
- No fully automated rescheduling
- No persistent cloud-based memory or storage by default

---

## User Persona

- **Primary User:** Dr. Sam Leuthold, research scientist and daily system optimizer
- **Needs:** Integrated routines, structure, journaled logs, deep work protection
- **Values:** Clarity, predictability, control, reflection, autonomy

---

## Core Features (MVP)

| Module            | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| Daily Scaffold    | Generates structured time blocks based on YAML + calendar context          |
| Reflection Logger | Prompts and captures end-of-day log in structured Markdown format           |
| Planning Prompt   | Morning prompt with context-aware reflection and scheduling scaffold        |
| Rules Engine      | Applies scheduling logic based on anchor blocks, overrides, priorities      |
| Notion Integration| Two-way sync with Notion (project metadata, logs, progress references)      |
| Push Notifications| Nudge if day is unplanned (e.g., 8 AM check) or log is missing (evening)    |
| Config Schema     | User-defined YAML config governs scheduling, metadata, anchors, routines    |

---

## Stretch Features

| Feature                 | Description                                                            |
|--------------------------|------------------------------------------------------------------------|
| Profiles / Overrides     | Config profiles for travel, holidays, altered routines                 |
| Timeline Integration     | Project milestones and deadlines influence scaffolding                 |
| Mobile UI (Swift/React)  | Local client app for phone-based review and journaling                 |
| GPT Reflection Summary   | Optional opt-in insight generation across logs                         |
| Plugin Hooks             | Structured module extension points for future features                 |

---

## Architecture Summary

```text
User Config (YAML)
       ↓
[Echo Core Engine]
  ├── Rules Evaluator
  ├── Scheduler (anchor blocks, overrides, routines)
  ├── Prompt System (planning + reflection)
  ├── Log Writer (Markdown + Notion sync)
  └── Notification Engine (push if missing structure)
```

---

## Data Flows

- **Config Input:** YAML (local, structured)
- **Daily Plan:** Deterministically constructed from ruleset
- **Logs:** Saved as local Markdown, optionally written to Notion
- **Project Links:** Referenced via metadata keys (e.g., `project_id: MIR_stack`)
- **APIs (optional):** TrainerRoad, Calendar (read-only), OpenAI (explicit-only)

---

## Success Criteria (30 Days)

- Daily scaffolds are generated and logged with high consistency
- Friction to start the day is reduced
- Logs are formatted and searchable
- Project references surface naturally during scheduling
- Echo does not become intrusive or off-course
- System feels like an assistant—not a second brain, not a chatbot

---

## Open Questions

1. Where should project metadata live—YAML, Notion, or both?
2. How will we support push notifications on mobile?
3. How much autonomy (if any) should Echo be allowed in re-scaffolding missed time?
4. Should we maintain a formal state engine or keep everything stateless + queryable?
5. How should we structure fallback logic when context is ambiguous?

---

## Timeline (draft, to be refined)

| Phase                  | Target Date   | Milestone                              |
|------------------------|---------------|----------------------------------------|
| Core rule engine       | July 1        | Scheduler logic with config + anchors  |
| Prompt system v1       | July 5        | Planning + reflection scaffolds        |
| Log writer + schema    | July 10       | Markdown logger + file structure       |
| Notion API integration | July 15       | Project link + daily log sync          |
| Push notifications     | July 20       | Time-based nudge system                |
| Mobile UI scaffold     | August        | Swift client with reflection support   |

---

# Echo is not productivity software.  
# It is **scaffolding** for your time, memory, and intention.
```
