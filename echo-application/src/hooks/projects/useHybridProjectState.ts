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

import { useCallback, useRef, useMemo } from 'react';
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

  // Conversation management (extracted to separate hook)
  const conversationHook = useConversation(
    {
      enableRealTimeAnalysis: fullConfig.enableRealTimeAnalysis,
      analysisDebounceDelay: fullConfig.analysisDebounceDelay
    },
    null // Analysis now managed by orchestration service
  );

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

  // Compose state from child hooks with memoization to prevent unnecessary re-renders
  const state: HybridWizardState = useMemo(() => ({
    conversation: conversationHook.conversation,
    brief: briefHook.brief,
    ai_responses: wizardFlowHook.flowState.ai_responses,
    phase: wizardFlowHook.flowState.phase,
    can_create_project: wizardFlowHook.flowState.can_create_project,
    error: wizardFlowHook.flowState.error
  }), [
    conversationHook.conversation,
    briefHook.brief,
    wizardFlowHook.flowState
  ]);

  /**
   * Submits a new message and orchestrates analysis across hooks
   */
  const submitMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    try {
      // Submit message to conversation hook
      const analysis = await conversationHook.submitMessage(message, briefHook.brief.uploaded_files);

      if (analysis) {
        // Update orchestration service cache
        orchestrationServiceRef.current.setCurrentAnalysis(analysis);

        // Coordinate updates across hooks
        await briefHook.updateBriefFromAnalysis(analysis);
        wizardFlowHook.updatePhase(analysis, briefHook.brief);
        wizardFlowHook.updateProjectReadiness(analysis);
      }
    } catch (error) {
      console.error('Message submission failed:', error);
      conversationHook.setError('Failed to process your message. Please try again.');
    }
  }, [conversationHook, briefHook, wizardFlowHook]);

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
        // Coordinate response across hooks
        conversationHook.addAIMessage(result.message, 0.8, true);
        wizardFlowHook.addAIResponse(result.response);
      }
    }
  }, [briefHook, fullConfig.enableActiveResponses, conversationHook, wizardFlowHook]);

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
      conversationHook.setProcessingState(true);
      conversationHook.setError(null);

      // Re-run analysis with current data
      const lastUserMessage = state.conversation.messages
        .filter(m => m.type === 'user-input')
        .pop();

      if (lastUserMessage) {
        await submitMessage(lastUserMessage.content);
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
      conversationHook.setProcessingState(false);
      conversationHook.setError('Analysis retry failed. Please try again.');
    }
  }, [state.conversation.messages, submitMessage, conversationHook]);

  /**
   * Creates the project using the current brief state (delegating to wizard flow hook for phase management)
   */
  const createProject = useCallback(async (): Promise<string | null> => {
    if (!briefHook.isReadyForCreation()) {
      throw new Error('Project is not ready for creation');
    }

    try {
      wizardFlowHook.setPhase('finalizing');

      const projectData = {
        ...briefHook.getProjectData(),
        // Convert brief state to ProjectFormData format
        estimated_hours: 40, // Default estimate
        initial_phase: 'initiation' as const
      };

      const project = await createProjectAPI(projectData);

      // Update project with roadmap and deliverables if available
      // This would be done through API in real implementation
      if (briefHook.brief.roadmap.value) {
        // Store roadmap in project
        console.log('Roadmap to be saved:', briefHook.brief.roadmap.value);
      }

      if (briefHook.brief.key_deliverables.value.length > 0) {
        // Store deliverables in project
        console.log('Deliverables to be saved:', briefHook.brief.key_deliverables.value);
      }

      wizardFlowHook.setPhase('complete');
      return project.id;
    } catch (error) {
      console.error('Project creation failed:', error);
      wizardFlowHook.setError('Failed to create project. Please try again.');
      wizardFlowHook.setPhase('refining');
      return null;
    }
  }, [briefHook, createProjectAPI, wizardFlowHook]);

  /**
   * Clears conversation history (using conversation hook)
   */
  const clearConversation = useCallback(() => {
    conversationHook.clearConversation();
  }, [conversationHook.clearConversation]);

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
    conversationHook.clearConversation();
    briefHook.resetBrief();
    fileUploadsHook.clearAllFiles();
    wizardFlowHook.resetFlow();
    
    // Reset orchestration service
    orchestrationServiceRef.current.reset();
  }, [
    conversationHook.clearConversation,
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