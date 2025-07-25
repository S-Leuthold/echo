"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NovelMarkdownEditor } from "@/components/ui/novel-markdown-editor";
import { generateSessionLog, SessionLogResult } from "@/services/mockSessionLogData";
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

// Generate a fallback log if the service fails
const generateFallbackLog = (debriefData: SessionDebriefData, sessionData: SessionStartData): SessionLogResult => {
  const today = new Date();
  const sessionTitle = sessionData.nextWorkBlock?.label || 'Deep Work Session';
  
  const content = `# Session Log: ${sessionTitle}

## What I Accomplished

${debriefData.accomplishments || '• Made progress on session objectives'}

## Outstanding Items

${debriefData.outstanding || '• No outstanding items'}

## Key Insights

${debriefData.finalNotes || '• Productive session with good focus'}

## Next Steps

• Continue with planned work
• Review progress in next session

---

*Session completed at ${today.toLocaleTimeString()}*`;

  return {
    metadata: {
      title: sessionTitle,
      date: today.toLocaleDateString(),
      duration: '2 hours',
      category: 'Deep Work',
      completedAt: today.toLocaleTimeString()
    },
    content: content.trim()
  };
};

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
      
      // Generate session log
      generateSessionLog(debriefData, sessionData, completedTasks, incompleteTasks)
        .then((result) => {
          setSessionLog(result.content);
          setSessionMetadata(result.metadata);
          setPhase('editing');
        })
        .catch((error) => {
          console.error('Failed to generate session log:', error);
          const fallback = generateFallbackLog(debriefData, sessionData);
          setSessionLog(fallback.content);
          setSessionMetadata(fallback.metadata);
          setPhase('editing');
        });
    }
  }, [isOpen]);
  
  
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
        Generating your session log
      </h3>
      <p className="text-muted-foreground text-center max-w-md leading-relaxed">
        AI is synthesizing your session data into a comprehensive log that you can review and edit.
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