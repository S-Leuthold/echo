/**
 * UnifiedProjectCreator Component
 * 
 * The ultimate hybrid interface combining:
 * - 2-panel layout (conversation + planning brief)
 * - Adaptive coaching with natural conversation flow
 * - Structured question parsing without constraining AI
 * - Subtle stage indicators and confidence tracking
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useHybridProjectState } from '@/hooks/projects/useHybridProjectState';
import { AdaptiveConversationPanel } from './AdaptiveConversationPanel';
import { PlanningBrief } from './PlanningBrief';
// Remove Progress import - we'll use a simple div with width styling
import { 
  X, 
  MessageCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface UnifiedProjectCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

// Map conversation stages to icons
const stageIcons = {
  discovery: MessageCircle,
  confirmation: CheckCircle2,
  expert_coaching: Sparkles
};

const stageNames = {
  discovery: 'Discovery',
  confirmation: 'Confirmation',
  expert_coaching: 'Expert Guidance'
};

export const UnifiedProjectCreator: React.FC<UnifiedProjectCreatorProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const {
    state,
    submitMessage,
    uploadFiles,
    updateBriefField,
    updateRoadmapPhase,
    createProject,
    resetWizard
  } = useHybridProjectState({
    enableRealTimeAnalysis: true,
    enableActiveResponses: true
  });

  const [currentStage, setCurrentStage] = useState<'discovery' | 'confirmation' | 'expert_coaching'>('discovery');
  const [overallConfidence, setOverallConfidence] = useState(0);
  const hasResetRef = useRef(false);

  // Reset when opening
  useEffect(() => {
    if (isOpen && !hasResetRef.current) {
      hasResetRef.current = true;
      resetWizard();
    } else if (!isOpen) {
      hasResetRef.current = false;
    }
  }, [isOpen, resetWizard]);

  // Memoize the messages transformation to prevent infinite renders
  const conversationMessages = useMemo(() => 
    state.conversation.messages.map(msg => ({
      id: msg.id,
      role: msg.type === 'user-input' ? 'user' : 'assistant',
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      metadata: msg.metadata || {}
    })),
    [state.conversation.messages]
  );

  // Update stage and confidence based on conversation state
  useEffect(() => {
    // Extract stage from the most recent AI message metadata
    const lastAIMessage = state.conversation.messages
      .filter(m => m.type === 'ai-response')
      .pop();
    
    // First try to get stage from message metadata, then fall back to inference
    let conversationStage: string | undefined;
    
    if (lastAIMessage?.metadata?.stage) {
      conversationStage = lastAIMessage.metadata.stage;
    } else {
      // Infer stage from message count and content
      const messageCount = state.conversation.messages.filter(m => m.type === 'ai-response').length;
      if (messageCount === 0) {
        conversationStage = 'discovery';
      } else if (messageCount <= 2) {
        conversationStage = 'discovery';
      } else if (lastAIMessage?.content.includes('Based on our conversation') || 
                 lastAIMessage?.content.includes('here\'s my understanding')) {
        conversationStage = 'confirmation';
      } else {
        conversationStage = 'expert_coaching';
      }
    }
    
    // Map backend stage names to component stage names
    const stageMapping = {
      'discovery': 'discovery' as const,
      'confirmation': 'confirmation' as const, 
      'expert_coaching': 'expert_coaching' as const  // Backend sends 'expert_coaching'
    };
    
    if (conversationStage && stageMapping[conversationStage]) {
      setCurrentStage(stageMapping[conversationStage]);
    }
    
    // Update confidence
    setOverallConfidence(state.brief.overall_confidence * 100);
  }, [state.conversation.messages, state.brief.overall_confidence]);

  const handleCreateProject = async () => {
    try {
      const projectId = await createProject();
      if (projectId) {
        onSuccess?.(projectId);
        onClose();
      }
    } catch (error) {
      console.error('Project creation failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-background rounded-lg shadow-xl w-full h-full max-w-[90vw] max-h-[90vh] mx-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500 ease-out">
        
        {/* Header with Stage Indicators */}
        <div className="border-b border-border/50 bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-6">
              {/* Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">AI Project Consultant</h2>
                  <p className="text-sm text-muted-foreground">Natural conversation with project planning</p>
                </div>
              </div>
              
              {/* Stage Indicators */}
              <div className="flex items-center gap-4">
                {Object.entries(stageIcons).map(([stage, Icon]) => (
                  <div
                    key={stage}
                    className="flex items-center gap-2"
                    title={stageNames[stage as keyof typeof stageNames]}
                  >
                    <Icon 
                      className={`w-5 h-5 transition-colors ${
                        currentStage === stage 
                          ? 'text-accent' 
                          : 'text-muted-foreground'
                      }`}
                    />
                    {currentStage === stage && (
                      <span className="text-sm font-medium text-accent">
                        {stageNames[stage as keyof typeof stageNames]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Content: Split-Pane Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[3fr_2fr] min-h-0">
          
          {/* Left Pane: Adaptive Conversation */}
          <div className="border-r border-border/50 bg-muted/20 flex flex-col min-h-0">
            <AdaptiveConversationPanel
              messages={conversationMessages}
              onSendMessage={submitMessage}
              isProcessing={state.conversation.is_processing}
            />
          </div>

          {/* Right Pane: Planning Brief */}
          <div className="bg-background flex flex-col min-h-0">
            <PlanningBrief
              brief={state.brief}
              onFieldEdit={updateBriefField}
              readOnly={state.conversation.is_processing}
            />
            
            {/* Subtle Confidence Indicator */}
            <div className="p-4 border-t border-border/30">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Understanding</span>
                  <span className="font-medium">{Math.round(overallConfidence)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-300 ease-out"
                    style={{ width: `${overallConfidence}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: Action Controls */}
        <div className="flex items-center justify-between p-4 border-t border-border/50 bg-card/30 backdrop-blur">
          <div className="flex items-center gap-4">
            {/* Status */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>AI is helping build your project brief</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Reset */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetWizard}
              className="text-muted-foreground hover:text-foreground gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              Start Over
            </Button>

            {/* Create Project */}
            <Button
              onClick={handleCreateProject}
              disabled={!state.can_create_project || state.phase === 'finalizing'}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-6 gap-2 shadow-lg hover:shadow-accent/25 transition-all duration-300"
            >
              {state.phase === 'finalizing' ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedProjectCreator;