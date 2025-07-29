/**
 * useConversationState Hook
 * 
 * React hook for managing adaptive expert coaching conversation state.
 * Provides real-time conversation management with Server-Sent Events streaming,
 * stage progression tracking, and integration with the backend coaching system.
 * 
 * Part of the adaptive expert coaching system implementation.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Conversation stages for the adaptive coaching system
 */
export type ConversationStage = 'discovery' | 'confirmation' | 'expert_coaching';

/**
 * Message in the conversation
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isTyping?: boolean;
  confidence?: number;
  stage?: string;
  metadata?: Record<string, any>;
}

/**
 * Domain detection results
 */
export interface DomainDetection {
  domain: string;
  confidence: number;
  alternative_domains?: Array<[string, number]>;
  reasoning?: string;
}

/**
 * Project understanding extracted from conversation
 */
export interface ProjectData {
  summary?: string;
  data: Record<string, any>;
  confidence: number;
  missingInfo: string[];
  isComplete: boolean;
}

/**
 * Expert persona information
 */
export interface ExpertInfo {
  domain?: string;
  detection?: DomainDetection;
  isActive: boolean;
}

/**
 * User context and preferences
 */
export interface UserContext {
  expertiseLevel?: string;
  constraints: string[];
  successCriteria: string[];
  concerns: string[];
}

/**
 * Conversation analytics
 */
export interface ConversationAnalytics {
  exchanges: number;
  avgResponseTime: number;
  startedAt: string;
  lastActive: string;
  stageTransitions: number;
}

/**
 * UI state for conversation components
 */
export interface ConversationUIState {
  showStageIndicator: boolean;
  showConfidenceScore: boolean;
  showDomainSwitch: boolean;
  showProjectSummary: boolean;
  canComplete: boolean;
}

/**
 * Complete conversation state
 */
export interface ConversationState {
  id?: string;
  stage: {
    current: ConversationStage;
    progress: number;
    canTransition: boolean;
  };
  messages: ConversationMessage[];
  project: ProjectData;
  expert: ExpertInfo;
  user: UserContext;
  analytics: ConversationAnalytics;
  ui: ConversationUIState;
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
}

/**
 * Configuration for conversation behavior
 */
export interface ConversationConfig {
  apiBaseUrl?: string;
  enableStreaming?: boolean;
  autoSave?: boolean;
  debugMode?: boolean;
}

/**
 * Event types for streaming
 */
export type StreamEventType = 
  | 'message_received'
  | 'thinking'
  | 'stage_transition'
  | 'domain_detected'
  | 'partial_response'
  | 'response_complete'
  | 'error';

/**
 * Stream event data structure
 */
export interface StreamEvent {
  type: StreamEventType;
  data: any;
  timestamp: string;
}

/**
 * Return type for useConversationState hook
 */
export interface UseConversationStateReturn {
  // State
  conversation: ConversationState;
  
  // Actions
  startConversation: (userId?: string) => Promise<void>;
  sendMessage: (message: string, metadata?: Record<string, any>) => Promise<void>;
  sendStreamingMessage: (message: string, metadata?: Record<string, any>) => Promise<void>;
  completeConversation: (corrections?: Record<string, any>) => Promise<string | null>;
  loadConversation: (conversationId: string) => Promise<void>;
  resetConversation: () => void;
  setError: (error: string | null) => void;
  
  // Utilities
  canSendMessage: boolean;
  stageProgress: number;
  isConversationComplete: boolean;
}

/**
 * Default conversation state
 */
const createInitialConversationState = (): ConversationState => ({
  stage: {
    current: 'discovery',
    progress: 0.0,
    canTransition: false
  },
  messages: [],
  project: {
    data: {},
    confidence: 0,
    missingInfo: [],
    isComplete: false
  },
  expert: {
    isActive: false
  },
  user: {
    constraints: [],
    successCriteria: [],
    concerns: []
  },
  analytics: {
    exchanges: 0,
    avgResponseTime: 0,
    startedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    stageTransitions: 0
  },
  ui: {
    showStageIndicator: true,
    showConfidenceScore: false,
    showDomainSwitch: false,
    showProjectSummary: false,
    canComplete: false
  },
  isLoading: false,
  error: null,
  isStreaming: false
});

/**
 * Adaptive expert coaching conversation state management hook
 */
