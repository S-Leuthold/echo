"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export type PlanningMode = 'tomorrow' | 'today';
export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';
export type PlanningModeSource = 'url_param' | 'time_suggestion' | 'user_choice' | 'default';

interface TimeContext {
  current_time_24h: string;
  current_hour: number;
  current_minute: number;
  time_period: TimePeriod;
  has_existing_plan: boolean;
  remaining_day_hours: number;
  planning_mode_suggestion: string;
  schedulable_start_time: string;
  is_workday: boolean;
  weekday_name: string;
}

interface PlanningContextType {
  // Planning mode state
  planningMode: PlanningMode;
  setPlanningMode: (mode: PlanningMode, source?: PlanningModeSource) => void;
  planningModeSource: PlanningModeSource;
  
  // Time context
  timeContext: TimeContext | null;
  refreshTimeContext: () => Promise<void>;
  
  // Copy helpers
  getDynamicCopy: (baseText: string, todayText?: string) => string;
  getTimeAwareCopy: (templates: TimeAwareCopyTemplates) => string;
  
  // Planning state
  canPlanToday: boolean;
  shouldSuggestSameDay: boolean;
  isLoadingTimeContext: boolean;
  
  // Utility functions
  getCurrentTime: () => string;
  getRemainingDayText: () => string;
  getTimePeriodGreeting: () => string;
}

interface TimeAwareCopyTemplates {
  morning?: string;
  afternoon?: string;
  evening?: string;
  night?: string;
  default: string;
}

// Create the context
const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

// Provider component
interface PlanningProviderProps {
  children: ReactNode;
  initialMode?: PlanningMode;
  initialSource?: PlanningModeSource;
}

