"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Block } from '@/hooks/useSessionState';
import { IconResolutionService } from '@/lib/icon-resolution';
import { SessionErrorBoundary, ScaffoldErrorFallback } from '@/components/session/SessionErrorBoundary';
import { sessionApi } from '@/services/sessionApiService';
import { 
  AutoSaveErrorBoundary, 
  SessionProgressErrorBoundary, 
  SessionRecoveryModal,
  EnhancedConnectionStatus,
  ActiveSessionErrorType 
} from '@/components/session/ActiveSessionErrorBoundaries';
import { CheckCircle2, Circle, ListChecks, PenSquare, SquareCheckBig, Target, Users, RefreshCw, Save, Wifi, WifiOff, Clock, Info } from 'lucide-react';

/**
 * ActiveSessionState Component - Focused Execution Cockpit
 * 
 * The core execution environment for deep work sessions. Provides a
 * distraction-free cockpit with live timer, progress tracking, and
 * structured task management.
 * 
 * Design Philosophy: "Maximize Focus" - every element serves concentration
 */

interface SessionStartData {
  blockId: string;
  aiInsights: any;
  userGoal: string;
  userTasks: string[];
  startTime: Date;
  nextWorkBlock?: Block; // Add the full block data
}

interface ActiveSessionStateProps {
  sessionData: SessionStartData;
  currentTime: Date;
  onEndSession?: (sessionNotes: string, checklist: ChecklistItem[]) => void;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  estimated_minutes?: number;
}

// Fallback function to transform raw tasks into structured checklist (when Claude API fails)
const processUserTasksToChecklist = (rawTasks: string[]): ChecklistItem[] => {
  return rawTasks.map((task, index) => ({
    id: `task-${index + 1}`,
    task: task.replace(/^[•\-\*]\s*/, '').trim(), // Clean up bullets and dashes
    completed: false,
    category: 'user',
    priority: 'medium' as const
  })).filter(item => item.task.length > 0); // Remove empty tasks
};

