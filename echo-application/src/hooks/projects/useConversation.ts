/**
 * useConversation Hook
 * 
 * Extracted conversation management logic from useHybridProjectState.
 * Handles message submission, AI analysis integration, and conversation state.
 * 
 * Phase 2 of hybrid wizard refactoring - single responsibility principle.
 */

import { useState, useCallback, useRef } from 'react';
import { 
  ConversationState,
  ConversationMessage,
  ConversationAnalysis 
} from '@/types/hybrid-wizard';
import { UploadedFile } from '@/components/projects/FileUploadZone';
import { HybridProjectParser } from '@/services/hybrid-project-parser';

/**
 * Configuration for conversation behavior
 */
export interface ConversationConfig {
  /** Enable real-time AI analysis */
  enableRealTimeAnalysis: boolean;
  /** Debounce delay for AI analysis (ms) */
  analysisDebounceDelay: number;
}

/**
 * Return type for the useConversation hook
 */
export interface UseConversationReturn {
  // State
  conversation: ConversationState;
  
  // Actions
  submitMessage: (message: string, uploadedFiles?: UploadedFile[]) => Promise<ConversationAnalysis | null>;
  clearConversation: () => void;
  setProcessingState: (isProcessing: boolean, step?: string) => void;
  setError: (error: string | null) => void;
  addAIMessage: (content: string, confidence?: number, dismissible?: boolean) => void;
}

/**
 * Creates initial conversation state with welcome message
 */
function createInitialConversationState(): ConversationState {
  return {
    messages: [
      {
        id: 'initial',
        type: 'ai-response',
        content: "Let's create your project! Tell me what you're working on. You can describe it here or upload any relevant files - requirements, sketches, notes, anything that gives context.",
        timestamp: new Date(),
        confidence: 1.0,
        dismissible: false
      }
    ],
    current_input: '',
    is_processing: false,
    error: null
  };
}

/**
 * Conversation management hook with AI analysis integration
 */
export const useConversation = (
  config: ConversationConfig,
  currentAnalysis?: ConversationAnalysis | null
): UseConversationReturn => {
  // Conversation state
  const [conversation, setConversation] = useState<ConversationState>(
    createInitialConversationState
  );

  // AI parser service (using ref to maintain identity across renders)
  const parserRef = useRef(new HybridProjectParser({
    debounce_delay: config.analysisDebounceDelay,
    include_file_context: true
  }));

  /**
   * Submits a new message and triggers AI analysis
   */
  const submitMessage = useCallback(async (
    message: string, 
    uploadedFiles: UploadedFile[] = []
  ): Promise<ConversationAnalysis | null> => {
    if (!message.trim() || conversation.is_processing) {
      return null;
    }

    try {
      // Add user message to conversation
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'user-input',
        content: message,
        timestamp: new Date()
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        current_input: '',
        is_processing: true,
        processing_step: 'Analyzing your input...'
      }));

      // Analyze conversation with AI if enabled
      if (config.enableRealTimeAnalysis) {
        const analysis = await parserRef.current.analyzeConversation(
          message,
          uploadedFiles,
          currentAnalysis || undefined
        );

        // Add AI confirmation message
        const aiMessage: ConversationMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai-response',
          content: generateAnalysisConfirmation(analysis),
          timestamp: new Date(),
          confidence: analysis.confidence
        };

        setConversation(prev => ({
          ...prev,
          messages: [...prev.messages, aiMessage],
          is_processing: false,
          processing_step: undefined
        }));

        return analysis;
      } else {
        // If analysis is disabled, just stop processing
        setConversation(prev => ({
          ...prev,
          is_processing: false,
          processing_step: undefined
        }));

        return null;
      }
    } catch (error) {
      console.error('Message submission failed:', error);
      setConversation(prev => ({
        ...prev,
        is_processing: false,
        error: 'Failed to process your message. Please try again.'
      }));
      return null;
    }
  }, [conversation.is_processing, config.enableRealTimeAnalysis, currentAnalysis]);

  /**
   * Clears conversation history and resets to initial state
   */
  const clearConversation = useCallback(() => {
    setConversation(createInitialConversationState());
  }, []);

  /**
   * Sets processing state (useful for external operations)
   */
  const setProcessingState = useCallback((isProcessing: boolean, step?: string) => {
    setConversation(prev => ({
      ...prev,
      is_processing: isProcessing,
      processing_step: step
    }));
  }, []);

  /**
   * Sets error state
   */
  const setError = useCallback((error: string | null) => {
    setConversation(prev => ({
      ...prev,
      error
    }));
  }, []);

  /**
   * Adds an AI message to the conversation
   */
  const addAIMessage = useCallback((
    content: string, 
    confidence: number = 0.8, 
    dismissible: boolean = true
  ) => {
    const aiMessage: ConversationMessage = {
      id: `ai-external-${Date.now()}`,
      type: 'ai-response',
      content,
      timestamp: new Date(),
      confidence,
      dismissible
    };

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, aiMessage]
    }));
  }, []);

  return {
    conversation,
    submitMessage,
    clearConversation,
    setProcessingState,
    setError,
    addAIMessage
  };
};

/**
 * Generates a confirmation message based on AI analysis results
 */
function generateAnalysisConfirmation(analysis: ConversationAnalysis): string {
  const parts = ["Got it! I've updated the project brief."];
  
  if (analysis.project_name) {
    parts.push(`Project: "${analysis.project_name}"`);
  }
  
  if (analysis.missing_information && analysis.missing_information.length > 0) {
    parts.push(`To improve my understanding, could you tell me more about: ${analysis.missing_information.join(', ')}?`);
  }
  
  return parts.join(' ');
}