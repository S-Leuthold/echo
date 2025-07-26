"use client";

import { useState, useEffect, useCallback } from 'react';

// Session state machine types
export type SessionState = 'TRANQUIL' | 'SPIN_UP' | 'ACTIVE' | 'SPIN_DOWN';

export interface Block {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
  timeCategory: string;
  startMinutes: number;
  endMinutes: number;
  emoji?: string;
  strategicNote?: string;
}

export interface SessionStateInfo {
  state: SessionState;
  currentBlock: Block | null;
  nextWorkBlock: Block | null;
  timeUntilTransition: number; // minutes until next state change
  debugInfo?: {
    currentMinutes: number;
    reason: string;
    blocks: Block[];
  };
}

// Configuration for state detection
const STATE_CONFIG = {
  SPIN_UP_LEAD_TIME: 10, // minutes before work block to enter spin-up
  WORK_CATEGORIES: ['DEEP_WORK', 'SHALLOW_WORK', 'ADMIN', 'MEETINGS', 'RESEARCH', 'PLANNING'],
  REST_CATEGORIES: ['PERSONAL', 'HEALTH', 'MEALS', 'TRANSIT', 'REST'],
  DEVELOPMENT_MODE: process.env.NODE_ENV === 'development'
};

/**
 * Core state detection engine
 * Production-grade algorithm for determining current session state
 */
const detectSessionState = (
  currentTime: Date, 
  schedule: Block[]
): SessionStateInfo => {
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  
  // Find current block (if any)
  const currentBlock = schedule.find(block => 
    currentMinutes >= block.startMinutes && currentMinutes < block.endMinutes
  );
  
  // Find next work block
  const nextWorkBlock = schedule
    .filter(block => 
      block.startMinutes > currentMinutes && 
      STATE_CONFIG.WORK_CATEGORIES.includes(block.timeCategory)
    )
    .sort((a, b) => a.startMinutes - b.startMinutes)[0] || null;
  
  // State detection logic
  let state: SessionState = 'TRANQUIL';
  let reason = 'Default state';
  let timeUntilTransition = Infinity;
  
  if (currentBlock) {
    if (STATE_CONFIG.REST_CATEGORIES.includes(currentBlock.timeCategory)) {
      state = 'TRANQUIL';
      reason = `In rest block: ${currentBlock.label}`;
      timeUntilTransition = currentBlock.endMinutes - currentMinutes;
    } else if (STATE_CONFIG.WORK_CATEGORIES.includes(currentBlock.timeCategory)) {
      // TODO: Check if session is active
      state = 'TRANQUIL'; // Will be ACTIVE in future phases
      reason = `In work block: ${currentBlock.label}`;
      timeUntilTransition = currentBlock.endMinutes - currentMinutes;
    }
  } else if (nextWorkBlock) {
    // Check if we're in spin-up window
    const minutesUntilWork = nextWorkBlock.startMinutes - currentMinutes;
    if (minutesUntilWork <= STATE_CONFIG.SPIN_UP_LEAD_TIME && minutesUntilWork > 0) {
      state = 'SPIN_UP';
      reason = `Spin-up for: ${nextWorkBlock.label}`;
      timeUntilTransition = minutesUntilWork;
    } else {
      state = 'TRANQUIL';
      reason = 'Between blocks';
      timeUntilTransition = Math.max(0, minutesUntilWork - STATE_CONFIG.SPIN_UP_LEAD_TIME);
    }
  } else {
    state = 'TRANQUIL';
    reason = 'No upcoming work blocks';
    timeUntilTransition = Infinity;
  }
  
  return {
    state,
    currentBlock,
    nextWorkBlock,
    timeUntilTransition,
    ...(STATE_CONFIG.DEVELOPMENT_MODE && {
      debugInfo: {
        currentMinutes,
        reason,
        blocks: schedule.slice(0, 3) // First 3 blocks for debugging
      }
    })
  };
};

/**
 * Session state management hook
 * Provides real-time state detection and transition management
 */
export const useSessionState = (schedule: Block[] = []) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionStateInfo, setSessionStateInfo] = useState<SessionStateInfo>(() =>
    detectSessionState(new Date(), schedule)
  );
  
  // Manual state override for development/testing
  const [manualStateOverride, setManualStateOverride] = useState<SessionState | null>(null);
  
  // Real-time clock updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for accurate transitions
    
    return () => clearInterval(timer);
  }, []);
  
  // State detection updates
  useEffect(() => {
    if (schedule.length > 0) {
      const newStateInfo = detectSessionState(currentTime, schedule);
      setSessionStateInfo(newStateInfo);
    }
  }, [currentTime, schedule]);
  
  // Development helpers
  const devOverrideState = useCallback((state: SessionState | null) => {
    if (STATE_CONFIG.DEVELOPMENT_MODE) {
      setManualStateOverride(state);
    }
  }, []);
  
  const getCurrentState = useCallback((): SessionState => {
    return manualStateOverride || sessionStateInfo.state;
  }, [manualStateOverride, sessionStateInfo.state]);
  
  // Transition helpers
  const transitionToSpinUp = useCallback(() => {
    // TODO: Implement manual spin-up transition
    console.log('Manual transition to spin-up state');
  }, []);
  
  const transitionToActive = useCallback((sessionData: any) => {
    console.log('Transitioning to active state', sessionData);
    setManualStateOverride('ACTIVE');
  }, []);
  
  const transitionToSpinDown = useCallback(() => {
    console.log('Transitioning to spin-down state');
    setManualStateOverride('SPIN_DOWN');
  }, []);
  
  const transitionToTranquil = useCallback(() => {
    console.log('Transitioning to tranquil state');
    setManualStateOverride('TRANQUIL');
  }, []);
  
  return {
    // Core state
    currentState: getCurrentState(),
    stateInfo: sessionStateInfo,
    currentTime,
    
    // State transitions (for manual control)
    transitionToSpinUp,
    transitionToActive,
    transitionToSpinDown,
    transitionToTranquil,
    
    // Development helpers
    ...(STATE_CONFIG.DEVELOPMENT_MODE && {
      devOverrideState,
      manualStateOverride,
      debugInfo: sessionStateInfo.debugInfo
    })
  };
};

/**
 * Utility functions for state detection
 */
export const isRestBlock = (block: Block): boolean => {
  return STATE_CONFIG.REST_CATEGORIES.includes(block.timeCategory);
};

export const isWorkBlock = (block: Block): boolean => {
  return STATE_CONFIG.WORK_CATEGORIES.includes(block.timeCategory);
};

export const formatTimeUntilTransition = (minutes: number): string => {
  if (minutes === Infinity) return 'No transition scheduled';
  if (minutes < 1) return 'Less than 1 minute';
  if (minutes < 60) return `${Math.floor(minutes)} minute${Math.floor(minutes) !== 1 ? 's' : ''}`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};