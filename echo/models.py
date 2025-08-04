# ==============================================================================
# FILE: echo/models.py
# AUTHOR: Dr. Sam Leuthold
# PROJECT: Echo
#
# PURPOSE:
#   Defines the core, typed data structures used throughout the Echo application.
#   These dataclasses serve as the canonical, in-memory representation of both the
#   user's configuration and the dynamically generated schedule plan. They are the
#   "single source of truth" for what data looks like in the system.
#
# DEPENDS ON:
#   - None (This module has no internal project dependencies)
#
# DEPENDED ON BY:
#   - echo.config_loader (constructs Config, Project, etc. from YAML)
#   - echo.scheduler (uses Config to produce a list of Blocks)
#   - echo.prompt_engine (uses Config and Blocks to build prompts)
#   - echo.cli (orchestrates the flow of these data objects)
#   - tests/* (the test suite heavily validates these models)
# ==============================================================================

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import time, date, datetime
from enum import Enum
from typing import Dict, List, Optional, Any

# Defines the public API for this module.
__all__ = [
    "BlockType",
    "Block",
    "Defaults",
    "Project",
    "Profile",
    "Config",
    "JournalEntryType",
    "JournalEntry",
    "EveningReflection",
    "JournalPlanningContext",
<<<<<<< HEAD
=======
    "ConversationStage",
    "ConversationMessage",
    "ConversationState",
    "DomainDetection",
    "ExpertPersona",
>>>>>>> feature/adaptive-coaching-foundation
]


class BlockType(str, Enum):
    """
    The canonical set of categories for any element on the schedule.
    Using an Enum here prevents ambiguity and typo-related bugs.
    """
    ANCHOR = "anchor"   # A fixed, non-negotiable event (e.g., wake-up, sleep)
    FIXED  = "fixed"    # A scheduled appointment with a hard start/end time
    FLEX   = "flex"     # A task that can be moved by the LLM (e.g., deep work)


class JournalEntryType(str, Enum):
    """
    The types of journal entries that can be created.
    Each type serves a different purpose in the reflection and planning workflow.
    """
    EVENING_REFLECTION = "evening_reflection"  # Daily evening reflection
    QUICK_NOTE = "quick_note"                  # Quick journal entry
    INSIGHT = "insight"                         # LLM-generated insight
    PATTERN = "pattern"                         # Identified pattern or trend


@dataclass
class JournalEntry:
    """
    Represents a journal entry with structured data for reflection and planning.
    Journal entries provide context for LLM planning and enable pattern recognition.
    """
    date: date
    entry_type: JournalEntryType
    content: Dict[str, str]  # Structured content (e.g., {"what_went_well": "...", "challenges": "..."})
    created_at: datetime = field(default_factory=datetime.now)
    tags: List[str] = field(default_factory=list)
    linked_projects: List[str] = field(default_factory=list)  # Project IDs this entry relates to
    
    def to_dict(self) -> Dict:
        """Serializes the JournalEntry into a JSON-safe dictionary."""
        return {
            "date": self.date.isoformat(),
            "entry_type": self.entry_type.value,
            "content": self.content,
            "created_at": self.created_at.isoformat(),
            "tags": self.tags,
            "linked_projects": self.linked_projects,
        }


