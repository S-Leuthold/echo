"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { usePlanStatus } from "@/contexts/PlanStatusContext";
import { usePlanning } from "@/contexts/PlanningContext";
import { DynamicText, TimeAwareText, PlanningModeBadge, TimeContextDisplay, PlanningModeToggle } from "@/components/ui/dynamic-text";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PlanTimeline } from "@/components/shared/PlanTimeline";
import { SessionStatePanel } from "@/components/session/SessionStatePanel";
import { IconResolutionService } from "@/lib/icon-resolution";
import { sessionApi } from "@/services/sessionApiService";
import { SessionHistoryItem } from "@/types/sessionApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Play, 
  Pause, 
  ChevronDown, 
  ChevronUp,
  Clock,
  Info,
  Target,
  CheckCircle2,
  Circle,
  FileText,
  Calendar,
  ExternalLink,
  Square,
  AlertCircle,
  Plus,
  BookOpen
} from "lucide-react";

// Plan status detection and management
type PlanStatus = 'loading' | 'exists' | 'missing' | 'expired' | 'error';

interface PlanStatusInfo {
  status: PlanStatus;
  canPlanToday: boolean;
  shouldPlanTomorrow: boolean;
  message: string;
  actionText: string;
}

const getPlanStatusInfo = (): PlanStatusInfo => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's after 6 PM, suggest planning tomorrow instead of today
  const shouldPlanTomorrow = currentHour >= 18;
  const canPlanToday = currentHour < 18;
  
  return {
    status: 'missing',
    canPlanToday,
    shouldPlanTomorrow,
    message: shouldPlanTomorrow 
      ? "No plan found for today. Since it's evening, let's plan tomorrow instead."
      : "No plan found for today. You can still plan the rest of your day.",
    actionText: shouldPlanTomorrow ? "Plan Tomorrow" : "Plan Today"
  };
};

