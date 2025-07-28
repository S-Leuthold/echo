/**
 * Mock Schedule Data for Today Page
 * 
 * This file contains mock schedule blocks for development and testing.
 * Extracted from Today page component for better maintainability.
 */

export interface MockScheduleBlock {
  id: string;
  startTime: string;
  endTime: string;
  emoji: string;
  label: string;
  timeCategory: string;
  isCurrent: boolean;
  progress: number;
  startMinutes: number;
  strategicNote: string;
  state: 'completed' | 'active' | 'upcoming';
}

export const mockSchedule: MockScheduleBlock[] = [
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

/**
 * Session State Detection Types
 */
export interface SessionState {
  type: 'active' | 'between' | 'upcoming';
  session?: MockScheduleBlock;
  completedSession?: MockScheduleBlock;
  nextSession?: MockScheduleBlock;
}

/**
 * Intelligent session state detection based on current time
 */
export const getCurrentSessionState = (): SessionState => {
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