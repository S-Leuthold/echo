"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NovelMarkdownEditor } from "@/components/ui/novel-markdown-editor";
import { sessionApi } from "@/services/sessionApiService";
import { SessionCompleteRequest } from "@/types/sessionApi";
import { BookOpen, Save, Loader2 } from 'lucide-react';

/**
 * SessionLogModal Component
 * 
 * Two-phase modal for session log generation:
 * 1. Loading phase: Shows spinner while "LLM" generates content
 * 2. Editor phase: Novel-style markdown editor for user refinement
 * 
 * Design Philosophy: Smooth UX that feels like working with an AI assistant
 */

interface SessionDebriefData {
  accomplishments: string;
  outstanding: string;
  finalNotes: string;
  sessionMetadata: {
    duration: number;
    category: string;
    originalGoal: string;
  };
}

interface SessionStartData {
  blockId: string;
  aiInsights: any;
  userGoal: string;
  userTasks: string[];
  startTime: Date;
  nextWorkBlock?: any;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

interface SessionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sessionLog: string) => void;
  debriefData: SessionDebriefData;
  sessionData: SessionStartData;
  completedTasks?: ChecklistItem[];
  incompleteTasks?: ChecklistItem[];
}

type ModalPhase = 'loading' | 'editing';


export function SessionLogModal({
  isOpen,
  onClose,
  onSave,
  debriefData,
  sessionData,
  completedTasks = [],
  incompleteTasks = []
}: SessionLogModalProps) {
  
  const [phase, setPhase] = useState<ModalPhase>('loading');
  const [sessionLog, setSessionLog] = useState('');
  const [sessionMetadata, setSessionMetadata] = useState<SessionLogResult['metadata'] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Format category for consistent capitalization
  const formatCategory = (category: string): string => {
    return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Handle modal opening and log generation
  useEffect(() => {
    if (isOpen) {
      setPhase('loading');
      setSessionLog('');
      setSessionMetadata(null);
      
      // Generate session log using live Claude API
      const generateSessionLog = async () => {
        try {
          // Build session complete request
          const sessionCompleteRequest: SessionCompleteRequest = {
            block_id: sessionData.blockId,
            accomplishments: debriefData.accomplishments,
            outstanding: debriefData.outstanding,
            final_notes: debriefData.finalNotes,
            session_duration_minutes: debriefData.sessionMetadata.duration,
            block_title: sessionData.nextWorkBlock?.label || sessionData.blockId || 'Work Session',
            project_name: 'Echo', // TODO: Extract from session data when available
            time_category: debriefData.sessionMetadata.category.toLowerCase().replace(' ', '_'),
            start_time: sessionData.startTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            end_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            checklist_data: {
              completed_tasks: completedTasks,
              incomplete_tasks: incompleteTasks,
              primary_objective: sessionData.userGoal
            }
          };

          // Call live Claude API
          const result = await sessionApi.completeSession(sessionCompleteRequest);
          
          if (result.success && result.data) {
            setSessionLog(result.data.session_log_markdown);
            setSessionMetadata(result.data.session_metadata);
            setPhase('editing');
          } else {
            throw new Error('Session completion API returned unsuccessful result');
          }
        } catch (error) {
          console.error('Failed to generate session log with Claude API:', error);
          // The sessionApi already handles fallback, but if it completely fails, we show an error
          setSessionLog(`# Session Log Generation Failed

Unfortunately, we encountered an error while generating your session log. Please try again.

**Error details:** ${error instanceof Error ? error.message : 'Unknown error'}

## Manual Session Summary

**Accomplishments:**
${debriefData.accomplishments}

**Outstanding Items:**
${debriefData.outstanding}

**Final Notes:**
${debriefData.finalNotes}`);
          
          setSessionMetadata({
            title: sessionData.nextWorkBlock?.label || 'Work Session',
            date: new Date().toLocaleDateString(),
            duration: `${debriefData.sessionMetadata.duration}m`,
            category: debriefData.sessionMetadata.category,
            completedAt: new Date().toLocaleTimeString()
          });
          
          setPhase('editing');
        }
      };

      generateSessionLog();
    }
  }, [isOpen, debriefData, sessionData, completedTasks, incompleteTasks]);
  
  
  // Handle save action
  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate brief save delay for UX
    setTimeout(() => {
      onSave(sessionLog);
      setIsSaving(false);
      onClose();
    }, 300);
  };
  
  // Handle cancel action
  const handleCancel = () => {
    onClose();
  };
  
  // Loading Phase Content
  const renderLoadingPhase = () => (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="mb-6">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Claude is generating your session log
      </h3>
      <p className="text-muted-foreground text-center max-w-md leading-relaxed">
        Using the hybrid voice model to synthesize your session data into an intelligent, comprehensive log.
      </p>
    </div>
  );
  
  // Editor Phase Content
  const renderEditorPhase = () => (
    <div className="space-y-6">
      {/* Metadata Header */}
      {sessionMetadata && (
        <div className="bg-muted/20 border border-border/30 rounded-lg p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Date:</span>
            <span>{sessionMetadata.date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Duration:</span>
            <span>{sessionMetadata.duration}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Category:</span>
            <span>{formatCategory(sessionMetadata.category)}</span>
          </div>
        </div>
      )}
      
      {/* Editor Container */}
      <div className="border border-border/30 rounded-lg p-6 bg-card/30 min-h-[500px]">
        <NovelMarkdownEditor
          value={sessionLog}
          onChange={setSessionLog}
          placeholder="Your session log will appear here..."
          autoFocus={true}
        />
      </div>
      
      {/* Actions */}
      <div className="flex justify-end pt-6 border-t border-border/50">
        <Button 
          onClick={handleSave}
          disabled={!sessionLog.trim() || isSaving}
          className="min-w-[160px] bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Session Log
            </>
          )}
        </Button>
      </div>
    </div>
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[60vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <BookOpen className="w-5 h-5 text-accent" />
            <DialogTitle className="text-xl">
              {phase === 'loading' ? 'Session Log' : 'Review Session Log'}
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Dynamic Content Based on Phase */}
        <div className="min-h-[400px]">
          {phase === 'loading' && renderLoadingPhase()}
          {phase === 'editing' && renderEditorPhase()}
        </div>
      </DialogContent>
    </Dialog>
  );
}