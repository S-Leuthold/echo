/**
 * useHybridProjectState Hook
 * 
 * Master state management hook for the hybrid conversational project creation wizard.
 * Serves as the single source of truth that unifies conversation and brief state,
 * orchestrates AI services, and provides a clean interface for components.
 * 
 * Core responsibilities:
 * - Unified state management between conversation and brief
 * - AI service orchestration (parser, roadmap generator, response analyzer)
 * - Real-time synchronization between chat and form edits
 * - Error handling and loading state management
 * - Integration with existing project creation system
 * 
 * Follows React hooks best practices with proper dependency management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  HybridWizardState,
  ConversationState,
  BriefState,
  ConversationMessage,
  BriefField,
  AIResponse,
  ConversationAnalysis
} from '@/types/hybrid-wizard';
import { ProjectType, ProjectRoadmap, ProjectRoadmapPhase } from '@/types/projects';
import { UploadedFile } from '@/components/projects/FileUploadZone';
import { useProjects } from './useProjects';
import { useConversation } from './useConversation';

// Service imports
import { HybridProjectParser } from '@/services/hybrid-project-parser';
import { ProjectRoadmapGenerator } from '@/services/roadmap-generator';
import { ResponseTriggerAnalyzer } from '@/services/response-trigger-analyzer';

/**
 * Configuration for the hybrid wizard behavior
 */
interface HybridWizardConfig {
  /** Enable real-time AI analysis */
  enableRealTimeAnalysis: boolean;
  /** Enable active AI responses to form edits */
  enableActiveResponses: boolean;
  /** Debounce delay for AI analysis (ms) */
  analysisDebounceDelay: number;
  /** Maximum AI responses per session */
  maxResponsesPerSession: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: HybridWizardConfig = {
  enableRealTimeAnalysis: true,
  enableActiveResponses: true,
  analysisDebounceDelay: 2000,
  maxResponsesPerSession: 8
};

/**
 * Return type for the useHybridProjectState hook
 */
interface UseHybridProjectStateReturn {
  // State
  state: HybridWizardState;
  
  // Conversation actions
  submitMessage: (message: string) => Promise<void>;
  uploadFiles: (files: UploadedFile[]) => Promise<void>;
  clearConversation: () => void;
  
  // Brief actions
  updateBriefField: <K extends keyof BriefState>(field: K, value: BriefState[K]['value']) => Promise<void>;
  updateRoadmapPhase: (phaseId: string, updates: Partial<ProjectRoadmapPhase>) => Promise<void>;
  reorderRoadmapPhases: (newOrder: string[]) => Promise<void>;
  
  // AI response actions
  dismissResponse: (responseId: string) => void;
  retryAnalysis: () => Promise<void>;
  
  // Project creation
  createProject: () => Promise<string | null>;
  
  // Utility
  resetWizard: () => void;
  updateConfig: (config: Partial<HybridWizardConfig>) => void;
}

/**
 * Creates an initial brief field with metadata
 */
function createBriefField<T>(value: T, confidence: number = 0.5): BriefField<T> {
  return {
    value,
    confidence,
    source: 'ai-generated',
    is_updating: false,
    is_valid: true
  };
}

/**
 * Creates initial brief state
 */
function createInitialBriefState(): BriefState {
  return {
    name: createBriefField(''),
    type: createBriefField<ProjectType>('personal'),
    description: createBriefField(''),
    objective: createBriefField(''),
    key_deliverables: createBriefField<string[]>([]),
    roadmap: createBriefField<ProjectRoadmap | null>(null),
    overall_confidence: 0.5,
    user_modified: false,
    last_updated: new Date(),
    uploaded_files: []
  };
}

// Conversation state creation moved to useConversation hook

/**
 * Creates initial hybrid wizard state (conversation now managed by useConversation)
 */
function createInitialState(conversation: ConversationState): HybridWizardState {
  return {
    conversation,
    brief: createInitialBriefState(),
    ai_responses: [],
    phase: 'gathering',
    can_create_project: false,
    error: null
  };
}

/**
 * Main hook for hybrid project creation wizard state management
 */
export const useHybridProjectState = (
  config: Partial<HybridWizardConfig> = {}
): UseHybridProjectStateReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { createProject: createProjectAPI } = useProjects();

