"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Block } from '@/hooks/useSessionState';
import { IconResolutionService } from '@/lib/icon-resolution';
import { CheckCircle2, Circle, ListChecks, PenSquare, SquareCheckBig, Target, Users } from 'lucide-react';

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
}

// Mock LLM processing function to transform raw tasks into structured checklist
const processUserTasksToChecklist = (rawTasks: string[]): ChecklistItem[] => {
  return rawTasks.map((task, index) => ({
    id: `task-${index + 1}`,
    task: task.replace(/^[•\-\*]\s*/, '').trim(), // Clean up bullets and dashes
    completed: false
  })).filter(item => item.task.length > 0); // Remove empty tasks
};

export function ActiveSessionState({
  sessionData,
  currentTime,
  onEndSession
}: ActiveSessionStateProps) {
  
  // Component state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => 
    processUserTasksToChecklist(sessionData.userTasks)
  );
  const [sessionNotes, setSessionNotes] = useState("");
  const [isEnding, setIsEnding] = useState(false);
  
  // Timer calculations
  const sessionStartTime = sessionData.startTime.getTime();
  const currentTimeMs = currentTime.getTime();
  const elapsedMs = Math.max(0, currentTimeMs - sessionStartTime);
  
  // Mock session duration (2 hours) - in production this would come from the block data
  const mockSessionDurationMs = 2 * 60 * 60 * 1000; // 2 hours
  const remainingMs = Math.max(0, mockSessionDurationMs - elapsedMs);
  const progress = Math.max(0, Math.min(100, (elapsedMs / mockSessionDurationMs) * 100));
  
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
  
  // Handle checklist item toggle
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };
  
  // Handle session end
  const handleEndSession = async () => {
    setIsEnding(true);
    
    // Simulate brief loading state
    setTimeout(() => {
      onEndSession?.(sessionNotes, checklist);
      setIsEnding(false);
    }, 500);
  };
  
  // Auto-save scratchpad on blur
  const handleScratchpadBlur = () => {
    // In production, this would save to backend
    console.log('Auto-saving scratchpad:', sessionNotes);
  };
  
  return (
    <div className="h-full flex flex-col p-12 space-y-8">
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
      
      {/* 2. PRIMARY OUTCOME - Blockquote Style */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Primary outcome
        </h2>
        
        <blockquote className="border-l-4 border-accent pl-4 text-base text-foreground/90 leading-relaxed">
          {sessionData.userGoal}
        </blockquote>
      </div>
      
      {/* 3. ACTION CHECKLIST - Structured Container */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-accent" />
          Action checklist
        </h2>
        
        <Card className="bg-muted/20 border-border/50">
          <CardContent className="px-3 pt-0 pb-0">
            <div className="space-y-1">
              {checklist.map((item, index) => (
                <div
                  key={item.id}
                  className={`group flex items-start space-x-3 px-2 rounded-md hover:bg-accent/5 transition-all duration-200 cursor-pointer ${
                    index === 0 ? 'pt-0 pb-2' : index === checklist.length - 1 ? 'pt-2 pb-0' : 'py-2'
                  }`}
                  onClick={() => toggleChecklistItem(item.id)}
                >
                  {/* Simplified Checkbox */}
                  <div className="flex-shrink-0 mt-0.5">
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 transition-all duration-200" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-all duration-200" />
                    )}
                  </div>
                  
                  {/* Task Text */}
                  <span className={`text-sm text-muted-foreground leading-relaxed transition-all duration-200 ${
                    item.completed 
                      ? "line-through opacity-60" 
                      : "group-hover:text-foreground"
                  }`}>
                    {item.task}
                  </span>
                </div>
              ))}
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
              onChange={(e) => setSessionNotes(e.target.value)}
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
  );
}