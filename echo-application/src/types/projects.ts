/**
 * TypeScript interfaces for the Projects feature
 * 
 * These types define the structure for project management,
 * weekly summaries, project state tracking, and the hybrid
 * conversational project creation system.
 */

// Project Status and Phase Types
/**
 * Project lifecycle status indicating current state
 */
export type ProjectStatus = 'active' | 'on_hold' | 'backlog' | 'completed' | 'archived';

/**
 * Project category types for organization and AI context
 */
export type ProjectType = 'software' | 'research' | 'writing' | 'creative' | 'admin' | 'personal';

/**
 * Predefined project phases for traditional project management.
 * Note: The hybrid wizard uses ProjectRoadmapPhase for custom AI-generated phases.
 */
export type ProjectPhase = 
  // Academic Research
  | 'planning' | 'literature_review' | 'experiments' | 'data_analysis' | 'writing' | 'revision' | 'submission'
  // Software Development  
  | 'design' | 'implementation' | 'testing' | 'deployment' | 'maintenance'
  // General
  | 'initiation' | 'execution' | 'monitoring' | 'closure';

// Activity Heatmap Types
/**
 * Activity intensity scale for heatmap visualization
 * 0 = no activity, 4 = maximum intensity
 */
export type ActivityIntensity = 0 | 1 | 2 | 3 | 4;

/**
 * Daily activity data point for heatmap and analytics
 */
export interface DailyActivity {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Total hours worked on this day */
  hours: number;
  /** Number of work sessions */
  sessions: number;
  /** Calculated intensity based on hours and sessions */
  intensity: ActivityIntensity;
}

/**
 * Heatmap rendering dimensions and layout configuration
 */
export interface HeatmapDimensions {
  /** Total heatmap width in pixels */
  width: number;
  /** Total heatmap height in pixels */
  height: number;
  /** Individual cell size in pixels */
  cellSize: number;
  /** Gap between cells in pixels */
  cellGap: number;
}

/**
 * Date range utility for filtering and analysis
 */
export interface DateRange {
  /** Start date (inclusive) */
  start: Date;
  /** End date (inclusive) */
  end: Date;
}

// Hybrid Conversational Wizard - Project Roadmap Types
/**
 * Represents a phase in the project roadmap timeline.
 * Unlike the predefined ProjectPhase enum, these are AI-generated
 * and fully customizable by the user during project creation.
 */
export interface ProjectRoadmapPhase {
  /** Unique identifier for this phase */
  id: string;
  /** User-facing phase title (e.g., "Review & Strategy") */
  title: string;
  /** One-sentence description of the phase goal */
  goal: string;
  /** Phase sequence order (0-based) */
  order: number;
  /** Whether this phase is currently active/highlighted */
  is_current: boolean;
  /** Optional estimated duration in days */
  estimated_days?: number;
  /** Optional due date for this phase */
  due_date?: string; // ISO date string
}

/**
 * Complete project roadmap containing all phases and metadata
 */
export interface ProjectRoadmap {
  /** Array of phases in chronological order */
  phases: ProjectRoadmapPhase[];
  /** Currently active phase ID */
  current_phase_id: string | null;
  /** AI confidence score for the generated roadmap (0-1) */
  ai_confidence: number;
  /** Timestamp when roadmap was generated */
  generated_at: string; // ISO datetime
  /** Whether roadmap has been modified by user */
  user_modified: boolean;
}

/**
 * Core Project entity representing a complete project with all metadata,
 * activity tracking, and optional AI-generated roadmap from hybrid wizard.
 * 
 * Projects created through the hybrid conversational wizard include additional
 * roadmap and deliverables fields populated by AI analysis.
 */
export interface Project {
  /** Unique project identifier */
  id: string;
  /** User-facing project name */
  name: string;
  /** Rich project description */
  description: string;
  /** Project category for organization and context */
  type: ProjectType;
  /** Current lifecycle status */
  status: ProjectStatus;
  /** Current phase in traditional project management */
  phase: ProjectPhase;
  
  // Objective and Context
  /** Primary project objective (one-sentence "why") */
  objective: string;
  /** Current state description for context */
  current_state: string;
  
  // Time Tracking
  /** Initial time estimate in hours */
  total_estimated_hours: number;
  /** Actual time invested to date in hours */
  total_actual_hours: number;
  /** Hours worked this week */
  hours_this_week: number;
  /** Hours worked last week for comparison */
  hours_last_week: number;
  
  // Activity Tracking (for visualization)
  /** Last 6-8 weeks of activity data, most recent last */
  weekly_activity_hours: number[];
  /** Last 6 months of daily activity for heatmap visualization */
  daily_activity_hours: DailyActivity[];
  
  // Progress and Momentum
  /** Completion percentage (0-100) */
  progress_percentage: number;
  /** Current project momentum assessment */
  momentum: 'high' | 'medium' | 'low' | 'stalled';
  
  // Metadata
  /** ISO date when project was created */
  created_date: string;
  /** ISO date when project was last updated */
  updated_date: string;
  /** ISO date of last work session (optional) */
  last_session_date?: string;
  
  // Weekly summaries (chronological)
  /** AI-generated weekly summaries for pattern recognition */
  weekly_summaries: WeeklySummary[];
  
  // Associated sessions count
  /** Total number of work sessions ever */
  total_sessions: number;
  /** Number of sessions this week */
  sessions_this_week: number;
  
