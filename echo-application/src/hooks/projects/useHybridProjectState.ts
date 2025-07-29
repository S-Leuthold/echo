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
import { useBriefState } from './useBriefState';
import { useFileUploads } from './useFileUploads';
import { useWizardFlow, WizardFlowState } from './useWizardFlow';

// Service imports
import { HybridProjectParser } from '@/services/hybrid-project-parser';

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
 * Creates initial hybrid wizard state (conversation, brief, and flow now managed by hooks)
 */
function createInitialState(conversation: ConversationState, brief: BriefState, flowState: WizardFlowState): HybridWizardState {
  return {
    conversation,
    brief,
    ai_responses: flowState.ai_responses,
    phase: flowState.phase,
    can_create_project: flowState.can_create_project,
    error: flowState.error
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

  // Main state (conversation, brief, and flow now managed by hooks)
  const [state, setState] = useState<HybridWizardState>(
    () => createInitialState(conversationHook.conversation, briefHook.brief, wizardFlowHook.flowState)
  );

  // Service instances (using refs to maintain identity across renders)
  const parserRef = useRef(new HybridProjectParser({
    debounce_delay: fullConfig.analysisDebounceDelay,
    include_file_context: true
  }));

  // Sync conversation state from the conversation hook
  useEffect(() => {
    setState(prev => ({
      ...prev,
      conversation: conversationHook.conversation
    }));
  }, [conversationHook.conversation]);

  // Sync brief state from the brief hook
  useEffect(() => {
    setState(prev => ({
      ...prev,
      brief: briefHook.brief
    }));
  }, [briefHook.brief]);

  // Sync wizard flow state from the wizard flow hook
  useEffect(() => {
    setState(prev => ({
      ...prev,
      ai_responses: wizardFlowHook.flowState.ai_responses,
      phase: wizardFlowHook.flowState.phase,
      can_create_project: wizardFlowHook.flowState.can_create_project,
      error: wizardFlowHook.flowState.error
    }));
  }, [wizardFlowHook.flowState]);

  /**
   * Submits a new message and triggers AI analysis (using conversation hook)
   */
  const submitMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    try {
      // Use conversation hook to submit message and get analysis
      const analysis = await conversationHook.submitMessage(message, briefHook.brief.uploaded_files);

      if (analysis) {
        // Update current analysis cache
        currentAnalysisRef.current = analysis;

        // Update brief fields based on analysis using brief hook
        await briefHook.updateBriefFromAnalysis(analysis);

        // Update wizard phase and project readiness using wizard flow hook
        wizardFlowHook.updatePhase(analysis, briefHook.brief);
        wizardFlowHook.updateProjectReadiness(analysis);
      }
    } catch (error) {
      console.error('Message submission failed:', error);
      conversationHook.setError('Failed to process your message. Please try again.');
    }
  }, [conversationHook, briefHook]);

  /**
   * Handles file uploads with security validation and integrates them into analysis
   */
  const uploadFiles = useCallback(async (rawFiles: File[]) => {
    try {
      // Upload files with security validation using file uploads hook
      const uploadedFiles = await fileUploadsHook.uploadFiles(rawFiles);

      // Add successful uploads to brief using brief hook
      briefHook.addUploadedFiles(uploadedFiles);

      // If we have existing conversation, re-analyze with file context
      if (currentAnalysisRef.current && fullConfig.enableRealTimeAnalysis && uploadedFiles.length > 0) {
        try {
          const updatedAnalysis = await parserRef.current.analyzeConversation(
            '', // Empty input since we're just adding files
            uploadedFiles,
            currentAnalysisRef.current
          );

          currentAnalysisRef.current = updatedAnalysis;
          await briefHook.updateBriefFromAnalysis(updatedAnalysis);
        } catch (error) {
          console.error('File integration analysis failed:', error);
        }
      }

      return uploadedFiles;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }, [fileUploadsHook, briefHook, fullConfig.enableRealTimeAnalysis]);

  /**
   * Updates a brief field and triggers active response analysis (using brief hook)
   */
  const updateBriefField = useCallback(async <K extends keyof BriefState>(
    field: K,
    value: BriefState[K]['value']
  ) => {
    const previousBrief = { ...briefHook.brief };

    // Update field using brief hook
    await briefHook.updateBriefField(field, value);

    // Analyze for active response if enabled
    if (fullConfig.enableActiveResponses) {
      try {
        const triggerAnalyzer = wizardFlowHook.getTriggerAnalyzer();
        const trigger = await triggerAnalyzer.analyzeChange(
          briefHook.brief,
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

          // Add AI response to wizard flow using wizard flow hook
          wizardFlowHook.addAIResponse(aiResponse);
        }
      } catch (error) {
        console.error('Active response analysis failed:', error);
      }
    }
  }, [briefHook, fullConfig.enableActiveResponses, conversationHook]);

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
  }, [wizardFlowHook]);

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
    currentAnalysisRef.current = null;
  }, [conversationHook]);

  /**
   * Removes a file from the uploaded files list (delegating to file uploads hook)
   */
  const removeFile = useCallback((fileId: string) => {
    fileUploadsHook.removeFile(fileId);
    // Note: Brief state synchronization is handled through the file upload integration
    // The brief hook maintains its own file list which gets updated when files are added
  }, [fileUploadsHook]);

  /**
   * Clears all uploaded files (delegating to file uploads hook)
   */
  const clearAllFiles = useCallback(() => {
    fileUploadsHook.clearAllFiles();
    // Note: Brief state synchronization is handled through the file upload integration
    // The brief hook maintains its own file list which gets reset when wizard resets
  }, [fileUploadsHook]);

  /**
   * Resets the entire wizard state (conversation, brief, files, and flow managed by hooks)
   */
  const resetWizard = useCallback(() => {
    conversationHook.clearConversation();
    briefHook.resetBrief();
    fileUploadsHook.clearAllFiles();
    wizardFlowHook.resetFlow();
    setState(prev => createInitialState(prev.conversation, prev.brief, wizardFlowHook.flowState)); // Keep current states from hooks
    currentAnalysisRef.current = null;
  }, [conversationHook, briefHook, fileUploadsHook, wizardFlowHook]);

  /**
   * Updates wizard configuration (delegating to wizard flow hook)
   */
  const updateConfig = useCallback((newConfig: Partial<HybridWizardConfig>) => {
    Object.assign(fullConfig, newConfig);
    
    // Update wizard flow configuration
    wizardFlowHook.updateConfig({
      enableActiveResponses: newConfig.enableActiveResponses,
      maxResponsesPerSession: newConfig.maxResponsesPerSession,
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