  // Current analysis cache (to build upon previous analysis)
  const currentAnalysisRef = useRef<ConversationAnalysis | null>(null);

  // Conversation management (extracted to separate hook)
  const conversationHook = useConversation(
    {
      enableRealTimeAnalysis: fullConfig.enableRealTimeAnalysis,
      analysisDebounceDelay: fullConfig.analysisDebounceDelay
    },
    currentAnalysisRef.current
  );

  // Main state (conversation now managed by useConversation)
  const [state, setState] = useState<HybridWizardState>(
    () => createInitialState(conversationHook.conversation)
  );

  // Service instances (using refs to maintain identity across renders)
  const parserRef = useRef(new HybridProjectParser({
    debounce_delay: fullConfig.analysisDebounceDelay,
    include_file_context: true
  }));

  const roadmapGeneratorRef = useRef(new ProjectRoadmapGenerator());
  
  const triggerAnalyzerRef = useRef(new ResponseTriggerAnalyzer({
    debounceDelay: fullConfig.analysisDebounceDelay,
    maxResponsesPerSession: fullConfig.maxResponsesPerSession
  }));

  // Sync conversation state from the conversation hook
  useEffect(() => {
    setState(prev => ({
      ...prev,
      conversation: conversationHook.conversation
    }));
  }, [conversationHook.conversation]);

  /**
   * Submits a new message and triggers AI analysis (using conversation hook)
   */
  const submitMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    try {
      // Use conversation hook to submit message and get analysis
      const analysis = await conversationHook.submitMessage(message, state.brief.uploaded_files);

      if (analysis) {
        // Update current analysis cache
        currentAnalysisRef.current = analysis;

        // Update brief fields based on analysis
        await updateBriefFromAnalysis(analysis);

        // Generate roadmap if we have enough information
        if (analysis.project_type && analysis.objective) {
          const roadmap = await roadmapGeneratorRef.current.generateRoadmap(
            analysis,
            analysis.project_type
          );

          setState(prev => ({
            ...prev,
            brief: {
              ...prev.brief,
              roadmap: createBriefField(roadmap, analysis.confidence)
            }
          }));
        }

        // Update wizard phase and project readiness
        setState(prev => ({
          ...prev,
          phase: determineWizardPhase(analysis, prev.brief),
          can_create_project: canCreateProject(analysis)
        }));
      }
    } catch (error) {
      console.error('Message submission failed:', error);
      conversationHook.setError('Failed to process your message. Please try again.');
    }
  }, [conversationHook, state.brief.uploaded_files]);

  /**
   * Handles file uploads and integrates them into analysis
   */
  const uploadFiles = useCallback(async (files: UploadedFile[]) => {
    setState(prev => ({
      ...prev,
      brief: {
        ...prev.brief,
        uploaded_files: [...prev.brief.uploaded_files, ...files]
      }
    }));

    // If we have existing conversation, re-analyze with file context
    if (currentAnalysisRef.current && fullConfig.enableRealTimeAnalysis) {
      try {
        const updatedAnalysis = await parserRef.current.analyzeConversation(
          '', // Empty input since we're just adding files
          files,
          currentAnalysisRef.current
        );

        currentAnalysisRef.current = updatedAnalysis;
        await updateBriefFromAnalysis(updatedAnalysis);
      } catch (error) {
        console.error('File integration analysis failed:', error);
      }
    }
  }, [fullConfig.enableRealTimeAnalysis]);

  /**
   * Updates a brief field and triggers active response analysis
   */
  const updateBriefField = useCallback(async <K extends keyof BriefState>(
    field: K,
    value: BriefState[K]['value']
  ) => {
    const previousBrief = { ...state.brief };

    // Update field with user-edited source
    setState(prev => ({
      ...prev,
      brief: {
        ...prev.brief,
        [field]: {
          ...prev.brief[field],
          value,
          source: 'user-edited',
          is_updating: false
        },
        user_modified: true,
        last_updated: new Date()
      }
    }));

    // Analyze for active response if enabled
    if (fullConfig.enableActiveResponses) {
      try {
        const trigger = await triggerAnalyzerRef.current.analyzeChange(
          state.brief,
          field
        );

        if (trigger) {
          const responseMessage = await parserRef.current.generateActiveResponse(trigger);
          
          const aiResponse: AIResponse = {
            id: `response-${Date.now()}`,
            trigger,
            message: responseMessage,
            dismissed: false,
            created_at: new Date(),
            suggestions: [] // Could be populated based on trigger type
          };

          // Add AI response to conversation using conversation hook
          conversationHook.addAIMessage(responseMessage, 0.8, true);

          setState(prev => ({
            ...prev,
            ai_responses: [...prev.ai_responses, aiResponse]
          }));
        }
      } catch (error) {
        console.error('Active response analysis failed:', error);
      }
    }
  }, [state.brief, fullConfig.enableActiveResponses]);

  /**
   * Updates a roadmap phase
   */
  const updateRoadmapPhase = useCallback(async (
    phaseId: string,
    updates: Partial<ProjectRoadmapPhase>
  ) => {
    if (!state.brief.roadmap.value) return;

    const updatedRoadmap = await roadmapGeneratorRef.current.modifyRoadmap(
      state.brief.roadmap.value,
      'update',
      { id: phaseId, ...updates }
    );

    setState(prev => ({
      ...prev,
      brief: {
        ...prev.brief,
        roadmap: createBriefField(updatedRoadmap, prev.brief.roadmap.confidence),
        user_modified: true
      }
    }));
  }, [state.brief.roadmap.value]);

  /**
   * Reorders roadmap phases
   */
  const reorderRoadmapPhases = useCallback(async (newOrder: string[]) => {
    if (!state.brief.roadmap.value) return;

    const updatedRoadmap = await roadmapGeneratorRef.current.modifyRoadmap(
      state.brief.roadmap.value,
      'reorder',
      { newOrder }
    );

    setState(prev => ({
      ...prev,
      brief: {
        ...prev.brief,
        roadmap: createBriefField(updatedRoadmap, prev.brief.roadmap.confidence),
        user_modified: true
      }
    }));
  }, [state.brief.roadmap.value]);

  /**
   * Dismisses an AI response and learns from the dismissal
   */
  const dismissResponse = useCallback((responseId: string) => {
    const response = state.ai_responses.find(r => r.id === responseId);
    if (response) {
      triggerAnalyzerRef.current.learnFromDismissal(response);
      
      setState(prev => ({
        ...prev,
        ai_responses: prev.ai_responses.map(r => 
          r.id === responseId ? { ...r, dismissed: true } : r
        )
      }));
    }
  }, [state.ai_responses]);

  /**
   * Retries analysis if it failed
   */
  const retryAnalysis = useCallback(async () => {
    if (!currentAnalysisRef.current) return;

    try {
      setState(prev => ({
        ...prev,
        conversation: {
          ...prev.conversation,
          is_processing: true,
          error: null
        }
      }));

      // Re-run analysis with current data
      const lastUserMessage = state.conversation.messages
        .filter(m => m.type === 'user-input')
        .pop();

      if (lastUserMessage) {
        await submitMessage(lastUserMessage.content);
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
      setState(prev => ({
        ...prev,
        conversation: {
          ...prev.conversation,
          is_processing: false,
          error: 'Analysis retry failed. Please try again.'
        }
      }));
    }
  }, [state.conversation.messages, submitMessage]);

  /**
   * Creates the project using the current brief state
   */
  const createProject = useCallback(async (): Promise<string | null> => {
    if (!state.can_create_project) {
      throw new Error('Project is not ready for creation');
    }

    try {
      setState(prev => ({ ...prev, phase: 'finalizing' }));

      const projectData = {
        name: state.brief.name.value,
        description: state.brief.description.value,
        type: state.brief.type.value,
        objective: state.brief.objective.value,
        // Convert brief state to ProjectFormData format
        estimated_hours: 40, // Default estimate
        initial_phase: 'initiation' as const
      };

      const project = await createProjectAPI(projectData);

      // Update project with roadmap and deliverables if available
      // This would be done through API in real implementation
      if (state.brief.roadmap.value) {
        // Store roadmap in project
        console.log('Roadmap to be saved:', state.brief.roadmap.value);
      }

      if (state.brief.key_deliverables.value.length > 0) {
        // Store deliverables in project
        console.log('Deliverables to be saved:', state.brief.key_deliverables.value);
      }

      setState(prev => ({ ...prev, phase: 'complete' }));
      return project.id;
    } catch (error) {
      console.error('Project creation failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to create project. Please try again.',
        phase: 'refining'
      }));
      return null;
    }
  }, [state.can_create_project, state.brief, createProjectAPI]);

  /**
   * Clears conversation history (using conversation hook)
   */
  const clearConversation = useCallback(() => {
    conversationHook.clearConversation();
    currentAnalysisRef.current = null;
  }, [conversationHook]);

  /**
   * Resets the entire wizard state (conversation managed by hook)
   */
  const resetWizard = useCallback(() => {
    conversationHook.clearConversation();
    setState(prev => createInitialState(prev.conversation)); // Keep current conversation from hook
    currentAnalysisRef.current = null;
    triggerAnalyzerRef.current.resetSession();
  }, [conversationHook]);

  /**
   * Updates wizard configuration
   */
  const updateConfig = useCallback((newConfig: Partial<HybridWizardConfig>) => {
    Object.assign(fullConfig, newConfig);
    
    // Update service configurations
    triggerAnalyzerRef.current.updateConfig({
      maxResponsesPerSession: newConfig.maxResponsesPerSession,
      debounceDelay: newConfig.analysisDebounceDelay
    });
  }, [fullConfig]);

  /**
   * Helper function to update brief from AI analysis
   */
  const updateBriefFromAnalysis = useCallback(async (analysis: ConversationAnalysis) => {
    setState(prev => ({
      ...prev,
      brief: {
        ...prev.brief,
        name: analysis.project_name 
          ? createBriefField(analysis.project_name, analysis.confidence)
          : prev.brief.name,
        type: analysis.project_type
          ? createBriefField(analysis.project_type, analysis.confidence)
          : prev.brief.type,
        description: createBriefField(analysis.description, analysis.confidence),
        objective: analysis.objective
          ? createBriefField(analysis.objective, analysis.confidence)
          : prev.brief.objective,
        key_deliverables: createBriefField(analysis.deliverables, analysis.confidence),
        overall_confidence: analysis.confidence,
        last_updated: new Date()
      }
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      triggerAnalyzerRef.current.resetSession();
    };
  }, []);

  return {
    state,
    submitMessage,
    uploadFiles,
    clearConversation,
    updateBriefField,
    updateRoadmapPhase,
    reorderRoadmapPhases,
    dismissResponse,
    retryAnalysis,
    createProject,
    resetWizard,
    updateConfig
  };
};

/**
 * Utility functions
 */
// generateAnalysisConfirmation moved to useConversation hook

function determineWizardPhase(
  analysis: ConversationAnalysis, 
  brief: BriefState
): HybridWizardState['phase'] {
  if (analysis.confidence > 0.8 && analysis.project_name && analysis.objective) {
    return 'refining';
  }
  
  if (brief.user_modified) {
    return 'finalizing';
  }
  
  return 'gathering';
}

function canCreateProject(analysis: ConversationAnalysis): boolean {
  return !!(
    analysis.project_name &&
    analysis.project_type &&
    analysis.objective &&
    analysis.confidence > 0.6
  );
}