// API integration functions
const checkTodayPlan = async (): Promise<{ exists: boolean; data?: any; error?: string }> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/today`);
    if (response.ok) {
      const data = await response.json();
      
      // Check if there are actually scheduled blocks (not just empty response)
      const hasBlocks = data.blocks && data.blocks.length > 0;
      
      if (hasBlocks) {
        return { exists: true, data };
      } else {
        // API responded but no actual plan blocks exist
        return { exists: false, data }; // Include data for email info
      }
    } else if (response.status === 404) {
      return { exists: false };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Error checking today\'s plan:', error);
    return { exists: false, error: error.message };
  }
};

const logUserAction = async (action: string, data: any = {}) => {
  try {
    // Future: Send to analytics endpoint
    // Silently track user actions for now
  } catch (error) {
    // Silently handle logging errors
  }
};

// Data transformation functions (now accepts currentTime parameter for real-time updates)
const transformTodayDataToFocus = (todayData: any, currentTime: Date = new Date()) => {
  if (!todayData || !todayData.current_block) {
    return mockCurrentFocus; // Fallback to mock if no current block
  }
  
  const currentBlock = todayData.current_block;
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  // Calculate real-time progress and time remaining
  const startTime = parseTime(currentBlock.start_time);
  const endTime = parseTime(currentBlock.end_time);
  const startMinutes = startTime.hours * 60 + startTime.minutes;
  const endMinutes = endTime.hours * 60 + endTime.minutes;
  const totalDuration = endMinutes - startMinutes;
  const elapsed = currentMinutes - startMinutes;
  const remaining = endMinutes - currentMinutes;
  
  const realTimeProgress = Math.max(0, Math.min(100, Math.round((elapsed / totalDuration) * 100)));
  const remainingMinutes = Math.max(0, remaining);
  
  return {
    id: currentBlock.id,
    startTime: currentBlock.start_time,
    endTime: currentBlock.end_time,
    emoji: currentBlock.emoji || '🚀',
    label: currentBlock.label,
    type: 'active' as const,
    progress: realTimeProgress,
    strategicNote: currentBlock.note || 'Focus on completing this task with quality and intention.',
    timeCategory: mapBlockTypeToCategory(currentBlock.type, currentBlock.label),
    sessionGoal: `Complete the current task: ${currentBlock.task_name}`,
    remainingMinutes, // Add real-time remaining minutes
    subtasks: [
      { id: '1', text: 'Focus on the primary objective', completed: false },
      { id: '2', text: 'Track progress and insights', completed: false },
      { id: '3', text: 'Maintain quality standards', completed: false }
    ],
    userNotes: 'Session in progress with live data.'
  };
};

const transformTodayDataToSchedule = (todayData: any, currentTime: Date = new Date()) => {
  if (!todayData || !todayData.blocks) {
    return mockSchedule; // Fallback to mock if no blocks
  }
  
  return todayData.blocks.map((block: any, index: number) => {
    const startTime = parseTime(block.start_time);
    const endTime = parseTime(block.end_time);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    const duration = endMinutes - startMinutes;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Determine block state
    let state = 'upcoming';
    let progress = 0;
    let isCurrent = false;
    
    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      state = 'active';
      isCurrent = true;
      progress = Math.round(((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100);
    } else if (currentMinutes > endMinutes) {
      state = 'completed';
      progress = 100;
    }
    
    // Map time category to match PlanTimeline expectations
    const timeCategory = mapBlockTypeToCategory(block.type, block.label);
    
    // Resolve icon using IconResolutionService with backend icon name
    const { icon: IconComponent } = IconResolutionService.resolveIcon(
      block.label, 
      timeCategory.toLowerCase(), 
      block.icon // Use backend icon name if available
    );
    
    // Check if this is a config block (anchor/fixed types)
    const isConfigBlock = block.type === 'anchor' || block.type === 'fixed';
    
    return {
      id: block.id,
      startTime: block.start_time,
      endTime: block.end_time,
      startMinutes,
      endMinutes,
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      label: block.label,
      timeCategory,
      icon: IconComponent,
      isCurrent,
      progress,
      strategicNote: block.note || '',
      note: block.rationale || block.note || '', // Use rationale as note for tooltips
      rationale: block.rationale || '',
      isConfigBlock,
      state
    };
  });
};

const parseTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

const mapBlockTypeToCategory = (blockType: string, label: string = '') => {
  // Enhanced category detection based on content, not just type
  const lowerLabel = label.toLowerCase();
  
  // First check label content for accurate categorization
  if (lowerLabel.includes('meeting') || lowerLabel.includes('standup') || lowerLabel.includes('call') || lowerLabel.includes('sync')) {
    return 'MEETINGS';
  }
  if (lowerLabel.includes('email') || lowerLabel.includes('admin') || lowerLabel.includes('inbox')) {
    return 'SHALLOW_WORK';
  }
  if (lowerLabel.includes('deep work') || lowerLabel.includes('focus') || lowerLabel.includes('development') || lowerLabel.includes('coding')) {
    return 'DEEP_WORK';
  }
  if (lowerLabel.includes('gym') || lowerLabel.includes('workout') || lowerLabel.includes('exercise') || lowerLabel.includes('fitness')) {
    return 'HEALTH';
  }
  if (lowerLabel.includes('lunch') || lowerLabel.includes('dinner') || lowerLabel.includes('breakfast') || lowerLabel.includes('meal')) {
    return 'MEALS';
  }
  if (lowerLabel.includes('commute') || lowerLabel.includes('drive') || lowerLabel.includes('transit') || lowerLabel.includes('travel')) {
    return 'TRANSIT';
  }
  if (lowerLabel.includes('personal') || lowerLabel.includes('break') || lowerLabel.includes('rest')) {
    return 'PERSONAL';
  }
  if (lowerLabel.includes('planning') || lowerLabel.includes('review')) {
    return 'PLANNING';
  }
  if (lowerLabel.includes('research') || lowerLabel.includes('study') || lowerLabel.includes('learn')) {
    return 'RESEARCH';
  }
  
  // Then fall back to type mapping (but don't assume anchor/fixed are personal)
  const typeMap: { [key: string]: string } = {
    'flex': 'DEEP_WORK',
    'work': 'DEEP_WORK',
    'meeting': 'MEETINGS',
    'personal': 'PERSONAL',
    'health': 'HEALTH',
    'meal': 'MEALS',
    'transit': 'TRANSIT',
    'planning': 'PLANNING',
    'research': 'RESEARCH'
  };
  
  // For anchor/fixed, try to infer from label
  if (blockType.toLowerCase() === 'anchor' || blockType.toLowerCase() === 'fixed') {
    // Morning/evening routines are typically personal
    if (lowerLabel.includes('morning') || lowerLabel.includes('evening') || lowerLabel.includes('routine')) {
      return 'PERSONAL';
    }
    // Otherwise, default to work
    return 'DEEP_WORK';
  }
  
  return typeMap[blockType.toLowerCase()] || 'DEEP_WORK';
};

// Session management API functions (hooks for future implementation)
const sessionAPI = {
  async startSession(blockId: string, sessionData: any) {
    try {
      await logUserAction('session_start', { blockId, sessionData });
      // Session API not yet implemented - return mock success
      return { success: true, sessionId: `session_${Date.now()}` };
    } catch (error) {
      throw error;
    }
  },

  async pauseSession(sessionId: string) {
    try {
      await logUserAction('session_pause', { sessionId });
      // Session API not yet implemented - return mock success
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  async endSession(sessionId: string, sessionNotes?: string) {
    try {
      await logUserAction('session_end', { sessionId, hasNotes: !!sessionNotes });
      // Session API not yet implemented - return mock success
      return { success: true };
    } catch (error) {
      throw error;
    }
  },

  async updateSessionNotes(sessionId: string, notes: string) {
    try {
      await logUserAction('session_notes_update', { sessionId, notesLength: notes.length });
      // Session API not yet implemented - return mock success
      return { success: true };
    } catch (error) {
      throw error;
    }
  }
};

// Mock schedule data with TimeCategory system - Personal & Intuitive
const mockSchedule = [
  {
    id: "1",
    startTime: "06:00",
    endTime: "06:30", 
    emoji: "☀️",
    label: "Personal | Morning Reading",
    timeCategory: "PERSONAL",
    isCurrent: false,
    progress: 100,
    startMinutes: 6 * 60,
    strategicNote: "Start the day with clarity. This reading time sets your mental foundation and creates momentum for everything that follows.",
    state: "completed"
  },
  {
    id: "2",
    startTime: "06:30",
    endTime: "07:00",
    emoji: "💪",
    label: "Personal | Exercise", 
    timeCategory: "HEALTH",
    isCurrent: false,
    progress: 100,
    startMinutes: 6.5 * 60,
    strategicNote: "Energy investment that pays dividends all day. Your body and mind work better when you move first.",
    state: "completed"
  },
  {
    id: "3",
    startTime: "09:00",
    endTime: "11:00",
    emoji: "🚀",
    label: "Echo Development | Frontend Build",
    timeCategory: "DEEP_WORK", 
    isCurrent: true,
    progress: 45,
    startMinutes: 9 * 60,
    strategicNote: "This is the session that moves the needle. Lock in on the session-aware dashboard - this transforms Echo from a simple schedule to a true thinking tool.",
    state: "active"
  },
  {
    id: "4",
    startTime: "12:00",
    endTime: "12:30",
    emoji: "🤝",
    label: "Team Standup",
    timeCategory: "MEETINGS",
    isCurrent: false,
    progress: 0,
    startMinutes: 12 * 60,
    strategicNote: "Quick alignment check. Keep it focused - status, blockers, next steps. Don't let it drift.",
    state: "upcoming"
  },
  {
    id: "5",
    startTime: "14:00",
    endTime: "16:00",
    emoji: "🔌",
    label: "Echo Development | API Integration",
    timeCategory: "DEEP_WORK",
    isCurrent: false,
    progress: 0,
    startMinutes: 14 * 60,
    strategicNote: "Connect the beautiful frontend to the powerful backend. This is where the magic happens - real data flowing through your focus pane.",
    state: "upcoming"
  },
];

// Intelligent session state detection
const getCurrentSessionState = () => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Find current or most relevant session
  const activeSession = mockSchedule.find(session => 
    currentMinutes >= session.startMinutes && 
    currentMinutes < (session.startMinutes + 120) // Assuming 2hr default duration
  );
  
  if (activeSession) {
    return { type: 'active', session: activeSession };
  }
  
  // Check for completed sessions (within last 30 mins)
  const recentlyCompleted = mockSchedule
    .filter(session => session.state === 'completed')
    .filter(session => (session.startMinutes + 120) <= currentMinutes && currentMinutes <= (session.startMinutes + 150))
    .sort((a, b) => b.startMinutes - a.startMinutes)[0];
    
  if (recentlyCompleted) {
    // Find next upcoming session
    const nextSession = mockSchedule
      .filter(session => session.state === 'upcoming')
      .sort((a, b) => a.startMinutes - b.startMinutes)[0];
    
    return { 
      type: 'between', 
      completedSession: recentlyCompleted, 
      nextSession: nextSession 
    };
  }
  
  // Default to next upcoming session
  const nextSession = mockSchedule
    .filter(session => session.state === 'upcoming')
    .sort((a, b) => a.startMinutes - b.startMinutes)[0];
    
  return { type: 'upcoming', session: nextSession };
};

// Mock data for the current focus - with intelligent state awareness
const getSmartCurrentFocus = () => {
  const sessionState = getCurrentSessionState();
  
  if (sessionState.type === 'active') {
    return {
      id: sessionState.session!.id,
      startTime: sessionState.session!.startTime,
      endTime: sessionState.session!.endTime,
      emoji: sessionState.session!.emoji,
      label: sessionState.session!.label,
      type: 'active' as const,
      progress: sessionState.session!.progress,
      strategicNote: sessionState.session!.strategicNote,
      timeCategory: sessionState.session!.timeCategory,
      sessionGoal: "Complete the session-aware dashboard with Enricher integration, visual system for block types/states, and interactive subtask management",
      subtasks: [
        { id: "1", text: "Integrate emojis and strategic notes from Enricher", completed: false },
        { id: "2", text: "Build sophisticated visual system for block types", completed: false },
        { id: "3", text: "Transform Current Focus into session hub", completed: false },
        { id: "4", text: "Add notification badges to sidebar", completed: true }
      ],
      userNotes: "Focused session in progress. Deep work time."
    };
  }
  
  if (sessionState.type === 'between') {
    const nextTime = sessionState.nextSession 
      ? `${sessionState.nextSession.startTime}` 
      : "later today";
    const nextTitle = sessionState.nextSession?.label || "your next session";
    
    return {
      id: 'between',
      type: 'between' as const,
      completedSession: sessionState.completedSession!,
      nextSession: sessionState.nextSession,
      message: `${sessionState.completedSession!.label} complete.`,
      nextMessage: sessionState.nextSession 
        ? `Your next session, ${sessionState.nextSession.emoji} ${sessionState.nextSession.label}, begins at ${nextTime}.`
        : "No more sessions scheduled today.",
      strategicNote: "Perfect time for a quick break, review your notes, or prepare for what's ahead.",
      userNotes: "Transition time - a moment to breathe and refocus."
    };
  }
  
  // Upcoming session
  return {
    id: sessionState.session!.id,
    startTime: sessionState.session!.startTime,
    endTime: sessionState.session!.endTime,
    emoji: sessionState.session!.emoji,
    label: sessionState.session!.label,
    type: 'upcoming' as const,
    progress: 0,
    strategicNote: sessionState.session!.strategicNote,
    timeCategory: sessionState.session!.timeCategory,
    sessionGoal: "Prepare for your upcoming session and ensure you're ready to dive in with full focus.",
    subtasks: [
      { id: "1", text: "Review session goals and context", completed: false },
      { id: "2", text: "Prepare tools and resources", completed: false },
      { id: "3", text: "Clear mental space and focus", completed: false }
    ],
    userNotes: "Upcoming session - time to prepare and set intentions."
  };
};

const mockCurrentFocus = getSmartCurrentFocus();

// Session data now loaded from API via sessionApi service

// No Plan Available Component  
function NoPlanAvailable({ planStatusInfo, todayData }: { planStatusInfo: PlanStatusInfo; todayData?: any }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const { setPlanningMode, timeContext, canPlanToday, shouldSuggestSameDay } = usePlanning();
  
  const handlePlanNavigation = async (mode: 'today' | 'tomorrow') => {
    setIsNavigating(true);
    
    // Set planning mode in context
    setPlanningMode(mode, 'no_plan_modal');
    
    await logUserAction('navigate_to_planning', { 
      reason: 'no_plan_available',
      planning_mode: mode,
      time_context: timeContext?.time_period,
      source: 'no_plan_modal'
    });
    
    // Navigate to planning page with mode parameter
    window.location.href = `/planning?mode=${mode}`;
  };

  // Determine primary recommendation based on time context
  const primaryMode = shouldSuggestSameDay && canPlanToday ? 'today' : 'tomorrow';
  const secondaryMode = primaryMode === 'today' ? 'tomorrow' : 'today';
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-lg w-full mx-4">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              <DynamicText>No Plan for Today</DynamicText>
            </h2>
            
            {/* Time context display */}
            <div className="mb-4">
              <TimeContextDisplay 
                className="text-center"
                showGreeting={true}
                showRemainingTime={canPlanToday}
              />
            </div>
            
            <p className="text-muted-foreground leading-relaxed">
              <TimeAwareText
                morning="Start your day with intention by creating a focused plan."
                afternoon="You can still plan the remainder of your day for maximum productivity."
                evening="Since it's evening, let's plan tomorrow for a great start."
                night="Perfect time to plan tomorrow while reflecting on today."
                default="Create a thoughtful plan to guide your time and energy."
              />
            </p>
          </div>
          
          <div className="space-y-3">
            {/* Primary recommendation button */}
            <Button 
              onClick={() => handlePlanNavigation(primaryMode)}
              disabled={isNavigating}
              className="w-full"
            >
              {isNavigating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Starting planning...
                </>
              ) : (
                <>
                  {primaryMode === 'today' ? (
                    <>
                      <Target className="w-4 h-4 mr-2" />
                      <DynamicText todayText="Plan Remaining Day">Plan Tomorrow</DynamicText>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Plan Tomorrow
                    </>
                  )}
                </>
              )}
            </Button>
            
            {/* Secondary option if available */}
            {canPlanToday && primaryMode === 'tomorrow' && (
              <Button 
                variant="outline" 
                onClick={() => handlePlanNavigation('today')}
                disabled={isNavigating}
                className="w-full"
              >
                <Target className="w-4 h-4 mr-2" />
                Plan Today Instead
              </Button>
            )}
            
            {primaryMode === 'today' && (
              <Button 
                variant="outline" 
                onClick={() => handlePlanNavigation('tomorrow')}
                disabled={isNavigating}
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Plan Tomorrow Instead
              </Button>
            )}
            
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                <DynamicText 
                  todayText="Same-day planning focuses on your remaining time and energy."
                >
                  Strategic planning helps you stay focused and productive.
                </DynamicText>
              </p>
              
              {/* Show email context if available */}
              {todayData?.email_summary?.action_items?.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-border/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    📧 Email action items waiting:
                  </p>
                  <div className="space-y-1">
                    {todayData.email_summary.action_items.slice(0, 3).map((item: any, index: number) => (
                      <div key={index} className="text-xs text-muted-foreground">
                        • {item.subject} ({item.priority})
                      </div>
                    ))}
                    {todayData.email_summary.action_items.length > 3 && (
                      <div className="text-xs text-muted-foreground italic">
                        +{todayData.email_summary.action_items.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to get category color
const getCategoryColor = (category: string) => {
  switch (category) {
    case "DEEP_WORK": return "text-deep-work border-deep-work/20 bg-deep-work/10";
    case "MEETINGS": return "text-meetings border-meetings/20 bg-meetings/10";
    case "PERSONAL": return "text-personal border-personal/20 bg-personal/10";
    case "HEALTH": return "text-health border-health/20 bg-health/10";
    case "RESEARCH": return "text-research border-research/20 bg-research/10";
    case "PLANNING": return "text-planning border-planning/20 bg-planning/10";
    default: return "text-muted-foreground border-border bg-muted/20";
  }
};

function SessionNoteReview({ 
  recentSessions, 
  relatedSessions, 
  loading, 
  error,
  onSessionClick
}: { 
  recentSessions: SessionHistoryItem[]; 
  relatedSessions: SessionHistoryItem[]; 
  loading: boolean; 
  error: string | null; 
  onSessionClick: (session: SessionHistoryItem) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Related Sessions - Database View - Only show if we have related sessions */}
      {relatedSessions.length > 0 && (
        <Card className="bg-muted/20 border-border/50">
          <CardContent className="px-3 py-1">
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                  RELATED SESSIONS
                </div>
                
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground pl-3">
                    <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading related sessions...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-destructive pl-3">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-sm">{error}</span>
                  </div>
                ) : relatedSessions.length === 0 ? (
                  <div className="text-sm text-muted-foreground pl-3">
                    No related sessions found
                  </div>
                ) : (
                  <div className="space-y-2 pl-3">
                    {relatedSessions.map((session) => (
                      <div key={session.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-base mt-0.5">{session.emoji}</span>
                          <div className="flex-1">
                            <div className="text-sm text-foreground font-medium leading-relaxed">
                              {session.title}
                            </div>
                            <div className="text-xs text-muted-foreground/80 mt-1">
                              {new Date(session.date).toLocaleDateString("en-US", { 
                                month: "short", 
                                day: "numeric" 
                              })} • {session.timeRange}
                              {session.attendees && (
                                <span> • {session.attendees.length} attendees</span>
                              )}
                            </div>
                            {session.snippet && (
                              <div className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
                                {session.snippet}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs px-2 py-0.5 border ${getCategoryColor(session.timeCategory)}`}>
                            {session.timeCategory.replace('_', ' ').toLowerCase()}
                          </Badge>
                          {session.totalTasks > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {session.tasksCompleted}/{session.totalTasks}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Sessions - Echo Insights Style */}
      <Card className="bg-muted/20 border-border/50">
        <CardContent className="px-3 py-1">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-3">
              <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                RECENT SESSIONS
              </div>
              
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground pl-3">
                  <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading recent sessions...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-destructive pl-3">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="text-sm text-muted-foreground pl-3">
                  No recent sessions found
                </div>
              ) : (
                <div className="space-y-2 pl-3">
                  {recentSessions.map((session) => {
                    // Get Lucide icon for session (remove emojis)
                    const { icon: SessionIcon } = IconResolutionService.resolveIcon(
                      session.title, 
                      session.timeCategory.toLowerCase()
                    );
                    
                    // Format relative date
                    const sessionDate = new Date(session.date);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    let relativeDate;
                    if (sessionDate.toDateString() === today.toDateString()) {
                      relativeDate = "Today";
                    } else if (sessionDate.toDateString() === yesterday.toDateString()) {
                      relativeDate = "Yesterday";
                    } else {
                      relativeDate = sessionDate.toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric" 
                      });
                    }
                    
                    return (
                      <div key={session.id} className="flex items-start justify-between gap-4 hover:bg-muted/10 p-2 -m-2 rounded transition-colors">
                        {/* Left: Session Identity with Date/Time Below */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Icon with tooltip matching ActiveSessionState exactly */}
                          <div className="group relative">
                            <SessionIcon className="w-4 h-4 text-muted-foreground/70 hover:text-muted-foreground flex-shrink-0 mt-0.5" />
                            {(session.executiveSummary || session.snippet) && (
                              <div className="invisible group-hover:visible absolute left-6 bottom-6 z-50 w-80 p-3 bg-popover border border-border rounded-md shadow-lg">
                                <div className="text-xs text-muted-foreground mb-1">Executive Summary:</div>
                                <div className="text-sm text-foreground leading-relaxed">
                                  {session.executiveSummary || session.snippet || "No executive summary available."}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div 
                              className="text-sm text-foreground font-medium truncate cursor-pointer hover:text-accent transition-colors"
                              onClick={() => onSessionClick(session)}
                            >
                              {session.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{relativeDate}</span>
                              <span>•</span>  
                              <span>{session.timeRange}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: AI Keywords (Fully Right-Justified) */}
                        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                          {session.aiKeywords && session.aiKeywords.length > 0 ? (
                            session.aiKeywords.map((keyword, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  // Future: Navigate to Journal view with keyword filter
                                }}
                                className="px-2 py-1 text-xs bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded border font-mono transition-colors"
                              >
                                {keyword}
                              </button>
                            ))
                          ) : !session.hasNotes ? (
                            <span className="text-xs text-muted-foreground/50 italic">
                              Personal
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CurrentFocusComponent({ focus }: { focus: typeof mockCurrentFocus }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(focus.userNotes || "");
  const [subtasks, setSubtasks] = useState(focus.subtasks || []);
  const [sessionNotes, setSessionNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [sessionActive, setSessionActive] = useState(focus.type === 'active');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  
  // Handle "between" state differently
  if (focus.type === 'between') {
    return (
      <TooltipProvider>
        <Card className="border-border/30 bg-card/50 backdrop-blur-sm">
          <div className="p-8">
            {/* Between State Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-muted-foreground/60 rounded-full" />
                <span className="text-sm text-muted-foreground font-medium tracking-wide">TRANSITION TIME</span>
              </div>
            </div>
            
            {/* Completion Message */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                <h2 className="text-xl font-medium text-foreground">
                  {focus.message}
                </h2>
              </div>
              
              {/* Next Session Info */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-base text-foreground leading-relaxed">
                  {focus.nextMessage}
                </p>
              </div>
            </div>
            
            {/* Strategic Note */}
            <div className="mb-6 p-4 rounded-xl bg-accent/8 border border-accent/20">
              <p className="text-base text-foreground/90 italic leading-relaxed font-light">
                "{focus.strategicNote}"
              </p>
            </div>
            
            {/* Simple actions for transition time */}
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Review Notes
              </Button>
              <Button variant="outline" size="sm">
                <Target className="w-4 h-4 mr-2" />
                Prepare Next
              </Button>
            </div>
          </div>
        </Card>
      </TooltipProvider>
    );
  }

  const toggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const completedSubtasks = subtasks.filter(task => task.completed).length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <TooltipProvider>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-2">
        <Card className="border-accent/20 bg-card/50 backdrop-blur-sm">
          <CollapsibleTrigger asChild>
            <div className="p-8 cursor-pointer hover:bg-accent/5 transition-all">
              {/* Header Section - 16px bottom margin */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-accent rounded-full animate-pulse" />
                  <span className="text-sm text-muted-foreground font-medium tracking-wide">CURRENT FOCUS</span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {focus.timeCategory.replace('_', ' ')}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              
              {/* Hero Title - 24px bottom margin */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-foreground leading-tight flex items-center gap-4">
                  <span className="text-4xl">{focus.emoji}</span>
                  {focus.label}
                </h1>
                
                {/* Elegant progress integration - right below title */}
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="w-full h-1.5 bg-border/50 rounded-full">
                      <div 
                        className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${focus.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-accent tabular-nums">
                    {focus.progress}%
                  </div>
                </div>
              </div>
              
              {/* Strategic Note - 24px bottom margin */}
              <div className="mb-6 p-4 rounded-xl bg-accent/8 border border-accent/20">
                <p className="text-base text-foreground/90 italic leading-relaxed font-light">
                  "{focus.strategicNote}"
                </p>
              </div>
              
              {/* Time metadata - refined spacing */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {focus.startTime} - {focus.endTime}
                </span>
                <span className="text-muted-foreground/40">•</span>
                <span>
                  {focus.remainingMinutes 
                    ? `${focus.remainingMinutes} minutes remaining`
                    : 'Time remaining calculation...'
                  }
                </span>
              </div>
            </div>
          </CollapsibleTrigger>
          
          {/* Session Goal - 24px bottom margin */}
          <div className="px-8 pb-6">
            <div className="flex items-start space-x-4 p-5 rounded-xl bg-muted/40">
              <Target className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                  Session Goal
                </div>
                <div className="text-base text-foreground leading-relaxed font-normal">
                  {focus.sessionGoal}
                </div>
              </div>
            </div>
          </div>
          
          {/* Session Notes - In-session note-taking */}
          <div className="px-8 pb-6">
            {!showNotesInput ? (
              <button
                onClick={() => setShowNotesInput(true)}
                className="w-full p-4 rounded-xl border border-dashed border-muted-foreground/40 hover:border-accent/60 hover:bg-accent/5 transition-all text-left group"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/40 group-hover:border-accent flex items-center justify-center transition-colors">
                    <span className="text-xs text-muted-foreground group-hover:text-accent">+</span>
                  </div>
                  <span className="text-sm text-muted-foreground group-hover:text-accent transition-colors">
                    Add a note to this session
                  </span>
                </div>
              </button>
            ) : (
              <div className="rounded-xl border border-accent/20 bg-card/30">
                <div className="p-4 border-b border-border/50">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Session Notes
                  </div>
                </div>
                <div className="p-4">
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Capture thoughts, ideas, and insights as you work..."
                    className="w-full min-h-[120px] bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground leading-relaxed text-base"
                    autoFocus
                    style={{ 
                      fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, sans-serif',
                    }}
                  />
                  <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-border/50">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowNotesInput(false);
                        setSessionNotes("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={async () => {
                        try {
                          if (currentSessionId && sessionNotes.trim()) {
                            await sessionAPI.updateSessionNotes(currentSessionId, sessionNotes);
                          }
                          setShowNotesInput(false);
                        } catch (error) {
                          console.error('Failed to save session notes:', error);
                        }
                      }}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Subtask Progress - 24px bottom margin */}
          <div className="px-8 pb-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground font-medium mb-3">
              <span className="uppercase tracking-wider text-xs">Task Progress</span>
              <span>{completedSubtasks}/{totalSubtasks} completed</span>
            </div>
            <div className="w-full h-1.5 bg-border/50 rounded-full">
              <div 
                className="h-full bg-deep-work rounded-full transition-all duration-700"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
          </div>
          
          {/* State-based Session Control Buttons */}
          <div className="px-8 pb-8">
            <div className="flex gap-3">
              {!sessionActive ? (
                // When NO session is active: Only show Start Session
                <Button 
                  size="sm" 
                  className="bg-accent hover:bg-accent/90 font-medium"
                  disabled={sessionLoading}
                  onClick={async () => {
                    try {
                      setSessionLoading(true);
                      const result = await sessionAPI.startSession(focus.id, {
                        blockLabel: focus.label,
                        startTime: new Date().toISOString(),
                        sessionGoal: focus.sessionGoal
                      });
                      
                      if (result.success) {
                        setSessionActive(true);
                        setCurrentSessionId(result.sessionId);
                      }
                    } catch (error) {
                      console.error('Failed to start session:', error);
                    } finally {
                      setSessionLoading(false);
                    }
                  }}
                >
                  {sessionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Start Session
                    </>
                  )}
                </Button>
              ) : (
                // When session IS active: Show Pause and End Session
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-medium"
                    disabled={sessionLoading}
                    onClick={async () => {
                      try {
                        setSessionLoading(true);
                        if (currentSessionId) {
                          await sessionAPI.pauseSession(currentSessionId);
                        }
                      } catch (error) {
                        console.error('Failed to pause session:', error);
                      } finally {
                        setSessionLoading(false);
                      }
                    }}
                  >
                    <Pause className="w-4 h-4 mr-2" />  
                    Pause Session
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm" 
                    className="border-accent text-accent hover:bg-accent hover:text-accent-foreground font-medium"
                    disabled={sessionLoading}
                    onClick={async () => {
                      try {
                        setSessionLoading(true);
                        if (currentSessionId) {
                          await sessionAPI.endSession(currentSessionId, sessionNotes);
                        }
                        setSessionActive(false);
                        setCurrentSessionId(null);
                        setSessionNotes("");
                      } catch (error) {
                        console.error('Failed to end session:', error);
                      } finally {
                        setSessionLoading(false);
                      }
                    }}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    End Session
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
        
        <CollapsibleContent className="space-y-6">
          {/* Interactive Subtask Checklist */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                Session Tasks
              </h3>
              <div className="space-y-3">
                {subtasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent/5 transition-colors cursor-pointer"
                    onClick={() => toggleSubtask(task.id)}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-chart-1 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      task.completed 
                        ? "text-muted-foreground line-through" 
                        : "text-foreground"
                    }`}>
                      {task.text}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* LLM Instructions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Instructions</h3>
              <div className="prose prose-sm prose-invert max-w-none">
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {focus.llmInstructions}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Novel-style Notes */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Session Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Start writing..."
                className="w-full min-h-[200px] bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground leading-relaxed text-base"
                style={{ 
                  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}


export default function TodayPage() {
  // Use shared plan status context instead of local state
  const { planStatus, todayData, error, isLoading } = usePlanStatus();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [calendarHeight, setCalendarHeight] = useState(800); // Better default height
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const [currentSessionState, setCurrentSessionState] = useState<string>('TRANQUIL');
  
  // Session data state management
  const [recentSessions, setRecentSessions] = useState<SessionHistoryItem[]>([]);
  const [relatedSessions, setRelatedSessions] = useState<SessionHistoryItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  
  // Session modal state
  const [selectedSession, setSelectedSession] = useState<SessionHistoryItem | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  
  // Handle opening session modal
  const handleOpenSessionModal = (session: SessionHistoryItem) => {
    setSelectedSession(session);
    setIsSessionModalOpen(true);
  };
  
  // Handle closing session modal
  const handleCloseSessionModal = () => {
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  };
  
  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    
    return () => clearInterval(timer);
  }, []);
  
  // Simplified height calculation for full viewport usage
  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      
      // Calendar now uses full viewport height from top
      // Header space (80px) + padding (48px) = 128px reserved
      const reservedSpace = 128;
      const availableHeight = windowHeight - reservedSpace;
      const finalHeight = Math.max(availableHeight, 700);
      
      
      // Use the actual available space - should be much larger now
      setCalendarHeight(finalHeight);
    };
    
    // Initial calculation and multiple attempts to ensure it works
    calculateHeight(); // Immediate
    const timer1 = setTimeout(calculateHeight, 100);
    const timer2 = setTimeout(calculateHeight, 500); // Additional attempt
    
    window.addEventListener('resize', calculateHeight);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);

  
  
  // Load session data from API with context awareness
  const loadSessionData = useCallback(async () => {
    if (sessionsLoading) return;
    
    // Ensure sessionApi is available
    if (!sessionApi) {
      return;
    }
    
    setSessionsLoading(true);
    setSessionsError(null);
    
    try {
      // Always load recent sessions
      const recentResponse = await sessionApi.getRecentSessions(6);
      
      if (recentResponse.success) {
        setRecentSessions(recentResponse.data.sessions);
      }
      
      // Load related sessions only for work blocks (not personal blocks)
      const currentBlock = todayData?.current_block;
      const isPersonalBlock = currentBlock?.type === 'PERSONAL' || currentBlock?.type === 'HEALTH' || currentBlock?.type === 'MEALS';
      
      if (!isPersonalBlock && currentBlock?.label) {
        // Extract project from block label (format: "project | task")
        // We need to match the full project format used in mock data
        let projectContext = 'Admin | Operations'; // default fallback
        
        const pipeIndex = currentBlock.label.indexOf('|');
        if (pipeIndex > 0) {
          const projectPrefix = currentBlock.label.substring(0, pipeIndex).trim();
          // Map common prefixes to full project names
          const projectMap = {
            'echo': 'echo | Platform Development',
            'MAOM-N': 'MAOM-N | Manuscript Revision', 
            'PersonalSite': 'PersonalSite | Portfolio Redesign',
            'Admin': 'Admin | Operations',
            'Research': 'Research | AI Integration'
          };
          projectContext = projectMap[projectPrefix] || `${projectPrefix} | Development`;
        }
        
        const relatedResponse = await sessionApi.getRelatedSessions({
          projectContext: projectContext,
          timeCategory: currentBlock.type,
          limit: 4
        });
        
        if (relatedResponse.success) {
          setRelatedSessions(relatedResponse.data.sessions);
        }
      } else {
        // Clear related sessions for personal blocks
        setRelatedSessions([]);
      }
      
    } catch (error) {
      setSessionsError('Failed to load session history');
    } finally {
      setSessionsLoading(false);
    }
  }, [todayData]);
  
  // Load session data on component mount
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);
  
  // Memoize schedule transformations to prevent unnecessary re-renders
  const transformedSchedule = useMemo(() => {
    return todayData ? transformTodayDataToSchedule(todayData, currentTime) : undefined;
  }, [todayData, currentTime]);
  
  const timelineSchedule = useMemo(() => {
    return todayData ? transformTodayDataToSchedule(todayData, currentTime) : mockSchedule;
  }, [todayData, currentTime]);
  
  
  const currentTimeString = currentTime.toLocaleTimeString("en-US", { 
    hour12: false, 
    hour: "2-digit", 
    minute: "2-digit" 
  });
  
  // Log page visit (context handles the actual data loading)
  useEffect(() => {
    logUserAction('page_load', { page: 'today' });
  }, []);
  
  // Show loading state
  if (planStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading today's plan...</p>
        </div>
      </div>
    );
  }
  
  // Show no plan state with smart planning options
  if (planStatus === 'missing') {
    const planStatusInfo = getPlanStatusInfo();
    return <NoPlanAvailable planStatusInfo={planStatusInfo} todayData={todayData} />;
  }
  
  // Show error state
  if (planStatus === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-lg w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Error Loading Today's Plan
            </h2>
            <p className="text-muted-foreground mb-6">
              {error || 'Something went wrong while loading your plan.'}
            </p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render normal today view when plan exists
  return (
    <div className="min-h-screen bg-background">
      {/* Page header aligned with content */}
      <div className="border-b border-border/50 pr-[30vw] relative">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-foreground">Today</h1>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("en-US", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })} • {currentTimeString}
          </p>
        </div>
        
      </div>

      {/* Left Content Area - Independent Scrolling, leaves space for fixed calendar */}
      <div className="pr-[30vw]">
        <div className="min-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="max-w-none mx-auto p-6 space-y-12">
            {/* Session State Panel - State-driven co-pilot experience */}
            <SessionStatePanel 
              schedule={transformedSchedule}
              onSessionStateChange={setCurrentSessionState}
            />
            
            {/* Session Notes Review - Generous spacing */}
            <div className="relative">
              <SessionNoteReview 
                recentSessions={recentSessions}
                relatedSessions={relatedSessions}
                loading={sessionsLoading}
                error={sessionsError}
                onSessionClick={handleOpenSessionModal}
              />
              
            </div>
          </div>
        </div>
      </div>

      {/* Right Calendar Panel - Fixed Sticky Panel */}
      <div className="bg-background border-l border-border/50 flex flex-col h-screen fixed right-0 w-[30vw] top-0 z-10">
        <div className="px-6 pt-6 pb-2 flex-shrink-0" style={{ height: '80px' }}>
          {/* Header space - matches main header height */}
        </div>
        
        <div ref={calendarRef} className="flex-1 px-6 pb-6 overflow-hidden">
          <PlanTimeline 
            schedule={timelineSchedule}
            context="today"
            availableHeight={calendarHeight}
            currentTime={currentTime}
          />
        </div>
        
      </div>

      {/* Session management now integrated into SessionStatePanel */}
      
      
      
      {/* Session Log Modal */}
      <Dialog open={isSessionModalOpen} onOpenChange={handleCloseSessionModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              {selectedSession?.title || 'Session Log'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedSession && (
              <>
                {/* Session Metadata */}
                <div className="bg-muted/20 border border-border/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span><strong>Date:</strong> {selectedSession.date}</span>
                    <span><strong>Time:</strong> {selectedSession.timeRange}</span>
                    <span><strong>Duration:</strong> {selectedSession.duration}m</span>
                  </div>
                  {selectedSession.project && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Project:</strong> {selectedSession.project}
                    </div>
                  )}
                </div>
                
                {/* Session Content */}
                <div className="border border-border/30 rounded-lg p-6 bg-card/30 min-h-[400px]">
                  {selectedSession.sessionLogMarkdown ? (
                    <div className="prose prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedSession.sessionLogMarkdown}
                      </pre>
                    </div>
                  ) : selectedSession.executiveSummary ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Executive Summary</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedSession.executiveSummary}
                      </p>
                      {selectedSession.snippet && (
                        <>
                          <h3 className="text-lg font-semibold">Session Notes</h3>
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            {selectedSession.snippet}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-12">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No detailed session log available.</p>
                      {selectedSession.hasNotes === false && (
                        <p className="text-xs mt-2">This was a personal session without notes.</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}