export function PlanningProvider({ 
  children, 
  initialMode = 'tomorrow',
  initialSource = 'default'
}: PlanningProviderProps) {
  // Initialize with a smarter default based on current time to prevent flicker
  const getSmartInitialMode = (): PlanningMode => {
    if (initialMode !== 'tomorrow') return initialMode;
    
    // Quick time-based heuristic to prevent flicker
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      return 'today'; // Likely same-day planning during daytime
    }
    return 'tomorrow'; // Evening/night - likely tomorrow planning
  };

  const [planningMode, setPlanningModeState] = useState<PlanningMode>(getSmartInitialMode());
  const [planningModeSource, setPlanningModeSource] = useState<PlanningModeSource>(initialSource);
  const [timeContext, setTimeContext] = useState<TimeContext | null>(null);
  const [isLoadingTimeContext, setIsLoadingTimeContext] = useState(false);

  // Fetch time context from API
  const fetchTimeContext = async (): Promise<TimeContext | null> => {
    try {
      const response = await fetch('http://localhost:8000/today');
      if (response.ok) {
        const data = await response.json();
        return data.time_context || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching time context:', error);
      return null;
    }
  };

  // Refresh time context
  const refreshTimeContext = async () => {
    if (isLoadingTimeContext) return;
    
    setIsLoadingTimeContext(true);
    try {
      const context = await fetchTimeContext();
      setTimeContext(context);
      
      // Auto-suggest planning mode based on time context, but only if it won't cause flicker
      if (context && planningModeSource === 'default') {
        const suggestion = context.planning_mode_suggestion;
        const currentHour = new Date().getHours();
        
        // Only change mode if the smart initial guess was likely wrong
        if (suggestion === 'same_day_planning' && !context.has_existing_plan) {
          // Only switch to today if we're in the daytime and current mode is tomorrow
          if (currentHour >= 6 && currentHour < 18 && planningMode === 'tomorrow') {
            setPlanningModeState('today');
            setPlanningModeSource('time_suggestion');
          }
        } else if (suggestion === 'next_day_planning') {
          // Only switch to tomorrow if we're in the evening and current mode is today
          if (currentHour >= 18 && planningMode === 'today') {
            setPlanningModeState('tomorrow');
            setPlanningModeSource('time_suggestion');
          }
        }
      }
    } finally {
      setIsLoadingTimeContext(false);
    }
  };

  // Set planning mode with source tracking
  const setPlanningMode = (mode: PlanningMode, source: PlanningModeSource = 'user_choice') => {
    setPlanningModeState(mode);
    setPlanningModeSource(source);
    
    // Log the mode change for analytics
    console.log(`[PlanningContext] Mode changed to ${mode} (source: ${source})`);
  };

  // Dynamic copy helper - replaces "tomorrow" with "today" when in same-day mode
  const getDynamicCopy = (baseText: string, todayText?: string): string => {
    if (planningMode === 'today') {
      if (todayText) {
        return todayText;
      }
      // Simple text replacement for common patterns
      return baseText
        .replace(/tomorrow/gi, 'today')
        .replace(/Tomorrow/g, 'Today')
        .replace(/TOMORROW/g, 'TODAY')
        .replace(/next day/gi, 'remaining day')
        .replace(/Next day/g, 'Remaining day');
    }
    return baseText;
  };

  // Time-aware copy based on current time period
  const getTimeAwareCopy = (templates: TimeAwareCopyTemplates): string => {
    if (!timeContext) return templates.default;
    
    const period = timeContext.time_period;
    return templates[period] || templates.default;
  };

  // Computed properties
  const canPlanToday = timeContext ? timeContext.remaining_day_hours > 2 : false;
  const shouldSuggestSameDay = timeContext ? 
    timeContext.planning_mode_suggestion === 'same_day_planning' && !timeContext.has_existing_plan : 
    false;

  // Utility functions
  const getCurrentTime = (): string => {
    return timeContext?.current_time_24h || new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getRemainingDayText = (): string => {
    if (!timeContext) return '';
    
    const hours = timeContext.remaining_day_hours;
    if (hours <= 0) return 'The day is nearly over';
    if (hours === 1) return '1 hour remaining';
    if (hours < 4) return `${hours} hours remaining`;
    return `${hours} hours remaining in your day`;
  };

  const getTimePeriodGreeting = (): string => {
    if (!timeContext) return 'Hello';
    
    switch (timeContext.time_period) {
      case 'morning':
        return 'Good morning';
      case 'afternoon':
        return 'Good afternoon';
      case 'evening':
        return 'Good evening';
      case 'night':
        return 'Working late?';
      default:
        return 'Hello';
    }
  };

  // Initialize time context on mount
  useEffect(() => {
    refreshTimeContext();
  }, []);

  // Handle URL parameter changes for planning mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const modeParam = urlParams.get('mode');
      
      if (modeParam === 'today' || modeParam === 'tomorrow') {
        setPlanningMode(modeParam as PlanningMode, 'url_param');
      }
    }
  }, []);

  const contextValue: PlanningContextType = {
    // Planning mode state
    planningMode,
    setPlanningMode,
    planningModeSource,
    
    // Time context
    timeContext,
    refreshTimeContext,
    
    // Copy helpers
    getDynamicCopy,
    getTimeAwareCopy,
    
    // Planning state
    canPlanToday,
    shouldSuggestSameDay,
    isLoadingTimeContext,
    
    // Utility functions
    getCurrentTime,
    getRemainingDayText,
    getTimePeriodGreeting,
  };

  return (
    <PlanningContext.Provider value={contextValue}>
      {children}
    </PlanningContext.Provider>
  );
}

// Custom hook to use the context
export function usePlanning() {
  const context = useContext(PlanningContext);
  if (context === undefined) {
    throw new Error('usePlanning must be used within a PlanningProvider');
  }
  return context;
}

// Hook for just dynamic copy (lighter alternative)
export function useDynamicCopy() {
  const { getDynamicCopy, getTimeAwareCopy, planningMode } = usePlanning();
  return { getDynamicCopy, getTimeAwareCopy, planningMode };
}

// Hook for time context
export function useTimeContext() {
  const { timeContext, refreshTimeContext, isLoadingTimeContext } = usePlanning();
  return { timeContext, refreshTimeContext, isLoadingTimeContext };
}