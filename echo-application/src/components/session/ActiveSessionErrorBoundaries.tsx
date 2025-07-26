/**
 * ActiveSessionState-Specific Error Boundaries
 * 
 * Specialized error boundaries and recovery components for the ActiveSessionState component.
 * Handles auto-save failures, session state corruption, and progress tracking errors.
 */

import React, { Component, ReactNode, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  WifiOff, 
  Clock, 
  Shield,
  ArrowRight,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  Settings
} from 'lucide-react';

// ============================================================================
// Error Types and Interfaces
// ============================================================================

export enum ActiveSessionErrorType {
  AUTO_SAVE_FAILURE = 'auto_save_failure',
  SESSION_STATE_CORRUPTION = 'session_state_corruption',
  PROGRESS_CALCULATION_ERROR = 'progress_calculation_error',
  LOCALSTORAGE_ACCESS_ERROR = 'localStorage_access_error',
  CHECKLIST_SYNC_ERROR = 'checklist_sync_error'
}

export interface ActiveSessionError extends Error {
  type: ActiveSessionErrorType;
  recoverable: boolean;
  data?: any;
  timestamp: Date;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: ActiveSessionError | null;
  retryCount: number;
  isRecovering: boolean;
}

interface ActiveSessionErrorBoundaryProps {
  children: ReactNode;
  onError?: (error: ActiveSessionError) => void;
  onRecover?: (recoveryData: any) => void;
  maxRetries?: number;
  sessionId: string;
}

// ============================================================================
// Auto-Save Error Boundary
// ============================================================================

interface AutoSaveErrorBoundaryProps {
  children: ReactNode;
  onSaveError?: (error: Error) => void;
  onRecovery?: () => void;
  sessionId: string;
}

interface AutoSaveErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

export class AutoSaveErrorBoundary extends Component<
  AutoSaveErrorBoundaryProps,
  AutoSaveErrorBoundaryState
