/**
 * Session API Service Tests
 * 
 * Comprehensive test suite covering all aspects of the session API service:
 * - Request/response handling
 * - Error scenarios and recovery
 * - Retry logic and backoff
 * - Cache management
 * - Mock fallback behavior
 * - Type safety and validation
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { SessionApiService, SessionApiError, ErrorType } from '../sessionApiService';
import {
  ScaffoldGenerationRequest,
  SessionStartRequest,
  SessionCompleteRequest
} from '@/types/sessionApi';

// ============================================================================
// Test Setup and Mocks
// ============================================================================

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock console methods to avoid test noise
const originalConsole = console;
beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.log = originalConsole.log;
});

// Test data
const mockScaffoldRequest: ScaffoldGenerationRequest = {
  daily_plan: [
    {
      id: 'test-block-1',
      start: '09:00:00',
      end: '10:30:00',
      label: 'Test Block',
      type: 'flex',
      meta: { id: 'test-block-1', time_category: 'deep_work' }
    }
  ],
  context_briefing: {
    executive_summary: 'Test summary',
    email_summary: {
      action_items: ['Test action'],
      response_needed: ['Test response'],
      metadata: { total_processed: 1 }
    },
    session_notes: {
      pending_commitments: ['Test commitment'],
      metadata: { sessions_analyzed: 1 }
    },
    commitments_deadlines: {
      urgent_deadlines: ['Test deadline'],
      upcoming_deadlines: ['Test upcoming'],
      metadata: { deadlines_processed: 1 }
    }
  }
};

const mockSessionStartRequest: SessionStartRequest = {
  block_id: 'test-block-1',
  primary_outcome: 'Complete testing',
  key_tasks: ['Write tests', 'Verify functionality'],
  session_duration_minutes: 90,
  energy_level: 8
};

const mockSessionCompleteRequest: SessionCompleteRequest = {
  block_title: 'Test Session',
  project_name: 'Test Project',
  session_date: '2025-07-25',
  duration_minutes: 85,
  time_category: 'deep_work',
  start_time: '09:00',
  end_time: '10:25',
  accomplishments: 'Completed all tests',
  outstanding: 'Need to review coverage',
  final_notes: 'Session went well'
};

// Mock responses
const mockScaffoldResponse = {
  success: true,
  scaffolds_generated: 1,
  success_rate: 1.0,
  message: 'Generated successfully',
  failed_blocks: []
};

const mockSessionStartResponse = {
  success: true,
  session_title: 'Test Working Session',
  primary_objective: 'Complete testing',
  checklist: [
    {
      task: 'Write tests',
      category: 'core',
      priority: 'high' as const,
      estimated_minutes: 45
    }
  ],
  success_criteria: ['Tests pass', 'Code coverage maintained'],
  time_allocation: { core: 60, supporting: 30 },
  session_id: 'test-session-123'
};

const mockSessionCompleteResponse = {
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
};

// ============================================================================
// Helper Functions
// ============================================================================

const createMockResponse = (data: any, status = 200, ok = true) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data),
  statusText: status === 200 ? 'OK' : 'Error'
});

const createNetworkError = () => {
  const error = new TypeError('Network request failed');
  error.message = 'fetch error';
  return error;
};

const createTimeoutError = () => {
  const error = new DOMException('Request timed out', 'AbortError');
  return error;
};

// ============================================================================
// Core API Service Tests
// ============================================================================

describe('SessionApiService', () => {
  let apiService: SessionApiService;

  beforeEach(() => {
    jest.clearAllMocks();
    apiService = new SessionApiService({
      baseUrl: 'http://localhost:8001',
      timeout: 5000,
      retryAttempts: 2,
      enableMockFallback: true
    });
  });

  afterEach(() => {
    apiService.cancelAllRequests();
    apiService.clearCache();
  });

  // ============================================================================
  // Successful Request Tests
  // ============================================================================

  describe('Successful Requests', () => {
    it('should generate scaffolds successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockScaffoldResponse) as any
      );

      const response = await apiService.generateScaffolds(mockScaffoldRequest);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockScaffoldResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/session/generate-scaffolds',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(mockScaffoldRequest)
        })
      );
    });

    it('should get scaffold for block successfully', async () => {
      const mockGetScaffoldResponse = {
        success: true,
        scaffold: {
          block_id: 'test-block-1',
          project_context: 'Test context',
          suggested_approach: 'Test approach',
          key_deliverables: ['Deliverable 1'],
          potential_blockers: ['Blocker 1'],
          preparation_items: ['Prep 1'],
          success_criteria: ['Criteria 1'],
          estimated_complexity: 'medium' as const,
          confidence_score: 0.8,
          generated_at: '2025-07-25T10:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockGetScaffoldResponse) as any
      );

      const response = await apiService.getScaffold('test-block-1');

      expect(response.success).toBe(true);
      expect(response.data?.scaffold?.block_id).toBe('test-block-1');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/session/scaffold/test-block-1',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should start session successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockSessionStartResponse) as any
      );

      const response = await apiService.startSession(mockSessionStartRequest);

      expect(response.success).toBe(true);
      expect(response.data?.session_id).toBe('test-session-123');
      expect(response.data?.checklist).toHaveLength(1);
    });

    it('should complete session successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockSessionCompleteResponse) as any
      );

      const response = await apiService.completeSession(mockSessionCompleteRequest);

      expect(response.success).toBe(true);
      expect(response.data?.stored_successfully).toBe(true);
      expect(response.data?.ai_insights.session_quality).toBe('high');
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle network errors with retry', async () => {
      mockFetch
        .mockRejectedValueOnce(createNetworkError())
        .mockRejectedValueOnce(createNetworkError())
        .mockResolvedValueOnce(createMockResponse(mockScaffoldResponse) as any);

      const response = await apiService.generateScaffolds(mockScaffoldRequest);

      expect(response.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle timeout errors', async () => {
      mockFetch.mockRejectedValue(createTimeoutError());

      await expect(
        apiService.generateScaffolds(mockScaffoldRequest)
      ).rejects.toThrow(SessionApiError);

      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Server error' }, 500, false) as any
      );

      await expect(
        apiService.generateScaffolds(mockScaffoldRequest)
      ).rejects.toThrow(SessionApiError);
    });

    it('should classify errors correctly', async () => {
      // Test authentication error
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Unauthorized' }, 401, false) as any
      );

      try {
        await apiService.generateScaffolds(mockScaffoldRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(SessionApiError);
        expect((error as SessionApiError).type).toBe(ErrorType.AUTHENTICATION_ERROR);
      }

      // Test rate limit error
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Rate limited' }, 429, false) as any
      );

      try {
        await apiService.generateScaffolds(mockScaffoldRequest);
      } catch (error) {
        expect(error).toBeInstanceOf(SessionApiError);
        expect((error as SessionApiError).type).toBe(ErrorType.RATE_LIMIT_ERROR);
      }
    });

    it('should not retry non-retryable errors', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ error: 'Bad request' }, 400, false) as any
      );

      try {
        await apiService.generateScaffolds(mockScaffoldRequest);
      } catch (error) {
        expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for 400 errors
      }
    });
  });

  // ============================================================================
  // Mock Fallback Tests
  // ============================================================================

  describe('Mock Fallback', () => {
    it('should fallback to mock data when API fails', async () => {
      mockFetch.mockRejectedValue(createNetworkError());

      const response = await apiService.getScaffold('test-block-1');

      expect(response.success).toBe(true);
      expect(response.data?.scaffold?.block_id).toBe('test-block-1');
      expect(response.metadata?.api_version).toBe('mock');
    });

    it('should fallback to mock for session start', async () => {
      mockFetch.mockRejectedValue(createNetworkError());

      const response = await apiService.startSession(mockSessionStartRequest);

      expect(response.success).toBe(true);
      expect(response.data?.session_title).toContain('Working Session');
      expect(response.metadata?.api_version).toBe('mock');
    });

    it('should fallback to mock for session completion', async () => {
      mockFetch.mockRejectedValue(createNetworkError());

      const response = await apiService.completeSession(mockSessionCompleteRequest);

      expect(response.success).toBe(true);
      expect(response.data?.status).toBe('completed');
      expect(response.data?.session_log_markdown).toContain('Test Session');
      expect(response.metadata?.api_version).toBe('mock');
    });
  });

  // ============================================================================
  // Cache Management Tests
  // ============================================================================

  describe('Cache Management', () => {
    it('should cache successful scaffold responses', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse(mockScaffoldResponse) as any
      );

      // First request
      await apiService.generateScaffolds(mockScaffoldRequest);
      
      // Second request should use cache
      const response = await apiService.generateScaffolds(mockScaffoldRequest);

      expect(response.metadata?.cache_hit).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect cache settings', async () => {
      const mockGetScaffoldResponse = {
        success: true,
        scaffold: {
          block_id: 'test-block-1',
          project_context: 'Test context',
          suggested_approach: 'Test approach',
          key_deliverables: ['Deliverable 1'],
          potential_blockers: ['Blocker 1'],
          preparation_items: ['Prep 1'],
          success_criteria: ['Criteria 1'],
          estimated_complexity: 'medium' as const,
          confidence_score: 0.8,
          generated_at: '2025-07-25T10:00:00Z'
        }
      };

      mockFetch.mockResolvedValue(
        createMockResponse(mockGetScaffoldResponse) as any
      );

      // First request
      await apiService.getScaffold('test-block-1');
      
      // Second request should use cache
      const response = await apiService.getScaffold('test-block-1');

      expect(response.metadata?.cache_hit).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache when requested', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(mockScaffoldResponse) as any
      );

      // First request
      await apiService.generateScaffolds(mockScaffoldRequest);
      
      // Clear cache
      apiService.clearCache();
      
      // Second request should not use cache
      await apiService.generateScaffolds(mockScaffoldRequest);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', () => {
      const stats = apiService.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(Array.isArray(stats.entries)).toBe(true);
    });
  });

  // ============================================================================
  // Request Management Tests
  // ============================================================================

  describe('Request Management', () => {
    it('should cancel requests when requested', async () => {
      let requestStarted = false;
      let requestCompleted = false;

      mockFetch.mockImplementation(() => {
        requestStarted = true;
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            requestCompleted = true;
            resolve(createMockResponse(mockScaffoldResponse) as any);
          }, 1000);
        });
      });

      // Start request
      const requestPromise = apiService.generateScaffolds(mockScaffoldRequest);
      
      // Wait a bit for request to start
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(requestStarted).toBe(true);
      
      // Cancel all requests
      apiService.cancelAllRequests();
      
      // Wait for potential completion
      await new Promise(resolve => setTimeout(resolve, 200));
      expect(requestCompleted).toBe(false);

      // Request should have been cancelled
      await expect(requestPromise).rejects.toThrow();
    });

    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse(mockScaffoldResponse) as any
      );

      const promises = [
        apiService.generateScaffolds(mockScaffoldRequest),
        apiService.getScaffold('test-block-1'),
        apiService.startSession(mockSessionStartRequest)
      ];

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Response Validation', () => {
    it('should validate scaffold generation response schema', async () => {
      const invalidResponse = {
        success: true,
        // Missing required fields
        invalid_field: 'invalid'
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(invalidResponse) as any
      );

      await expect(
        apiService.generateScaffolds(mockScaffoldRequest)
      ).rejects.toThrow(SessionApiError);
    });

    it('should validate session start response schema', async () => {
      const invalidResponse = {
        success: true,
        session_title: 'Test',
        // Missing required fields
      };

      mockFetch.mockResolvedValueOnce(
        createMockResponse(invalidResponse) as any
      );

      await expect(
        apiService.startSession(mockSessionStartRequest)
      ).rejects.toThrow(SessionApiError);
    });
  });

  // ============================================================================
  // Health Check Tests
  // ============================================================================

  describe('Health Check', () => {
    it('should return true for healthy API', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 'healthy' }) as any
      );

      const isHealthy = await apiService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8001/health',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return false for unhealthy API', async () => {
      mockFetch.mockRejectedValueOnce(createNetworkError());

      const isHealthy = await apiService.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });
});