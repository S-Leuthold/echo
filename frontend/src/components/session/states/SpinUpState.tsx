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
import { sessionApi } from '@/services/sessionApiService';
import { SessionStartRequest } from '@/types/sessionApi';
// Removed useScaffold - will load pre-generated data instead
import { SessionErrorBoundary, ScaffoldErrorFallback } from '@/components/session/SessionErrorBoundary';
import { Rocket, CheckCircle2, Plus, Clock, Target, Users, Check, RefreshCw, WifiOff } from 'lucide-react';

/**
 * Smart session context generator - works with any block
 * Generates context based on block properties instead of hardcoded IDs
 */
const getSmartSessionContext = (block: Block) => {
  const timeCategory = block.timeCategory?.toLowerCase();
  const label = block.label?.toLowerCase();
  
  // Generate context based on time category and label patterns
  if (timeCategory === 'deep_work' || label.includes('development') || label.includes('build')) {
    return {
      momentum_context: "Ready for deep focus work. This session is about making real progress on meaningful development work.",
      email_pressure: [
        "Check for any blocking technical dependencies",
        "Review any team feedback that might affect the work"
      ],
      suggested_tasks: [
        "Set up development environment and tools",
        "Break down the work into manageable chunks",
        "Focus on one core deliverable at a time",
        "Document key decisions and insights"
      ],
      preparation_items: [
        "Close distracting applications and notifications",
        "Review any relevant documentation or previous work",
        "Ensure development environment is ready"
      ],
      potential_blockers: [
        "Technical dependencies or API issues",
        "Unclear requirements or scope"
      ],
      estimated_complexity: "high",
      confidence: 0.85,
      isLiveData: false
    };
  }
  
  if (timeCategory === 'meetings' || label.includes('standup') || label.includes('meeting')) {
    return {
      momentum_context: "Preparing for team alignment and communication.",
      email_pressure: [
        "Review agenda and any pre-meeting materials",
        "Check for updates that need to be shared"
      ],
      suggested_tasks: [
        "Prepare status update and accomplishments",
        "Identify any blockers or help needed",
        "Note key questions or discussion points",
        "Be ready to contribute meaningfully"
      ],
      preparation_items: [
        "Review meeting agenda and materials",
        "Prepare status and updates to share",
        "Join meeting platform early"
      ],
      potential_blockers: [
        "Technical issues with meeting platform",
        "Missing context or preparation"
      ],
      estimated_complexity: "medium",
      confidence: 0.90,
      isLiveData: false
    };
  }
  
  if (timeCategory === 'admin' || label.includes('email') || label.includes('admin')) {
    return {
      momentum_context: "Administrative work session - maintain focus on efficiency and action.",
      email_pressure: [
        "Process emails using 2-minute rule",
        "Identify and schedule follow-up actions",
        "Clear notification backlog"
      ],
      suggested_tasks: [
        "Process all emails with immediate action",
        "Schedule follow-up tasks in calendar",
        "Update project status where needed",
        "Clean up workspace and organize files"
      ],
      preparation_items: [
        "Set timer for focused processing",
        "Have calendar ready for scheduling",
        "Prepare standard response templates"
      ],
      potential_blockers: [
        "High email volume",
        "Complex issues requiring research"
      ],
      estimated_complexity: "medium",
      confidence: 0.95,
      isLiveData: false
    };
  }
  
  if (timeCategory === 'research' || label.includes('research') || label.includes('study')) {
    return {
      momentum_context: "Research and learning session - explore, discover, and document insights.",
      email_pressure: [
        "No immediate email dependencies for research work"
      ],
      suggested_tasks: [
        "Define clear research questions and goals",
        "Explore relevant resources and materials",
        "Take detailed notes and document insights",
        "Prepare summary of key findings"
      ],
      preparation_items: [
        "Set up note-taking system",
        "Bookmark relevant resources",
        "Define success criteria for the session"
      ],
      potential_blockers: [
        "Information overload or scope creep",
        "Difficulty finding relevant sources"
      ],
      estimated_complexity: "low",
      confidence: 0.80,
      isLiveData: false
    };
  }
  
  // Default context for any other block type
  return {
    momentum_context: `Focused work session: ${block.label}. Approach with intention and clarity.`,
    email_pressure: [],
    suggested_tasks: [
      "Define clear objectives for this session",
      "Organize workspace and tools needed",
      "Begin with the most important task",
      "Track progress and insights"
    ],
    preparation_items: [
      "Review session goals and context",
      "Prepare necessary tools and resources",
      "Clear mental space and focus"
    ],
    potential_blockers: [
      "Unclear objectives or scope",
      "Missing tools or dependencies"
    ],
    estimated_complexity: "medium",
    confidence: 0.75,
    isLiveData: false
  };
};

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
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set());
  
  // Load pre-generated scaffold from database (using mock data for now)
  // TODO: Replace with actual database call: getPreGeneratedScaffold(blockId)
  const mockInsights = nextWorkBlock ? getSmartSessionContext(nextWorkBlock) : null;
  
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
  
  // Format category for consistent capitalization
  const formatCategory = (category: string): string => {
    return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Load pre-generated AI insights from database (mock data for now)
  const getAiInsights = () => {
    return mockInsights ? {
      ...mockInsights,
      isLiveData: false // Will be true when loading from database
    } : null;
  };
  
  const aiInsights = getAiInsights();
  
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
  
  // Handle adding/removing tasks from echo insights to tactical plan
  const handleToggleTask = (item: string) => {
    const newTask = `• ${item}`;
    
    if (addedTasks.has(item)) {
      // Remove task from tactical plan
      setTacticalPlan(prev => {
        const lines = prev.split('\n');
        const filteredLines = lines.filter(line => line.trim() !== newTask.trim());
        return filteredLines.join('\n');
      });
      // Remove from added tasks set
      setAddedTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(item);
        return newSet;
      });
    } else {
      // Add task to tactical plan
      setTacticalPlan(prev => {
        if (!prev.trim()) {
          return newTask;
        }
        // Add new task on a new line
        return `${prev}\n${newTask}`;
      });
      // Track that this task has been added
      setAddedTasks(prev => new Set([...prev, item]));
    }
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
    
    try {
      // Prepare request for Claude session start API
      const sessionStartRequest: SessionStartRequest = {
        block_id: nextWorkBlock.meta?.id || nextWorkBlock.id,
        primary_outcome: primaryGoal,
        key_tasks: tacticalPlan.split('\n').filter(task => task.trim()),
        session_duration_minutes: Math.round((nextWorkBlock.endMinutes - nextWorkBlock.startMinutes)),
        energy_level: 8, // TODO: Get from user input
        time_constraints: `Session ends at ${nextWorkBlock.endTime}`
      };
      
      // Call Claude API for session refinement
      console.log('🚀 SpinUpState: Making API call with request:', sessionStartRequest);
      const result = await sessionApi.startSession(sessionStartRequest);
      console.log('📥 SpinUpState: Received API result:', result);
      console.log('📥 SpinUpState: RAW API RESPONSE DATA:', JSON.stringify(result.data, null, 2));
      
      if (result.success && result.data) {
        console.log('✅ SpinUpState: API call successful, processing Claude data:', result.data);
        console.log('🔍 SpinUpState: RAW CHECKLIST FROM CLAUDE:', JSON.stringify(result.data.checklist, null, 2));
        
        // Session data with Claude-generated insights
        const sessionData: SessionStartData = {
          blockId: nextWorkBlock.meta?.id || nextWorkBlock.id,
          aiInsights: {
            // Merge scaffold data with Claude session insights
            ...aiInsights,
            sessionTitle: result.data.session_title,
            primaryObjective: result.data.primary_objective,
            originalUserGoal: result.data.original_user_goal,
            checklist: result.data.checklist,
            successCriteria: result.data.success_criteria,
            timeAllocation: result.data.time_allocation,
            contingencyPlan: result.data.contingency_plan,
            dataSource: result.metadata?.api_version === 'mock' ? 'fallback_user_input' : 'live_claude_api'
          },
          userGoal: primaryGoal,
          userTasks: tacticalPlan.split('\n').filter(task => task.trim()),
          startTime: currentTime,
          nextWorkBlock: nextWorkBlock
        };
        
        console.log('📤 SpinUpState: Passing session data to ActiveSessionState:', sessionData);
        console.log('🔍 SpinUpState: Claude checklist details:', sessionData.aiInsights.checklist);
        
        onStartSession?.(sessionData);
      } else {
        console.error('Session start API failed:', result.error);
        // Fallback to user input only
        const fallbackSessionData: SessionStartData = {
          blockId: nextWorkBlock.meta?.id || nextWorkBlock.id,
          aiInsights: {
            ...aiInsights,
            dataSource: 'fallback_user_input'
          },
          userGoal: primaryGoal,
          userTasks: tacticalPlan.split('\n').filter(task => task.trim()),
          startTime: currentTime,
          nextWorkBlock: nextWorkBlock
        };
        
        onStartSession?.(fallbackSessionData);
      }
    } catch (error) {
      console.error('Error starting session:', error);
      // Fallback to user input only
      const fallbackSessionData: SessionStartData = {
        blockId: nextWorkBlock.meta?.id || nextWorkBlock.id,
        aiInsights: {
          ...aiInsights,
          dataSource: 'fallback_user_input'
        },
        userGoal: primaryGoal,
        userTasks: tacticalPlan.split('\n').filter(task => task.trim()),
        startTime: currentTime,
        nextWorkBlock: nextWorkBlock
      };
      
      onStartSession?.(fallbackSessionData);
    } finally {
      setIsStarting(false);
    }
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
            <div className="flex items-center gap-3 text-muted-foreground mb-2">
              <span className="text-lg">
                {formatTime(nextWorkBlock.startTime)} - {formatTime(nextWorkBlock.endTime)}
              </span>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                {formatCategory(nextWorkBlock.timeCategory)}
              </Badge>
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {/* Empty line to match ActiveSessionState spacing */}
            </div>
          </div>
        </div>
      </div>
      
      {/* 2. AI BRIEFING - "Key Intel" */}
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-accent" />
          echo insights
          {aiInsights?.isLiveData && (
            <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
              Live
            </Badge>
          )}
        </h2>
        
        <SessionErrorBoundary fallback={ScaffoldErrorFallback}>
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
                          className={`h-6 px-2 text-xs flex-shrink-0 ${
                            addedTasks.has(item) 
                              ? 'text-accent/70 hover:bg-accent/5' 
                              : 'hover:bg-accent/10'
                          }`}
                          onClick={() => handleToggleTask(item)}
                        >
                          {addedTasks.has(item) ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Plus className="w-3 h-3 mr-1" />
                          )}
                          {addedTasks.has(item) ? 'Added' : 'Add to tasks'}
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
                          className={`h-6 px-2 text-xs flex-shrink-0 ${
                            addedTasks.has(task) 
                              ? 'text-accent/70 hover:bg-accent/5' 
                              : 'hover:bg-accent/10'
                          }`}
                          onClick={() => handleToggleTask(task)}
                        >
                          {addedTasks.has(task) ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Plus className="w-3 h-3 mr-1" />
                          )}
                          {addedTasks.has(task) ? 'Added' : 'Add to tasks'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Preparation Items - Enhanced with live Claude data */}
              {aiInsights?.preparation_items?.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    PREPARATION ITEMS
                  </div>
                  <div className="space-y-2 pl-3">
                    {aiInsights.preparation_items.slice(0, 3).map((item: string, index: number) => (
                      <div key={index} className="flex items-start justify-between gap-3">
                        <span className="text-sm text-muted-foreground flex-1">• {item}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={`h-6 px-2 text-xs flex-shrink-0 ${
                            addedTasks.has(item) 
                              ? 'text-accent/70 hover:bg-accent/5' 
                              : 'hover:bg-accent/10'
                          }`}
                          onClick={() => handleToggleTask(item)}
                        >
                          {addedTasks.has(item) ? (
                            <Check className="w-3 h-3 mr-1" />
                          ) : (
                            <Plus className="w-3 h-3 mr-1" />
                          )}
                          {addedTasks.has(item) ? 'Added' : 'Add to prep'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Potential Blockers - Claude intelligence warning */}
              {aiInsights?.potential_blockers?.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                    POTENTIAL BLOCKERS
                  </div>
                  <div className="space-y-2 pl-3">
                    {aiInsights.potential_blockers.slice(0, 2).map((blocker: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <WifiOff className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground flex-1">{blocker}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </div>
              </CardContent>
            </Card>
        </SessionErrorBoundary>
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