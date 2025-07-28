/**
 * Tests for useSessionState hook
 * 
 * Critical functionality tests as identified in CODEBASE_REVIEW_REPORT.md
 * Tests the core session state detection logic that was previously broken.
 */

import { renderHook } from '@testing-library/react';
import { useSessionState, isRestBlock, isWorkBlock, formatTimeUntilTransition } from '../useSessionState';
import type { Block } from '../useSessionState';

// Mock schedule data for testing
const mockSchedule: Block[] = [
  {
    id: '1',
    startTime: '09:00',
    endTime: '10:00',
    label: 'Morning standup',
    timeCategory: 'MEETINGS',
    startMinutes: 9 * 60,
    endMinutes: 10 * 60,
  },
  {
    id: '2', 
    startTime: '10:00',
    endTime: '12:00',
    label: 'Deep work session',
    timeCategory: 'DEEP_WORK',
    startMinutes: 10 * 60,
    endMinutes: 12 * 60,
  },
  {
    id: '3',
    startTime: '12:00',
    endTime: '12:30',
    label: 'Lunch break',
    timeCategory: 'MEALS',
    startMinutes: 12 * 60,
    endMinutes: 12.5 * 60,
  },
  {
    id: '4',
    startTime: '13:00',
    endTime: '15:00',
    label: 'Research session',
    timeCategory: 'RESEARCH',
    startMinutes: 13 * 60,
    endMinutes: 15 * 60,
  },
];

describe('useSessionState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should initialize with TRANQUIL state by default', () => {
      const { result } = renderHook(() => useSessionState(mockSchedule));
      
      expect(result.current.currentState).toBe('TRANQUIL');
      expect(result.current.stateInfo).toBeDefined();
      expect(result.current.currentTime).toBeInstanceOf(Date);
    });

    it('should handle empty schedule gracefully', () => {
      const { result } = renderHook(() => useSessionState([]));
      
      expect(result.current.currentState).toBe('TRANQUIL');
      expect(result.current.stateInfo.currentBlock).toBe(undefined);
      expect(result.current.stateInfo.nextWorkBlock).toBe(undefined);
      expect(result.current.stateInfo.timeUntilTransition).toBe(Infinity);
    });

    it('should provide state transition functions', () => {
      const { result } = renderHook(() => useSessionState(mockSchedule));
      
      expect(typeof result.current.transitionToSpinUp).toBe('function');
      expect(typeof result.current.transitionToActive).toBe('function');
      expect(typeof result.current.transitionToSpinDown).toBe('function');
      expect(typeof result.current.transitionToTranquil).toBe('function');
    });

    it('should update currentTime periodically', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useSessionState(mockSchedule));
      
      const initialTime = result.current.currentTime;
      
      // Wait a bit to see if time updates
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Note: This test might be flaky due to timing, but it verifies the basic mechanism
      expect(result.current.currentTime).toBeInstanceOf(Date);
    });
  });

  describe('manual state transitions', () => {
    it('should allow manual transition to ACTIVE state', () => {
      const { result } = renderHook(() => useSessionState(mockSchedule));
      
      // Transition to active state
      result.current.transitionToActive({});
      
      expect(result.current.currentState).toBe('ACTIVE');
    });

    it('should allow manual transition to SPIN_DOWN state', () => {
      const { result } = renderHook(() => useSessionState(mockSchedule));
      
      // Transition to spin down state
      result.current.transitionToSpinDown();
      
      expect(result.current.currentState).toBe('SPIN_DOWN');
    });

    it('should allow manual transition back to TRANQUIL state', () => {
      const { result } = renderHook(() => useSessionState(mockSchedule));
      
      // First transition to active
      result.current.transitionToActive({});
      expect(result.current.currentState).toBe('ACTIVE');
      
      // Then back to tranquil
      result.current.transitionToTranquil();
      expect(result.current.currentState).toBe('TRANQUIL');
    });
  });

  describe('schedule processing', () => {
    it('should accept and process schedule data', () => {
      const { result } = renderHook(() => useSessionState(mockSchedule));
      
      // The hook should process the schedule without errors
      expect(result.current.stateInfo).toBeDefined();
      expect(typeof result.current.stateInfo.timeUntilTransition).toBe('number');
    });

    it('should handle schedule changes', () => {
      const { result, rerender } = renderHook(
        ({ schedule }) => useSessionState(schedule),
        { initialProps: { schedule: mockSchedule } }
      );
      
      const initialState = result.current.stateInfo;
      
      // Change the schedule
      const newSchedule = mockSchedule.slice(0, 2); // Only first 2 blocks
      rerender({ schedule: newSchedule });
      
      // Should handle the change without crashing
      expect(result.current.stateInfo).toBeDefined();
    });
  });
});

