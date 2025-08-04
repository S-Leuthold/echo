/**
 * SpinUpState Enhanced Integration Tests
 * 
 * Tests the live Claude API integration with graceful fallback to mock data.
 * Validates loading states, error handling, and progressive enhancement.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpinUpState } from '../SpinUpState';
import { Block } from '@/hooks/useSessionState';

// Mock the session API hook
jest.mock('@/hooks/useSessionApi', () => ({
  useScaffold: jest.fn()
}));

// Mock the mock session data service (fallback)
jest.mock('@/services/mockSessionData', () => ({
  getMockSessionContext: jest.fn()
}));

// Mock error boundary
jest.mock('@/components/session/SessionErrorBoundary', () => ({
  SessionErrorBoundary: ({ children, fallback }: any) => children,
  ScaffoldErrorFallback: ({ error, resetError }: any) => (
    <div data-testid="scaffold-error">
      Error: {error.message}
      <button onClick={resetError}>Retry</button>
    </div>
  )
}));

import { useScaffold } from '@/hooks/useSessionApi';
import { getMockSessionContext } from '@/services/mockSessionData';

const mockUseScaffold = useScaffold as jest.MockedFunction<typeof useScaffold>;
const mockGetMockSessionContext = getMockSessionContext as jest.MockedFunction<typeof getMockSessionContext>;

// Test data
const mockBlock: Block = {
  id: 'test-block-1',
  startTime: '09:00',
  endTime: '10:30',
  label: 'Echo | Test Session',
  timeCategory: 'DEEP_WORK',
  startMinutes: 540,
  endMinutes: 630,
  meta: {
    id: 'test-block-1',
    time_category: 'deep_work'
  }
};

const mockScaffold = {
  block_id: 'test-block-1',
  project_context: 'Live Claude scaffold context for testing integration',
  suggested_approach: 'Use test-driven development approach',
  key_deliverables: [
    'Complete API integration tests',
    'Validate error handling',
    'Document integration patterns'
  ],
  potential_blockers: [
    'API rate limits during testing',
    'Network connectivity issues'
  ],
  preparation_items: [
    'Set up test environment',
    'Verify API credentials',
    'Prepare mock data scenarios'
  ],
  success_criteria: [
    'All tests pass',
    'Error scenarios handled gracefully',
    'Progressive enhancement verified'
  ],
  estimated_complexity: 'medium' as const,
  confidence_score: 0.85,
  generated_at: '2025-07-25T10:00:00Z'
};

const mockContextData = {
  momentum_context: 'Fallback mock context for testing',
  email_pressure: ['Test email item'],
  suggested_tasks: ['Mock task 1', 'Mock task 2'],
  estimated_complexity: 'medium',
  confidence: 0.75
};

describe('SpinUpState Enhanced Integration', () => {
  const mockOnStartSession = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMockSessionContext.mockReturnValue(mockContextData);
  });

  it('should display live Claude scaffold data when available', async () => {
    mockUseScaffold.mockReturnValue({
      scaffold: mockScaffold,
      loading: false,
      error: null,
      data: { success: true, scaffold: mockScaffold },
      isAvailable: true,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: Date.now()
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    // Should show live data indicator
    expect(screen.getByText('Live')).toBeInTheDocument();
    
    // Should display Claude-generated context
    expect(screen.getByText(mockScaffold.project_context)).toBeInTheDocument();
    
    // Should show preparation items section
    expect(screen.getByText('PREPARATION ITEMS')).toBeInTheDocument();
    expect(screen.getByText(mockScaffold.preparation_items[0])).toBeInTheDocument();
    
    // Should show potential blockers
    expect(screen.getByText('POTENTIAL BLOCKERS')).toBeInTheDocument();
    expect(screen.getByText(mockScaffold.potential_blockers[0])).toBeInTheDocument();
    
    // Should show suggested focus (key deliverables)
    expect(screen.getByText('SUGGESTED FOCUS')).toBeInTheDocument();
    expect(screen.getByText(mockScaffold.key_deliverables[0])).toBeInTheDocument();
  });

  it('should show loading state while fetching scaffold', () => {
    mockUseScaffold.mockReturnValue({
      scaffold: null,
      loading: true,
      error: null,
      data: null,
      isAvailable: false,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    // Should show loading spinner
    expect(screen.getByText('echo insights')).toBeInTheDocument();
    const loadingSpinner = screen.container.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should gracefully fallback to mock data on API error', async () => {
    const mockError = new Error('Network error');
    mockUseScaffold.mockReturnValue({
      scaffold: null,
      loading: false,
      error: mockError,
      data: null,
      isAvailable: false,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    // Should show error fallback component
    expect(screen.getByTestId('scaffold-error')).toBeInTheDocument();
    expect(screen.getByText('Error: Network error')).toBeInTheDocument();
    
    // Should still allow interaction
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should fallback to mock data when no scaffold available', async () => {
    mockUseScaffold.mockReturnValue({
      scaffold: null,
      loading: false,
      error: null,
      data: { success: false },
      isAvailable: false,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    // Should show mock data without live indicator
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.getByText(mockContextData.momentum_context)).toBeInTheDocument();
    expect(screen.getByText(mockContextData.suggested_tasks[0])).toBeInTheDocument();
  });

  it('should allow adding scaffold items to tactical plan', async () => {
    mockUseScaffold.mockReturnValue({
      scaffold: mockScaffold,
      loading: false,
      error: null,
      data: { success: true, scaffold: mockScaffold },
      isAvailable: true,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: Date.now()
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    // Find and click the first "Add to tasks" button
    const addButtons = screen.getAllByText('Add to tasks');
    fireEvent.click(addButtons[0]);

    // Should change to "Added" state
    await waitFor(() => {
      expect(screen.getByText('Added')).toBeInTheDocument();
    });

    // Should add the item to the tactical plan textarea
    const textarea = screen.getByPlaceholderText('• ');
    expect(textarea).toHaveValue(expect.stringContaining(mockScaffold.key_deliverables[0]));
  });

  it('should include enhanced session data when starting session', async () => {
    mockUseScaffold.mockReturnValue({
      scaffold: mockScaffold,
      loading: false,
      error: null,
      data: { success: true, scaffold: mockScaffold },
      isAvailable: true,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: Date.now()
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    // Set a primary goal
    const goalInput = screen.getByLabelText(/What is the single, primary outcome/);
    fireEvent.change(goalInput, { target: { value: 'Test the integration' } });

    // Start the session
    const startButton = screen.getByText('Start Session');
    fireEvent.click(startButton);

    // Wait for session start
    await waitFor(() => {
      expect(mockOnStartSession).toHaveBeenCalledWith(
        expect.objectContaining({
          blockId: mockBlock.meta?.id,
          userGoal: 'Test the integration',
          aiInsights: expect.objectContaining({
            scaffold: expect.objectContaining({
              preparation_items: mockScaffold.preparation_items,
              potential_blockers: mockScaffold.potential_blockers,
              success_criteria: mockScaffold.success_criteria,
              estimated_complexity: mockScaffold.estimated_complexity,
              confidence_score: mockScaffold.confidence_score
            }),
            dataSource: 'claude_scaffold'
          })
        })
      );
    });
  });

  it('should handle session start without scaffold data', async () => {
    mockUseScaffold.mockReturnValue({
      scaffold: null,
      loading: false,
      error: null,
      data: null,
      isAvailable: false,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: null
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    // Set a primary goal
    const goalInput = screen.getByLabelText(/What is the single, primary outcome/);
    fireEvent.change(goalInput, { target: { value: 'Test fallback behavior' } });

    // Start the session
    const startButton = screen.getByText('Start Session');
    fireEvent.click(startButton);

    // Should still start session with mock data
    await waitFor(() => {
      expect(mockOnStartSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userGoal: 'Test fallback behavior',
          aiInsights: expect.objectContaining({
            scaffold: null,
            dataSource: 'mock_fallback'
          })
        })
      );
    });
  });

  it('should disable start button when no primary goal is set', () => {
    mockUseScaffold.mockReturnValue({
      scaffold: mockScaffold,
      loading: false,
      error: null,
      data: { success: true, scaffold: mockScaffold },
      isAvailable: true,
      refresh: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      clearError: jest.fn(),
      lastUpdated: Date.now()
    });

    render(
      <SpinUpState
        nextWorkBlock={mockBlock}
        timeUntilTransition={5}
        currentTime={new Date()}
        onStartSession={mockOnStartSession}
      />
    );

    const startButton = screen.getByText('Start Session');
    expect(startButton).toBeDisabled();

    // Should show helper text
    expect(screen.getByText('Set your primary goal to launch the session')).toBeInTheDocument();
  });
});