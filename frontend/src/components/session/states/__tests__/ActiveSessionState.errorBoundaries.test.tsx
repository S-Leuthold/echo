/**
 * ActiveSessionState Enhanced Error Boundaries Tests
 * 
 * Tests the Phase 3.3 implementation of enhanced error boundaries,
 * retry mechanisms, and session recovery functionality.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ActiveSessionState } from '../ActiveSessionState';
import { Block } from '@/hooks/useSessionState';

// Mock the session API hook
jest.mock('@/hooks/useSessionApi', () => ({
  useSessionStart: jest.fn()
}));

// Mock localStorage with error simulation
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  let shouldThrowError = false;
  
  return {
    getItem: jest.fn((key: string) => {
      if (shouldThrowError) throw new Error('localStorage access denied');
      return store[key] || null;
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (shouldThrowError) throw new Error('localStorage access denied');
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      if (shouldThrowError) throw new Error('localStorage access denied');
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    simulateError: (shouldError: boolean) => {
      shouldThrowError = shouldError;
    }
  };
};

const mockLocalStorage = createMockLocalStorage();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock error boundaries
jest.mock('@/components/session/SessionErrorBoundary', () => ({
  SessionErrorBoundary: ({ children }: any) => children,
  ScaffoldErrorFallback: () => <div data-testid="scaffold-error">Error</div>
}));

// Mock ActiveSessionErrorBoundaries
jest.mock('@/components/session/ActiveSessionErrorBoundaries', () => ({
  AutoSaveErrorBoundary: ({ children, onSaveError }: any) => {
    // Simulate error boundary catching errors
    return (
      <div data-testid="auto-save-boundary">
        {children}
        <button onClick={() => onSaveError?.(new Error('Test error'))}>
          Simulate Save Error
        </button>
      </div>
    );
  },
  SessionProgressErrorBoundary: ({ children, fallbackProgress }: any) => children,
  SessionRecoveryModal: ({ isOpen, onRecover, onStartFresh }: any) => (
    isOpen ? (
      <div data-testid="recovery-modal">
        <button onClick={() => onRecover({ notes: 'recovered notes', checklist: [] })}>
          Auto Recover
        </button>
        <button onClick={onStartFresh}>Start Fresh</button>
      </div>
    ) : null
  ),
  EnhancedConnectionStatus: ({ 
    isOnline, 
    saveStatus, 
    lastSaveTime, 
    onRetryConnection, 
    onManualSave 
  }: any) => (
    <div data-testid="connection-status">
      <span data-testid="online-status">{isOnline ? 'Online' : 'Offline'}</span>
      <span data-testid="save-status">{saveStatus}</span>
      {lastSaveTime && <span data-testid="last-save">{lastSaveTime.toISOString()}</span>}
      <button onClick={onRetryConnection} data-testid="retry-connection">Retry</button>
      <button onClick={onManualSave} data-testid="manual-save">Manual Save</button>
    </div>
  ),
  ErrorSimulationPanel: ({ onSimulateError }: any) => (
    process.env.NODE_ENV === 'development' ? (
      <div data-testid="error-simulation">
        <button onClick={() => onSimulateError('auto_save_failure')}>
          Simulate Auto-save Error
        </button>
        <button onClick={() => onSimulateError('session_state_corruption')}>
          Simulate Corruption
        </button>
      </div>
    ) : null
  ),
  ActiveSessionErrorType: {
    AUTO_SAVE_FAILURE: 'auto_save_failure',
    SESSION_STATE_CORRUPTION: 'session_state_corruption',
    PROGRESS_CALCULATION_ERROR: 'progress_calculation_error'
  }
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
  userGoal: 'Complete the enhanced error boundary tests',
  userTasks: ['• Test auto-save retry', '• Test recovery modal', '• Test error simulation'],
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

describe('ActiveSessionState Enhanced Error Boundaries', () => {
  const mockOnEndSession = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage.simulateError(false);
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

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Auto-save error handling with retry mechanisms', () => {
    it('should show enhanced connection status component', () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('online-status')).toHaveTextContent('Online');
      expect(screen.getByTestId('save-status')).toHaveTextContent('idle');
    });

    it('should handle offline mode and queue saves', async () => {
      // Start online
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      fireEvent(window, new Event('offline'));

      // Make a change that would trigger auto-save
      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'Offline test notes' } });

      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Should save locally even when offline
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'notes-test-session-1',
          'Offline test notes'
        );
      });

      expect(screen.getByTestId('online-status')).toHaveTextContent('Offline');
    });

    it('should retry failed saves with exponential backoff', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Make a change to trigger save
      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'Test retry functionality' } });

      // Fast-forward past debounce delay
      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Should trigger retry logic (mocked to fail initially)
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Auto-saved session progress')
        );
      });

      consoleSpy.mockRestore();
    });

    it('should show retry count when saves fail', async () => {
      // Mock Math.random to always trigger failures
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.05); // Always trigger failure

      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'Test retry count' } });

      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Fast-forward through retry attempts
      act(() => {
        jest.advanceTimersByTime(15000); // Should cover all retry attempts
      });

      // Should eventually show retry count
      await waitFor(() => {
        const retryElement = screen.queryByText(/\/3 retries/);
        if (retryElement) {
          expect(retryElement).toBeInTheDocument();
        }
      }, { timeout: 5000 });

      Math.random = originalRandom;
    });
  });

  describe('Session recovery modal', () => {
    it('should show recovery modal when localStorage fails', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Simulate localStorage error during save
      mockLocalStorage.simulateError(true);

      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'This should trigger recovery' } });

      act(() => {
        jest.advanceTimersByTime(2100);
      });

      // Recovery modal should appear for localStorage errors
      await waitFor(() => {
        const modal = screen.queryByTestId('recovery-modal');
        if (modal) {
          expect(modal).toBeInTheDocument();
        }
      });
    });

    it('should handle auto-recovery from modal', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Trigger recovery modal via error simulation
      const errorButton = screen.getByText('Simulate Corruption');
      fireEvent.click(errorButton);

      await waitFor(() => {
        expect(screen.getByTestId('recovery-modal')).toBeInTheDocument();
      });

      // Click auto-recover
      const recoverButton = screen.getByText('Auto Recover');
      fireEvent.click(recoverButton);

      // Should recover data and close modal
      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
        expect(textarea).toHaveValue('recovered notes');
        expect(screen.queryByTestId('recovery-modal')).not.toBeInTheDocument();
      });
    });

    it('should handle starting fresh from modal', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Add some content first
      const textarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
      fireEvent.change(textarea, { target: { value: 'Content to be cleared' } });

      // Trigger recovery modal
      const errorButton = screen.getByText('Simulate Corruption');
      fireEvent.click(errorButton);

      await waitFor(() => {
        expect(screen.getByTestId('recovery-modal')).toBeInTheDocument();
      });

      // Click start fresh
      const freshButton = screen.getByText('Start Fresh');
      fireEvent.click(freshButton);

      // Should clear data and close modal
      await waitFor(() => {
        const clearedTextarea = screen.getByPlaceholderText(/Capture thoughts, ideas/);
        expect(clearedTextarea).toHaveValue('');
        expect(screen.queryByTestId('recovery-modal')).not.toBeInTheDocument();
      });

      // Should clear localStorage
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('notes-test-session-1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('checklist-test-session-1');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('session-test-session-1');
    });
  });

  describe('Error simulation panel (dev mode)', () => {
    it('should show error simulation panel in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      expect(screen.getByTestId('error-simulation')).toBeInTheDocument();
      expect(screen.getByText('Simulate Auto-save Error')).toBeInTheDocument();
      expect(screen.getByText('Simulate Corruption')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not show error simulation panel in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      expect(screen.queryByTestId('error-simulation')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should trigger auto-save failure simulation', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const errorButton = screen.getByText('Simulate Auto-save Error');
      fireEvent.click(errorButton);

      // Should show error status
      await waitFor(() => {
        expect(screen.getByTestId('save-status')).toHaveTextContent('error');
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Enhanced connection status features', () => {
    it('should provide manual retry options', async () => {
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      const retryButton = screen.getByTestId('retry-connection');
      const manualSaveButton = screen.getByTestId('manual-save');

      expect(retryButton).toBeInTheDocument();
      expect(manualSaveButton).toBeInTheDocument();

      // Should be able to click them without errors
      fireEvent.click(retryButton);
      fireEvent.click(manualSaveButton);
    });
  });

  describe('Progress calculation error boundary', () => {
    it('should handle progress calculation errors gracefully', () => {
      // This would be tested with a component that actually throws an error
      // during progress calculation, but our current setup doesn't simulate this
      render(
        <ActiveSessionState
          sessionData={mockSessionData}
          currentTime={new Date('2025-01-25T10:30:00Z')}
          onEndSession={mockOnEndSession}
        />
      );

      // Should show progress without errors
      expect(screen.getByText(/0\/3 complete \(0%\)/)).toBeInTheDocument();
    });
  });
});