/**
 * Session API Types
 * 
 * Type-safe interfaces matching the backend Pydantic models exactly.
 * These types ensure compile-time safety and runtime validation.
 */

// ============================================================================
// Core Session Management Types
// ============================================================================

export interface Block {
  id: string;
  start: string;
  end: string;
  label: string;
  type: string;
  meta?: {
    id?: string;
    time_category?: string;
    [key: string]: any;
  };
}

export interface ContextBriefing {
  executive_summary: string;
  email_summary: {
    action_items: string[];
    response_needed: string[];
    metadata: {
      total_processed: number;
    };
  };
  session_notes: {
    pending_commitments: string[];
    metadata: {
      sessions_analyzed: number;
    };
  };
  commitments_deadlines: {
    urgent_deadlines: string[];
    upcoming_deadlines: string[];
    metadata: {
      deadlines_processed: number;
    };
  };
}

// ============================================================================
// Phase 1: Scaffold Generation Types
// ============================================================================

export interface ScaffoldGenerationRequest {
  daily_plan: Block[];
  context_briefing: ContextBriefing;
  force_refresh?: boolean;
}

export interface ScaffoldGenerationResponse {
  success: boolean;
  scaffolds_generated: number;
  success_rate: number;
  message: string;
  failed_blocks: string[];
}

export interface SessionScaffold {
  block_id: string;
  project_context: string;
  suggested_approach: string;
  key_deliverables: string[];
  potential_blockers: string[];
  preparation_items: string[];
  success_criteria: string[];
  estimated_complexity: 'low' | 'medium' | 'high';
  confidence_score: number;
  generated_at: string;
}

export interface GetScaffoldResponse {
  success: boolean;
  scaffold?: SessionScaffold;
  error?: string;
}

// ============================================================================
// Phase 2: Session Start Types
// ============================================================================

export interface SessionStartRequest {
  block_id: string;
  primary_outcome: string;
  key_tasks: string[];
  session_duration_minutes?: number;
  energy_level?: number;
  time_constraints?: string;
}

export interface ChecklistItem {
  task: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  estimated_minutes: number;
  dependencies?: string[];
}

export interface SessionStartResponse {
  success: boolean;
  session_title: string;
  primary_objective: string;
  checklist: ChecklistItem[];
  success_criteria: string[];
  time_allocation: Record<string, number>;
  session_id: string;
}

// ============================================================================
// Phase 3: Session Completion Types
// ============================================================================

export interface SessionCompleteRequest {
  // Session identification
  block_id: string;
  
  // User debrief data  
  accomplishments: string;
  outstanding: string;
  final_notes: string;
  
  // Session metadata
  session_duration_minutes: number;
  block_title: string;
  project_name: string;
  time_category: string;
  start_time: string;
  end_time: string;
  
  // Optional checklist data for enhanced synthesis
  checklist_data?: any;
}

export interface SessionCompleteResponse {
  status: string;
  session_log_markdown: string;
  session_metadata: {
    title: string;
    date: string;
    duration: string;
    category: string;
    completedAt: string;
  };
  ai_insights: {
    session_quality: string;
    key_success_factors: string[];
    recommended_followup: string[];
    productivity_patterns: Record<string, any>;
    project_momentum: string;
  };
  data_source: string;
  stored_successfully: boolean;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  request_id?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    request_duration_ms: number;
    api_version: string;
    cache_hit: boolean;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCache: boolean;
  enableMockFallback: boolean;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  priority?: 'low' | 'normal' | 'high';
  cacheable?: boolean;
  fallbackToMock?: boolean;
}

// ============================================================================
// Loading and State Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  stage?: string;
  estimatedTimeRemaining?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expires: number;
  key: string;
}

// ============================================================================
// Mock Data Fallback Types
// ============================================================================

export interface MockDataConfig {
  enabled: boolean;
  delay: number;
  errorRate: number;
  scenarios: Record<string, any>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type SessionApiEndpoint = 
  | '/session/generate-scaffolds'
  | '/session/start'
  | '/session/complete'
  | '/session/scaffold/{block_id}';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface RequestConfig {
  method: HttpMethod;
  endpoint: SessionApiEndpoint;
  data?: any;
  params?: Record<string, string>;
  options?: RequestOptions;
}