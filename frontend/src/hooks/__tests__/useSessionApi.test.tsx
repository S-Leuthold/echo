/**
 * Session API Hooks Tests
 * 
 * Comprehensive tests for the React hooks that interface with the session API.
 * Tests loading states, error handling, retry logic, and component integration.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock the sessionApiService before importing hooks
jest.mock('@/services/sessionApiService', () => {
  const mockSessionApi = {
    getScaffold: jest.fn(),
    startSession: jest.fn(),
    completeSession: jest.fn(),
    generateScaffolds: jest.fn(),
    healthCheck: jest.fn(),
    cancelRequest: jest.fn(),
    clearCache: jest.fn(),
    getCacheStats: jest.fn(),
    getHealthStatus: jest.fn(),
    refreshAuthentication: jest.fn()
  };

  return {
    sessionApi: mockSessionApi,
    SessionApiError: class MockSessionApiError extends Error {
      constructor(
        public type: string,
        message: string,
        public originalError?: any,
        public retryable: boolean = false,
        public statusCode?: number
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
  };
});

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

// Get the mocked sessionApi - direct access to mocked functions
const mockSessionApi = sessionApi as any;

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
  session_start_time: '10:00',
  session_end_time: '11:30',
  planned_deliverables: ['Deliverable 1'],
  actual_accomplishments: ['Accomplishment 1'],
  blockers_encountered: ['Blocker 1'],
  next_steps: ['Next step 1'],
  energy_level_start: 8,
  energy_level_end: 7,
  focus_rating: 9,
  productivity_score: 8
};

const mockSessionCompleteResponse = {
  success: true,
  data: {
    success: true,
    synthesis: 'Test synthesis',
    insights: ['Insight 1'],
    commitments: ['Commitment 1'],
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
  mockSessionApi.getHealthStatus.mockReturnValue('healthy');
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
    expect(result.current.isAvailable).toBe(false);
    expect(mockSessionApi.getScaffold).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const error = new SessionApiError(ErrorType.NETWORK_ERROR, 'Network error', undefined, true);
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
    const error = new SessionApiError(ErrorType.NETWORK_ERROR, 'Network error', undefined, true);
    mockSessionApi.getScaffold.mockRejectedValueOnce(error)
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

    // Wait for success
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    expect(result.current.data).toEqual(mockGetScaffoldResponse.data);
    expect(mockSessionApi.getScaffold).toHaveBeenCalledTimes(2);
  });

  it('should support refresh functionality', async () => {
    const { result } = renderHook(() => useScaffold('test-block-1'));

    // Initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Refresh
    act(() => {
      result.current.refresh();
    });

    expect(mockSessionApi.getScaffold).toHaveBeenCalledTimes(2);
  });

  it('should clear errors when requested', async () => {
    const error = new SessionApiError(ErrorType.NETWORK_ERROR, 'Network error', undefined, true);
    mockSessionApi.getScaffold.mockRejectedValue(error);

    const { result } = renderHook(() => useScaffold('test-block-1'));

    // Wait for error
    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });

    // Clear error
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

    act(() => {
      result.current.startSession(mockSessionStartRequest);
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sessionData).toEqual(mockSessionStartResponse.data);
    expect(result.current.error).toBe(null);
    expect(mockSessionApi.startSession).toHaveBeenCalledWith(mockSessionStartRequest, {});
  });

  it('should handle session start errors', async () => {
    const error = new SessionApiError(ErrorType.API_ERROR, 'API error', undefined, false);
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

    // Start session
    act(() => {
      result.current.startSession(mockSessionStartRequest);
    });

    await waitFor(() => {
      expect(result.current.sessionData).toBeTruthy();
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.sessionData).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });
});

// Simplified remaining tests to focus on core functionality
describe('useSessionComplete', () => {
  it('should complete session successfully', async () => {
    const { result } = renderHook(() => useSessionComplete());

    act(() => {
      result.current.completeSession(mockSessionCompleteRequest);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.completionData).toEqual(mockSessionCompleteResponse.data);
    expect(mockSessionApi.completeSession).toHaveBeenCalledWith(mockSessionCompleteRequest, {});
  });

  it('should handle completion errors', async () => {
    const error = new SessionApiError(ErrorType.API_ERROR, 'API error', undefined, false);
    mockSessionApi.completeSession.mockRejectedValue(error);

    const { result } = renderHook(() => useSessionComplete());

    act(() => {
      result.current.completeSession(mockSessionCompleteRequest);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });
  });
});

describe('useApiHealth', () => {
  it('should check API health on mount', async () => {
    const { result } = renderHook(() => useApiHealth());

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(true);
    });

    expect(mockSessionApi.healthCheck).toHaveBeenCalled();
  });

  it('should handle health check errors', async () => {
    mockSessionApi.healthCheck.mockRejectedValue(new Error('Health check failed'));

    const { result } = renderHook(() => useApiHealth());

    await waitFor(() => {
      expect(result.current.isHealthy).toBe(false);
    });
  });
});