export const useConversationState = (
  config: ConversationConfig = {}
): UseConversationStateReturn => {
  const {
    apiBaseUrl = 'http://localhost:8000',
    enableStreaming = true,
    autoSave = true,
    debugMode = false
  } = config;

  // State
  const [conversation, setConversation] = useState<ConversationState>(createInitialConversationState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Start a new conversation
   */
  const startConversation = useCallback(async (userId?: string): Promise<void> => {
    try {
      setConversation(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${apiBaseUrl}/conversations/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      const data = await response.json();
      
      setConversation(prev => ({
        ...prev,
        id: data.conversation_id,
        messages: [
          {
            id: 'welcome',
            role: 'assistant',
            content: data.message,
            timestamp: data.created_at,
            isTyping: false
          }
        ],
        analytics: {
          ...prev.analytics,
          startedAt: data.created_at,
          lastActive: data.created_at
        },
        isLoading: false
      }));

      if (debugMode) {
        console.log('🚀 Started conversation:', data.conversation_id);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      setConversation(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      console.error('Failed to start conversation:', error);
    }
  }, [apiBaseUrl, debugMode]);

  /**
   * Send a message without streaming
   */
  const sendMessage = useCallback(async (
    message: string, 
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    if (!conversation.id || !message.trim()) return;

    try {
      setConversation(prev => ({ ...prev, isLoading: true, error: null }));

      // Add user message immediately
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        metadata
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage]
      }));

      const response = await fetch(`${apiBaseUrl}/conversations/${conversation.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, metadata })
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const data = await response.json();

      // Add assistant message
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        confidence: data.confidence,
        stage: data.stage,
        metadata: {
          detected_domain: data.detected_domain,
          reasoning: data.reasoning
        }
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        stage: {
          current: data.stage,
          progress: data.stage === 'discovery' ? 0.33 : data.stage === 'confirmation' ? 0.66 : 1.0,
          canTransition: data.confidence > 0.7
        },
        project: {
          summary: data.project_summary,
          data: prev.project.data,
          confidence: data.confidence,
          missingInfo: data.missing_information || [],
          isComplete: data.confidence > 0.8 && (data.missing_information?.length || 0) === 0
        },
        expert: {
          domain: data.detected_domain,
          isActive: data.stage === 'expert_coaching'
        },
        analytics: {
          ...prev.analytics,
          exchanges: prev.analytics.exchanges + 1,
          lastActive: new Date().toISOString()
        },
        isLoading: false
      }));

      if (debugMode) {
        console.log('💬 Message sent:', { stage: data.stage, confidence: data.confidence });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setConversation(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      console.error('Failed to send message:', error);
    }
  }, [conversation.id, apiBaseUrl, debugMode]);

  /**
   * Send a message with streaming response
   */
  const sendStreamingMessage = useCallback(async (
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<void> => {
    if (!conversation.id || !message.trim() || !enableStreaming) {
      return sendMessage(message, metadata);
    }

    try {
      setConversation(prev => ({ ...prev, isStreaming: true, error: null }));

      // Add user message immediately
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        metadata
      };

      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, userMessage]
      }));

      // Create EventSource for streaming
      const eventSource = new EventSource(
        `${apiBaseUrl}/conversations/${conversation.id}/stream`,
        { withCredentials: false }
      );

      eventSourceRef.current = eventSource;

      // Send the message via POST (EventSource doesn't support POST)
      const response = await fetch(`${apiBaseUrl}/conversations/${conversation.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, metadata })
      });

      if (!response.ok) {
        throw new Error(`Failed to start streaming: ${response.statusText}`);
      }

      // Handle streaming events
      let currentAssistantMessage = '';
      let assistantMessageId = `assistant-${Date.now()}`;

      const handleStreamEvent = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          
          if (debugMode) {
            console.log('📡 Stream event:', data.type, data);
          }

          switch (data.type) {
            case 'thinking':
              // Add thinking indicator
              setConversation(prev => ({
                ...prev,
                messages: [...prev.messages, {
                  id: assistantMessageId,
                  role: 'assistant',
                  content: data.message,
                  timestamp: data.timestamp,
                  isTyping: true
                }]
              }));
              break;

            case 'partial_response':
              currentAssistantMessage = data.message;
              
              // Update the assistant message with partial content
              setConversation(prev => ({
                ...prev,
                messages: prev.messages.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: currentAssistantMessage, isTyping: !data.is_complete }
                    : msg
                )
              }));
              break;

            case 'stage_transition':
              setConversation(prev => ({
                ...prev,
                stage: {
                  current: data.new_stage,
                  progress: data.new_stage === 'discovery' ? 0.33 : data.new_stage === 'confirmation' ? 0.66 : 1.0,
                  canTransition: false
                }
              }));
              break;

            case 'domain_detected':
              setConversation(prev => ({
                ...prev,
                expert: {
                  domain: data.domain,
                  detection: {
                    domain: data.domain,
                    confidence: data.confidence,
                    reasoning: data.reasoning
                  },
                  isActive: prev.stage.current === 'expert_coaching'
                }
              }));
              break;

            case 'response_complete':
              // Finalize the assistant message
              setConversation(prev => ({
                ...prev,
                messages: prev.messages.map(msg => 
                  msg.id === assistantMessageId 
                    ? { 
                        ...msg, 
                        isTyping: false,
                        confidence: data.confidence,
                        stage: data.stage,
                        metadata: {
                          detected_domain: data.detected_domain,
                          reasoning: data.reasoning
                        }
                      }
                    : msg
                ),
                project: {
                  summary: data.project_summary,
                  data: prev.project.data,
                  confidence: data.confidence,
                  missingInfo: data.missing_information || [],
                  isComplete: data.confidence > 0.8 && (data.missing_information?.length || 0) === 0
                },
                analytics: {
                  ...prev.analytics,
                  exchanges: data.total_exchanges,
                  lastActive: data.timestamp
                },
                isStreaming: false
              }));

              // Close the EventSource
              if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
              }
              break;

            case 'error':
              throw new Error(data.error);
          }
        } catch (error) {
          console.error('Error parsing stream event:', error);
        }
      };

      eventSource.onmessage = handleStreamEvent;
      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setConversation(prev => ({
          ...prev,
          isStreaming: false,
          error: 'Connection lost. Please try again.'
        }));
        eventSource.close();
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send streaming message';
      setConversation(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage
      }));
      console.error('Failed to send streaming message:', error);
    }
  }, [conversation.id, apiBaseUrl, enableStreaming, debugMode, sendMessage]);

  /**
   * Complete the conversation and create project
   */
  const completeConversation = useCallback(async (
    corrections: Record<string, any> = {}
  ): Promise<string | null> => {
    if (!conversation.id) return null;

    try {
      setConversation(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${apiBaseUrl}/conversations/${conversation.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corrections })
      });

      if (!response.ok) {
        throw new Error(`Failed to complete conversation: ${response.statusText}`);
      }

      const data = await response.json();
      
      setConversation(prev => ({
        ...prev,
        isLoading: false,
        ui: {
          ...prev.ui,
          canComplete: false
        }
      }));

      if (debugMode) {
        console.log('✅ Conversation completed:', data.project_id);
      }

      return data.project_id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete conversation';
      setConversation(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      console.error('Failed to complete conversation:', error);
      return null;
    }
  }, [conversation.id, apiBaseUrl, debugMode]);

  /**
   * Load an existing conversation
   */
  const loadConversation = useCallback(async (conversationId: string): Promise<void> => {
    try {
      setConversation(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch(`${apiBaseUrl}/conversations/${conversationId}`);

      if (!response.ok) {
        throw new Error(`Failed to load conversation: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert API response to conversation state
      setConversation(prev => ({
        ...prev,
        id: data.conversation_id,
        stage: {
          current: data.stage,
          progress: data.stage === 'discovery' ? 0.33 : data.stage === 'confirmation' ? 0.66 : 1.0,
          canTransition: data.confidence_score > 0.7
        },
        messages: data.messages,
        project: {
          summary: data.project_summary,
          data: data.extracted_data,
          confidence: data.confidence_score,
          missingInfo: data.missing_information,
          isComplete: data.confidence_score > 0.8 && data.missing_information.length === 0
        },
        expert: {
          domain: data.current_persona,
          detection: data.domain_detection,
          isActive: data.stage === 'expert_coaching'
        },
        analytics: {
          exchanges: data.total_exchanges,
          avgResponseTime: 0, // Not provided in API
          startedAt: data.created_at,
          lastActive: data.updated_at,
          stageTransitions: 0 // Not provided in API
        },
        ui: {
          showStageIndicator: true,
          showConfidenceScore: data.confidence_score > 0,
          showDomainSwitch: data.stage === 'expert_coaching',
          showProjectSummary: data.project_summary !== null,
          canComplete: data.confidence_score > 0.7 && data.missing_information.length <= 2
        },
        isLoading: false
      }));

      if (debugMode) {
        console.log('📂 Loaded conversation:', conversationId);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load conversation';
      setConversation(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      console.error('Failed to load conversation:', error);
    }
  }, [apiBaseUrl, debugMode]);

  /**
   * Reset conversation to initial state
   */
  const resetConversation = useCallback(() => {
    // Close any active streams
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setConversation(createInitialConversationState());
    
    if (debugMode) {
      console.log('🔄 Reset conversation');
    }
  }, [debugMode]);

  /**
   * Set error state
   */
  const setError = useCallback((error: string | null) => {
    setConversation(prev => ({ ...prev, error }));
  }, []);

  // Computed properties
  const canSendMessage = !conversation.isLoading && !conversation.isStreaming && !!conversation.id;
  const stageProgress = conversation.stage.progress;
  const isConversationComplete = conversation.ui.canComplete;

  return {
    conversation,
    startConversation,
    sendMessage,
    sendStreamingMessage,
    completeConversation,
    loadConversation,
    resetConversation,
    setError,
    canSendMessage,
    stageProgress,
    isConversationComplete
  };
};