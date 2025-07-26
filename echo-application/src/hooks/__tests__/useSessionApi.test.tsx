/**
 * Session API Hooks Tests
 * 
 * Comprehensive tests for the React hooks that interface with the session API.
 * Tests loading states, error handling, retry logic, and component integration.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  useScaffold, 
  useSessionStart, 
  useSessionComplete,
  useSessionFlow,
  useApiHealth 
} from '../useSessionApi';
import { sessionApi, SessionApiError, ErrorType } from '@/services/sessionApiService';
import {
  ScaffoldGenerationRequest,
  SessionStartRequest,
  SessionCompleteRequest
} from '@/types/sessionApi';

// ============================================================================
// Mock Session API Service
// ============================================================================

jest.mock('@/services/sessionApiService', () => ({
  sessionApi: {
    getScaffold: jest.fn(),
    startSession: jest.fn(),
    completeSession: jest.fn(),
    generateScaffolds: jest.fn(),
    healthCheck: jest.fn(),
    cancelRequest: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn()
  },
  SessionApiError: class MockSessionApiError extends Error {
    constructor(
      public type: string,
      message: string,
      public originalError?: any,
      public retryable: boolean = false
    ) {
      super(message);
      this.name = 'SessionApiError';
    }
  },
  ErrorType: {
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    API_ERROR: 'API_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  }
}));

const mockSessionApi = sessionApi as jest.Mocked<typeof sessionApi>;

// ============================================================================
// Test Data
// ============================================================================

const mockScaffold = {
  block_id: 'test-block-1',
  project_context: 'Test project context',
  suggested_approach: 'Test approach',
  key_deliverables: ['Deliverable 1', 'Deliverable 2'],
  potential_blockers: ['Blocker 1'],
  preparation_items: ['Prep item 1'],
  success_criteria: ['Success 1'],
  estimated_complexity: 'medium' as const,
  confidence_score: 0.8,
  generated_at: '2025-07-25T10:00:00Z'
};

const mockGetScaffoldResponse = {
  success: true,
  data: {
    success: true,
    scaffold: mockScaffold
  },
  metadata: {
    request_duration_ms: 500,
    api_version: '1.0',
    cache_hit: false
  }
};

const mockSessionStartRequest: SessionStartRequest = {
  block_id: 'test-block-1',
  primary_outcome: 'Test objective',
  key_tasks: ['Task 1', 'Task 2'],
  session_duration_minutes: 90,
  energy_level: 8
};

const mockSessionStartResponse = {
  success: true,
  data: {
    success: true,
    session_title: 'Test Session',
    primary_objective: 'Test objective',
    checklist: [
      {
        task: 'Task 1',
        category: 'core',
        priority: 'high' as const,
        estimated_minutes: 30
      }
    ],
    success_criteria: ['Criteria 1'],
    time_allocation: { core: 60, supporting: 30 },
    session_id: 'test-session-123'
  },
  metadata: {
    request_duration_ms: 800,
    api_version: '1.0',
    cache_hit: false
  }
};

const mockSessionCompleteRequest: SessionCompleteRequest = {
  block_title: 'Test Session',
  project_name: 'Test Project',
  session_date: '2025-07-25',
  duration_minutes: 85,
  time_category: 'deep_work',
  start_time: '09:00',
  end_time: '10:25',
  accomplishments: 'Completed all tasks',
  outstanding: 'Need follow-up',
  final_notes: 'Great session'
};

const mockSessionCompleteResponse = {
  success: true,
  data: {
    success: true,
    status: 'completed',
    stored_successfully: true,
    session_log_markdown: '# Test Session Log',
    ai_insights: {
      session_quality: 'high',
      key_success_factors: ['Clear objectives'],
      recommended_followup: ['Review results'],
      productivity_patterns: { focus_level: 'high' },
      project_momentum: 'accelerating'
    },
    session_id: 'test-session-123'
  },
  metadata: {
    request_duration_ms: 1200,
    api_version: '1.0',
    cache_hit: false
  }
};

// ============================================================================
// Setup and Cleanup
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
  
  // Set up default successful responses
  mockSessionApi.getScaffold.mockResolvedValue(mockGetScaffoldResponse);
  mockSessionApi.startSession.mockResolvedValue(mockSessionStartResponse);
  mockSessionApi.completeSession.mockResolvedValue(mockSessionCompleteResponse);
  mockSessionApi.healthCheck.mockResolvedValue(true);
  mockSessionApi.getCacheStats.mockReturnValue({ size: 0, entries: [] });
});

afterEach(() => {
  jest.clearAllTimers();
});

// ============================================================================
// useScaffold Hook Tests
// ============================================================================

describe('useScaffold', () => {
  it('should load scaffold data successfully', async () => {
    const { result } = renderHook(() => useScaffold('test-block-1'));

    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    // Wait for API call to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockGetScaffoldResponse.data);
    expect(result.current.scaffold).toEqual(mockScaffold);
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.error).toBe(null);
    expect(mockSessionApi.getScaffold).toHaveBeenCalledWith('test-block-1', {});
  });

  it('should not make request when blockId is null', () => {
    const { result } = renderHook(() => useScaffold(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(mockSessionApi.getScaffold).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'NETWORK_ERROR',
      'Network error',
      null,
      true
    );
    
    mockSessionApi.getScaffold.mockRejectedValue(error);

    const { result } = renderHook(() => useScaffold('test-block-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.data).toBe(null);
    expect(result.current.scaffold).toBe(null);
    expect(result.current.isAvailable).toBe(false);
  });

  it('should support retry functionality', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'NETWORK_ERROR',
      'Network error',
      null,
      true
    );
    
    mockSessionApi.getScaffold
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockGetScaffoldResponse);

    const { result } = renderHook(() => useScaffold('test-block-1'));

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });

    // Retry
    act(() => {
      result.current.retry();
    });

    // Wait for successful retry
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    expect(result.current.data).toEqual(mockGetScaffoldResponse.data);
    expect(mockSessionApi.getScaffold).toHaveBeenCalledTimes(2);
  });

  it('should support refresh functionality', async () => {
    const { result } = renderHook(() => useScaffold('test-block-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Refresh
    act(() => {
      result.current.refresh();
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSessionApi.getScaffold).toHaveBeenCalledTimes(2);
  });

  it('should clear errors when requested', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'NETWORK_ERROR',
      'Network error',
      null,
      true
    );
    
    mockSessionApi.getScaffold.mockRejectedValue(error);

    const { result } = renderHook(() => useScaffold('test-block-1'));

    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });
});

// ============================================================================
// useSessionStart Hook Tests
// ============================================================================

describe('useSessionStart', () => {
  it('should start session successfully', async () => {
    const { result } = renderHook(() => useSessionStart());

    // Initial state
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.isStarting).toBe(false);

    // Start session
    act(() => {
      result.current.startSession(mockSessionStartRequest);
    });

    expect(result.current.isStarting).toBe(true);

    await waitFor(() => {
      expect(result.current.isStarting).toBe(false);
    });

    expect(result.current.sessionData).toEqual(mockSessionStartResponse.data);
    expect(result.current.error).toBe(null);
    expect(mockSessionApi.startSession).toHaveBeenCalledWith(mockSessionStartRequest);
  });

  it('should handle session start errors', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'API_ERROR',
      'Server error',
      null,
      true
    );
    
    mockSessionApi.startSession.mockRejectedValue(error);

    const { result } = renderHook(() => useSessionStart());

    act(() => {
      result.current.startSession(mockSessionStartRequest);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.sessionData).toBe(null);
  });

  it('should reset state when requested', async () => {
    const { result } = renderHook(() => useSessionStart());

    act(() => {
      result.current.startSession(mockSessionStartRequest);
    });

    await waitFor(() => {
      expect(result.current.sessionData).toBeTruthy();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.sessionData).toBe(null);
    expect(result.current.error).toBe(null);
  });
});

// ============================================================================
// useSessionComplete Hook Tests
// ============================================================================

describe('useSessionComplete', () => {
  it('should complete session successfully', async () => {
    const { result } = renderHook(() => useSessionComplete());

    act(() => {
      result.current.completeSession(mockSessionCompleteRequest);
    });

    expect(result.current.isCompleting).toBe(true);

    await waitFor(() => {
      expect(result.current.isCompleting).toBe(false);
    });

    expect(result.current.sessionResult).toEqual(mockSessionCompleteResponse.data);
    expect(result.current.error).toBe(null);
    expect(mockSessionApi.completeSession).toHaveBeenCalledWith(mockSessionCompleteRequest);
  });

  it('should handle completion errors', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'TIMEOUT_ERROR',
      'Request timeout',
      null,
      true
    );
    
    mockSessionApi.completeSession.mockRejectedValue(error);

    const { result } = renderHook(() => useSessionComplete());

    act(() => {
      result.current.completeSession(mockSessionCompleteRequest);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(error);
    expect(result.current.sessionResult).toBe(null);
  });
});

// ============================================================================
// useSessionFlow Hook Tests
// ============================================================================

describe('useSessionFlow', () => {
  it('should manage complete session flow', async () => {
    const { result } = renderHook(() => useSessionFlow('test-block-1'));

    // Initial phase should be scaffold loading
    await waitFor(() => {
      expect(result.current.currentPhase).toBe('scaffold');
    });

    expect(result.current.scaffold).toEqual(mockScaffold);

    // Start session
    act(() => {
      result.current.startSessionFlow(mockSessionStartRequest);
    });

    expect(result.current.currentPhase).toBe('active');

    await waitFor(() => {
      expect(result.current.sessionData).toBeTruthy();
    });

    // Complete session
    act(() => {
      result.current.completeSessionFlow(mockSessionCompleteRequest);
    });

    expect(result.current.currentPhase).toBe('complete');

    await waitFor(() => {
      expect(result.current.sessionResult).toBeTruthy();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should handle errors in session flow', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'NETWORK_ERROR',
      'Network error',
      null,
      true
    );
    
    mockSessionApi.getScaffold.mockRejectedValue(error);

    const { result } = renderHook(() => useSessionFlow('test-block-1'));

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    expect(result.current.scaffoldError).toBe(error);
  });

  it('should reset flow state', async () => {
    const { result } = renderHook(() => useSessionFlow('test-block-1'));

    await waitFor(() => {
      expect(result.current.currentPhase).toBe('scaffold');
    });

    act(() => {
      result.current.resetFlow();
    });

    expect(result.current.currentPhase).toBe('idle');
  });

  it('should clear all errors', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'NETWORK_ERROR',
      'Network error',
      null,
      true
    );
    
    mockSessionApi.getScaffold.mockRejectedValue(error);

    const { result } = renderHook(() => useSessionFlow('test-block-1'));

    await waitFor(() => {
      expect(result.current.hasError).toBe(true);
    });

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.scaffoldError).toBe(null);
  });
});

// ============================================================================
// useApiHealth Hook Tests
// ============================================================================

describe('useApiHealth', () => {
  it('should check API health on mount', async () => {
    const { result } = renderHook(() => useApiHealth(0)); // No interval

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });

    expect(result.current.lastCheck).toBeTruthy();
    expect(mockSessionApi.healthCheck).toHaveBeenCalledTimes(1);
  });

  it('should handle unhealthy API', async () => {
    mockSessionApi.healthCheck.mockResolvedValue(false);

    const { result } = renderHook(() => useApiHealth(0));

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
    });
  });

  it('should handle health check errors', async () => {
    mockSessionApi.healthCheck.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApiHealth(0));

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
    });
  });

  it('should support manual health checks', async () => {
    const { result } = renderHook(() => useApiHealth(0));

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });

    // Manual check
    act(() => {
      result.current.checkHealth();
    });

    await waitFor(() => {
      expect(mockSessionApi.healthCheck).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle periodic health checks', async () => {
    jest.useFakeTimers();

    renderHook(() => useApiHealth(1000)); // 1 second interval

    // Initial check
    await waitFor(() => {
      expect(mockSessionApi.healthCheck).toHaveBeenCalledTimes(1);
    });

    // Advance timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockSessionApi.healthCheck).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Hook Integration', () => {
  it('should handle concurrent hook usage', async () => {
    const { result: scaffoldResult } = renderHook(() => useScaffold('test-block-1'));
    const { result: startResult } = renderHook(() => useSessionStart());
    const { result: healthResult } = renderHook(() => useApiHealth(0));

    // Wait for all hooks to complete initial loading
    await waitFor(() => {
      expect(scaffoldResult.current.loading).toBe(false);
      expect(healthResult.current.isHealthy).toBe(true);
    });

    // Start session
    act(() => {
      startResult.current.startSession(mockSessionStartRequest);
    });

    await waitFor(() => {
      expect(startResult.current.sessionData).toBeTruthy();
    });

    // All hooks should work independently
    expect(scaffoldResult.current.scaffold).toBeTruthy();
    expect(startResult.current.sessionData).toBeTruthy();
    expect(healthResult.current.isHealthy).toBe(true);
  });

  it('should handle API service errors consistently', async () => {
    const error = new (mockSessionApi as any).SessionApiError(
      'NETWORK_ERROR',
      'Network error',
      null,
      true
    );
    
    // Make all API calls fail
    mockSessionApi.getScaffold.mockRejectedValue(error);
    mockSessionApi.startSession.mockRejectedValue(error);
    mockSessionApi.completeSession.mockRejectedValue(error);

    const { result: scaffoldResult } = renderHook(() => useScaffold('test-block-1'));
    const { result: startResult } = renderHook(() => useSessionStart());
    const { result: completeResult } = renderHook(() => useSessionComplete());

    // Trigger all operations
    act(() => {
      startResult.current.startSession(mockSessionStartRequest);
      completeResult.current.completeSession(mockSessionCompleteRequest);
    });

    // Wait for all to complete
    await waitFor(() => {
      expect(scaffoldResult.current.loading).toBe(false);
      expect(startResult.current.loading).toBe(false);
      expect(completeResult.current.loading).toBe(false);
    });

    // All should have errors
    expect(scaffoldResult.current.error).toBeTruthy();
    expect(startResult.current.error).toBeTruthy();
    expect(completeResult.current.error).toBeTruthy();
  });
});