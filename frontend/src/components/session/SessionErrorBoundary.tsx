/**
 * Session Error Boundary Components
 * 
 * Robust error boundaries that provide graceful fallbacks for session API failures.
 * Implements different fallback strategies based on error type and context.
 */

import React, { Component, ReactNode, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Clock, 
  Shield,
  ArrowRight
} from 'lucide-react';
import { SessionApiError, ErrorType } from '@/services/sessionApiService';

// ============================================================================
// Error Boundary Props and State
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface SessionErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  resetKeys?: Array<string | number>;
  isolate?: boolean;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  retryCount: number;
  maxRetries: number;
}

// ============================================================================
// Error Classification and Messaging
// ============================================================================

const getErrorMessage = (error: Error): { title: string; message: string; actionable: boolean } => {
  if (error instanceof SessionApiError) {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return {
          title: 'Connection Issue',
          message: 'Unable to connect to Echo servers. Please check your internet connection.',
          actionable: true
        };
      
      case ErrorType.TIMEOUT_ERROR:
        return {
          title: 'Request Timeout',
          message: 'The request took too long to complete. This may be due to high server load.',
          actionable: true
        };
      
      case ErrorType.RATE_LIMIT_ERROR:
        return {
          title: 'Rate Limit Exceeded',
          message: 'Too many requests in a short time. Please wait a moment before trying again.',
          actionable: true
        };
      
      case ErrorType.AUTHENTICATION_ERROR:
        return {
          title: 'Authentication Error',
          message: 'Session expired or invalid credentials. Please refresh the page.',
          actionable: false
        };
      
      case ErrorType.VALIDATION_ERROR:
        return {
          title: 'Data Validation Error',
          message: 'The data format was invalid. This is likely a temporary issue.',
          actionable: true
        };
      
      case ErrorType.API_ERROR:
        return {
          title: 'Server Error',
          message: 'The server encountered an error. Our team has been notified.',
          actionable: true
        };
      
      default:
        return {
          title: 'Unexpected Error',
          message: 'Something unexpected happened. Please try again.',
          actionable: true
        };
    }
  }

  return {
    title: 'Application Error',
    message: 'An unexpected error occurred in the application.',
    actionable: true
  };
};

const getErrorIcon = (error: Error) => {
  if (error instanceof SessionApiError) {
    switch (error.type) {
      case ErrorType.NETWORK_ERROR:
        return WifiOff;
      case ErrorType.TIMEOUT_ERROR:
        return Clock;
      case ErrorType.RATE_LIMIT_ERROR:
        return Shield;
      case ErrorType.AUTHENTICATION_ERROR:
        return Shield;
      default:
        return AlertTriangle;
    }
  }
  return AlertTriangle;
};

// ============================================================================
// Default Error Fallback Component
// ============================================================================

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retryCount,
  maxRetries
}) => {
  const { title, message, actionable } = getErrorMessage(error);
  const ErrorIcon = getErrorIcon(error);
  const canRetry = actionable && retryCount < maxRetries;

  return (
    <Card className="border-red-200 bg-red-50/50">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <ErrorIcon className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-red-900">{title}</h3>
              <p className="text-sm text-red-700 mt-1">{message}</p>
            </div>
            
            {canRetry && (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={resetError}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                {retryCount > 0 && (
                  <span className="text-xs text-red-600">
                    Attempt {retryCount + 1} of {maxRetries + 1}
                  </span>
                )}
              </div>
            )}
            
            {!actionable && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Please refresh the page to continue. If the problem persists, contact support.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Specialized Error Fallbacks
// ============================================================================

export const ScaffoldErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retryCount,
  maxRetries
}) => {
  const { title, message, actionable } = getErrorMessage(error);
  const canRetry = actionable && retryCount < maxRetries;

  return (
    <Card className="bg-muted/20 border-border/50">
      <CardContent className="px-3 py-1">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <WifiOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Unable to load AI insights
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p className="mb-2">{message}</p>
            <p>Using cached session context while we reconnect...</p>
          </div>
          
          {canRetry && (
            <Button
              onClick={resetError}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const SessionStartErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  retryCount,
  maxRetries
}) => {
  const { title, message, actionable } = getErrorMessage(error);
  const canRetry = actionable && retryCount < maxRetries;

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="w-4 h-4 text-amber-600" />
      <AlertDescription className="space-y-3">
        <div>
          <strong className="text-amber-900">{title}</strong>
          <p className="text-amber-800 text-sm mt-1">{message}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {canRetry && (
            <Button
              onClick={resetError}
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-700 hover:bg-amber-100"
            onClick={() => {
              // Continue with manual session setup
              console.log('Falling back to manual session setup');
            }}
          >
            Continue Manually
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

// ============================================================================
// Connection Status Component
// ============================================================================

export const ConnectionStatus: React.FC<{ isOnline: boolean }> = ({ isOnline }) => {
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowStatus(true);
    } else {
      // Hide after a brief moment when back online
      const timer = setTimeout(() => setShowStatus(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!showStatus) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isOnline ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
    } border rounded-lg p-3 shadow-lg`}>
      <div className="flex items-center space-x-2">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-600" />
        )}
        <span className={`text-sm font-medium ${
          isOnline ? 'text-green-800' : 'text-red-800'
        }`}>
          {isOnline ? 'Connected' : 'Connection lost'}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// Main Error Boundary Class Component
// ============================================================================

export class SessionErrorBoundary extends Component<
  SessionErrorBoundaryProps,
  ErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: SessionErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
    
    // Log error for monitoring
    console.error('SessionErrorBoundary caught error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: SessionErrorBoundaryProps) {
    const { resetKeys = [] } = this.props;
    const { resetKeys: prevResetKeys = [] } = prevProps;
    
    if (
      this.state.hasError &&
      resetKeys.length > 0 &&
      resetKeys.some((key, index) => key !== prevResetKeys[index])
    ) {
      this.resetError();
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetError = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Hook for Online Status
// ============================================================================

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};