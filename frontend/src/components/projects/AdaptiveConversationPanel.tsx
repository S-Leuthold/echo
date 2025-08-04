/**
 * AdaptiveConversationPanel Component
 * 
 * Enhanced conversation panel that intelligently parses AI responses
 * to provide structure without constraining the AI's natural flow.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { parseAIResponse, formatAnswers, QuestionGroup } from '@/utils/questionParser';
import { QuestionGroups } from './QuestionGroups';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { 
  MessageSquare, 
  Send, 
  Sparkles,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  questionGroups?: QuestionGroup[];
  isStructured?: boolean;
}

interface AdaptiveConversationPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isProcessing?: boolean;
  className?: string;
}

export const AdaptiveConversationPanel: React.FC<AdaptiveConversationPanelProps> = ({
  messages,
  onSendMessage,
  isProcessing = false,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState('');
  const [structuredMode, setStructuredMode] = useState(true);
  const [parsedMessages, setParsedMessages] = useState<Message[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<QuestionGroup[]>([]);
  
  // Parse AI messages to extract question structure
  useEffect(() => {
    const enhanced = messages.map(msg => {
      if (msg.role === 'assistant' && structuredMode) {
        const parsed = parseAIResponse(msg.content);
        if (parsed.hasQuestions) {
          return {
            ...msg,
            questionGroups: parsed.questionGroups,
            isStructured: true
          };
        }
      }
      return msg;
    });
    
    // Only update if actually changed
    setParsedMessages(prev => {
      // Simple length check first
      if (prev.length !== enhanced.length) return enhanced;
      
      // Deep check if content changed
      const hasChanged = enhanced.some((msg, idx) => 
        msg.id !== prev[idx]?.id || 
        msg.content !== prev[idx]?.content
      );
      
      return hasChanged ? enhanced : prev;
    });
    
    // Get the latest unanswered questions
    const lastAssistantMsg = enhanced.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMsg?.questionGroups) {
      setPendingQuestions(lastAssistantMsg.questionGroups);
    }
  }, [messages, structuredMode]);

  const handleQuestionAnswer = useCallback((groupId: string, questionId: string, answer: string) => {
    // Update local state for the question
    setPendingQuestions(prev => prev.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          questions: group.questions.map(q => 
            q.id === questionId ? { ...q, answer, answered: true } : q
          )
        };
      }
      return group;
    }));
  }, []);

  const handleSubmitAnswers = useCallback((answeredGroups: QuestionGroup[]) => {
    // Format the answers into a natural response
    const formattedResponse = formatAnswers(answeredGroups);
    onSendMessage(formattedResponse);
    
    // Clear pending questions that were answered
    const answeredIds = new Set(answeredGroups.map(g => g.id));
    setPendingQuestions(prev => prev.filter(g => !answeredIds.has(g.id)));
  }, [onSendMessage]);

  const handleConversationalSubmit = useCallback(() => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  }, [inputValue, onSendMessage]);

  return (
    <div className={`adaptive-conversation-panel flex flex-col h-full ${className}`}>
      {/* Mode Toggle */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4" />
          <span>Conversation</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStructuredMode(!structuredMode)}
          className="gap-2 text-xs"
        >
          {structuredMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {structuredMode ? 'Structured' : 'Natural'}
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {parsedMessages.map((message, idx) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'assistant' ? 'bg-accent/10' : 'bg-muted'
              }`}>
                {message.role === 'assistant' ? (
                  <Sparkles className="w-4 h-4 text-accent" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
              </div>
              
              <div className="flex-1">
                {message.isStructured && message.questionGroups ? (
                  <>
                    {/* Show the main content */}
                    {parseAIResponse(message.content).mainContent && (
                      <div className="prose prose-sm max-w-none mb-3">
                        {parseAIResponse(message.content).mainContent}
                      </div>
                    )}
                    
                    {/* Show structured questions only for the latest message */}
                    {idx === parsedMessages.length - 1 && (
                      <QuestionGroups
                        groups={pendingQuestions}
                        onSubmitAnswers={handleSubmitAnswers}
                        onQuestionAnswer={handleQuestionAnswer}
                        isProcessing={isProcessing}
                      />
                    )}
                  </>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {message.content}
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <div className="space-y-2">
          {/* Show hint if there are pending questions */}
          {pendingQuestions.length > 0 && structuredMode && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Answer the questions above or continue the conversation below
            </div>
          )}
          
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleConversationalSubmit();
                }
              }}
              placeholder="Type your response..."
              className="flex-1 min-h-[60px]"
              disabled={isProcessing}
            />
            <Button
              onClick={handleConversationalSubmit}
              disabled={!inputValue.trim() || isProcessing}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveConversationPanel;