/**
 * Session API React Hooks
 * 
 * Clean, composable React hooks for session intelligence API integration.
 * Provides loading states, error handling, and automatic cache management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  sessionApi, 
  SessionApiError, 
  ErrorType,
  LoadingState,
  ApiResponse 
} from '@/services/sessionApiService';
import {
  ScaffoldGenerationRequest,
  ScaffoldGenerationResponse,
  SessionStartRequest,
  SessionStartResponse,
  SessionCompleteRequest,
  SessionCompleteResponse,
  GetScaffoldResponse,
  RequestOptions
} from '@/types/sessionApi';

// ============================================================================
// Base Hook Types
// ============================================================================

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: SessionApiError | null;
  lastUpdated: number | null;
}

interface AsyncActions {
  retry: () => void;
  cancel: () => void;
  clearError: () => void;
}

type UseAsyncReturn<T> = AsyncState<T> & AsyncActions;

// ============================================================================
// Core Async Hook
// ============================================================================

function useAsync<T>(
  asyncFunction: () => Promise<ApiResponse<T>>,
  deps: React.DependencyList = [],
  options: {
    immediate?: boolean;
    retainDataOnError?: boolean;
    fallbackData?: T;
  } = {}
): UseAsyncReturn<T> {
  const {
    immediate = false,
    retainDataOnError = true,
    fallbackData = null
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: fallbackData,
    loading: false,
    error: null,
    lastUpdated: null
  });

  const cancelRef = useRef<(() => void) | null>(null);
  const requestIdRef = useRef<string | null>(null);

  const execute = useCallback(async () => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    const requestId = `hook-${Date.now()}-${Math.random()}`;
    requestIdRef.current = requestId;

    cancelRef.current = () => {
      sessionApi.cancelRequest(requestId);
      setState(prev => ({
        ...prev,
        loading: false
      }));
    };

    try {
      const response = await asyncFunction();
      
      // Check if request was cancelled
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
          lastUpdated: Date.now()
        });
      } else {
        throw new SessionApiError(
          ErrorType.API_ERROR,
          'API returned unsuccessful response',
          response,
          true
        );
      }
    } catch (error) {
      // Check if request was cancelled
      if (requestIdRef.current !== requestId) {
        return;
      }

      const apiError = error instanceof SessionApiError 
        ? error 
        : new SessionApiError(
            ErrorType.UNKNOWN_ERROR,
            'An unexpected error occurred',
            error,
            true
          );

      setState(prev => ({
        data: retainDataOnError ? prev.data : fallbackData,
        loading: false,
        error: apiError,
        lastUpdated: prev.lastUpdated
      }));
    } finally {
      cancelRef.current = null;
      requestIdRef.current = null;
    }
  }, deps);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  const cancel = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current();
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      execute();
    }
    
    // Cleanup on unmount
    return () => {
      if (cancelRef.current) {
        cancelRef.current();
      }
    };
  }, [execute, immediate]);

  return {
    ...state,
    retry,
    cancel,
    clearError
  };
}

// ============================================================================
// Scaffold Generation Hook
// ============================================================================

export function useScaffoldGeneration() {
  const [requestData, setRequestData] = useState<ScaffoldGenerationRequest | null>(null);

  const asyncState = useAsync<ScaffoldGenerationResponse>(
    () => {
      if (!requestData) {
        throw new Error('No request data provided');
      }
      return sessionApi.generateScaffolds(requestData);
    },
    [requestData],
    { immediate: false, retainDataOnError: true }
  );

  const generateScaffolds = useCallback((request: ScaffoldGenerationRequest) => {
    setRequestData(request);
    // Trigger execution by updating dependency
    setTimeout(() => asyncState.retry(), 0);
  }, [asyncState.retry]);

  return {
    ...asyncState,
    generateScaffolds,
    isGenerating: asyncState.loading
  };
}

// ============================================================================
// Individual Scaffold Hook
// ============================================================================

export function useScaffold(blockId: string | null, options: RequestOptions = {}) {
  const asyncState = useAsync<GetScaffoldResponse>(
    () => {
      if (!blockId) {
        throw new Error('Block ID is required');
      }
      return sessionApi.getScaffold(blockId, options);
    },
    [blockId, JSON.stringify(options)],
    { 
      immediate: !!blockId,
      retainDataOnError: true,
      fallbackData: null
    }
  );

  const refresh = useCallback(() => {
    if (blockId) {
      asyncState.retry();
    }
  }, [blockId, asyncState.retry]);

  return {
    ...asyncState,
    scaffold: asyncState.data?.scaffold || null,
    isAvailable: !!asyncState.data?.success,
    refresh
  };
}

// ============================================================================
// Session Start Hook
// ============================================================================

export function useSessionStart() {
  const [requestData, setRequestData] = useState<SessionStartRequest | null>(null);

  const asyncState = useAsync<SessionStartResponse>(
    () => {
      if (!requestData) {
        throw new Error('No session start data provided');
      }
      return sessionApi.startSession(requestData);
    },
    [requestData],
    { immediate: false, retainDataOnError: false }
  );

  const startSession = useCallback((request: SessionStartRequest) => {
    setRequestData(request);
    setTimeout(() => asyncState.retry(), 0);
  }, [asyncState.retry]);

  const reset = useCallback(() => {
    setRequestData(null);
    asyncState.clearError();
  }, [asyncState.clearError]);

  return {
    ...asyncState,
    startSession,
    reset,
    sessionData: asyncState.data,
    isStarting: asyncState.loading
  };
}

// ============================================================================
// Session Completion Hook
// ============================================================================

export function useSessionComplete() {
  const [requestData, setRequestData] = useState<SessionCompleteRequest | null>(null);

  const asyncState = useAsync<SessionCompleteResponse>(
    () => {
      if (!requestData) {
        throw new Error('No session completion data provided');
      }
      return sessionApi.completeSession(requestData);
    },
    [requestData],
    { immediate: false, retainDataOnError: false }
  );

  const completeSession = useCallback((request: SessionCompleteRequest) => {
    setRequestData(request);
    setTimeout(() => asyncState.retry(), 0);
  }, [asyncState.retry]);

  const reset = useCallback(() => {
    setRequestData(null);
    asyncState.clearError();
  }, [asyncState.clearError]);

  return {
    ...asyncState,
    completeSession,
    reset,
    sessionResult: asyncState.data,
    isCompleting: asyncState.loading
  };
}

// ============================================================================
// API Health Hook
// ============================================================================

export function useApiHealth(checkInterval: number = 30000) {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const healthy = await sessionApi.healthCheck();
      setIsHealthy(healthy);
      setLastCheck(Date.now());
    } catch {
      setIsHealthy(false);
      setLastCheck(Date.now());
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkHealth();

    // Set up interval if provided
    if (checkInterval > 0) {
      const interval = setInterval(checkHealth, checkInterval);
      return () => clearInterval(interval);
    }
  }, [checkHealth, checkInterval]);

  return {
    isHealthy,
    lastCheck,
    checkHealth
  };
}

// ============================================================================
// Combined Session Flow Hook
// ============================================================================

export function useSessionFlow(blockId: string | null) {
  const scaffold = useScaffold(blockId);
  const sessionStart = useSessionStart();
  const sessionComplete = useSessionComplete();

  const [currentPhase, setCurrentPhase] = useState<'scaffold' | 'active' | 'complete' | 'idle'>('idle');

  const startSessionFlow = useCallback((startRequest: SessionStartRequest) => {
    setCurrentPhase('active');
    sessionStart.startSession(startRequest);
  }, [sessionStart.startSession]);

  const completeSessionFlow = useCallback((completeRequest: SessionCompleteRequest) => {
    setCurrentPhase('complete');
    sessionComplete.completeSession(completeRequest);
  }, [sessionComplete.completeSession]);

  const resetFlow = useCallback(() => {
    setCurrentPhase('idle');
    sessionStart.reset();
    sessionComplete.reset();
  }, [sessionStart.reset, sessionComplete.reset]);

  useEffect(() => {
    if (blockId && scaffold.data) {
      setCurrentPhase('scaffold');
    }
  }, [blockId, scaffold.data]);

  const isLoading = scaffold.loading || sessionStart.loading || sessionComplete.loading;
  const hasError = scaffold.error || sessionStart.error || sessionComplete.error;

  return {
    // Phase management
    currentPhase,
    resetFlow,

    // Scaffold data
    scaffold: scaffold.scaffold,
    scaffoldLoading: scaffold.loading,
    scaffoldError: scaffold.error,
    refreshScaffold: scaffold.refresh,

    // Session start
    startSessionFlow,
    sessionData: sessionStart.sessionData,
    sessionStartLoading: sessionStart.loading,
    sessionStartError: sessionStart.error,

    // Session completion
    completeSessionFlow,
    sessionResult: sessionComplete.sessionResult,
    sessionCompleteLoading: sessionComplete.loading,
    sessionCompleteError: sessionComplete.error,

    // Combined state
    isLoading,
    hasError,
    
    // Actions
    clearErrors: () => {
      scaffold.clearError();
      sessionStart.clearError();
      sessionComplete.clearError();
    }
  };
}

// ============================================================================
// Cache Management Hook
// ============================================================================

export function useApiCache() {
  const [stats, setStats] = useState({ size: 0, entries: [] });

  const refreshStats = useCallback(() => {
    const cacheStats = sessionApi.getCacheStats();
    setStats(cacheStats);
  }, []);

  const clearCache = useCallback(() => {
    sessionApi.clearCache();
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();
    // Refresh stats periodically
    const interval = setInterval(refreshStats, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    clearCache,
    refreshStats
  };
}