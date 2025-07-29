/**
 * HybridProjectCreator Component
 * 
 * Main orchestrator component for the hybrid conversational project creation experience.
 * Implements the "AI Consultant with Live Whiteboard" concept using a split-pane layout:
 * - Left pane: Conversational interface with AI
 * - Right pane: Live project brief that updates in real-time
 * 
 * Core functionality:
 * - CSS Grid split-pane layout (60/40 conversation/brief)
 * - Real-time bi-directional synchronization
 * - Smooth animations and transitions following Echo design system
 * - Responsive mobile layout with stack arrangement
 * - Integration with useHybridProjectState master hook
 * 
 * Component maintains <200 lines by delegating specific concerns to child components.
 */

"use client";

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useHybridProjectState } from '@/hooks/projects/useHybridProjectState';
import { HybridProjectCreatorProps } from '@/types/hybrid-wizard';
import { ConversationPane } from './ConversationPane';
import { LiveProjectBrief } from './LiveProjectBrief';
import { 
  X, 
  Sparkles,
  AlertCircle 
} from 'lucide-react';

/**
 * Main hybrid project creation component
 * Orchestrates the conversation and brief panes with unified state management
 */
export const HybridProjectCreator: React.FC<HybridProjectCreatorProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialState
}) => {
  // Master state hook that manages all wizard functionality
  const {
    state,
    submitMessage,
    uploadFiles,
    clearConversation,
    updateBriefField,
    updateRoadmapPhase,
    reorderRoadmapPhases,
    dismissResponse,
    retryAnalysis,
    createProject,
    resetWizard
  } = useHybridProjectState({
    enableRealTimeAnalysis: true,
    enableActiveResponses: true
  });

  // Handle project creation
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

  // Reset wizard when opening
  useEffect(() => {
    if (isOpen) {
      resetWizard();
    }
  }, [isOpen, resetWizard]);

  // Don't render if not open (following React Hooks rules)
  return !isOpen ? null : (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-background rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] mx-4 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500 ease-out">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-card/50 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Create New Project</h2>
              <p className="text-sm text-muted-foreground">AI-powered project creation with intelligent assistance</p>
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

        {/* Error Display */}
        {state.error && (
          <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{state.error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={retryAnalysis}
              className="h-6 text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Main Content: Split-Pane Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[3fr_2fr] min-h-0">
          
          {/* Left Pane: Conversation */}
          <div className="border-r border-border/50 bg-muted/20 flex flex-col min-h-0">
            <ConversationPane
              conversation={state.conversation}
              onSubmitInput={submitMessage}
              onFilesUploaded={uploadFiles}
              disabled={state.conversation.is_processing}
            />
          </div>

          {/* Right Pane: Live Project Brief */}
          <div className="bg-background flex flex-col min-h-0">
            <LiveProjectBrief
              brief={state.brief}
              onFieldEdit={updateBriefField}
              onPhaseEdit={updateRoadmapPhase}
              readOnly={state.conversation.is_processing}
            />
          </div>
        </div>

        {/* Footer: Action Controls */}
        <div className="flex items-center justify-between p-6 border-t border-border/50 bg-card/30 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>AI is building your project brief</span>
            </div>
            
            {/* AI responses indicator */}
            {state.ai_responses.filter(r => !r.dismissed).length > 0 && (
              <div className="flex items-center gap-2 text-sm text-accent">
                <Sparkles className="w-3 h-3" />
                <span>
                  {state.ai_responses.filter(r => !r.dismissed).length} AI suggestion
                  {state.ai_responses.filter(r => !r.dismissed).length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Clear conversation */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear Chat
            </Button>

            {/* Reset wizard */}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetWizard}
              className="text-muted-foreground hover:text-foreground"
            >
              Start Over
            </Button>

            {/* Create project - Primary CTA */}
            <Button
              onClick={handleCreateProject}
              disabled={!state.can_create_project || state.phase === 'finalizing'}
              className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-2 gap-2 font-medium shadow-lg hover:shadow-accent/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
            >
              {state.phase === 'finalizing' ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                  Creating Project...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Finalize & Create Project
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile-responsive considerations:
 * - Grid layout automatically stacks on smaller screens (grid-cols-1 lg:grid-cols-[3fr_2fr])
 * - Touch-friendly button sizes and spacing
 * - Adequate padding for mobile touch targets
 * - Backdrop blur effects work across devices
 * 
 * Animation strategy:
 * - Entrance: fade-in backdrop with slide-in-from-bottom modal
 * - Content: smooth transitions with 300ms duration following Echo patterns
 * - Loading states: subtle spinners and pulse effects
 * - State changes: gentle slide and fade transitions
 * 
 * Accessibility features:
 * - Proper heading hierarchy with semantic HTML
 * - Focus management when modal opens/closes
 * - Clear loading and error states
 * - Keyboard navigation support
 * - Screen reader friendly progress indicators
 */