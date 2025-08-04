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

import { useCallback, useRef, useMemo, useEffect } from 'react';
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
import { useConversationState, ConversationConfig } from './useConversationState';
import { useBriefState } from './useBriefState';
import { useFileUploads } from './useFileUploads';
import { useWizardFlow, WizardFlowState } from './useWizardFlow';

// Service imports
import { WizardOrchestrationService } from '@/services/wizard-orchestration-service';

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
  uploadFiles: (files: File[]) => Promise<UploadedFile[]>;
  clearConversation: () => void;
  
  // Brief actions
  updateBriefField: <K extends keyof BriefState>(field: K, value: BriefState[K]['value']) => Promise<void>;
  updateRoadmapPhase: (phaseId: string, updates: Partial<ProjectRoadmapPhase>) => Promise<void>;
  reorderRoadmapPhases: (newOrder: string[]) => Promise<void>;
  
  // File management actions
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  
  // AI response actions
  dismissResponse: (responseId: string) => void;
  retryAnalysis: () => Promise<void>;
  
  // Project creation
  createProject: () => Promise<string | null>;
  
  // Utility
  resetWizard: () => void;
  updateConfig: (config: Partial<HybridWizardConfig>) => void;
}

// Brief state creation moved to useBriefState hook

// Conversation state creation moved to useConversation hook

/**
 * Main hook for hybrid project creation wizard state management
 */
export const useHybridProjectState = (
  config: Partial<HybridWizardConfig> = {}
): UseHybridProjectStateReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { createProject: createProjectAPI } = useProjects();

  // New adaptive conversation state management
  const conversationStateHook = useConversationState({
    apiBaseUrl: 'http://localhost:8000',
    enableStreaming: false, // Disable streaming for now
    autoSave: fullConfig.enableRealTimeAnalysis,
    debugMode: false
  });

  // Track if conversation has been started
  const conversationStartedRef = useRef(false);
  
  // Start conversation on mount only once
  useEffect(() => {
    if (!conversationStartedRef.current && conversationStateHook.conversation.id === undefined) {
      conversationStartedRef.current = true;
      conversationStateHook.startConversation();
    }
  }, [conversationStateHook.conversation.id]); // Only re-run if conversation.id changes

  // Brief state management (extracted to separate hook)
  const briefHook = useBriefState({
    enableRoadmapGeneration: fullConfig.enableRealTimeAnalysis
  });

  // File uploads management (extracted to separate hook)
  const fileUploadsHook = useFileUploads({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    enableSecurityScanning: true
  });

  // Wizard flow management (extracted to separate hook)
  const wizardFlowHook = useWizardFlow({
    enableActiveResponses: fullConfig.enableActiveResponses,
    analysisDebounceDelay: fullConfig.analysisDebounceDelay,
    maxResponsesPerSession: fullConfig.maxResponsesPerSession
  });

  // Orchestration service (using ref to maintain identity across renders)
  const orchestrationServiceRef = useRef(new WizardOrchestrationService({
    enableRealTimeAnalysis: fullConfig.enableRealTimeAnalysis,
    analysisDebounceDelay: fullConfig.analysisDebounceDelay,
    includeFileContext: true
  }));

  // Map new conversation state to old structure for backward compatibility
  const mappedConversation: ConversationState = useMemo(() => {
    const adaptiveConv = conversationStateHook.conversation;
    
    // Map messages from new format to old format
    const mappedMessages: ConversationMessage[] = adaptiveConv.messages.map(msg => ({
      id: msg.id,
      type: msg.role === 'user' ? 'user-input' : 'ai-response',
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      confidence: msg.confidence,
      dismissible: msg.role === 'assistant',
      metadata: msg.metadata || {}  // Include metadata for stage tracking
    }));

    return {
      messages: mappedMessages,
      current_input: '',
      is_processing: adaptiveConv.isLoading || adaptiveConv.isStreaming,
      processing_step: adaptiveConv.isStreaming ? 'Processing...' : undefined,
      error: adaptiveConv.error
    };
  }, [conversationStateHook.conversation]);

  // Compose state from child hooks with memoization to prevent unnecessary re-renders
  const state: HybridWizardState = useMemo(() => ({
    conversation: mappedConversation,
    brief: briefHook.brief,
    ai_responses: wizardFlowHook.flowState.ai_responses,
    phase: wizardFlowHook.flowState.phase,
    can_create_project: wizardFlowHook.flowState.can_create_project || conversationStateHook.isConversationComplete,
    error: wizardFlowHook.flowState.error || conversationStateHook.conversation.error
  }), [
    mappedConversation,
    briefHook.brief,
    wizardFlowHook.flowState,
    conversationStateHook.isConversationComplete,
    conversationStateHook.conversation.error
  ]);

  /**
   * Submits a new message and orchestrates analysis across hooks
   */
  const submitMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    try {
      // Submit message to new conversation state hook
      await conversationStateHook.sendMessage(message, {
        uploaded_files: briefHook.brief.uploaded_files.map(f => f.name)
      });

      // Extract project data from conversation if available
      const adaptiveConv = conversationStateHook.conversation;
      if (adaptiveConv.project.summary) {
        // Update brief with extracted project information
        const analysis: ConversationAnalysis = {
          project_name: adaptiveConv.project.data.project_name || '',
          project_type: adaptiveConv.project.data.project_type || 'other',
          description: adaptiveConv.project.data.description || adaptiveConv.project.summary,
          objective: adaptiveConv.project.data.objective,
          deliverables: adaptiveConv.project.data.key_deliverables || [],
          requirements: adaptiveConv.project.data.requirements || [],
          estimated_duration_days: adaptiveConv.project.data.estimated_duration_days,
          suggested_phases: [], // Will be generated by roadmap service
          confidence: adaptiveConv.project.confidence,
          missing_information: adaptiveConv.project.missingInfo || []
        };

        // Update orchestration service cache
        orchestrationServiceRef.current.setCurrentAnalysis(analysis);

        // Coordinate updates across hooks
        await briefHook.updateBriefFromAnalysis(analysis);
        wizardFlowHook.updatePhase(analysis, briefHook.brief);
        wizardFlowHook.updateProjectReadiness(analysis);
      }
    } catch (error) {
      console.error('Message submission failed:', error);
      conversationStateHook.setError('Failed to process your message. Please try again.');
    }
  }, [conversationStateHook, briefHook, wizardFlowHook]);

  /**
   * Handles file uploads and orchestrates analysis integration
   */
  const uploadFiles = useCallback(async (rawFiles: File[]) => {
    try {
      // Upload files with security validation
      const uploadedFiles = await fileUploadsHook.uploadFiles(rawFiles);

      // Add to brief state
      briefHook.addUploadedFiles(uploadedFiles);

      // Orchestrate file analysis integration
      if (uploadedFiles.length > 0) {
        const result = await orchestrationServiceRef.current.analyzeFileUpload(uploadedFiles);
        
        if (result.success) {
          await briefHook.updateBriefFromAnalysis(result.analysis);
        }
      }

      return uploadedFiles;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }, [fileUploadsHook, briefHook]);

  /**
   * Updates a brief field and orchestrates active response analysis
   */
  const updateBriefField = useCallback(async <K extends keyof BriefState>(
    field: K,
    value: BriefState[K]['value']
  ) => {
    // Update field through brief hook
    await briefHook.updateBriefField(field, value);

    // Orchestrate active response if enabled
    if (fullConfig.enableActiveResponses) {
      const triggerAnalyzer = wizardFlowHook.getTriggerAnalyzer();
      const result = await orchestrationServiceRef.current.generateActiveResponse(
        briefHook.brief,
        field,
        triggerAnalyzer
      );

      if (result) {
        // The adaptive conversation hook handles AI messages internally
        // We just need to update the wizard flow state
        wizardFlowHook.addAIResponse(result.response);
      }
    }
  }, [briefHook, fullConfig.enableActiveResponses, wizardFlowHook]);

  /**
   * Updates a roadmap phase (delegating to brief hook)
   */
  const updateRoadmapPhase = useCallback(async (
    phaseId: string,
    updates: Partial<ProjectRoadmapPhase>
  ) => {
    await briefHook.updateRoadmapPhase(phaseId, updates);
  }, [briefHook]);

  /**
   * Reorders roadmap phases (delegating to brief hook)
   */
  const reorderRoadmapPhases = useCallback(async (newOrder: string[]) => {
    await briefHook.reorderRoadmapPhases(newOrder);
  }, [briefHook]);

  /**
   * Dismisses an AI response and learns from the dismissal (delegating to wizard flow hook)
   */
  const dismissResponse = useCallback((responseId: string) => {
    wizardFlowHook.dismissResponse(responseId);
  }, [wizardFlowHook.dismissResponse]);

  /**
   * Retries analysis if it failed
   */
  const retryAnalysis = useCallback(async () => {
    try {
      // Re-run analysis with current data
      const lastUserMessage = state.conversation.messages
        .filter(m => m.type === 'user-input')
        .pop();

      if (lastUserMessage) {
        await submitMessage(lastUserMessage.content);
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
      conversationStateHook.setError('Analysis retry failed. Please try again.');
    }
  }, [state.conversation.messages, submitMessage, conversationStateHook]);

  /**
   * Creates the project using the current brief state (delegating to wizard flow hook for phase management)
   */
  const createProject = useCallback(async (): Promise<string | null> => {
    // Extract data from conversation if brief is not fully populated
    const conversationData = conversationStateHook.conversation.project || {};
    const extractedData = conversationData.data || {};
    
    // Get basic project data from brief or fallback to conversation
    const briefData = briefHook.getProjectData();
    
    try {
      wizardFlowHook.setPhase('finalizing');

      // Map conversation and brief data to project structure
      const projectData = {
        name: briefData.name || extractedData.project_name || 'New Project',
        description: briefData.description || conversationData.summary || '',
        type: briefData.type || extractedData.project_type || 'personal',
        objective: briefData.objective || extractedData.project_goal || '',
        
        // Planning data from conversation
        estimated_hours: extractedData.estimated_hours || 40,
        initial_phase: 'planning' as const,
        status: 'active' as const,
        
        // Key deliverables from conversation or brief
        key_deliverables: briefHook.brief.key_deliverables.value.length > 0 
          ? briefHook.brief.key_deliverables.value
          : (extractedData.key_deliverables || []),
        
        // Timeline info if available
        timeline_info: extractedData.timeline_info,
        
        // Roadmap if generated
        roadmap: briefHook.brief.roadmap.value || null
      };

      const project = await createProjectAPI(projectData);

      wizardFlowHook.setPhase('complete');
      return project.id;
    } catch (error) {
      console.error('Project creation failed:', error);
      wizardFlowHook.setError('Failed to create project. Please try again.');
      wizardFlowHook.setPhase('refining');
      return null;
    }
  }, [briefHook, createProjectAPI, wizardFlowHook, conversationStateHook]);

  /**
   * Clears conversation history (using new conversation state hook)
   */
  const clearConversation = useCallback(() => {
    conversationStateHook.resetConversation();
  }, [conversationStateHook]);

  /**
   * Removes a file from the uploaded files list (delegating to file uploads hook)
   */
  const removeFile = useCallback((fileId: string) => {
    fileUploadsHook.removeFile(fileId);
    // Note: Brief state synchronization is handled through the file upload integration
    // The brief hook maintains its own file list which gets updated when files are added
  }, [fileUploadsHook.removeFile]);

  /**
   * Clears all uploaded files (delegating to file uploads hook)
   */
  const clearAllFiles = useCallback(() => {
    fileUploadsHook.clearAllFiles();
    // Note: Brief state synchronization is handled through the file upload integration
    // The brief hook maintains its own file list which gets reset when wizard resets
  }, [fileUploadsHook.clearAllFiles]);

  /**
   * Resets the entire wizard state - pure coordination
   */
  const resetWizard = useCallback(() => {
    // Reset all hooks
    conversationStateHook.resetConversation();
    briefHook.resetBrief();
    fileUploadsHook.clearAllFiles();
    wizardFlowHook.resetFlow();
    
    // Reset orchestration service
    orchestrationServiceRef.current.reset();
    
    // Reset the started flag
    conversationStartedRef.current = false;
    
    // Restart conversation after a small delay to ensure clean state
    setTimeout(() => {
      conversationStateHook.startConversation();
    }, 100);
  }, [
    conversationStateHook,
    briefHook.resetBrief,
    fileUploadsHook.clearAllFiles,
    wizardFlowHook.resetFlow
  ]);

  /**
   * Updates wizard configuration - pure coordination
   */
  const updateConfig = useCallback((newConfig: Partial<HybridWizardConfig>) => {
    Object.assign(fullConfig, newConfig);
    
    // Coordinate configuration updates across services
    wizardFlowHook.updateConfig({
      enableActiveResponses: newConfig.enableActiveResponses,
      maxResponsesPerSession: newConfig.maxResponsesPerSession,
      analysisDebounceDelay: newConfig.analysisDebounceDelay
    });

    orchestrationServiceRef.current.updateConfig({
      enableRealTimeAnalysis: newConfig.enableRealTimeAnalysis,
      analysisDebounceDelay: newConfig.analysisDebounceDelay
    });
  }, [fullConfig, wizardFlowHook]);

  // updateBriefFromAnalysis moved to useBriefState hook

  // Cleanup moved to useWizardFlow hook

  return {
    state,
    submitMessage,
    uploadFiles,
    clearConversation,
    updateBriefField,
    updateRoadmapPhase,
    reorderRoadmapPhases,
    removeFile,
    clearAllFiles,
    dismissResponse,
    retryAnalysis,
    createProject,
    resetWizard,
    updateConfig
  };
};

/**
 * Utility functions moved to respective hooks:
 * - generateAnalysisConfirmation moved to useConversation hook
 * - determineWizardPhase moved to useWizardFlow hook
 * - canCreateProject moved to useWizardFlow hook
 */