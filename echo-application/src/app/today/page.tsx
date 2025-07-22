"use client";

import { useState, useEffect } from "react";
import { usePlanStatus } from "@/contexts/PlanStatusContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Plus
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
    const response = await fetch('http://localhost:8000/today');
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
    console.log(`[User Action] ${action}:`, {
      timestamp: new Date().toISOString(),
      page: 'today',
      action,
      data
    });
    // Future: Send to analytics endpoint
  } catch (error) {
    console.error('Error logging user action:', error);
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
    timeCategory: mapBlockTypeToCategory(currentBlock.type),
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
    
    return {
      id: block.id,
      startTime: block.start_time,
      endTime: block.end_time,
      emoji: block.emoji || '📅',
      label: block.label,
      timeCategory: mapBlockTypeToCategory(block.type),
      isCurrent,
      progress,
      startMinutes,
      strategicNote: block.note || '',
      state
    };
  });
};

const parseTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

const mapBlockTypeToCategory = (blockType: string) => {
  // Map API block types to UI categories
  const typeMap: { [key: string]: string } = {
    'fixed': 'PERSONAL',
    'anchor': 'PERSONAL', 
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
  
  return typeMap[blockType.toLowerCase()] || 'DEEP_WORK';
};

// Session management API functions (hooks for future implementation)
const sessionAPI = {
  async startSession(blockId: string, sessionData: any) {
    try {
      await logUserAction('session_start', { blockId, sessionData });
      // TODO: Implement actual API call to POST /sessions/start
      console.log('Starting session for block:', blockId, sessionData);
      return { success: true, sessionId: `session_${Date.now()}` };
    } catch (error) {
      console.error('Error starting session:', error);
      throw error;
    }
  },

  async pauseSession(sessionId: string) {
    try {
      await logUserAction('session_pause', { sessionId });
      // TODO: Implement actual API call to POST /sessions/{id}/pause
      console.log('Pausing session:', sessionId);
      return { success: true };
    } catch (error) {
      console.error('Error pausing session:', error);
      throw error;
    }
  },

  async endSession(sessionId: string, sessionNotes?: string) {
    try {
      await logUserAction('session_end', { sessionId, hasNotes: !!sessionNotes });
      // TODO: Implement actual API call to POST /sessions/{id}/end
      console.log('Ending session:', sessionId, { notes: sessionNotes });
      return { success: true };
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  },

  async updateSessionNotes(sessionId: string, notes: string) {
    try {
      await logUserAction('session_notes_update', { sessionId, notesLength: notes.length });
      // TODO: Implement actual API call to PUT /sessions/{id}/notes
      console.log('Updating session notes:', sessionId, notes.length, 'characters');
      return { success: true };
    } catch (error) {
      console.error('Error updating session notes:', error);
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

// Mock data for session notes review
const mockRelatedSessions = [
  {
    id: "session-1",
    date: "2025-01-18",
    timeRange: "09:00 - 11:30",
    title: "API Foundation",
    emoji: "🚀",
    snippet: "Set up the core API structure with FastAPI. The authentication flow is working smoothly, but need to refactor the session management...",
    noteCount: 3,
    tasksCompleted: 2,
    totalTasks: 4,
    timeCategory: "DEEP_WORK"
  },
  {
    id: "session-2", 
    date: "2025-01-17",
    timeRange: "14:00 - 16:00",
    title: "UI Component Library",
    emoji: "🎨",
    snippet: "Built the foundation components with shadcn/ui. The color system needs more thought - purple feels too generic for what we're building...",
    noteCount: 5,
    tasksCompleted: 4,
    totalTasks: 5,
    timeCategory: "DEEP_WORK"
  },
  {
    id: "session-3",
    date: "2025-01-16",
    timeRange: "10:00 - 12:00", 
    title: "Planning & Architecture",
    emoji: "📋",
    snippet: "Sketched out the session-aware dashboard concept. The key insight: move from surface-level representation to true thinking tool...",
    noteCount: 8,
    tasksCompleted: 3,
    totalTasks: 3,
    timeCategory: "PLANNING"
  },
  {
    id: "session-4",
    date: "2025-01-15",
    timeRange: "16:00 - 17:30",
    title: "Research & Discovery",
    emoji: "🔍",
    snippet: "Analyzed competitor design patterns and user interface paradigms. Key insight: users need both capture and review modes for session notes...",
    noteCount: 6,
    tasksCompleted: 1,
    totalTasks: 2,
    timeCategory: "RESEARCH"
  }
];

const mockRecentSessions = [
  {
    id: "recent-1",
    date: "2025-01-18",
    timeRange: "15:30 - 16:00",
    title: "Team Standup",
    emoji: "🤝",
    snippet: "Sprint review went well. Need to follow up on the deployment pipeline discussion...",
    noteCount: 2,
    tasksCompleted: 1,
    totalTasks: 2,
    timeCategory: "MEETINGS"
  },
  {
    id: "recent-2",
    date: "2025-01-18",
    timeRange: "12:00 - 13:00",
    title: "Lunch & Walk",
    emoji: "🚶‍♂️",
    snippet: "Beautiful day. The walk helped clarify the session notes architecture - we need both capture and review modes...",
    noteCount: 1,
    tasksCompleted: 0,
    totalTasks: 0,
    timeCategory: "PERSONAL"
  },
  {
    id: "recent-3",
    date: "2025-01-17",
    timeRange: "18:00 - 19:00",
    title: "User Interface Patterns",
    emoji: "🔍",
    snippet: "Studied Fantastical's design language. Their use of color and typography creates such a warm, professional feel...",
    noteCount: 4,
    tasksCompleted: 2,
    totalTasks: 3,
    timeCategory: "RESEARCH"
  },
  {
    id: "recent-4",
    date: "2025-01-17",
    timeRange: "07:00 - 07:30",
    title: "Morning Workout",
    emoji: "💪",
    snippet: "Good energy session. The consistency is paying off - feeling more focused during deep work blocks...",
    noteCount: 1,
    tasksCompleted: 1,
    totalTasks: 1,
    timeCategory: "HEALTH"
  },
  {
    id: "recent-5",
    date: "2025-01-16", 
    timeRange: "20:00 - 21:00",
    title: "Evening Reflection",
    emoji: "🌅",
    snippet: "Productive day overall. The new planning approach is working. Tomorrow: focus on the session review interface...",
    noteCount: 2,
    tasksCompleted: 0,
    totalTasks: 0,
    timeCategory: "PERSONAL"
  }
];

// No Plan Available Component  
function NoPlanAvailable({ planStatusInfo, todayData }: { planStatusInfo: PlanStatusInfo; todayData?: any }) {
  const [isNavigating, setIsNavigating] = useState(false);
  
  const handlePlanNavigation = async () => {
    setIsNavigating(true);
    await logUserAction('navigate_to_planning', { 
      reason: 'no_plan_available',
      recommendation: planStatusInfo.actionText
    });
    
    // Navigate to planning page
    window.location.href = '/planning';
  };
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-lg w-full mx-4">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No Plan for Today
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {planStatusInfo.message}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handlePlanNavigation}
              disabled={isNavigating}
              className="w-full"
            >
              {isNavigating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {planStatusInfo.actionText}
                </>
              )}
            </Button>
            
            {planStatusInfo.canPlanToday && (
              <Button 
                variant="outline" 
                onClick={() => {
                  logUserAction('navigate_to_planning', { 
                    reason: 'no_plan_available',
                    recommendation: 'Plan Tomorrow'
                  });
                  window.location.href = '/planning';
                }}
                className="w-full"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Plan Tomorrow Instead
              </Button>
            )}
            
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Planning helps you stay focused and productive throughout your day.
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

function SessionNoteReview() {
  return (
    <div className="space-y-8">
      {/* Related Sessions - Database View */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-deep-work" />
              Related Sessions
            </h3>
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              Full Project Log
            </Button>
          </div>
          
          {/* Database Table Header */}
          <div className="mb-3">
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Session</div>
              <div className="col-span-5">Note Preview</div>
              <div className="col-span-1">Category</div>
              <div className="col-span-1">Tasks</div>
            </div>
          </div>
          
          {/* Database Table Rows */}
          <div className="space-y-1">
            {mockRelatedSessions.map((session) => (
              <div 
                key={session.id}
                className="grid grid-cols-12 gap-4 px-3 py-3 rounded-md hover:bg-card/50 transition-all cursor-pointer group text-sm"
              >
                {/* Date Column */}
                <div className="col-span-2 text-muted-foreground">
                  {new Date(session.date).toLocaleDateString("en-US", { 
                    month: "short", 
                    day: "numeric" 
                  })}
                </div>
                
                {/* Session Title Column (with emoji) */}
                <div className="col-span-3 flex items-center gap-2">
                  <span className="text-base">{session.emoji}</span>
                  <span className="text-foreground font-medium group-hover:text-deep-work transition-colors truncate">
                    {session.title}
                  </span>
                </div>
                
                {/* Note Preview Column */}
                <div className="col-span-5 text-muted-foreground leading-relaxed truncate">
                  {session.snippet}
                </div>
                
                {/* Category Column */}
                <div className="col-span-1 flex items-center">
                  <Badge className={`text-xs px-2 py-0.5 border ${getCategoryColor(session.timeCategory)}`}>
                    {session.timeCategory.replace('_', ' ').toLowerCase()}
                  </Badge>
                </div>
                
                {/* Tasks Column */}
                <div className="col-span-1 text-muted-foreground text-center">
                  {session.totalTasks > 0 ? `${session.tasksCompleted}/${session.totalTasks}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Sessions - Database View */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Recent Sessions
          </h3>
          
          {/* Database Table Header */}
          <div className="mb-3">
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Session</div>
              <div className="col-span-5">Note Preview</div>
              <div className="col-span-1">Category</div>
              <div className="col-span-1">Tasks</div>
            </div>
          </div>
          
          {/* Database Table Rows */}
          <div className="space-y-1">
            {mockRecentSessions.map((session) => (
              <div 
                key={session.id}
                className="grid grid-cols-12 gap-4 px-3 py-2 rounded-md hover:bg-card/30 transition-all cursor-pointer group text-sm"
              >
                {/* Date Column */}
                <div className="col-span-2 text-muted-foreground">
                  {new Date(session.date).toLocaleDateString("en-US", { 
                    month: "short", 
                    day: "numeric" 
                  })}
                </div>
                
                {/* Session Title Column (with emoji) */}
                <div className="col-span-3 flex items-center gap-2">
                  <span className="text-base">{session.emoji}</span>
                  <span className="text-foreground font-medium group-hover:text-accent transition-colors truncate">
                    {session.title}
                  </span>
                </div>
                
                {/* Note Preview Column */}
                <div className="col-span-5 text-muted-foreground leading-relaxed truncate">
                  {session.snippet}
                </div>
                
                {/* Category Column */}
                <div className="col-span-1 flex items-center">
                  <Badge className={`text-xs px-2 py-0.5 border ${getCategoryColor(session.timeCategory)}`}>
                    {session.timeCategory.replace('_', ' ').toLowerCase()}
                  </Badge>
                </div>
                
                {/* Tasks Column */}
                <div className="col-span-1 text-muted-foreground text-center">
                  {session.totalTasks > 0 ? `${session.tasksCompleted}/${session.totalTasks}` : "—"}
                </div>
              </div>
            ))}
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
                    size="sm" 
                    className="bg-destructive hover:bg-destructive/90 font-medium"
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

function TimelineSchedule({ schedule }: { schedule: typeof mockSchedule }) {
  const currentTime = new Date();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  // Calculate timeline bounds
  const minTime = Math.min(...schedule.map(block => block.startMinutes)) - 30;
  const maxTime = Math.max(...schedule.map(block => block.startMinutes)) + 120;
  const timelineHeight = 600; // Fixed height for timeline
  
  const getTopPosition = (minutes: number) => {
    return ((minutes - minTime) / (maxTime - minTime)) * timelineHeight;
  };

  const getBlockStyle = (block: typeof schedule[0]) => {
    // TimeCategory Color System: Personal & Intuitive
    let borderColor = "border-muted-foreground/30"; // default
    let backgroundStyle = "bg-card/50"; // default upcoming
    let shadowStyle = "";
    
    // Map TimeCategory to colors - the new visual language
    const categoryKey = block.timeCategory?.toLowerCase().replace('_', '-') || 'default';
    
    switch (block.timeCategory) {
      case "DEEP_WORK":
        borderColor = "border-deep-work";
        if (block.state === "active") {
          backgroundStyle = "bg-deep-work-active/20";
          shadowStyle = "shadow-lg shadow-deep-work-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-deep-work-completed/30";
        }
        break;
        
      case "SHALLOW_WORK":
        borderColor = "border-shallow-work";
        if (block.state === "active") {
          backgroundStyle = "bg-shallow-work-active/20";
          shadowStyle = "shadow-lg shadow-shallow-work-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-shallow-work-completed/30";
        }
        break;
        
      case "MEETINGS":
        borderColor = "border-meetings";
        if (block.state === "active") {
          backgroundStyle = "bg-meetings-active/20";
          shadowStyle = "shadow-lg shadow-meetings-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-meetings-completed/30";
        }
        break;
        
      case "PERSONAL":
        borderColor = "border-personal";
        if (block.state === "active") {
          backgroundStyle = "bg-personal-active/20";
          shadowStyle = "shadow-lg shadow-personal-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-personal-completed/30";
        }
        break;
        
      case "HEALTH":
        borderColor = "border-health";
        if (block.state === "active") {
          backgroundStyle = "bg-health-active/20";
          shadowStyle = "shadow-lg shadow-health-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-health-completed/30";
        }
        break;
        
      case "MEALS":
        borderColor = "border-meals";
        if (block.state === "active") {
          backgroundStyle = "bg-meals-active/20";
          shadowStyle = "shadow-lg shadow-meals-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-meals-completed/30";
        }
        break;
        
      case "TRANSIT":
        borderColor = "border-transit";
        if (block.state === "active") {
          backgroundStyle = "bg-transit-active/20";
          shadowStyle = "shadow-lg shadow-transit-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-transit-completed/30";
        }
        break;
        
      case "PLANNING":
        borderColor = "border-planning";
        if (block.state === "active") {
          backgroundStyle = "bg-planning-active/20";
          shadowStyle = "shadow-lg shadow-planning-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-planning-completed/30";
        }
        break;
        
      case "RESEARCH":
        borderColor = "border-research";
        if (block.state === "active") {
          backgroundStyle = "bg-research-active/20";
          shadowStyle = "shadow-lg shadow-research-active/20";
        } else if (block.state === "completed") {
          backgroundStyle = "bg-research-completed/30";
        }
        break;
    }
    
    return `${borderColor} ${backgroundStyle} ${shadowStyle}`;
  };

  return (
    <div className="relative">
      <h2 className="text-lg font-semibold text-foreground mb-6">Today's Schedule</h2>
      
      <div className="relative" style={{ height: timelineHeight }}>
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        
        {/* Current time indicator */}
        {currentMinutes >= minTime && currentMinutes <= maxTime && (
          <div 
            className="absolute left-0 right-0 flex items-center z-10"
            style={{ top: getTopPosition(currentMinutes) }}
          >
            <div className="w-2 h-2 bg-accent rounded-full" />
            <div className="flex-1 h-0.5 bg-accent ml-2" />
            <div className="text-xs text-accent font-mono ml-2">
              {currentTime.toLocaleTimeString("en-US", { 
                hour12: false, 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </div>
          </div>
        )}
        
        {/* Schedule blocks */}
        {schedule.map((block, index) => (
          <div
            key={block.id}
            className={`absolute left-8 right-0 p-3 rounded-lg border-2 transition-all hover:bg-accent/5 ${getBlockStyle(block)}`}
            style={{ 
              top: getTopPosition(block.startMinutes),
              minHeight: '60px'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {/* Simplified Title with Emoji - emojis do the heavy lifting */}
                <div className={`font-medium text-sm flex items-center gap-2 ${
                  block.state === "active" ? "text-accent font-semibold" : "text-foreground"
                }`}>
                  <span className="text-lg">{block.emoji}</span>
                  {block.label}
                  
                  {/* Strategic Note Info Icon - only when needed */}
                  {block.strategicNote && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground hover:text-accent cursor-help flex-shrink-0 transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <p className="text-xs italic">"{block.strategicNote}"</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {block.startTime} - {block.endTime}
                </div>
              </div>
              
              {/* Minimal state indicators - color and icons do the work */}
              <div className="flex items-center">
                {block.state === "completed" && (
                  <CheckCircle2 className={`w-4 h-4 ${
                    block.timeCategory === "DEEP_WORK" ? "text-deep-work" :
                    block.timeCategory === "HEALTH" ? "text-health" :
                    block.timeCategory === "PERSONAL" ? "text-personal" :
                    block.timeCategory === "MEETINGS" ? "text-meetings" :
                    block.timeCategory === "SHALLOW_WORK" ? "text-shallow-work" :
                    block.timeCategory === "MEALS" ? "text-meals" :
                    block.timeCategory === "TRANSIT" ? "text-transit" :
                    block.timeCategory === "PLANNING" ? "text-planning" :
                    block.timeCategory === "RESEARCH" ? "text-research" :
                    "text-muted-foreground"
                  }`} />
                )}
                {block.state === "active" && (
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                )}
                {/* Removed redundant progress percentages */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TodayPage() {
  // Use shared plan status context instead of local state
  const { planStatus, todayData, error, isLoading } = usePlanStatus();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    
    return () => clearInterval(timer);
  }, []);
  
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
      {/* Subtle page header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
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
      </div>

      {/* New Focus Pane Layout: 70% Focus + 30% Context */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-8 mb-8">
          {/* Focus Area (70%) */}
          <div className="w-[70%]">
            <CurrentFocusComponent 
              focus={todayData ? transformTodayDataToFocus(todayData, currentTime) : mockCurrentFocus} 
            />
          </div>

          {/* Context Area (30%) */}
          <div className="w-[30%]">
            <Card className="h-full">
              <CardContent className="p-6">
                <TimelineSchedule 
                  schedule={todayData ? transformTodayDataToSchedule(todayData, currentTime) : mockSchedule} 
                />
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Session Notes Review - Full Width */}
        <SessionNoteReview />
      </div>
    </div>
  );
}