@dataclass
class EveningReflection:
    """
    Represents a complete evening reflection session including the reflection
    and the planning context for tomorrow.
    """
    reflection: JournalEntry
    tomorrow_plan: List[Block]
    planning_context: Dict[str, str]  # Key planning insights for tomorrow
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict:
        """Serializes the EveningReflection into a JSON-safe dictionary."""
        return {
            "reflection": self.reflection.to_dict(),
            "tomorrow_plan": [block.to_dict() for block in self.tomorrow_plan],
            "planning_context": self.planning_context,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class JournalPlanningContext:
    """
    Extracted planning context from journal entries for use in planning prompts.
    """
    recent_mood: str
    energy_trend: str
    productivity_patterns: List[str] = field(default_factory=list)
    avoid_patterns: List[str] = field(default_factory=list)
    focus_areas: List[str] = field(default_factory=list)
    non_negotiables: List[str] = field(default_factory=list)
    energy_prediction: Optional[str] = None
    mood_prediction: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Serializes the JournalPlanningContext into a JSON-safe dictionary."""
        return {
            "recent_mood": self.recent_mood,
            "energy_trend": self.energy_trend,
            "productivity_patterns": self.productivity_patterns,
            "avoid_patterns": self.avoid_patterns,
            "focus_areas": self.focus_areas,
            "non_negotiables": self.non_negotiables,
            "energy_prediction": self.energy_prediction,
            "mood_prediction": self.mood_prediction,
        }
<<<<<<< HEAD
=======


class ConversationStage(str, Enum):
    """
    The stages of the adaptive expert coaching conversation flow.
    Each stage has different AI behavior and user interaction patterns.
    """
    DISCOVERY = "discovery"           # Natural conversation to understand project
    CONFIRMATION = "confirmation"     # Project summary validation and domain detection
    EXPERT_COACHING = "expert_coaching"  # Domain-specific strategic guidance


@dataclass
class ConversationMessage:
    """
    Represents a single message in the conversation history.
    Used for context building and conversation flow management.
    """
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)  # Additional context like confidence scores
    
    def to_dict(self) -> Dict:
        """Serializes the ConversationMessage into a JSON-safe dictionary."""
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


@dataclass
class DomainDetection:
    """
    Results of domain detection analysis for expert persona selection.
    Contains confidence scores and reasoning for transparent decision-making.
    """
    domain: str  # Detected domain (e.g., "academic_writing", "software_development")
    confidence: float  # Confidence score (0.0 to 1.0)
    alternative_domains: List[tuple[str, float]] = field(default_factory=list)  # (domain, confidence) pairs
    reasoning: str = ""  # Explanation of detection logic for transparency
    signals_detected: Dict[str, Any] = field(default_factory=dict)  # Raw analysis signals
    
    def to_dict(self) -> Dict:
        """Serializes the DomainDetection into a JSON-safe dictionary."""
        return {
            "domain": self.domain,
            "confidence": self.confidence,
            "alternative_domains": self.alternative_domains,
            "reasoning": self.reasoning,
            "signals_detected": self.signals_detected,
        }


@dataclass
class ExpertPersona:
    """
    Configuration for a domain-specific expert persona.
    Contains prompts, methodologies, and behavioral patterns for authentic expertise.
    """
    domain: str  # Domain identifier (e.g., "academic_writing")
    name: str    # Expert name and credentials
    expertise_areas: List[str] = field(default_factory=list)
    methodology_framework: str = ""  # Core methodology approach
    communication_style: str = ""   # Tone and approach description
    risk_awareness: List[str] = field(default_factory=list)  # Common failure modes
    assessment_questions: List[str] = field(default_factory=list)  # Diagnostic questions
    system_prompt: str = ""  # Base system prompt for Claude
    
    def to_dict(self) -> Dict:
        """Serializes the ExpertPersona into a JSON-safe dictionary."""
        return {
            "domain": self.domain,
            "name": self.name,
            "expertise_areas": self.expertise_areas,
            "methodology_framework": self.methodology_framework,
            "communication_style": self.communication_style,
            "risk_awareness": self.risk_awareness,
            "assessment_questions": self.assessment_questions,
            "system_prompt": self.system_prompt,
        }


@dataclass
class ConversationState:
    """
    Comprehensive conversation state for adaptive expert coaching.
    Manages conversation context, persona transitions, and project understanding.
    
    Following Anthropic best practices for multi-turn conversation management
    with explicit state tracking and context preservation.
    """
    # Conversation identification and tracking
    conversation_id: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Conversation flow management
    current_stage: ConversationStage = ConversationStage.DISCOVERY
    messages: List[ConversationMessage] = field(default_factory=list)
    stage_transitions: List[Dict[str, Any]] = field(default_factory=list)  # History of stage changes
    
    # Project understanding (built incrementally)
    project_summary: Optional[str] = None
    extracted_data: Dict[str, Any] = field(default_factory=dict)  # Structured project data
    confidence_score: float = 0.0  # Overall confidence in project understanding
    missing_information: List[str] = field(default_factory=list)  # What still needs clarification
    
    # Domain detection and persona management
    domain_detection: Optional[DomainDetection] = None
    current_persona: Optional[str] = None  # Domain identifier for active persona
    persona_switched_at: Optional[datetime] = None
    user_corrections: List[Dict[str, Any]] = field(default_factory=list)  # User corrections to AI understanding
    
    # Context building for expert coaching
    user_expertise_level: Optional[str] = None  # "beginner", "intermediate", "expert"
    key_constraints: List[str] = field(default_factory=list)  # Timeline, resource, scope constraints
    success_criteria: List[str] = field(default_factory=list)  # How user defines success
    risk_factors: List[str] = field(default_factory=list)  # Identified risks and challenges
    
    # File context and additional materials
    uploaded_files: List[Dict[str, Any]] = field(default_factory=list)  # File references and summaries
    external_context: Dict[str, Any] = field(default_factory=dict)  # Additional context from integrations
    
    # Conversation analytics
    total_exchanges: int = 0  # Number of user-assistant message pairs
    avg_response_time: float = 0.0  # Average AI response time for performance tracking
    user_satisfaction_indicators: Dict[str, Any] = field(default_factory=dict)  # Engagement metrics
    
    def add_message(self, role: str, content: str, metadata: Dict[str, Any] = None) -> None:
        """Add a new message to the conversation history."""
        message = ConversationMessage(
            role=role,
            content=content,
            metadata=metadata or {}
        )
        self.messages.append(message)
        self.updated_at = datetime.now()
        
        if role == "user":
            self.total_exchanges += 1
    
    def transition_stage(self, new_stage: ConversationStage, reason: str = "") -> None:
        """Transition to a new conversation stage with tracking."""
        old_stage = self.current_stage
        self.current_stage = new_stage
        self.updated_at = datetime.now()
        
        # Record the transition for analysis
        self.stage_transitions.append({
            "from": old_stage.value,
            "to": new_stage.value,
            "timestamp": self.updated_at.isoformat(),
            "reason": reason,
            "message_count": len(self.messages)
        })
    
    def set_persona(self, domain: str) -> None:
        """Switch to a specific expert persona."""
        self.current_persona = domain
        self.persona_switched_at = datetime.now()
        self.updated_at = datetime.now()
    
    def should_trigger_confirmation(self) -> bool:
        """Determine if ready for project summary and persona switch."""
        return (
            len(self.messages) >= 3 and
            self.project_summary is not None and
            self.confidence_score > 0.7 and
            self.current_stage == ConversationStage.DISCOVERY
        )
    
    def get_conversation_history_for_llm(self, include_metadata: bool = False) -> List[Dict[str, Any]]:
        """Format conversation history for Claude API calls."""
        history = []
        for message in self.messages:
            msg_dict = {
                "role": message.role,
                "content": message.content
            }
            if include_metadata and message.metadata:
                msg_dict["metadata"] = message.metadata
            history.append(msg_dict)
        return history
    
    def update_project_understanding(self, summary: str, data: Dict[str, Any], confidence: float) -> None:
        """Update the AI's understanding of the project."""
        self.project_summary = summary
        self.extracted_data.update(data)
        self.confidence_score = confidence
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict:
        """Serializes the ConversationState into a JSON-safe dictionary."""
        return {
            "conversation_id": self.conversation_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "current_stage": self.current_stage.value,
            "messages": [msg.to_dict() for msg in self.messages],
            "stage_transitions": self.stage_transitions,
            "project_summary": self.project_summary,
            "extracted_data": self.extracted_data,
            "confidence_score": self.confidence_score,
            "missing_information": self.missing_information,
            "domain_detection": self.domain_detection.to_dict() if self.domain_detection else None,
            "current_persona": self.current_persona,
            "persona_switched_at": self.persona_switched_at.isoformat() if self.persona_switched_at else None,
            "user_corrections": self.user_corrections,
            "user_expertise_level": self.user_expertise_level,
            "key_constraints": self.key_constraints,
            "success_criteria": self.success_criteria,
            "risk_factors": self.risk_factors,
            "uploaded_files": self.uploaded_files,
            "external_context": self.external_context,
            "total_exchanges": self.total_exchanges,
            "avg_response_time": self.avg_response_time,
            "user_satisfaction_indicators": self.user_satisfaction_indicators,
        }
>>>>>>> feature/adaptive-coaching-foundation


@dataclass
class Block:
    """
    The fundamental unit of the Echo schedule. A Block represents a single,
    contiguous chunk of time dedicated to a specific activity.
    """
    start: time
    end:   time
    label: str
    type:  BlockType
    meta:  Dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> Dict:
        """Serializes the Block into a JSON-safe dictionary."""
        return {
            "start": self.start.isoformat(timespec="minutes"),
            "end":   self.end.isoformat(timespec="minutes"),
            "label": self.label,
            "type":  self.type.value,
            "meta":  self.meta,
        }


@dataclass
class Defaults:
    """
    Global settings that define the boundaries of a typical day. These values
    are the baseline for scheduling unless a specific Profile overrides them.
    """
    wake_time:  str      # Expected wake-up time in "HH:MM" format
    sleep_time: str     # Expected sleep time in "HH:MM" format
    timezone:   str = "America/Chicago" # IANA timezone name

class ProjectStatus(str, Enum):
    """Defines the explicit states a project can be in."""
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    BACKLOG = "backlog"
    COMPLETED = "completed"

@dataclass
class Milestone:
    """Represents a specific, dated goal within a project."""
    description: str
    due_date: Optional[date] = None

@dataclass
class Project:
    """
    A lightweight representation of a user's active project. This provides the
    LLM with structured context to make informed scheduling decisions.
    """
    id:            str
    name:          str
    status:        ProjectStatus = ProjectStatus.ACTIVE
    current_focus: Optional[str] = None
    milestones:    List[Milestone] = field(default_factory=list)
    deadline:      Optional[date] = None


@dataclass
class Profile:
    """
    An override bundle for applying contextual changes to the schedule, such
    as for travel, holidays, or sick days. This allows for quick, temporary
    adjustments without altering the base configuration.
    """
    name: str
    overrides: Dict


@dataclass
class Categories:
    """
    User-defined categories for time tracking and analytics.
    Maps project names to category names for consistent reporting.
    """
    # Default categories that users can override
    default_categories: Dict[str, str] = field(default_factory=lambda: {
        "Echo": "Development",
        "Work": "Development",
        "Personal": "Personal",
        "Admin": "Admin",
        "Health": "Health",
        "Learning": "Learning",
        "Research": "Research",
        "Writing": "Writing",
        "Planning": "Planning"
    })

    # User can override any of these mappings
    custom_mappings: Dict[str, str] = field(default_factory=dict)

    def get_category(self, project_name: str) -> str:
        """Get the category for a project, using custom mappings first, then defaults."""
        # Check custom mappings first
        if project_name in self.custom_mappings:
            return self.custom_mappings[project_name]

        # Check default categories
        if project_name in self.default_categories:
            return self.default_categories[project_name]

        # If no mapping found, use the project name as the category
        return project_name

@dataclass
class Config:
    """Main configuration for Echo."""
    defaults: Defaults
    weekly_schedule: Dict[str, List[Dict[str, Any]]]
    projects: Dict[str, Dict[str, Any]]
    profiles: Dict[str, Dict[str, Any]]
    email: Dict[str, Any] = field(default_factory=dict)
<<<<<<< HEAD
=======
    reminders: List[Dict[str, Any]] = field(default_factory=list)
>>>>>>> feature/adaptive-coaching-foundation
