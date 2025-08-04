/**
 * useWizardFlow Hook
 * 
 * Extracted wizard flow logic from useHybridProjectState.
 * Handles phase transitions, AI responses, project creation readiness, and configuration.
 * 
 * Phase 5 of hybrid wizard refactoring - workflow orchestration separation.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  HybridWizardState,
  BriefState,
  AIResponse,
  ConversationAnalysis
} from '@/types/hybrid-wizard';
import { ResponseTriggerAnalyzer } from '@/services/response-trigger-analyzer';

/**
 * Configuration for wizard flow behavior
 */
export interface WizardFlowConfig {
  /** Enable active AI responses to form edits */
  enableActiveResponses: boolean;
  /** Debounce delay for AI analysis (ms) */
  analysisDebounceDelay: number;
  /** Maximum AI responses per session */
  maxResponsesPerSession: number;
}

/**
 * Wizard flow state
 */
export interface WizardFlowState {
  /** Current wizard phase */
  phase: HybridWizardState['phase'];
  /** AI responses generated during workflow */
  ai_responses: AIResponse[];
  /** Whether project can be created */
  can_create_project: boolean;
  /** General error state */
  error: string | null;
}

/**
 * Return type for the useWizardFlow hook
 */
export interface UseWizardFlowReturn {
  // State
  flowState: WizardFlowState;
  
  // Phase management
  updatePhase: (analysis: ConversationAnalysis, brief: BriefState) => void;
  setPhase: (phase: HybridWizardState['phase']) => void;
  
  // AI response management
  addAIResponse: (response: AIResponse) => void;
  dismissResponse: (responseId: string) => void;
  clearAIResponses: () => void;
  
  // Project creation readiness
  updateProjectReadiness: (analysis: ConversationAnalysis) => void;
  setProjectReadiness: (canCreate: boolean) => void;
  
  // Error management
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Configuration
  updateConfig: (config: Partial<WizardFlowConfig>) => void;
  
  // Reset
  resetFlow: () => void;
  
  // Trigger analysis
  getTriggerAnalyzer: () => ResponseTriggerAnalyzer;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: WizardFlowConfig = {
  enableActiveResponses: true,
  analysisDebounceDelay: 2000,
  maxResponsesPerSession: 8
};

/**
 * Creates initial wizard flow state
 */
function createInitialFlowState(): WizardFlowState {
  return {
    phase: 'gathering',
    ai_responses: [],
    can_create_project: false,
    error: null
  };
}

/**
 * Determines wizard phase based on analysis and brief state
 */
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

/**
 * Determines if project can be created based on analysis
 */
function canCreateProject(analysis: ConversationAnalysis): boolean {
  return !!(
    analysis.project_name &&
    analysis.project_type &&
    analysis.objective &&
    analysis.confidence > 0.6
  );
}

/**
 * Wizard flow management hook
 */
export const useWizardFlow = (
  config: Partial<WizardFlowConfig> = {}
): UseWizardFlowReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Flow state
  const [flowState, setFlowState] = useState<WizardFlowState>(createInitialFlowState);
  
  // Trigger analyzer service (using ref to maintain identity across renders)
  const triggerAnalyzerRef = useRef(new ResponseTriggerAnalyzer({
    debounceDelay: fullConfig.analysisDebounceDelay,
    maxResponsesPerSession: fullConfig.maxResponsesPerSession
  }));

  /**
   * Updates wizard phase based on analysis and brief state
   */
  const updatePhase = useCallback((analysis: ConversationAnalysis, brief: BriefState) => {
    const newPhase = determineWizardPhase(analysis, brief);
    setFlowState(prev => ({
      ...prev,
      phase: newPhase
    }));
  }, []);

  /**
   * Manually sets wizard phase
   */
  const setPhase = useCallback((phase: HybridWizardState['phase']) => {
    setFlowState(prev => ({
      ...prev,
      phase
    }));
  }, []);

  /**
   * Adds an AI response to the flow
   */
  const addAIResponse = useCallback((response: AIResponse) => {
    setFlowState(prev => ({
      ...prev,
      ai_responses: [...prev.ai_responses, response]
    }));
  }, []);

  /**
   * Dismisses an AI response and learns from the dismissal
   */
  const dismissResponse = useCallback((responseId: string) => {
    const response = flowState.ai_responses.find(r => r.id === responseId);
    if (response) {
      triggerAnalyzerRef.current.learnFromDismissal(response);
      
      setFlowState(prev => ({
        ...prev,
        ai_responses: prev.ai_responses.map(r => 
          r.id === responseId ? { ...r, dismissed: true } : r
        )
      }));
    }
  }, [flowState.ai_responses]);

  /**
   * Clears all AI responses
   */
  const clearAIResponses = useCallback(() => {
    setFlowState(prev => ({
      ...prev,
      ai_responses: []
    }));
  }, []);

  /**
   * Updates project creation readiness based on analysis
   */
  const updateProjectReadiness = useCallback((analysis: ConversationAnalysis) => {
    const canCreate = canCreateProject(analysis);
    setFlowState(prev => ({
      ...prev,
      can_create_project: canCreate
    }));
  }, []);

  /**
   * Manually sets project creation readiness
   */
  const setProjectReadiness = useCallback((canCreate: boolean) => {
    setFlowState(prev => ({
      ...prev,
      can_create_project: canCreate
    }));
  }, []);

  /**
   * Sets error state
   */
  const setError = useCallback((error: string | null) => {
    setFlowState(prev => ({
      ...prev,
      error
    }));
  }, []);

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setFlowState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Updates wizard flow configuration
   */
  const updateConfig = useCallback((newConfig: Partial<WizardFlowConfig>) => {
    Object.assign(fullConfig, newConfig);
    
    // Update trigger analyzer configuration
    triggerAnalyzerRef.current.updateConfig({
      maxResponsesPerSession: newConfig.maxResponsesPerSession,
      debounceDelay: newConfig.analysisDebounceDelay
    });
  }, [fullConfig]);

  /**
   * Resets wizard flow to initial state
   */
  const resetFlow = useCallback(() => {
    setFlowState(createInitialFlowState());
    triggerAnalyzerRef.current.resetSession();
  }, []);

  /**
   * Gets the trigger analyzer instance for external use
   */
  const getTriggerAnalyzer = useCallback(() => {
    return triggerAnalyzerRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      triggerAnalyzerRef.current.resetSession();
    };
  }, []);

  return {
    flowState,
    updatePhase,
    setPhase,
    addAIResponse,
    dismissResponse,
    clearAIResponses,
    updateProjectReadiness,
    setProjectReadiness,
    setError,
    clearError,
    updateConfig,
    resetFlow,
    getTriggerAnalyzer
  };
};