"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Block } from '@/hooks/useSessionState';
import { getMockSessionContext } from '@/services/mockSessionData';
import { IconResolutionService } from '@/lib/icon-resolution';
import { Rocket, CheckCircle2, Plus, Clock, Target, Users } from 'lucide-react';

/**
 * SpinUpState Component - Mission Briefing Experience
 * 
 * The critical transition from rest to focused work. Transforms preparation 
 * into an interactive mission briefing that answers three key questions:
 * - What is my mission? (Task confirmation)
 * - What is the key intel? (AI-powered context)
 * - What is my plan of attack? (User intention setting)
 * 
 * Design Philosophy: "Focused Activation" - not a form, but a mission briefing
 */

interface SpinUpStateProps {
  nextWorkBlock: Block | null;
  timeUntilTransition: number;
  currentTime: Date;
  onStartSession?: (sessionData: SessionStartData) => void;
}

interface SessionStartData {
  blockId: string;
  aiInsights: any;
  userGoal: string;
  userTasks: string[];
  startTime: Date;
  nextWorkBlock?: Block;
}

export function SpinUpState({
  nextWorkBlock,
  timeUntilTransition,
  currentTime,
  onStartSession
}: SpinUpStateProps) {
  
  // User intention state
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [tacticalPlan, setTacticalPlan] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  
  // Format time display for header
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Format countdown display
  const formatCountdown = (minutes: number): string => {
    if (minutes <= 0) return "Starting now";
    if (minutes === 1) return "1 minute";
    return `${Math.ceil(minutes)} minutes`;
  };
  
  // Get AI briefing data
  const aiInsights = nextWorkBlock ? getMockSessionContext(nextWorkBlock.id) : null;
  
  // Get proper icon for the session with fallback
  const getSessionIcon = () => {
    if (!nextWorkBlock) return Target;
    
    // Try IconResolutionService first
    try {
      const { icon } = IconResolutionService.resolveIcon(
        nextWorkBlock.label, 
        nextWorkBlock.timeCategory.toLowerCase(), 
        nextWorkBlock.emoji
      );
      return icon;
    } catch {
      // Fallback based on timeCategory if IconResolutionService fails
      switch (nextWorkBlock.timeCategory) {
        case 'DEEP_WORK': return Rocket;
        case 'MEETINGS': return Users;
        default: return Target;
      }
    }
  };
  
  const SessionIcon = getSessionIcon();
  
  // Handle adding tasks from echo insights to tactical plan
  const handleAddToTasks = (item: string) => {
    const newTask = `• ${item}`;
    setTacticalPlan(prev => {
      if (!prev.trim()) {
        return newTask;
      }
      // Add new task on a new line
      return `${prev}\n${newTask}`;
    });
  };
  
  // Handle Enter key to auto-add bullet points
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newValue = tacticalPlan + '\n• ';
      setTacticalPlan(newValue);
      
      // Move cursor to end (one space after the bullet)
      setTimeout(() => {
        const textarea = e.target as HTMLTextAreaElement;
        textarea.selectionStart = textarea.selectionEnd = newValue.length;
      }, 0);
    }
  };
  
  // Handle session start
  const handleStartSession = async () => {
    if (!nextWorkBlock) return;
    
    setIsStarting(true);
    
    const sessionData: SessionStartData = {
      blockId: nextWorkBlock.id,
      aiInsights,
      userGoal: primaryGoal,
      userTasks: tacticalPlan.split('\n').filter(task => task.trim()),
      startTime: currentTime,
      nextWorkBlock: nextWorkBlock
    };
    
    // Simulate brief loading state for smooth transition
    setTimeout(() => {
      onStartSession?.(sessionData);
      setIsStarting(false);
    }, 500);
  };
  
  if (!nextWorkBlock) {
    return (
      <div className="h-full flex items-center justify-center p-12">
        <div className="text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-4 opacity-50" />
          <p>No upcoming work session to prepare for</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col p-12 space-y-8">
      {/* 1. THE HEADER - "The Mission" */}
      <div className="flex-shrink-0">
        <div className="mb-3">
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Session Scaffold
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
            <SessionIcon className="w-6 h-6 text-accent" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {nextWorkBlock.label}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span className="text-lg">
                {formatTime(nextWorkBlock.startTime)} - {formatTime(nextWorkBlock.endTime)}
              </span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {nextWorkBlock.timeCategory.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* 2. AI BRIEFING - "Key Intel" */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-accent" />
          echo insights
        </h2>
        
        <Card className="bg-muted/20 border-border/50">
          <CardContent className="px-3 py-1">
            <div className="space-y-8">
              {/* From Last Session */}
              {aiInsights?.momentum_context && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    FROM LAST SESSION
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-3">
                    • {aiInsights.momentum_context}
                  </p>
                </div>
              )}
              
              {/* From Email */}
              {aiInsights?.email_pressure?.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    FROM EMAIL
                  </div>
                  <div className="space-y-2 pl-3">
                    {aiInsights.email_pressure.map((item: string, index: number) => (
                      <div key={index} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-muted-foreground flex-1">• {item}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs hover:bg-accent/10 flex-shrink-0"
                          onClick={() => handleAddToTasks(item)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to tasks
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Suggested Focus */}
              {aiInsights?.suggested_tasks?.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    SUGGESTED FOCUS
                  </div>
                  <div className="space-y-2 pl-3">
                    {aiInsights.suggested_tasks.slice(0, 3).map((task: string, index: number) => (
                      <div key={index} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-muted-foreground flex-1">• {task}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-2 text-xs hover:bg-accent/10 flex-shrink-0"
                          onClick={() => handleAddToTasks(task)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to tasks
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 3. USER INTENTION - "Focus Points" */}
      <div className="flex-1 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">
          Focus Points
        </h2>
        
        {/* Primary Goal */}
        <div className="space-y-2">
          <Label htmlFor="primary-goal" className="text-sm font-medium text-foreground">
            What is the single, primary outcome for this session?
          </Label>
          <Input
            id="primary-goal"
            value={primaryGoal}
            onChange={(e) => setPrimaryGoal(e.target.value)}
            placeholder=""
            className="text-base"
          />
        </div>
        
        {/* Tactical Plan */}
        <div className="space-y-2">
          <Label htmlFor="tactical-plan" className="text-sm font-medium text-foreground">
            Key sub-tasks or notes:
          </Label>
          <Textarea
            id="tactical-plan"
            value={tacticalPlan}
            onChange={(e) => setTacticalPlan(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="• "
            className="min-h-[100px] text-sm leading-relaxed"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Press Enter to add bullet points automatically
          </p>
        </div>
      </div>
      
      {/* 4. CALL TO ACTION - "Launch" */}
      <div className="flex-shrink-0">
        <Button
          onClick={handleStartSession}
          disabled={isStarting || !primaryGoal.trim()}
          className="w-full h-12 text-lg font-semibold bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {isStarting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              Starting Session...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-3" />
              Start Session
            </>
          )}
        </Button>
        
        {!primaryGoal.trim() && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Set your primary goal to launch the session
          </p>
        )}
      </div>
    </div>
  );
}