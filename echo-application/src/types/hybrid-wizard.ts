/**
 * Hybrid Conversational Project Creation Wizard Types
 * 
 * These types define the structure for the split-pane conversational
 * interface where users brain-dump to AI while watching a structured
 * Project Brief populate in real-time with bi-directional sync.
 */

import { ProjectType, ProjectRoadmap, ProjectRoadmapPhase } from './projects';
import { UploadedFile } from '@/components/projects/FileUploadZone';

// Conversation Flow Types
/**
 * Individual message in the conversation flow
 */
export interface ConversationMessage {
  /** Unique message identifier */
  id: string;
  /** Message type determines UI rendering and behavior */
  type: 'user-input' | 'ai-response' | 'ai-processing' | 'system-notification';
  /** Message content/text */
  content: string;
  /** Timestamp when message was created */
  timestamp: Date;
  /** Optional confidence score for AI messages (0-1) */
  confidence?: number;
  /** Whether message can be dismissed by user */
  dismissible?: boolean;
}

/**
 * Complete conversation state management
 */
export interface ConversationState {
  /** All messages in chronological order */
  messages: ConversationMessage[];
  /** Current user input being typed */
  current_input: string;
  /** Whether AI is currently processing */
  is_processing: boolean;
  /** Current processing step for user feedback */
  processing_step?: string;
  /** Error state for conversation */
  error: string | null;
}

// Project Brief State Types
/**
 * Live project brief form field with metadata
 */
export interface BriefField<T = string> {
  /** Current field value */
  value: T;
  /** AI confidence in this field (0-1) */
  confidence: number;
  /** Whether field was AI-generated or user-edited */
  source: 'ai-generated' | 'user-edited' | 'hybrid';
  /** Whether field is currently being updated */
  is_updating: boolean;
  /** Validation state */
  is_valid: boolean;
  /** Validation error message if any */
  error?: string;
}

/**
 * Complete project brief state with live-updating fields
 */
export interface BriefState {
  // Core Identity Fields
  /** Project name with metadata */
  name: BriefField<string>;
  /** Project type with confidence */
  type: BriefField<ProjectType>;
  /** Rich project description */
  description: BriefField<string>;
  
  // Strategic Core Fields
  /** Primary objective (one-sentence "why") */
  objective: BriefField<string>;
  /** Key deliverables array */
  key_deliverables: BriefField<string[]>;
  
  // Project Roadmap
  /** AI-generated roadmap with phases */
  roadmap: BriefField<ProjectRoadmap | null>;
  
  // Metadata
  /** Overall AI confidence in the brief */
  overall_confidence: number;
  /** Whether brief has been modified by user */
  user_modified: boolean;
  /** Last update timestamp */
  last_updated: Date;
  /** Files uploaded for context */
  uploaded_files: UploadedFile[];
}

// AI Response Trigger Types
/**
 * Types of changes that can trigger AI responses
 */
export type ResponseTriggerType = 
  | 'scope-expansion'     // New deliverables or requirements added
  | 'conflicting-requirements'  // Timeline vs deliverables mismatch
  | 'missing-implications'      // User added something that implies other needs
  | 'significant-pivot'         // Major change in type/objective/timeline
  | 'clarification-needed'      // AI needs more information
  | 'suggestion-opportunity';   // AI has helpful suggestions

/**
 * Analysis of what triggered an AI response
 */
export interface ResponseTrigger {
  /** Type of trigger */
  type: ResponseTriggerType;
  /** Field that was changed */
  field: keyof BriefState;
  /** Previous value for comparison */
  previous_value: any;
  /** New value that triggered response */
  new_value: any;
  /** AI's analysis of why this is significant */
  significance: string;
  /** Priority of this trigger (high = respond immediately) */
  priority: 'high' | 'medium' | 'low';
}

/**
 * AI response to user's form edit with context
 */
export interface AIResponse {
  /** Unique response identifier */
  id: string;
  /** What triggered this response */
  trigger: ResponseTrigger;
  /** AI's response message */
  message: string;
  /** Suggested actions or questions */
  suggestions?: string[];
  /** Whether response has been dismissed by user */
  dismissed: boolean;
  /** Timestamp of response */
  created_at: Date;
}

// Unified Hybrid State
/**
 * Master state that unifies conversation and brief
 * This is the single source of truth for the hybrid wizard
 */
