/**
 * ErrorBoundary - React Error Boundary for graceful error handling
 * 
 * Created as part of Phase 2 refactoring.
 * Prevents component failures from crashing the entire page.
 * 
 * Addresses CODEBASE_REVIEW_REPORT.md Issue #3: Missing Error Boundaries
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="w-full border-red-200 bg-red-50/30">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-red-900">Something went wrong</h3>
              <p className="text-sm text-red-700 mt-1">
                This component encountered an error and couldn't render properly.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-red-800">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              
              <Button 
                onClick={() => window.location.reload()}
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Specific fallback components for different contexts
export const SessionErrorFallback = () => (
  <Card className="w-full border-orange-200 bg-orange-50/30">
    <CardContent className="p-4 text-center">
      <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
      <p className="text-sm text-orange-700">
        Session component temporarily unavailable
      </p>
    </CardContent>
  </Card>
);

export const ScheduleErrorFallback = () => (
  <Card className="w-full border-blue-200 bg-blue-50/30">
    <CardContent className="p-4 text-center">
      <AlertTriangle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
      <p className="text-sm text-blue-700">
        Schedule display temporarily unavailable
      </p>
    </CardContent>
  </Card>
);

export default ErrorBoundary;