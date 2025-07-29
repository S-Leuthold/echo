/**
 * ConversationInput Component
 * 
 * Input interface for the adaptive expert coaching conversation system.
 * Supports text input, file uploads, and stage-aware interaction patterns.
 * 
 * Part of the adaptive expert coaching system UI components.
 */

import React, { useState, useRef, useCallback } from 'react';
import { ConversationStage } from '@/hooks/projects/useConversationState';
import { Send, Paperclip, Loader2, X } from 'lucide-react';

interface ConversationInputProps {
  /** Current conversation stage for contextual prompts */
  currentStage: ConversationStage;
  /** Whether input should be disabled */
  disabled: boolean;
  /** Whether conversation is currently streaming */
  isStreaming: boolean;
  /** Callback for sending messages */
  onSendMessage: (message: string, files?: File[]) => Promise<void>;
  /** Callback for file uploads */
  onFileUpload?: (files: File[]) => void;
  /** Show file upload interface */
  enableFileUpload?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Maximum message length */
  maxLength?: number;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Stage-specific placeholder text
 */
const getStagePlaceholder = (stage: ConversationStage): string => {
  switch (stage) {
    case 'discovery':
      return "Tell me about your project idea, goals, or requirements...";
    case 'confirmation':
      return "Any corrections or additional details about your project?";
    case 'expert_coaching':
      return "What specific guidance or advice do you need?";
    default:
      return "Type your message here...";
  }
};

/**
 * File upload preview component
 */
const FilePreview: React.FC<{
  files: File[];
  onRemove: (index: number) => void;
}> = ({ files, onRemove }) => {
  if (files.length === 0) return null;
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className="border-t border-gray-200 p-3 bg-gray-50">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Attached Files ({files.length})
      </div>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div key={index} className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-2">
            <div className="flex items-center space-x-2">
              <Paperclip className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium text-gray-900">{file.name}</div>
                <div className="text-xs text-gray-500">{formatFileSize(file.size)}</div>
              </div>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Main conversation input component
 */
export const ConversationInput: React.FC<ConversationInputProps> = ({
  currentStage,
  disabled,
  isStreaming,
  onSendMessage,
  onFileUpload,
  enableFileUpload = true,
  placeholder,
  maxLength = 2000,
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get stage-appropriate placeholder
  const effectivePlaceholder = placeholder || getStagePlaceholder(currentStage);
  
  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);
  
  // Handle message input changes
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      adjustTextareaHeight();
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files]);
      if (onFileUpload) {
        onFileUpload(files);
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove attached file
  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await onSendMessage(message, attachedFiles);
      
      // Clear input after successful submission
      setMessage('');
      setAttachedFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const canSend = message.trim().length > 0 && !disabled && !isSubmitting && !isStreaming;
  
  return (
    <div className={`conversation-input ${className}`}>
      <form onSubmit={handleSubmit} className="border border-gray-300 rounded-lg bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        {/* File preview */}
        <FilePreview files={attachedFiles} onRemove={handleRemoveFile} />
        
        {/* Main input area */}
        <div className="p-4">
          <div className="flex items-end space-x-3">
            {/* Textarea */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder={effectivePlaceholder}
                disabled={disabled || isSubmitting}
                rows={1}
                className="w-full resize-none border-0 focus:ring-0 focus:outline-none placeholder-gray-500 text-gray-900 bg-transparent"
                style={{ maxHeight: '120px' }}
              />
              
              {/* Character count */}
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  {message.length}/{maxLength}
                </div>
                
                {/* Stage indicator */}
                <div className="text-xs text-gray-500">
                  {currentStage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} stage
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              {/* File upload button */}
              {enableFileUpload && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.md,.pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Attach files"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </>
              )}
              
              {/* Send button */}
              <button
                type="submit"
                disabled={!canSend}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  canSend
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={canSend ? 'Send message' : 'Type a message to send'}
              >
                {isSubmitting || isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ConversationInput;