  // Project Roadmap (Generated by Hybrid Conversational Wizard)
  /** AI-generated project roadmap with phases and timeline */
  roadmap?: ProjectRoadmap;
  /** Key deliverables extracted from conversation (bulleted list) */
  key_deliverables: string[];
}

/**
 * AI-generated weekly project summary for pattern recognition and progress tracking.
 * Created automatically based on session data and user activity patterns.
 */
export interface WeeklySummary {
  /** Unique summary identifier */
  id: string;
  /** Associated project ID */
  project_id: string;
  /** ISO date of week ending (Sunday) */
  week_ending: string;
  
  // Time Investment
  /** Total hours invested this week */
  hours_invested: number;
  /** Number of work sessions conducted */
  sessions_count: number;
  
  // Narrative Summary
  /** AI-generated narrative summary of week's work */
  summary: string;
  /** Key accomplishments achieved this week */
  key_accomplishments: string[];
  /** Important decisions made during the week */
  decisions_made: string[];
  /** Blockers or challenges encountered */
  blockers_encountered: string[];
  /** Planned focus for next week */
  next_week_focus: string;
  
  // Metrics
  /** Number of tasks completed this week */
  tasks_completed: number;
  /** Optional phase transition information */
  phase_change?: {
    /** Previous phase */
    from: ProjectPhase;
    /** New phase */
    to: ProjectPhase;
    /** Reason for phase change */
    reason: string;
  };
  
  // Metadata
  /** ISO datetime when summary was generated */
  generated_at: string;
  /** AI confidence score in summary accuracy (0-1) */
  ai_confidence: number;
}

/**
 * Reference to a work session associated with a project.
 * Used for linking sessions to projects and analytics.
 */
export interface ProjectSession {
  /** Unique session identifier */
  id: string;
  /** Associated project ID */
  project_id: string;
  /** User-defined session title */
  title: string;
  /** ISO date when session occurred */
  date: string;
  /** Session start time (HH:MM format) */
  start_time: string;
  /** Session end time (HH:MM format) */
  end_time: string;
  /** Total session duration in minutes */
  duration_minutes: number;
  /** Session category (focus, meeting, admin, etc.) */
  category: string;
  /** AI-generated summary of session notes */
  notes_summary: string;
  /** User-applied tags for categorization */
  tags: string[];
}

/**
 * Form data structure for traditional project creation wizard.
 * Note: Hybrid conversational wizard uses different internal state
 * but converts to this format for final project creation.
 */
export interface ProjectFormData {
  /** Project name */
  name: string;
  /** Project description */
  description: string;
  /** Project category */
  type: ProjectType;
  /** Primary objective */
  objective: string;
  /** Optional time estimate in hours */
  estimated_hours?: number;
  /** Optional initial phase */
  initial_phase?: ProjectPhase;
}

/**
 * Project template for quick project creation with predefined structure
 */
export interface ProjectTemplate {
  /** Unique template identifier */
  id: string;
  /** Template display name */
  name: string;
  /** Associated project type */
  type: ProjectType;
  /** Template description */
  description: string;
  /** Default phases for this template */
  default_phases: ProjectPhase[];
  /** Suggested initial tasks */
  suggested_tasks: string[];
  /** Optional estimated duration in weeks */
  estimated_duration_weeks?: number;
}

/**
 * Filter options for project list views and queries
 */
export interface ProjectFilters {
  /** Filter by project status */
  status?: ProjectStatus[];
  /** Filter by project type */
  type?: ProjectType[];
  /** Filter by current phase */
  phase?: ProjectPhase[];
  /** Filter by momentum level */
  momentum?: ('high' | 'medium' | 'low' | 'stalled')[];
  /** Text search query */
  search?: string;
}

/** Available sorting fields for project lists */
export type ProjectSortBy = 'name' | 'updated_date' | 'hours_this_week' | 'progress_percentage' | 'created_date';

/** Sort order direction */
export type SortOrder = 'asc' | 'desc';

// API Response Types
export interface ProjectsResponse {
  projects: Project[];
  total_count: number;
  active_count: number;
  completed_count: number;
}

export interface ProjectStatsResponse {
  total_projects: number;
  active_projects: number;
  total_hours_all_time: number;
  total_hours_this_week: number;
  total_hours_last_week: number;
  most_active_project: {
    id: string;
    name: string;
    hours_this_week: number;
  };
  completion_rate: number; // percentage of completed projects
}

// Hook Return Types
export interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  filters: ProjectFilters;
  sortBy: ProjectSortBy;
  sortOrder: SortOrder;
  
  // Actions
  setFilters: (filters: ProjectFilters) => void;
  setSorting: (sortBy: ProjectSortBy, order: SortOrder) => void;
  refreshProjects: () => Promise<void>;
  createProject: (data: ProjectFormData) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export interface UseProjectFormReturn {
  formData: ProjectFormData;
  isValid: boolean;
  errors: Record<string, string>;
  isSubmitting: boolean;
  
  // Actions
  updateField: (field: keyof ProjectFormData, value: string | number) => void;
  resetForm: () => void;
  submitForm: () => Promise<Project | null>;
}

// Component Props Types
export interface ProjectCardProps {
  project: Project;
  onSelect?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface ProjectListProps {
  projects: Project[];
  loading?: boolean;
  error?: string | null;
  onProjectSelect?: (project: Project) => void;
  onProjectEdit?: (project: Project) => void;
  onProjectDelete?: (project: Project) => void;
  emptyStateMessage?: string;
}

export interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
  templates?: ProjectTemplate[];
}

// Error Types
export interface ProjectError {
  code: string;
  message: string;
  field?: string;
}