> {
  constructor(props: AutoSaveErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AutoSaveErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error) {
    this.props.onSaveError?.(error);
    console.error('AutoSave error caught:', error);
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });
    
    try {
      // Attempt to trigger a manual save
      const event = new CustomEvent('manualSave', { 
        detail: { sessionId: this.props.sessionId } 
      });
      window.dispatchEvent(event);
      
      // Reset error state after a brief delay
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          retryCount: this.state.retryCount + 1,
          isRetrying: false
        });
        this.props.onRecovery?.();
      }, 1000);
      
    } catch (error) {
      console.error('Manual save retry failed:', error);
      this.setState({ isRetrying: false });
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <Alert className="border-amber-200 bg-amber-50 mb-4">
          <Save className="w-4 h-4 text-amber-600" />
          <AlertDescription className="space-y-3">
            <div>
              <strong className="text-amber-900">Auto-save temporarily unavailable</strong>
              <p className="text-amber-800 text-sm mt-1">
                Your session progress is being saved locally, but cloud sync is currently experiencing issues.
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                {this.state.isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {this.state.isRetrying ? 'Saving...' : 'Retry Save'}
              </Button>
              
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                Local backup active
              </Badge>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Session Progress Error Boundary
// ============================================================================

interface ProgressErrorBoundaryProps {
  children: ReactNode;
  fallbackProgress?: number;
  onError?: (error: Error) => void;
}

interface ProgressErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SessionProgressErrorBoundary extends Component<
  ProgressErrorBoundaryProps,
  ProgressErrorBoundaryState
> {
  constructor(props: ProgressErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ProgressErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    console.error('Session progress calculation error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>Progress calculation unavailable</span>
            {this.props.fallbackProgress !== undefined && (
              <Badge variant="outline" className="text-xs">
                ~{this.props.fallbackProgress}% estimated
              </Badge>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Session Recovery Modal
// ============================================================================

interface SessionRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecover: (recoveryData: any) => void;
  onStartFresh: () => void;
  sessionId: string;
  corruptedData?: any;
}

export const SessionRecoveryModal: React.FC<SessionRecoveryModalProps> = ({
  isOpen,
  onClose,
  onRecover,
  onStartFresh,
  sessionId,
  corruptedData
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryOption, setRecoveryOption] = useState<'auto' | 'manual' | 'fresh'>('auto');

  const handleAutoRecover = async () => {
    setIsRecovering(true);
    try {
      // Attempt to sanitize and recover data
      const sanitizedData = sanitizeSessionData(corruptedData);
      onRecover(sanitizedData);
    } catch (error) {
      console.error('Auto-recovery failed:', error);
      setRecoveryOption('manual');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleManualRecover = () => {
    // Open manual recovery interface
    setRecoveryOption('manual');
  };

  const sanitizeSessionData = (data: any) => {
    // Basic data sanitization logic
    try {
      if (!data) return null;
      
      // Sanitize checklist
      if (data.checklist && Array.isArray(data.checklist)) {
        data.checklist = data.checklist.filter((item: any) => 
          item && typeof item.task === 'string' && item.task.trim().length > 0
        ).map((item: any) => ({
          id: item.id || `recovered-${Date.now()}`,
          task: item.task.trim(),
          completed: Boolean(item.completed),
          category: item.category || 'user',
          priority: item.priority || 'medium'
        }));
      }
      
      // Sanitize notes
      if (typeof data.notes === 'string') {
        data.notes = data.notes.trim();
      } else {
        data.notes = '';
      }
      
      return data;
    } catch (error) {
      throw new Error('Data corruption too severe for automatic recovery');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Session Recovery Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We detected corrupted session data. Choose how you'd like to proceed:
          </p>
          
          <div className="space-y-3">
            <Button
              onClick={handleAutoRecover}
              disabled={isRecovering}
              className="w-full justify-start"
              variant={recoveryOption === 'auto' ? 'default' : 'outline'}
            >
              {isRecovering ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              Auto-recover session data
            </Button>
            
            <Button
              onClick={handleManualRecover}
              className="w-full justify-start"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Manual recovery options
            </Button>
            
            <Button
              onClick={onStartFresh}
              className="w-full justify-start"
              variant="outline"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Start fresh session
            </Button>
          </div>
          
          {recoveryOption === 'manual' && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800 text-sm">
                Manual recovery will allow you to inspect and selectively restore 
                your session data. This option preserves maximum control over what gets recovered.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Connection Status with Error Recovery
// ============================================================================

interface EnhancedConnectionStatusProps {
  isOnline: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSaveTime?: Date;
  onRetryConnection?: () => void;
  onManualSave?: () => void;
}

export const EnhancedConnectionStatus: React.FC<EnhancedConnectionStatusProps> = ({
  isOnline,
  saveStatus,
  lastSaveTime,
  onRetryConnection,
  onManualSave
}) => {
  const [showDetails, setShowDetails] = useState(false);
  
  const getStatusColor = () => {
    if (!isOnline || saveStatus === 'error') return 'red';
    if (saveStatus === 'saving') return 'amber';
    if (saveStatus === 'saved') return 'green';
    return 'gray';
  };

  const getStatusIcon = () => {
    if (!isOnline) return WifiOff;
    if (saveStatus === 'saving') return RefreshCw;
    if (saveStatus === 'error') return AlertTriangle;
    if (saveStatus === 'saved') return CheckCircle2;
    return Clock;
  };

  const StatusIcon = getStatusIcon();
  const colorClass = getStatusColor();

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
          colorClass === 'red' ? 'bg-red-100 text-red-700 hover:bg-red-200' :
          colorClass === 'amber' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
          colorClass === 'green' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
          'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <StatusIcon className={`w-3 h-3 ${saveStatus === 'saving' ? 'animate-spin' : ''}`} />
        <span>
          {!isOnline ? 'Offline' :
           saveStatus === 'saving' ? 'Saving...' :
           saveStatus === 'error' ? 'Save failed' :
           saveStatus === 'saved' && lastSaveTime ? `Saved ${Math.floor((Date.now() - lastSaveTime.getTime()) / 1000)}s ago` :
           'Not saved'}
        </span>
      </button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-white border rounded-lg shadow-lg p-3 z-10">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Connection Status</span>
              <Badge variant={isOnline ? 'default' : 'destructive'} className="text-xs">
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">Save Status</span>
              <Badge variant={
                saveStatus === 'saved' ? 'default' :
                saveStatus === 'saving' ? 'secondary' :
                saveStatus === 'error' ? 'destructive' : 'outline'
              } className="text-xs">
                {saveStatus}
              </Badge>
            </div>
            
            {lastSaveTime && (
              <div className="text-xs text-muted-foreground">
                Last saved: {lastSaveTime.toLocaleTimeString()}
              </div>
            )}
            
            <div className="flex gap-2 pt-2 border-t">
              {!isOnline && onRetryConnection && (
                <Button
                  onClick={onRetryConnection}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-7"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              )}
              
              {saveStatus === 'error' && onManualSave && (
                <Button
                  onClick={onManualSave}
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-7"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Development Error Simulation (Dev Mode Only)
// ============================================================================

export const ErrorSimulationPanel: React.FC<{
  onSimulateError: (errorType: ActiveSessionErrorType) => void;
}> = ({ onSimulateError }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        variant="outline"
        className="bg-yellow-100 border-yellow-300 text-yellow-800"
      >
        🐛 Error Sim
      </Button>
      
      {isOpen && (
        <Card className="absolute bottom-full mb-2 w-64 border-yellow-300 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-yellow-800">
              Error Simulation (Dev Only)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={() => onSimulateError(ActiveSessionErrorType.AUTO_SAVE_FAILURE)}
              size="sm"
              variant="outline"
              className="w-full text-xs"
            >
              Auto-save Failure
            </Button>
            <Button
              onClick={() => onSimulateError(ActiveSessionErrorType.SESSION_STATE_CORRUPTION)}
              size="sm"
              variant="outline"
              className="w-full text-xs"
            >
              State Corruption
            </Button>
            <Button
              onClick={() => onSimulateError(ActiveSessionErrorType.PROGRESS_CALCULATION_ERROR)}
              size="sm"
              variant="outline"
              className="w-full text-xs"
            >
              Progress Error
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};