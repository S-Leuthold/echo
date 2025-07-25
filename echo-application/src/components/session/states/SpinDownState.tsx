"use client";

import { useState, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HybridSummaryInput } from "@/components/ui/hybrid-summary-input";
import { SessionLogModal } from "@/components/session/SessionLogModal";
import { Block } from '@/hooks/useSessionState';
import { IconResolutionService } from '@/lib/icon-resolution';
import { FileText, Target, Users, BookOpen } from 'lucide-react';

/**
 * SpinDownState Component - Session Debrief Experience
 * 
 * The final phase of the session cycle, focused on reflection and narrative
 * capture. Provides a frictionless debriefing experience that prioritizes 
 * the user's natural language summary while leveraging system data as 
 * interactive, optional assistance.
 * 
 * Design Philosophy: User narrative control with smart system assistance
 */

interface SessionStartData {
  blockId: string;
  aiInsights: any;
  userGoal: string;
  userTasks: string[];
  startTime: Date;
  nextWorkBlock?: Block;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

interface SpinDownStateProps {
  sessionData: SessionStartData;
  completedTasks?: ChecklistItem[];
  incompleteTasks?: ChecklistItem[];
  currentTime: Date;
  onCompleteDebrief?: (debriefData: SessionDebriefData) => void;
}

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

export function SpinDownState({
  sessionData,
  completedTasks = [],
  incompleteTasks = [],
  currentTime,
  onCompleteDebrief
}: SpinDownStateProps) {
  
  // Debrief content state
  const [accomplishments, setAccomplishments] = useState("");
  const [outstanding, setOutstanding] = useState("");
  const [finalNotes, setFinalNotes] = useState("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Timer calculations
  const sessionStartTime = sessionData.startTime.getTime();
  const currentTimeMs = currentTime.getTime();
  const sessionDurationMs = Math.max(0, currentTimeMs - sessionStartTime);
  const sessionDurationMinutes = Math.floor(sessionDurationMs / (1000 * 60));
  
  // Format time display matching other states
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
  
  // Format session duration
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours} hr ${mins} min`;
    } else if (hours > 0) {
      return `${hours} hr`;
    } else {
      return `${mins} min`;
    }
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
  
  // Convert checklist items to suggestion pills (memoized to prevent re-renders)
  const completedSuggestions = useMemo(() => 
    completedTasks.map(task => ({
      id: task.id,
      text: task.task
    })), [completedTasks]
  );
  
  const incompleteSuggestions = useMemo(() => 
    incompleteTasks.map(task => ({
      id: task.id,
      text: task.task
    })), [incompleteTasks]
  );
  
  // Memoize debrief data to prevent modal re-renders
  const memoizedDebriefData = useMemo(() => ({
    accomplishments,
    outstanding,
    finalNotes,
    sessionMetadata: {
      duration: sessionDurationMinutes,
      category: sessionData.nextWorkBlock?.timeCategory || 'DEEP_WORK',
      originalGoal: sessionData.userGoal
    }
  }), [accomplishments, outstanding, finalNotes, sessionDurationMinutes, sessionData.nextWorkBlock?.timeCategory, sessionData.userGoal]);
  
  // Handle session log generation (stabilized)
  const handleGenerateSessionLog = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  // Handle modal close (stabilized)
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  // Handle session log save (stabilized)
  const handleSessionLogSave = useCallback((sessionLog: string) => {
    console.log('Session log saved:', sessionLog);
    
    const debriefData: SessionDebriefData = {
      accomplishments,
      outstanding,
      finalNotes,
      sessionMetadata: {
        duration: sessionDurationMinutes,
        category: sessionData.nextWorkBlock?.timeCategory || 'DEEP_WORK',
        originalGoal: sessionData.userGoal
      }
    };
    
    // Call the original completion handler
    onCompleteDebrief?.(debriefData);
  }, [accomplishments, outstanding, finalNotes, sessionDurationMinutes, sessionData.nextWorkBlock?.timeCategory, sessionData.userGoal, onCompleteDebrief]);
  
  return (
    <div className="h-full flex flex-col p-12 space-y-8">
      {/* 1. THE HEADER - Following Session Scaffold Pattern */}
      <div className="flex-shrink-0">
        {/* Header Label */}
        <div className="mb-3">
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Session Debrief
          </span>
        </div>
        
        {/* Header Layout - Matching SpinUp/TranquilState/ActiveSession Pattern */}
        <div className="flex items-center gap-4">
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
            <div className="text-sm font-medium text-muted-foreground">
              {/* Empty line to match ActiveSessionState spacing */}
            </div>
          </div>
        </div>
      </div>
      
      {/* 2. WHAT YOU ACCOMPLISHED */}
      <div className="flex-shrink-0">
        <HybridSummaryInput
          prompt="In your own words, what did you accomplish this session?"
          placeholder="Describe what you completed, learned, or made progress on..."
          suggestionsLabel="From your checklist:"
          suggestions={completedSuggestions}
          value={accomplishments}
          onChange={setAccomplishments}
          minHeight="120px"
        />
      </div>
      
      {/* 3. WHAT'S STILL OUTSTANDING */}
      <div className="flex-shrink-0">
        <HybridSummaryInput
          prompt="What's still outstanding or on your mind for next time?"
          placeholder="Note any unfinished items, blockers, or next steps..."
          suggestionsLabel="Still to do:"
          suggestions={incompleteSuggestions}
          value={outstanding}
          onChange={setOutstanding}
          minHeight="100px"
        />
      </div>
      
      {/* 4. FINAL NOTES & EXTERNAL LOGS */}
      <div className="flex-1">
        <div className="space-y-2">
          <label className="text-lg font-semibold text-foreground block">
            Add any final thoughts, or paste summaries from other tools here
          </label>
          
          <Card className="bg-muted/20 border-border/50">
            <CardContent className="px-3 py-0">
              <textarea
                value={finalNotes}
                onChange={(e) => setFinalNotes(e.target.value)}
                placeholder="Additional insights, external tool summaries, or context for future reference..."
                className="w-full min-h-[140px] bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder-muted-foreground leading-relaxed pt-0 pb-3"
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* 5. SESSION COMPLETION CONTROLS */}
      <div className="flex-shrink-0 flex justify-end mt-0">
        <Button
          onClick={handleGenerateSessionLog}
          disabled={!accomplishments.trim()}
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium text-lg"
        >
          <BookOpen className="w-5 h-5 mr-2" />
          Generate Session Log
        </Button>
      </div>
      
      {!accomplishments.trim() && (
        <p className="text-xs text-muted-foreground text-center -mt-4">
          Add some accomplishments to generate your session log
        </p>
      )}
      
      {/* Session Log Modal */}
      <SessionLogModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSessionLogSave}
        debriefData={memoizedDebriefData}
        sessionData={sessionData}
        completedTasks={completedTasks}
        incompleteTasks={incompleteTasks}
      />
    </div>
  );
}