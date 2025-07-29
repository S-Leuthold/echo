/**
 * AdaptiveIntelligenceInterface Component
 * 
 * Main interface component that orchestrates the adaptive expert intelligence conversation.
 * Combines all conversation UI components with the useConversationState hook.
 * 
 * Part of the adaptive expert intelligence system UI components.
 */

import React, { useEffect, useState } from 'react';
import { useConversationState, ConversationConfig } from '@/hooks/projects/useConversationState';
import { ConversationStageIndicator } from './ConversationStageIndicator';
import { ConversationProgressTracker } from './ConversationProgressTracker';
import { ConversationMessageList } from './ConversationMessageList';
import { ConversationInput } from './ConversationInput';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AdaptiveIntelligenceInterfaceProps {
  /** Configuration for conversation behavior */
  config?: ConversationConfig;
  /** Callback when project is successfully created */
  onProjectCreated?: (projectId: string) => void;
  /** Callback when conversation is cancelled */
  onCancel?: () => void;
  /** Show detailed progress tracking */
  showDetailedProgress?: boolean;
  /** Show stage descriptions */
  showStageDescriptions?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Error display component
 */
const ErrorAlert: React.FC<{
  error: string;
  onDismiss: () => void;
}> = ({ error, onDismiss }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <AlertCircle className="w-5 h-5 text-red-600" />
        <div>
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  </div>
);

/**
 * Success notification component
 */
const SuccessAlert: React.FC<{
  message: string;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <CheckCircle2 className="w-5 h-5 text-green-600" />
        <div>
          <h3 className="text-sm font-medium text-green-800">Success</h3>
          <p className="text-sm text-green-700 mt-1">{message}</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-green-400 hover:text-green-600 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  </div>
);

/**
 * Conversation completion component
 */
const ConversationCompletion: React.FC<{
  onComplete: () => void;
  onCancel: () => void;
  isLoading: boolean;
}> = ({ onComplete, onCancel, isLoading }) => (
  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 text-center">
    <div className="mb-4">
      <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Ready to Create Your Project
      </h3>
      <p className="text-gray-600">
        I have enough information to create your project. Would you like to proceed?
      </p>
    </div>
    
    <div className="flex justify-center space-x-4">
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        Continue Conversation
      </button>
      <button
        onClick={onComplete}
        disabled={isLoading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
      >
        {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        <span>Create Project</span>
      </button>
    </div>
  </div>
);

/**
 * Main adaptive intelligence interface component
 */
export const AdaptiveIntelligenceInterface: React.FC<AdaptiveIntelligenceInterfaceProps> = ({
  config = {},
  onProjectCreated,
  onCancel,
  showDetailedProgress = true,
  showStageDescriptions = true,
  className = ''
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Initialize conversation hook
  const {
    conversation,
    startConversation,
    sendStreamingMessage,
    completeConversation,
    resetConversation,
    setError,
    canSendMessage,
    isConversationComplete
  } = useConversationState(config);
  
  // Start conversation on mount
  useEffect(() => {
    startConversation();
  }, [startConversation]);
  
  // Show completion interface when ready
  useEffect(() => {
    if (isConversationComplete && !showCompletion) {
      setShowCompletion(true);
    }
  }, [isConversationComplete, showCompletion]);
  
  // Handle message sending
  const handleSendMessage = async (message: string, files?: File[]) => {
    try {
      await sendStreamingMessage(message, { files: files?.map(f => f.name) || [] });
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  };
  
  // Handle conversation completion
  const handleCompleteConversation = async () => {
    try {
      const projectId = await completeConversation();
      if (projectId) {
        setSuccessMessage('Project created successfully!');
        if (onProjectCreated) {
          onProjectCreated(projectId);
        }
      } else {
        setError('Failed to create project. Please try again.');
      }
    } catch (error) {
      console.error('Failed to complete conversation:', error);
      setError('Failed to create project. Please try again.');
    }
  };
  
  // Handle conversation cancellation
  const handleCancel = () => {
    resetConversation();
    if (onCancel) {
      onCancel();
    }
  };
  
  // Handle continuing conversation after completion prompt
  const handleContinueConversation = () => {
    setShowCompletion(false);
  };
  
  // Dismiss notifications
  const dismissError = () => setError(null);
  const dismissSuccess = () => setSuccessMessage(null);
  
  return (
    <div className={`adaptive-intelligence-interface max-w-4xl mx-auto ${className}`}>
      {/* Header with stage indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            Adaptive Project Intelligence
          </h2>
          {onCancel && (
            <button
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <ConversationStageIndicator
          currentStage={conversation.stage.current}
          progress={conversation.stage.progress}
          canTransition={conversation.stage.canTransition}
          showDescriptions={showStageDescriptions}
        />
      </div>
      
      {/* Alerts */}
      {conversation.error && (
        <ErrorAlert error={conversation.error} onDismiss={dismissError} />
      )}
      
      {successMessage && (
        <SuccessAlert message={successMessage} onDismiss={dismissSuccess} />
      )}
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Completion prompt */}
          {showCompletion && (
            <ConversationCompletion
              onComplete={handleCompleteConversation}
              onCancel={handleContinueConversation}
              isLoading={conversation.isLoading}
            />
          )}
          
          {/* Message list */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="h-96 overflow-y-auto p-4">
              <ConversationMessageList
                messages={conversation.messages}
                currentStage={conversation.stage.current}
                isStreaming={conversation.isStreaming}
                showConfidence={true}
                showTimestamps={false}
                autoScroll={true}
              />
            </div>
          </div>
          
          {/* Input area */}
          <ConversationInput
            currentStage={conversation.stage.current}
            disabled={!canSendMessage || showCompletion}
            isStreaming={conversation.isStreaming}
            onSendMessage={handleSendMessage}
            enableFileUpload={true}
          />
        </div>
        
        {/* Progress sidebar */}
        {showDetailedProgress && (
          <div className="lg:col-span-1">
            <ConversationProgressTracker
              conversation={conversation}
              showAnalytics={true}
              showConfidence={true}
              showProjectStatus={true}
              compact={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdaptiveIntelligenceInterface;