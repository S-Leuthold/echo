/**
 * ConversationMessageList Component
 * 
 * Displays conversation messages with typing indicators, confidence scores,
 * and stage-aware styling for the adaptive expert intelligence system.
 * 
 * Part of the adaptive expert intelligence system UI components.
 */

import React, { useEffect, useRef } from 'react';
import { ConversationMessage, ConversationStage } from '@/hooks/projects/useConversationState';
import { User, Bot, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface ConversationMessageListProps {
  /** Array of conversation messages */
  messages: ConversationMessage[];
  /** Current conversation stage for styling context */
  currentStage: ConversationStage;
  /** Whether conversation is currently streaming */
  isStreaming: boolean;
  /** Show confidence scores for assistant messages */
  showConfidence?: boolean;
  /** Show message timestamps */
  showTimestamps?: boolean;
  /** Auto-scroll to bottom on new messages */
  autoScroll?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Individual message component with role-based styling
 */
const MessageBubble: React.FC<{
  message: ConversationMessage;
  currentStage: ConversationStage;
  showConfidence: boolean;
  showTimestamp: boolean;
}> = ({ message, currentStage, showConfidence, showTimestamp }) => {
  const isUser = message.role === 'user';
  const isTyping = message.isTyping || false;
  
  // Stage-based color schemes
  const getStageColors = (stage: ConversationStage) => {
    switch (stage) {
      case 'discovery':
        return {
          assistant: 'bg-blue-50 border-blue-200 text-blue-900',
          user: 'bg-blue-600 text-white'
        };
      case 'confirmation':
        return {
          assistant: 'bg-amber-50 border-amber-200 text-amber-900',
          user: 'bg-amber-600 text-white'
        };
      case 'expert_guidance':
        return {
          assistant: 'bg-purple-50 border-purple-200 text-purple-900',
          user: 'bg-purple-600 text-white'
        };
      default:
        return {
          assistant: 'bg-gray-50 border-gray-200 text-gray-900',
          user: 'bg-gray-600 text-white'
        };
    }
  };
  
  const stageColors = getStageColors(currentStage);
  const bubbleClasses = isUser 
    ? `${stageColors.user} ml-auto`
    : `${stageColors.assistant} border mr-auto`;
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-amber-600';
    return 'text-red-600';
  };
  
  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return null;
    if (confidence >= 0.8) return CheckCircle;
    if (confidence >= 0.6) return AlertTriangle;
    return AlertTriangle;
  };
  
  const ConfidenceIcon = getConfidenceIcon(message.confidence);
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl`}>
        {/* Message header with role indicator */}
        <div className={`flex items-center mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className="flex items-center space-x-2">
            {!isUser && <Bot className="w-4 h-4 text-gray-500" />}
            {isUser && <User className="w-4 h-4 text-gray-500" />}
            <span className="text-xs font-medium text-gray-600">
              {isUser ? 'You' : 'AI Assistant'}
            </span>
            {showTimestamp && (
              <span className="text-xs text-gray-400">
                {formatTimestamp(message.timestamp)}
              </span>
            )}
          </div>
        </div>
        
        {/* Message bubble */}
        <div className={`rounded-lg px-4 py-3 ${bubbleClasses} ${isUser ? 'max-w-full' : 'max-w-full'}`}>
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-center space-x-2 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm opacity-75">Thinking...</span>
            </div>
          )}
          
          {/* Message content */}
          <div className={`${isTyping ? 'opacity-75' : ''}`}>
            {message.content}
          </div>
          
          {/* Assistant message metadata */}
          {!isUser && !isTyping && (
            <div className="mt-2 flex items-center justify-between">
              {/* Confidence score */}
              {showConfidence && message.confidence && (
                <div className="flex items-center space-x-1">
                  {ConfidenceIcon && <ConfidenceIcon className={`w-3 h-3 ${getConfidenceColor(message.confidence)}`} />}
                  <span className={`text-xs ${getConfidenceColor(message.confidence)}`}>
                    {Math.round(message.confidence * 100)}% confident
                  </span>
                </div>
              )}
              
              {/* Stage indicator */}
              {message.stage && (
                <span className="text-xs opacity-60">
                  {message.stage.replace('_', ' ')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Typing indicator component for real-time streaming
 */
const TypingIndicator: React.FC<{
  currentStage: ConversationStage;
}> = ({ currentStage }) => {
  const getStageColors = (stage: ConversationStage) => {
    switch (stage) {
      case 'discovery':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'confirmation':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'expert_coaching':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };
  
  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl">
        <div className="flex items-center mb-1">
          <Bot className="w-4 h-4 text-gray-500 mr-2" />
          <span className="text-xs font-medium text-gray-600">AI Assistant</span>
        </div>
        
        <div className={`rounded-lg px-4 py-3 border ${getStageColors(currentStage)}`}>
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Processing your message...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Stage transition indicator
 */
const StageTransitionIndicator: React.FC<{
  newStage: ConversationStage;
  timestamp: string;
}> = ({ newStage, timestamp }) => {
  const stageLabels = {
    discovery: 'Discovery Phase',
    confirmation: 'Confirmation Phase',
    expert_guidance: 'Expert Guidance Phase'
  };
  
  return (
    <div className="flex justify-center my-6">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
        🚀 Advancing to {stageLabels[newStage]}
      </div>
    </div>
  );
};

/**
 * Main conversation message list component
 */
export const ConversationMessageList: React.FC<ConversationMessageListProps> = ({
  messages,
  currentStage,
  isStreaming,
  showConfidence = true,
  showTimestamps = false,
  autoScroll = true,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming, autoScroll]);
  
  // Track stage transitions for special indicators
  const getStageTransitions = () => {
    const transitions: Array<{ index: number; newStage: ConversationStage; timestamp: string }> = [];
    let currentMessageStage: ConversationStage | null = null;
    
    messages.forEach((message, index) => {
      if (message.stage && message.stage !== currentMessageStage) {
        transitions.push({
          index,
          newStage: message.stage as ConversationStage,
          timestamp: message.timestamp
        });
        currentMessageStage = message.stage as ConversationStage;
      }
    });
    
    return transitions;
  };
  
  const stageTransitions = getStageTransitions();
  
  return (
    <div className={`conversation-message-list ${className}`}>
      <div className="space-y-0">
        {messages.map((message, index) => {
          // Check if there's a stage transition before this message
          const transition = stageTransitions.find(t => t.index === index);
          
          return (
            <React.Fragment key={message.id}>
              {/* Stage transition indicator */}
              {transition && (
                <StageTransitionIndicator
                  newStage={transition.newStage}
                  timestamp={transition.timestamp}
                />
              )}
              
              {/* Message bubble */}
              <MessageBubble
                message={message}
                currentStage={currentStage}
                showConfidence={showConfidence}
                showTimestamp={showTimestamps}
              />
            </React.Fragment>
          );
        })}
        
        {/* Streaming indicator */}
        {isStreaming && (
          <TypingIndicator currentStage={currentStage} />
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ConversationMessageList;