export function ActiveSessionState({
  sessionData,
  currentTime,
  onEndSession
}: ActiveSessionStateProps) {
  
  // Reduced logging to prevent console spam
  
  // Helper function to initialize checklist from Claude data or user tasks
  const initializeChecklist = useCallback((): ChecklistItem[] => {
    // Check if we have Claude-enhanced checklist from SpinUpState
    if (sessionData.aiInsights?.checklist && Array.isArray(sessionData.aiInsights.checklist)) {
      // Transform Claude's structured checklist to our ChecklistItem format
      const claudeChecklist = sessionData.aiInsights.checklist.map((item, index) => ({
        id: `claude-${index + 1}`,
        task: item.task,
        completed: false,
        category: item.category,
        priority: item.priority,
        estimated_minutes: item.estimated_minutes
      }));
      
      return claudeChecklist;
    }
    
    // Fallback to processing user's raw tasks
    const userChecklist = processUserTasksToChecklist(sessionData.userTasks);
    return userChecklist;
  }, [sessionData.aiInsights, sessionData.userTasks]);

  // Component state - Use Claude data if available, fallback to user tasks
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => initializeChecklist());
  const [sessionNotes, setSessionNotes] = useState("");
  const [isEnding, setIsEnding] = useState(false);
  
  // Progress tracking state
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Enhanced error handling state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [corruptedData, setCorruptedData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);
  const [saveQueue, setSaveQueue] = useState<Array<{notes: string, checklist: ChecklistItem[], timestamp: number}>>([]);
  
  // Refs for debounced auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  
  // Local storage keys for session persistence
  const sessionStorageKey = `session-${sessionData.blockId}`;
  const checklistStorageKey = `checklist-${sessionData.blockId}`;
  const notesStorageKey = `notes-${sessionData.blockId}`;
  
  // Timer calculations using real block data
  const sessionStartTime = sessionData.startTime.getTime();
  const currentTimeMs = currentTime.getTime();
  const elapsedMs = Math.max(0, currentTimeMs - sessionStartTime);
  
  // Calculate actual session duration from block data
  const getSessionDuration = (): number => {
    if (sessionData.nextWorkBlock) {
      // Use actual block duration
      const totalMinutes = sessionData.nextWorkBlock.endMinutes - sessionData.nextWorkBlock.startMinutes;
      return totalMinutes * 60 * 1000; // Convert to milliseconds
    }
    // Fallback to 2 hours if no block data
    return 2 * 60 * 60 * 1000;
  };
  
  const sessionDurationMs = getSessionDuration();
  const remainingMs = Math.max(0, sessionDurationMs - elapsedMs);
  const progress = Math.max(0, Math.min(100, (elapsedMs / sessionDurationMs) * 100));
  
  // Format time display matching SpinUp format
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Format category for consistent capitalization
  const formatCategory = (category: string): string => {
    return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format session time range with remaining time
  const formatSessionTime = (): string => {
    if (remainingMs <= 0) return "Session Complete";
    
    // Use actual block data if available, fallback to mock
    const block = sessionData.nextWorkBlock;
    const startTime = block ? formatTime(block.startTime) : "9:30 AM";
    const endTime = block ? formatTime(block.endTime) : "11:30 AM";
    
    // Calculate remaining time in readable format
    const totalMinutes = Math.floor(remainingMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    let remainingText = "";
    if (hours > 0 && minutes > 0) {
      remainingText = `${hours} hr and ${minutes} min remaining`;
    } else if (hours > 0) {
      remainingText = `${hours} hr remaining`;
    } else if (minutes > 0) {
      remainingText = `${minutes} min remaining`;
    } else {
      remainingText = "Less than 1 min remaining";
    }
    
    return `${startTime} - ${endTime} (${remainingText})`;
  };
  
  // Get session icon with fallback based on timeCategory
  const getSessionIcon = () => {
    if (!sessionData.nextWorkBlock) return Target;
    
    try {
      const { icon } = IconResolutionService.resolveIcon(
        sessionData.nextWorkBlock.label, 
        sessionData.nextWorkBlock.timeCategory.toLowerCase(), 
        sessionData.nextWorkBlock.emoji
      );
      return icon;
    } catch {
      // Fallback based on timeCategory
      switch (sessionData.nextWorkBlock.timeCategory) {
        case 'MEETINGS': return Users;
        case 'DEEP_WORK': return Target;
        default: return Target;
      }
    }
  };
  
  const SessionIcon = getSessionIcon();
  
  // Auto-save function with exponential backoff and retry mechanisms
  const performAutoSave = useCallback(async (notes: string, checklistData: ChecklistItem[], attempt = 0) => {
    if (!autoSaveEnabled || isSaving) return;
    
    // Skip if data hasn't changed
    const currentDataHash = JSON.stringify({ notes, checklistData });
    if (currentDataHash === lastSaveDataRef.current) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError(null);
    
    try {
      // Always save to localStorage first for immediate persistence
      localStorage.setItem(notesStorageKey, notes);
      localStorage.setItem(checklistStorageKey, JSON.stringify(checklistData));
      localStorage.setItem(sessionStorageKey, JSON.stringify({
        lastSaved: new Date().toISOString(),
        progress: checklistData.filter(item => item.completed).length / checklistData.length,
        elapsedTime: elapsedMs
      }));
      
      // Add to save queue if offline or API call fails
      if (!isOnline) {
        setSaveQueue(prev => [...prev, { notes, checklist: checklistData, timestamp: Date.now() }]);
        setSaveStatus('saved'); // Local save successful
        setLastSaveTime(new Date());
        lastSaveDataRef.current = currentDataHash;
        // Saved locally (offline mode)
        return;
      }
      
      // Real API call to save session notes
      const response = await sessionApi.saveSessionNotes(
        sessionData.blockId,
        notes,
        checklistData
      );
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to save session notes');
      }
      
      setLastSaveTime(new Date());
      setSaveStatus('saved');
      setRetryCount(0); // Reset retry count on success
      lastSaveDataRef.current = currentDataHash;
      // Auto-saved session progress
      
    } catch (error) {
      console.error(`Auto-save failed (attempt ${attempt + 1}):`, error);
      
      // Exponential backoff retry logic
      const maxRetries = 3;
      if (attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 10000); // Max 10 second delay
        setRetryCount(attempt + 1);
        
        // Retrying save
        
        setTimeout(() => {
          performAutoSave(notes, checklistData, attempt + 1);
        }, backoffDelay);
        
        return; // Don't set error state yet, we're retrying
      }
      
      // All retries failed
      setSaveError(`Failed to save progress after ${maxRetries} attempts`);
      setSaveStatus('error');
      setRetryCount(maxRetries);
      
      // Add to save queue for later retry when connection is restored
      setSaveQueue(prev => [...prev, { notes, checklist: checklistData, timestamp: Date.now() }]);
      
      // Trigger error recovery if this is a critical failure
      if (error instanceof Error && error.message.includes('localStorage')) {
        setCorruptedData({ notes, checklistData });
        setShowRecoveryModal(true);
      }
    } finally {
      setIsSaving(false);
    }
  }, [autoSaveEnabled, isSaving, sessionData.blockId, elapsedMs, notesStorageKey, checklistStorageKey, sessionStorageKey, isOnline]);
  
  // Debounced auto-save trigger
  const triggerAutoSave = useCallback((notes: string, checklistData: ChecklistItem[]) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      performAutoSave(notes, checklistData);
    }, 2000); // 2 second debounce
  }, [performAutoSave]);
  
  // Load session state from localStorage on mount
  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(notesStorageKey);
      const savedChecklist = localStorage.getItem(checklistStorageKey);
      const savedSession = localStorage.getItem(sessionStorageKey);
      
      if (savedNotes) {
        setSessionNotes(savedNotes);
      }
      
      if (savedChecklist) {
        const parsedChecklist = JSON.parse(savedChecklist);
        setChecklist(parsedChecklist);
      }
      
      if (savedSession) {
        const sessionInfo = JSON.parse(savedSession);
        setLastSaveTime(new Date(sessionInfo.lastSaved));
        // Restored session state
      }
    } catch (error) {
      console.warn('Failed to restore session state:', error);
    }
  }, [notesStorageKey, checklistStorageKey, sessionStorageKey]);
  
  // Cleanup auto-save timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);
  
  // Monitor online status and process save queue when connection is restored
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process queued saves when connection is restored
      processSaveQueue();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [saveQueue]);
  
  // Process queued saves when connection is restored
  const processSaveQueue = useCallback(async () => {
    if (saveQueue.length === 0 || !isOnline) return;
    
    // Processing queued saves
    
    // Get the most recent save from the queue (discard older ones)
    const mostRecentSave = saveQueue[saveQueue.length - 1];
    setSaveQueue([]); // Clear the queue
    
    // Retry the most recent save
    await performAutoSave(mostRecentSave.notes, mostRecentSave.checklist, 0);
  }, [saveQueue, isOnline, performAutoSave]);
  
  // Listen for manual save events from error boundaries
  useEffect(() => {
    const handleManualSave = (event: CustomEvent) => {
      if (event.detail.sessionId === sessionData.blockId) {
        performAutoSave(sessionNotes, checklist);
      }
    };
    
    window.addEventListener('manualSave', handleManualSave as EventListener);
    return () => window.removeEventListener('manualSave', handleManualSave as EventListener);
  }, [sessionNotes, checklist, sessionData.blockId, performAutoSave]);
  
  
  // Handle checklist item toggle with auto-save
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      
      // Trigger auto-save with updated checklist
      triggerAutoSave(sessionNotes, updated);
      return updated;
    });
  };
  
  // Handle session end
  const handleEndSession = async () => {
    setIsEnding(true);
    
    try {
      // Clear any pending auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Perform final save
      await performAutoSave(sessionNotes, checklist);
      
      // Clear session state from localStorage (session is complete)
      localStorage.removeItem(notesStorageKey);
      localStorage.removeItem(checklistStorageKey);
      localStorage.removeItem(sessionStorageKey);
      
      // Session completed and state cleared
      
      // Simulate brief loading state
      setTimeout(() => {
        onEndSession?.(sessionNotes, checklist);
        setIsEnding(false);
      }, 300);
      
    } catch (error) {
      console.error('Error during session end:', error);
      // Still proceed with ending session even if save fails
      setTimeout(() => {
        onEndSession?.(sessionNotes, checklist);
        setIsEnding(false);
      }, 300);
    }
  };
  
  // Handle session notes change with auto-save
  const handleNotesChange = (value: string) => {
    setSessionNotes(value);
    triggerAutoSave(value, checklist);
  };
  
  // Handle immediate save on blur
  const handleScratchpadBlur = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      performAutoSave(sessionNotes, checklist);
    }
  };
  
  // Enhanced error recovery handlers
  const handleSessionRecovery = (recoveryData: any) => {
    try {
      if (recoveryData.notes) {
        setSessionNotes(recoveryData.notes);
      }
      if (recoveryData.checklist) {
        setChecklist(recoveryData.checklist);
      }
      setShowRecoveryModal(false);
      setCorruptedData(null);
      // Session recovered successfully
    } catch (error) {
      console.error('Session recovery failed:', error);
    }
  };
  
  const handleStartFreshSession = () => {
    // Clear all localStorage data and start fresh
    localStorage.removeItem(notesStorageKey);
    localStorage.removeItem(checklistStorageKey);
    localStorage.removeItem(sessionStorageKey);
    
    setSessionNotes('');
    setChecklist(initializeChecklist());
    setShowRecoveryModal(false);
    setCorruptedData(null);
    
    // Started fresh session
  };
  
  const handleRetryConnection = () => {
    // Attempt to re-establish connection and sync
    performAutoSave(sessionNotes, checklist);
  };
  
  const handleManualSave = () => {
    // Force immediate save
    performAutoSave(sessionNotes, checklist);
  };
  
  // Error simulation for development (disabled)
  const handleSimulateError = (errorType: ActiveSessionErrorType) => {
    // Development controls disabled
    return;
  };
  
  // Helper function to group checklist items by category
  const groupChecklistByCategory = (items: ChecklistItem[]) => {
    const groups = {
      core: items.filter(item => item.category === 'core'),
      supporting: items.filter(item => item.category === 'supporting'),
      stretch: items.filter(item => item.category === 'stretch'),
      other: items.filter(item => !item.category || !['core', 'supporting', 'stretch'].includes(item.category))
    };
    
    // Combine 'other' items into supporting if they exist
    if (groups.other.length > 0) {
      groups.supporting = [...groups.supporting, ...groups.other];
    }
    
    return groups;
  };
  
  const checklistGroups = groupChecklistByCategory(checklist);
  
  return (
    <AutoSaveErrorBoundary 
      sessionId={sessionData.blockId}
      onSaveError={(error) => console.error('Auto-save error:', error)}
      onRecovery={() => setSaveStatus('saved')}
    >
      <div className="h-full flex flex-col p-12 space-y-8">
        {/* Session Recovery Modal */}
        <SessionRecoveryModal
          isOpen={showRecoveryModal}
          onClose={() => setShowRecoveryModal(false)}
          onRecover={handleSessionRecovery}
          onStartFresh={handleStartFreshSession}
          sessionId={sessionData.blockId}
          corruptedData={corruptedData}
        />
        
        {/* Error Simulation Panel - Disabled */}
        
        {/* 1. THE HEADER - Refined Vitals Display */}
      <div className="flex-shrink-0">
        {/* Polished Header Label */}
        <div className="mb-3">
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Active Session
          </span>
        </div>
        
        {/* Header Layout - Matching SpinUp/TranquilState Pattern */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
            <SessionIcon className="w-6 h-6 text-accent" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {sessionData.nextWorkBlock?.label || sessionData.blockId || 'Deep Work Session'}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <span className="text-lg">
                {sessionData.nextWorkBlock ? 
                  `${formatTime(sessionData.nextWorkBlock.startTime)} - ${formatTime(sessionData.nextWorkBlock.endTime)}` :
                  '9:30 AM - 11:30 AM'
                }
              </span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {sessionData.nextWorkBlock?.timeCategory ? formatCategory(sessionData.nextWorkBlock.timeCategory) : 'Deep Work'}
              </Badge>
            </div>
            {/* Live Session Progress - Aligned with text content */}
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-muted-foreground">
                {remainingMs <= 0 ? (
                  <span className="text-emerald-600">Session Complete</span>
                ) : (
                  <>
                    {(() => {
                      const totalMinutes = Math.floor(remainingMs / (1000 * 60));
                      const hours = Math.floor(totalMinutes / 60);
                      const minutes = totalMinutes % 60;
                      
                      if (hours > 0 && minutes > 0) {
                        return `${hours} hr and ${minutes} min remaining`;
                      } else if (hours > 0) {
                        return `${hours} hr remaining`;
                      } else if (minutes > 0) {
                        return `${minutes} min remaining`;
                      } else {
                        return "Less than 1 min remaining";
                      }
                    })()}
                  </>
                )}
              </div>
              <div className="flex-1 h-1.5 bg-border/50 rounded-full">
                <div 
                  className="h-full bg-accent rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
            </div>
          </div>
        </div>
      </div>
      
      {/* 2. PRIMARY OUTCOME - Clean with Info Tooltip */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-lg font-semibold text-foreground">
            Primary outcome
          </h2>
          {/* Info tooltip when AI enhancement is available */}
          {sessionData.aiInsights?.primaryObjective && sessionData.aiInsights.primaryObjective !== sessionData.userGoal && (
            <div className="group relative">
              <Info className="w-4 h-4 text-muted-foreground/70 hover:text-muted-foreground" />
              <div className="invisible group-hover:visible absolute left-6 bottom-6 z-50 w-80 p-3 bg-popover border border-border rounded-md shadow-lg">
                <div className="text-xs text-muted-foreground mb-1">Your original goal was:</div>
                <div className="text-sm text-foreground">{sessionData.userGoal}</div>
              </div>
            </div>
          )}
        </div>
        
        <blockquote className="border-l-4 border-accent pl-4 text-base text-foreground/90 leading-relaxed">
          {sessionData.aiInsights?.primaryObjective && sessionData.aiInsights.primaryObjective !== sessionData.userGoal 
            ? sessionData.aiInsights.primaryObjective 
            : sessionData.userGoal}
        </blockquote>
      </div>
      
      {/* 3. ACTION CHECKLIST - Enhanced with Claude Integration Status */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            Action checklist
            {/* Show data source indicator for fallback scenarios only */}
            {sessionData.aiInsights?.dataSource === 'fallback_user_input' && (
              <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200">
                Fallback
              </Badge>
            )}
          </h2>
          
          {/* Task completion progress with error boundary */}
          <SessionProgressErrorBoundary 
            fallbackProgress={50}
            onError={(error) => console.error('Progress calculation error:', error)}
          >
            <div className="text-sm text-muted-foreground">
              {(() => {
                const completed = checklist.filter(item => item.completed).length;
                const total = checklist.length;
                const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                return `${completed}/${total} complete (${percentage}%)`;
              })()}
            </div>
          </SessionProgressErrorBoundary>
        </div>
        
        <Card className="bg-muted/20 border-border/50">
          <CardContent className="px-3 py-1">
            <div className="space-y-8">
              {/* CORE OBJECTIVES */}
              {checklistGroups.core.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    CORE OBJECTIVES
                  </div>
                  <div className="space-y-2 pl-3">
                    {checklistGroups.core.map((item, index) => (
                      <div key={item.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {item.completed ? (
                              <CheckCircle2 
                                className="w-4 h-4 text-emerald-500 transition-all duration-200 cursor-pointer" 
                                onClick={() => toggleChecklistItem(item.id)}
                              />
                            ) : (
                              <Circle 
                                className="w-4 h-4 text-muted-foreground hover:text-accent transition-all duration-200 cursor-pointer" 
                                onClick={() => toggleChecklistItem(item.id)}
                              />
                            )}
                          </div>
                          <span className={`text-sm text-muted-foreground leading-relaxed transition-all duration-200 flex-1 ${
                            item.completed 
                              ? "line-through opacity-60" 
                              : ""
                          }`}>
                            {item.task}
                          </span>
                        </div>
                        {item.estimated_minutes && (
                          <span className="text-xs text-muted-foreground/70 ml-3">
                            {item.estimated_minutes}min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUPPORTING TASKS */}
              {checklistGroups.supporting.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    SUPPORTING TASKS
                  </div>
                  <div className="space-y-2 pl-3">
                    {checklistGroups.supporting.map((item, index) => (
                      <div key={item.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {item.completed ? (
                              <CheckCircle2 
                                className="w-4 h-4 text-emerald-500 transition-all duration-200 cursor-pointer" 
                                onClick={() => toggleChecklistItem(item.id)}
                              />
                            ) : (
                              <Circle 
                                className="w-4 h-4 text-muted-foreground hover:text-accent transition-all duration-200 cursor-pointer" 
                                onClick={() => toggleChecklistItem(item.id)}
                              />
                            )}
                          </div>
                          <span className={`text-sm text-muted-foreground leading-relaxed transition-all duration-200 flex-1 ${
                            item.completed 
                              ? "line-through opacity-60" 
                              : ""
                          }`}>
                            {item.task}
                          </span>
                        </div>
                        {item.estimated_minutes && (
                          <span className="text-xs text-muted-foreground/70 ml-3">
                            {item.estimated_minutes}min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STRETCH GOALS */}
              {checklistGroups.stretch.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    STRETCH GOALS
                  </div>
                  <div className="space-y-2 pl-3">
                    {checklistGroups.stretch.map((item, index) => (
                      <div key={item.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            {item.completed ? (
                              <CheckCircle2 
                                className="w-4 h-4 text-emerald-500 transition-all duration-200 cursor-pointer" 
                                onClick={() => toggleChecklistItem(item.id)}
                              />
                            ) : (
                              <Circle 
                                className="w-4 h-4 text-muted-foreground hover:text-accent transition-all duration-200 cursor-pointer" 
                                onClick={() => toggleChecklistItem(item.id)}
                              />
                            )}
                          </div>
                          <span className={`text-sm text-muted-foreground leading-relaxed transition-all duration-200 flex-1 ${
                            item.completed 
                              ? "line-through opacity-60" 
                              : ""
                          }`}>
                            {item.task}
                          </span>
                        </div>
                        {item.estimated_minutes && (
                          <span className="text-xs text-muted-foreground/70 ml-3">
                            {item.estimated_minutes}min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 4. SESSION NOTES - Permanent Fixture */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <PenSquare className="w-5 h-5 text-accent" />
          Session notes
        </h2>
        
        <Card className="bg-muted/20 border-border/50">
          <CardContent className="px-3 pt-0 pb-0">
            <textarea
              value={sessionNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              onBlur={handleScratchpadBlur}
              placeholder="Capture thoughts, ideas, and insights as you work..."
              className="w-full min-h-[100px] bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder-muted-foreground leading-relaxed py-1"
            />
          </CardContent>
        </Card>
      </div>
      
      {/* 5. SESSION CONTROLS - "Exit Path" */}
      <div className="flex-shrink-0 flex justify-end mt-0">
        <Button
          onClick={handleEndSession}
          disabled={isEnding}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium text-lg"
        >
          {isEnding ? (
            <>
              <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Ending Session...
            </>
          ) : (
            <>
              <SquareCheckBig className="w-5 h-5 mr-2" />
              End Session
            </>
          )}
        </Button>
      </div>
    </div>
    </AutoSaveErrorBoundary>
  );
}