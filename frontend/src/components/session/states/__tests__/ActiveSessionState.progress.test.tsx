/**
 * ActiveSessionState Progress Tracking Tests
 * 
 * Tests the Phase 3.2 implementation of session progress tracking and auto-save.
 * Validates auto-save functionality, localStorage persistence, and progress indicators.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ActiveSessionState } from '../ActiveSessionState';
import { Block } from '@/hooks/useSessionState';

// Mock the session API hook
jest.mock('@/hooks/useSessionApi', () => ({
  useSessionStart: jest.fn()
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock error boundary
jest.mock('@/components/session/SessionErrorBoundary', () => ({
  SessionErrorBoundary: ({ children }: any) => children,
  ScaffoldErrorFallback: () => <div data-testid="scaffold-error">Error</div>
}));

import { useSessionStart } from '@/hooks/useSessionApi';

const mockUseSessionStart = useSessionStart as jest.MockedFunction<typeof useSessionStart>;

// Test data
const mockSessionData = {
  blockId: 'test-session-1',
  aiInsights: {
    momentum_context: 'Test context',
    suggested_tasks: ['Task 1', 'Task 2'],
    estimated_complexity: 'medium',
    confidence: 0.8,
    preparation_items: ['Prep 1'],
    success_criteria: ['Success 1']
  },
  userGoal: 'Complete the test session',
  userTasks: ['• Task 1', '• Task 2', '• Task 3'],
  startTime: new Date('2025-01-25T10:00:00Z'),
  nextWorkBlock: {
    id: 'test-block-1',
    startTime: '10:00',
    endTime: '12:00',
    label: 'Test Session',
    timeCategory: 'DEEP_WORK',
    startMinutes: 600,
    endMinutes: 720
  } as Block
};

describe('ActiveSessionState Progress Tracking', () => {
  const mockOnEndSession = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    jest.useFakeTimers();
    
    // Mock useSessionStart hook
    mockUseSessionStart.mockReturnValue({
      startSession: jest.fn(),
      sessionData: null,
      loading: false,
      error: null,
      isStarting: false,
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      data: null,
      lastUpdated: null,
      reset: jest.fn()
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Auto-save functionality', () => {
    it('should auto-save session notes after debounce delay', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      
      // Type in session notes
      fireEvent.change(textarea, { target: { value: 'Test session notes' } });

      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Should save to localStorage
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'notes-test-session-1',
          'Test session notes'
        );
      });
    });

    it('should auto-save checklist progress when items are toggled', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Find and click the first checklist item
      const firstCheckbox = screen.getAllByRole('button')[0]; // First clickable area
      fireEvent.click(firstCheckbox);

      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Should save checklist to localStorage
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'checklist-test-session-1',
          expect.stringContaining('"completed":true')
        );
      });
    });

    it('should not trigger auto-save if data has not changed', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      
      // Type same content twice
      fireEvent.change(textarea, { target: { value: 'Same content' } });
      act(() => { jest.advanceTimersByTime(2100); });
      
      // Clear the mock calls
      localStorageMock.setItem.mockClear();
      
      // Type same content again
      fireEvent.change(textarea, { target: { value: 'Same content' } });
      act(() => { jest.advanceTimersByTime(2100); });

      // Should not save again since content hasn't changed
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Session state persistence', () => {
    it('should restore session notes from localStorage on mount', () => {
      // Pre-populate localStorage
      localStorageMock.setItem('notes-test-session-1', 'Restored notes');

      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      expect(textarea).toHaveValue('Restored notes');
    });

    it('should restore checklist state from localStorage on mount', () => {
      // Pre-populate localStorage with checklist where first item is completed
      const savedChecklist = [
        { id: 'task-1', task: 'Task 1', completed: true, category: 'user', priority: 'medium' },
        { id: 'task-2', task: 'Task 2', completed: false, category: 'user', priority: 'medium' }
      ];
      localStorageMock.setItem('checklist-test-session-1', JSON.stringify(savedChecklist));

      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // First item should be completed (checkmark icon visible)
      const completedItems = screen.getAllByTestId(/checkmark|completed/);
      expect(completedItems.length).toBeGreaterThan(0);
    });

    it('should show progress percentage in checklist header', () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Should show initial progress (0/3 complete)
      expect(screen.getByText(/0\/3 complete \(0%\)/)).toBeInTheDocument();
    });
  });

  describe('Auto-save status indicators', () => {
    it('should show saving indicator while auto-save is in progress', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'Test content' } });

      // Fast-forward past debounce but not past save completion
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Should show saving status
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('should show saved timestamp after successful save', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'Test content' } });

      // Fast-forward past debounce and save completion
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should show saved timestamp
      await waitFor(() => {
        expect(screen.getByText(/Saved \d+s ago/)).toBeInTheDocument();
      });
    });
  });

  describe('Session completion', () => {
    it('should clear localStorage when session ends', async () => {
      // Pre-populate localStorage
      localStorageMock.setItem('notes-test-session-1', 'Test notes');
      localStorageMock.setItem('checklist-test-session-1', '[]');
      localStorageMock.setItem('session-test-session-1', '{}');

      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // End the session
      const endButton = screen.getByText('End Session');
      fireEvent.click(endButton);

      // Fast-forward past completion delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should clear localStorage
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('notes-test-session-1');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('checklist-test-session-1');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('session-test-session-1');
      });
    });

    it('should perform final save before ending session', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Add some session notes
      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'Final notes' } });

      // End the session immediately (before auto-save)
      const endButton = screen.getByText('End Session');
      fireEvent.click(endButton);

      // Should perform final save
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'notes-test-session-1',
          'Final notes'
        );
      });
    });
  });

  describe('Immediate save on blur', () => {
    it('should save immediately when textarea loses focus', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      
      // Type content and blur (without waiting for debounce)
      fireEvent.change(textarea, { target: { value: 'Immediate save test' } });
      fireEvent.blur(textarea);

      // Should save immediately without debounce delay
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'notes-test-session-1',
          'Immediate save test'
        );
      });
    });
  });
});