export interface HybridWizardState {
  /** Left pane: conversation flow */
  conversation: ConversationState;
  /** Right pane: live project brief */
  brief: BriefState;
  /** AI responses to form edits */
  ai_responses: AIResponse[];
  /** Current wizard phase */
  phase: 'gathering' | 'refining' | 'finalizing' | 'complete';
  /** Whether user can create project (all required fields valid) */
  can_create_project: boolean;
  /** Global error state */
  error: string | null;
}

// LLM Integration Types
/**
 * Academic domain information for project classification
 */
export interface AcademicDomainInfo {
  /** Primary academic domain */
  domain: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Human-readable description */
  description: string;
  /** AI reasoning for domain classification */
  reasoning: string;
  /** Alternative domains with confidence scores */
  alternative_domains?: Array<[string, number]>;
}

/**
 * Academic context extracted from conversation
 */
export interface AcademicContext {
  /** Research methodology if mentioned */
  methodology?: string;
  /** Academic tools referenced */
  tools_mentioned?: string[];
  /** File types detected from uploads */
  file_types_detected?: string[];
  /** Current research stage */
  research_stage?: 'planning' | 'data-collection' | 'analysis' | 'writing' | 'review';
}

/**
 * Structured data extracted from user conversation
 */
export interface ConversationAnalysis {
  /** Extracted project name */
  project_name?: string;
  /** Inferred project type */
  project_type?: ProjectType;
  /** Project description built from conversation */
  description: string;
  /** Identified objective */
  objective?: string;
  /** Extracted deliverables */
  deliverables: string[];
  /** Suggested roadmap phases */
  suggested_phases: Array<{
    title: string;
    goal: string;
    estimated_days?: number;
  }>;
  /** AI confidence in analysis (0-1) */
  confidence: number;
  /** What additional information AI needs */
  missing_information?: string[];
  /** Academic domain classification (for academic projects) */
  academic_domain?: AcademicDomainInfo;
  /** Academic context and metadata */
  academic_context?: AcademicContext;
}

/**
 * Configuration for LLM parsing behavior
 */
export interface LLMParsingConfig {
  /** Model to use for parsing */
  model: 'claude-sonnet-4' | 'claude-opus-4';
  /** Max tokens for response */
  max_tokens: number;
  /** Temperature for creativity */
  temperature: number;
  /** Whether to include file context */
  include_file_context: boolean;
  /** Debounce delay for real-time updates (ms) */
  debounce_delay: number;
}

// Component Props Types
/**
 * Props for the main HybridProjectCreator component
 */
export interface HybridProjectCreatorProps {
  /** Whether wizard is open */
  isOpen: boolean;
  /** Callback when wizard is closed */
  onClose: () => void;
  /** Callback when project is successfully created */
  onSuccess?: (projectId: string) => void;
  /** Optional initial state for editing existing project */
  initialState?: Partial<HybridWizardState>;
}

/**
 * Props for ConversationPane component
 */
export interface ConversationPaneProps {
  /** Current conversation state */
  conversation: ConversationState;
  /** Callback when user submits input */
  onSubmitInput: (input: string) => void;
  /** Callback when user uploads files */
  onFilesUploaded: (files: UploadedFile[]) => void;
  /** Whether input is disabled */
  disabled?: boolean;
}

/**
 * Props for LiveProjectBrief component
 */
export interface LiveProjectBriefProps {
  /** Current brief state */
  brief: BriefState;
  /** Callback when field is edited directly */
  onFieldEdit: <K extends keyof BriefState>(field: K, value: BriefState[K]['value']) => void;
  /** Callback when roadmap phase is edited */
  onPhaseEdit: (phaseId: string, updates: Partial<ProjectRoadmapPhase>) => void;
  /** Whether brief is read-only */
  readOnly?: boolean;
}

/**
 * Props for ProjectRoadmapVisualization component
 */
export interface ProjectRoadmapVisualizationProps {
  /** Roadmap to visualize */
  roadmap: ProjectRoadmap | null;
  /** Whether roadmap is editable */
  editable?: boolean;
  /** Callback when phase is edited */
  onPhaseEdit?: (phaseId: string, updates: Partial<ProjectRoadmapPhase>) => void;
  /** Callback when phase order changes */
  onPhaseReorder?: (phases: ProjectRoadmapPhase[]) => void;
  /** Callback when phase is added */
  onPhaseAdd?: (phase: Omit<ProjectRoadmapPhase, 'id'>) => void;
  /** Callback when phase is deleted */
  onPhaseDelete?: (phaseId: string) => void;
}