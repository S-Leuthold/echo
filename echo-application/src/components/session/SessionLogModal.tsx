"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NovelMarkdownEditor } from "@/components/ui/novel-markdown-editor";
import { sessionApi } from "@/services/sessionApiService";
import { SessionCompleteRequest } from "@/types/sessionApi";
import { BookOpen, Save, Loader2, Brain } from 'lucide-react';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<string | null>(null);
  
  // Track essential state for debugging
  const [lastApiError, setLastApiError] = useState<any>(null);
  
  // Loading animation state (moved from renderLoadingPhase)
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  const loadingWords = [
    "noodling",
    "pondering", 
    "synthesizing",
    "weaving",
    "crafting",
    "distilling",
    "reflecting",
    "connecting",
    "organizing",
    "polishing"
  ];
  
  // Word cycling effect for loading animation (moved from renderLoadingPhase)
  useEffect(() => {
    if (phase === 'loading') {
      const interval = setInterval(() => {
        setCurrentWordIndex((prev) => (prev + 1) % loadingWords.length);
      }, 1500); // Change word every 1.5 seconds
      
      return () => clearInterval(interval);
    }
  }, [phase, loadingWords.length]);
  
  // Format category for consistent capitalization
  const formatCategory = (category: string): string => {
    return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Handle modal opening and log generation
  useEffect(() => {
    if (isOpen && !isGenerating) {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      const currentRequestId = `session-log-${Date.now()}-${Math.random()}`;
      requestIdRef.current = currentRequestId;
      
      // Capture snapshot of data when modal opens (prevent changes during generation)
      const dataSnapshot = {
        debriefData: { ...debriefData },
        sessionData: { ...sessionData },
        completedTasks: [...completedTasks],
        incompleteTasks: [...incompleteTasks]
      };
      
      setPhase('loading');
      // DON'T reset sessionLog to empty - preserve any existing content
      if (!sessionLog.trim()) {
        setSessionLog('');
      }
      setSessionMetadata(null);
      setIsGenerating(true);
      
      
      // Generate session log using live Claude API
      const generateSessionLog = async () => {
        try {
          console.log(`🚀 [${currentRequestId}] Starting session log generation with data snapshot`);
          
          // Check if request was cancelled before starting
          if (abortControllerRef.current?.signal.aborted || requestIdRef.current !== currentRequestId) {
            console.log(`❌ [${currentRequestId}] Request cancelled before starting`);
            return;
          }
          
          // Build session complete request using snapshot data
          const sessionCompleteRequest: SessionCompleteRequest = {
            block_id: dataSnapshot.sessionData.blockId,
            accomplishments: dataSnapshot.debriefData.accomplishments,
            outstanding: dataSnapshot.debriefData.outstanding,
            final_notes: dataSnapshot.debriefData.finalNotes,
            session_duration_minutes: dataSnapshot.debriefData.sessionMetadata.duration,
            block_title: dataSnapshot.sessionData.nextWorkBlock?.label || dataSnapshot.sessionData.blockId || 'Work Session',
            project_name: 'Echo', // TODO: Extract from session data when available
            time_category: dataSnapshot.debriefData.sessionMetadata.category.toLowerCase().replace(' ', '_'),
            start_time: dataSnapshot.sessionData.startTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            end_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
            checklist_data: {
              completed_tasks: dataSnapshot.completedTasks,
              incomplete_tasks: dataSnapshot.incompleteTasks,
              primary_objective: dataSnapshot.sessionData.userGoal
            }
          };

          // Call live Claude API
          const result = await sessionApi.completeSession(sessionCompleteRequest);
          
          // Check if request was cancelled during API call
          if (abortControllerRef.current?.signal.aborted || requestIdRef.current !== currentRequestId) {
            console.log(`❌ [${currentRequestId}] Request cancelled during API call`);
            return;
          }
          
          if (result.success && result.data) {
            console.log(`✅ [${currentRequestId}] Session log generated successfully`);
            
            setLastApiError(null);
            setSessionLog(result.data.session_log_markdown);
            setSessionMetadata(result.data.session_metadata);
            setPhase('editing');
          } else {
            throw new Error('Session completion API returned unsuccessful result');
          }
        } catch (error) {
          // Check if request was cancelled
          if (abortControllerRef.current?.signal.aborted || requestIdRef.current !== currentRequestId) {
            console.log(`❌ [${currentRequestId}] Request cancelled during error handling`);
            return;
          }
          
          console.error(`🚨 [${currentRequestId}] Failed to generate session log:`, error);
          setLastApiError(error);
          
          // Create fallback content using snapshot data
          const fallbackContent = `# Session Log Generation Failed

Unfortunately, we encountered an error while generating your session log. Please try again.

**Error details:** ${error instanceof Error ? error.message : 'Unknown error'}

## Manual Session Summary

**Accomplishments:**
${dataSnapshot.debriefData.accomplishments}

**Outstanding Items:**
${dataSnapshot.debriefData.outstanding}

**Final Notes:**
${dataSnapshot.debriefData.finalNotes}`;
          
          
          setSessionLog(fallbackContent);
          
          setSessionMetadata({
            title: dataSnapshot.sessionData.nextWorkBlock?.label || 'Work Session',
            date: new Date().toLocaleDateString(),
            duration: `${dataSnapshot.debriefData.sessionMetadata.duration}m`,
            category: dataSnapshot.debriefData.sessionMetadata.category,
            completedAt: new Date().toLocaleTimeString()
          });
          
          setPhase('editing');
        } finally {
          setIsGenerating(false);
          abortControllerRef.current = null;
          requestIdRef.current = null;
        }
      };

      generateSessionLog();
    }
    
    // Cleanup function to cancel request when modal closes or component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (!isOpen) {
        setIsGenerating(false);
        requestIdRef.current = null;
      }
    };
  }, [isOpen]); // CRITICAL FIX: Only depend on isOpen, not the data objects
  
  
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
  
  // Loading Phase Content with Human Word Cycling
  const renderLoadingPhase = () => {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8">
        <div className="mb-8">
          <Brain className="w-10 h-10 text-accent animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-foreground text-center">
          We're{" "}
          <span 
            key={currentWordIndex}
            className="text-accent animate-in fade-in duration-500"
          >
            {loadingWords[currentWordIndex]}
          </span>
          {" "}your session...
        </h3>
      </div>
    );
  };
  
  // Editor Phase Content
  const renderEditorPhase = () => {
    return (
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
          
          {/* Minimal Error Display */}
          {process.env.NODE_ENV === 'development' && lastApiError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              <div className="font-medium mb-1">Session Generation Error:</div>
              <div>{lastApiError instanceof Error ? lastApiError.message : String(lastApiError)}</div>
            </div>
          )}
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
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[70vw] sm:max-w-[70vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <BookOpen className="w-5 h-5 text-accent" />
            <DialogTitle className="text-xl">
              {phase === 'loading' ? 'Session Log' : 'Review Session Log'}
            </DialogTitle>
          </div>
          <DialogDescription>
            {/* No description needed */}
          </DialogDescription>
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