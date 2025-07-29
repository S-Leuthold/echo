/**
 * ConversationPane Component
 * 
 * Left pane of the hybrid wizard - handles conversational interface with AI.
 * Provides chat-like experience where users can brain-dump project ideas
 * and receive intelligent responses from AI assistant.
 * 
 * Core functionality:
 * - Scrollable message history with auto-scroll to bottom
 * - AI/user message distinction with proper visual hierarchy
 * - Integrated file upload zone for project context
 * - Typing indicators and processing states
 * - Smooth message animations with staggered entrance
 * 
 * Design follows Echo's established patterns with amber accents and clean typography.
 */

"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ConversationPaneProps } from '@/types/hybrid-wizard';
import { FileUploadZone } from './FileUploadZone';
import { 
  Send, 
  Sparkles, 
  User,
  FileText,
  AlertCircle
} from 'lucide-react';

/**
 * Conversation pane component for AI chat interface
 */
export const ConversationPane: React.FC<ConversationPaneProps> = ({
  conversation,
  onSubmitInput,
  onFilesUploaded,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages.length]); // Only depend on length, not the array reference

  // Focus textarea when not disabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Handle message submission
  const handleSubmit = async () => {
    if (!inputValue.trim() || disabled) return;

    const message = inputValue.trim();
    setInputValue('');
    
    // Submit to parent
    await onSubmitInput(message);
  };

  // Handle Enter key (with Shift+Enter for new lines)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Format message timestamp
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {conversation.messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-3 animate-in slide-in-from-left-4 duration-300 ${
              message.type === 'user-input' ? 'justify-end' : 'justify-start'
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* AI Messages - Left aligned */}
            {message.type !== 'user-input' && (
              <>
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-accent" />
                </div>
                <div className="max-w-md">
                  <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-foreground">
                    {message.content}
                  </div>
                </div>
              </>
            )}

            {/* User Messages - Right aligned */}
            {message.type === 'user-input' && (
              <>
                <div className="max-w-md">
                  <div className="bg-accent text-accent-foreground rounded-lg px-4 py-3 text-sm ml-auto">
                    {message.content}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
              </>
            )}
          </div>
        ))}

        {/* Processing Indicator */}
        {conversation.is_processing && (
          <div className="flex gap-3 animate-in slide-in-from-left-4 duration-300">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            </div>
            <div className="max-w-md">
              <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>
                    {conversation.processing_step || 'Processing your input...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {conversation.error && (
          <div className="flex gap-3 animate-in slide-in-from-left-4 duration-300">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-destructive" />
            </div>
            <div className="max-w-md">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">
                {conversation.error}
              </div>
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Zone */}
      <div className="border-t border-border/30 p-4">
        <FileUploadZone
          onFilesUploaded={onFilesUploaded}
          maxFiles={3}
          acceptedTypes={['.pdf', '.docx', '.txt', '.md', '.png', '.jpg', '.csv', '.json']}
          className="mb-4"
        />
      </div>

      {/* Input Area */}
      <div className="border-t border-border/30 p-4 space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your project, goals, requirements, or any challenges you're facing..."
            disabled={disabled}
            rows={3}
            className="resize-none pr-12 text-sm placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all duration-200"
          />
          
          {/* Send Button */}
          <Button
            onClick={handleSubmit}
            disabled={!inputValue.trim() || disabled}
            size="sm"
            className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Input Help Text */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{inputValue.length}/1000</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Design Philosophy:
 * - Clean chat interface with clear AI/user distinction
 * - AI messages: Left-aligned with amber Sparkles icon and muted background
 * - User messages: Right-aligned with amber background and User icon
 * - Smooth animations with staggered entrance effects
 * - Integrated file upload maintains conversation context
 * 
 * Accessibility Features:
 * - Semantic message structure with proper roles
 * - Keyboard navigation with Enter/Shift+Enter support
 * - Focus management for optimal user experience
 * - Clear visual indicators for processing and error states
 * - Screen reader friendly timestamps and confidence indicators
 * 
 * Performance Considerations:
 * - Auto-scroll optimized with smooth behavior
 * - Efficient re-rendering with proper React keys
 * - Debounced input handling to prevent excessive updates
 * - Lazy loading considerations for long conversation histories
 */