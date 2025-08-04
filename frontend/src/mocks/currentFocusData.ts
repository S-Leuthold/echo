/**
 * Mock Current Focus Data for Today Page
 * 
 * This file contains mock current focus data with intelligent state awareness.
 * Extracted from Today page component for better maintainability.
 */

import { getCurrentSessionState, type MockScheduleBlock } from './scheduleData';

export interface CurrentFocusSubtask {
  id: string;
  text: string;
  completed: boolean;
}

export interface CurrentFocusActive {
  id: string;
  startTime: string;
  endTime: string;
  emoji: string;
  label: string;
  type: 'active';
  progress: number;
  strategicNote: string;
  timeCategory: string;
  sessionGoal: string;
  subtasks: CurrentFocusSubtask[];
  userNotes: string;
}

export interface CurrentFocusBetween {
  id: string;
  type: 'between';
  completedSession: MockScheduleBlock;
  nextSession?: MockScheduleBlock;
  message: string;
  nextMessage: string;
  strategicNote: string;
  userNotes: string;
}

export interface CurrentFocusUpcoming {
  id: string;
  startTime: string;
  endTime: string;
  emoji: string;
  label: string;
  type: 'upcoming';
  progress: number;
  strategicNote: string;
  timeCategory: string;
  sessionGoal: string;
  subtasks: CurrentFocusSubtask[];
  userNotes: string;
}

export type CurrentFocus = CurrentFocusActive | CurrentFocusBetween | CurrentFocusUpcoming;

/**
 * Mock data for the current focus - with intelligent state awareness
 */
export const getSmartCurrentFocus = (): CurrentFocus => {
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

/**
 * Pre-computed mock current focus for immediate use
 */
export const mockCurrentFocus = getSmartCurrentFocus();