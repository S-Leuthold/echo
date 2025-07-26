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
  
  // DIAGNOSTIC: Track API responses and errors
  const [lastApiResponse, setLastApiResponse] = useState<any>(null);
  const [lastApiError, setLastApiError] = useState<any>(null);
  
  // DIAGNOSTIC: Track sessionLog state changes
  useEffect(() => {
    console.log('🔍 sessionLog STATE CHANGED:', {
      length: sessionLog?.length || 0,
      hasContent: !!sessionLog?.trim(),
      type: typeof sessionLog,
      preview: sessionLog?.slice(0, 100) + '...',
      phase: phase
    });
  }, [sessionLog, phase]);
  
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
      
      console.log('🚀 SessionLogModal: Starting generation, current sessionLog length:', sessionLog.length);
      
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
            console.log('🔍 DIAGNOSTIC: Complete API Response:', {
              success: result.success,
              dataKeys: Object.keys(result.data),
              hasSessionLog: !!result.data.session_log_markdown,
              sessionLogType: typeof result.data.session_log_markdown,
              sessionLogLength: result.data.session_log_markdown?.length || 0,
              sessionLogIsEmpty: !result.data.session_log_markdown?.trim(),
              rawContent: result.data.session_log_markdown,
              contentPreview: result.data.session_log_markdown?.slice(0, 200) + '...',
              metadata: result.data.session_metadata
            });
            
            // DIAGNOSTIC: Store API response for debug panel
            setLastApiResponse(result);
            setLastApiError(null);
            
            // CRITICAL: Log the exact content being set
            console.log('🎯 SETTING sessionLog STATE TO:', result.data.session_log_markdown);
            setSessionLog(result.data.session_log_markdown);
            setSessionMetadata(result.data.session_metadata);
            
            // Log phase transition
            console.log('🔄 PHASE TRANSITION: loading → editing');
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
          
          // DIAGNOSTIC: Store error for debug panel
          setLastApiError(error);
          setLastApiResponse(null);
          
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
          
          console.log('⚠️ SessionLogModal: Setting fallback content:', {
            contentLength: fallbackContent.length,
            contentPreview: fallbackContent.slice(0, 150) + '...'
          });
          
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
    // DIAGNOSTIC: Log what's being passed to the editor (reduced frequency)
    // console.log('🎨 RENDERING EDITOR PHASE:', {
    //   sessionLogValue: sessionLog,
    //   sessionLogLength: sessionLog?.length || 0,
    //   sessionLogType: typeof sessionLog,
    //   hasContent: !!sessionLog?.trim(),
    //   isEmpty: !sessionLog || sessionLog.trim() === '',
    //   timestamp: new Date().toISOString()
    // });
    
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
          
          {/* Comprehensive Debug Panel */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-muted/20 rounded text-xs text-muted-foreground space-y-3">
              <div className="font-semibold text-foreground border-b border-border/30 pb-1">🔍 Debug Panel</div>
              
              {/* Current State */}
              <div>
                <div className="font-medium text-foreground mb-1">📊 Current State:</div>
                <div className="pl-2 space-y-1">
                  <div>Phase: <span className="text-accent">{phase}</span></div>
                  <div>SessionLog Length: <span className="text-accent">{sessionLog?.length || 0}</span></div>
                  <div>SessionLog Type: <span className="text-accent">{typeof sessionLog}</span></div>
                  <div>Has Content: <span className="text-accent">{!!sessionLog?.trim() ? 'YES' : 'NO'}</span></div>
                  <div>Is Empty: <span className="text-accent">{!sessionLog || sessionLog.trim() === '' ? 'YES' : 'NO'}</span></div>
                </div>
              </div>
              
              {/* Last API Response */}
              <div>
                <div className="font-medium text-foreground mb-1">🌐 Last API Response:</div>
                <div className="pl-2">
                  {lastApiResponse ? (
                    <div className="space-y-1">
                      <div>Success: <span className="text-green-500">✓</span></div>
                      <div>Data Keys: <span className="text-accent">{lastApiResponse.data ? Object.keys(lastApiResponse.data).join(', ') : 'none'}</span></div>
                      <div>Session Log Present: <span className="text-accent">{!!lastApiResponse.data?.session_log_markdown ? 'YES' : 'NO'}</span></div>
                      <div>Session Log Length: <span className="text-accent">{lastApiResponse.data?.session_log_markdown?.length || 0}</span></div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No response yet</span>
                  )}
                </div>
              </div>
              
              {/* Last API Error */}
              {lastApiError && (
                <div>
                  <div className="font-medium text-red-500 mb-1">❌ Last API Error:</div>
                  <div className="pl-2 text-red-400">
                    {lastApiError instanceof Error ? lastApiError.message : String(lastApiError)}
                  </div>
                </div>
              )}
              
              {/* Content Preview */}
              <div>
                <div className="font-medium text-foreground mb-1">📄 Content Preview:</div>
                <div className="pl-2 bg-muted/30 rounded p-2 max-h-20 overflow-y-auto">
                  {sessionLog ? (
                    <pre className="whitespace-pre-wrap text-xs">{sessionLog.slice(0, 200)}...</pre>
                  ) : (
                    <span className="text-muted-foreground italic">No content</span>
                  )}
                </div>
              </div>
              
              {/* Raw Data */}
              <details className="cursor-pointer">
                <summary className="font-medium text-foreground hover:text-accent">🔬 Raw Data</summary>
                <div className="pl-2 mt-1 bg-muted/30 rounded p-2 max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-xs">{JSON.stringify({ sessionLog, lastApiResponse, lastApiError }, null, 2)}</pre>
                </div>
              </details>
              
              {/* Test Controls */}
              <div className="border-t border-border/30 pt-2">
                <div className="font-medium text-foreground mb-2">🧪 Test Controls:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const testContent = "# Test Content\n\nThis is **hardcoded** test content to verify the editor works.\n\n- Item 1\n- Item 2\n- Item 3\n\n*Testing italic text*";
                      console.log('🧪 TESTING: Setting hardcoded content:', testContent);
                      setSessionLog(testContent);
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    Test Short Content
                  </button>
                  <button
                    onClick={() => {
                      console.log('🧪 TESTING: Clearing content');
                      setSessionLog('');
                    }}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Clear Content
                  </button>
                  <button
                    onClick={() => {
                      const longContent = `# Long Test Content\n\n## Section 1\nThis is a longer test to see if the editor handles substantial content properly.\n\n### Subsection A\n- First bullet point with **bold text**\n- Second bullet point with *italic text*\n- Third bullet point with \`code\`\n\n### Subsection B\n1. Numbered list item one\n2. Numbered list item two\n3. Numbered list item three\n\n## Section 2\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n> This is a blockquote to test formatting\n\n## Section 3\nFinal section with more content.`;
                      console.log('🧪 TESTING: Setting long content:', longContent);
                      setSessionLog(longContent);
                    }}
                    className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                  >
                    Test Long Content
                  </button>
                  <button
                    onClick={() => {
                      console.log('🧪 TESTING: Setting null');
                      setSessionLog(null as any);
                    }}
                    className="px-2 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
                  >
                    Test Null
                  </button>
                </div>
              </div>
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