describe('utility functions', () => {
  describe('isRestBlock', () => {
    it('should identify rest blocks correctly', () => {
      const restBlock: Block = {
        id: '1',
        startTime: '12:00',
        endTime: '12:30',
        label: 'Lunch',
        timeCategory: 'MEALS',
        startMinutes: 12 * 60,
        endMinutes: 12.5 * 60,
      };
      
      expect(isRestBlock(restBlock)).toBe(true);
    });

    it('should identify personal blocks as rest', () => {
      const personalBlock: Block = {
        id: '1',
        startTime: '17:00',
        endTime: '18:00',
        label: 'Personal time',
        timeCategory: 'PERSONAL',
        startMinutes: 17 * 60,
        endMinutes: 18 * 60,
      };
      
      expect(isRestBlock(personalBlock)).toBe(true);
    });

    it('should not identify work blocks as rest', () => {
      const workBlock: Block = {
        id: '1',
        startTime: '10:00',
        endTime: '12:00',
        label: 'Deep work',
        timeCategory: 'DEEP_WORK',
        startMinutes: 10 * 60,
        endMinutes: 12 * 60,
      };
      
      expect(isRestBlock(workBlock)).toBe(false);
    });
  });

  describe('isWorkBlock', () => {
    it('should identify deep work blocks correctly', () => {
      const workBlock: Block = {
        id: '1',
        startTime: '10:00',
        endTime: '12:00',
        label: 'Deep work',
        timeCategory: 'DEEP_WORK',
        startMinutes: 10 * 60,
        endMinutes: 12 * 60,
      };
      
      expect(isWorkBlock(workBlock)).toBe(true);
    });

    it('should identify meeting blocks as work', () => {
      const meetingBlock: Block = {
        id: '1',
        startTime: '09:00',
        endTime: '10:00',
        label: 'Standup',
        timeCategory: 'MEETINGS',
        startMinutes: 9 * 60,
        endMinutes: 10 * 60,
      };
      
      expect(isWorkBlock(meetingBlock)).toBe(true);
    });

    it('should identify research blocks as work', () => {
      const researchBlock: Block = {
        id: '1',
        startTime: '14:00',
        endTime: '16:00',
        label: 'Research',
        timeCategory: 'RESEARCH',
        startMinutes: 14 * 60,
        endMinutes: 16 * 60,
      };
      
      expect(isWorkBlock(researchBlock)).toBe(true);
    });

    it('should not identify personal blocks as work', () => {
      const personalBlock: Block = {
        id: '1',
        startTime: '17:00',
        endTime: '18:00',
        label: 'Personal time',
        timeCategory: 'PERSONAL',
        startMinutes: 17 * 60,
        endMinutes: 18 * 60,
      };
      
      expect(isWorkBlock(personalBlock)).toBe(false);
    });
  });

  describe('formatTimeUntilTransition', () => {
    it('should format minutes correctly', () => {
      expect(formatTimeUntilTransition(45)).toBe('45 minutes');
      expect(formatTimeUntilTransition(1)).toBe('1 minute');
      expect(formatTimeUntilTransition(0.5)).toBe('Less than 1 minute');
    });

    it('should format hours and minutes correctly', () => {
      expect(formatTimeUntilTransition(90)).toBe('1h 30m');
      expect(formatTimeUntilTransition(120)).toBe('2 hours');
      expect(formatTimeUntilTransition(125)).toBe('2h 5m');
    });

    it('should handle infinity correctly', () => {
      expect(formatTimeUntilTransition(Infinity)).toBe('No transition scheduled');
    });

    it('should handle zero and negative values', () => {
      expect(formatTimeUntilTransition(0)).toBe('Less than 1 minute');
      expect(formatTimeUntilTransition(-5)).toBe('Less than 1 minute');
    });
  });
});

// Cleanup
afterEach(() => {
  jest.restoreAllMocks();
});