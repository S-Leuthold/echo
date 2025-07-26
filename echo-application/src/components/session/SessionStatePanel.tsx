"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSessionState, SessionState } from '@/hooks/useSessionState';
import { generateMockSchedule } from '@/services/mockSessionData';
import { TranquilState } from './states/TranquilState';
import { SpinUpState } from './states/SpinUpState';
import { ActiveSessionState } from './states/ActiveSessionState';
import { SpinDownState } from './states/SpinDownState';

/**
 * SessionStatePanel - Main container for state-driven session management
 * 
 * This component serves as the central orchestrator for the four-state session system:
 * - TRANQUIL: During rest/personal blocks
 * - SPIN_UP: Pre-session preparation (future phase)
 * - ACTIVE: Live session cockpit (future phase) 
 * - SPIN_DOWN: Session debrief (future phase)
 * 
 * Architecture: Clean conditional rendering with shared container styling
 */

interface SessionStatePanelProps {
  // Future: Accept real schedule data
  schedule?: any[];
  // Future: Accept session configuration
  className?: string;
  // Theater mode control
  theaterModeActive?: boolean;
  onTheaterModeChange?: (active: boolean) => void;
  // Session state callback for parent components
  onSessionStateChange?: (state: SessionState) => void;
}

export function SessionStatePanel({ 
  schedule, 
  className = "",
  theaterModeActive = true,
  onTheaterModeChange,
  onSessionStateChange
}: SessionStatePanelProps) {
  
  // Use real schedule data if provided, fallback to mock data
  const mockSchedule = useMemo(() => generateMockSchedule(), []);
  const activeSchedule = schedule && schedule.length > 0 ? schedule : mockSchedule;
  
  // Transform real schedule data to match Block interface if needed
  const normalizedSchedule = useMemo(() => {
    return activeSchedule.map((block: any) => ({
      id: block.id,
      startTime: block.startTime,
      endTime: block.endTime,
      label: block.label,
      timeCategory: block.timeCategory || 'DEEP_WORK',
      startMinutes: block.startMinutes || (parseInt(block.startTime.split(':')[0]) * 60 + parseInt(block.startTime.split(':')[1])),
      endMinutes: block.endMinutes || (parseInt(block.endTime.split(':')[0]) * 60 + parseInt(block.endTime.split(':')[1])),
      emoji: block.emoji,
      strategicNote: block.strategicNote || block.note
    }));
  }, [activeSchedule]);
  
  // Core state management
  const {
    currentState,
    stateInfo,
    currentTime,
    transitionToSpinUp,
    transitionToActive,
    transitionToSpinDown,
    transitionToTranquil,
    devOverrideState,
    manualStateOverride,
    debugInfo
  } = useSessionState(normalizedSchedule);
  
  // Session data state - passed from SpinUp to Active state
  const [activeSessionData, setActiveSessionData] = useState<any>(null);
  const [sessionChecklist, setSessionChecklist] = useState<any[]>([]);
  
  // Notify parent of session state changes
  useEffect(() => {
    onSessionStateChange?.(currentState);
  }, [currentState, onSessionStateChange]);
  
  // Theater mode handlers
  const handleReenterTheaterMode = () => {
    if (currentState === 'TRANQUIL' && stateInfo.currentBlock && onTheaterModeChange) {
      onTheaterModeChange(true);
    }
  };
  
  
  // State-specific component rendering
  const renderCurrentState = () => {
    switch (currentState) {
      case 'TRANQUIL':
        return (
          <TranquilState 
            currentBlock={stateInfo.currentBlock}
            nextWorkBlock={stateInfo.nextWorkBlock}
            timeUntilTransition={stateInfo.timeUntilTransition}
            currentTime={currentTime}
            onReenterTheaterMode={handleReenterTheaterMode}
            theaterModeActive={theaterModeActive}
          />
        );
        
      case 'SPIN_UP':
        return (
          <SpinUpState
            nextWorkBlock={stateInfo.nextWorkBlock}
            timeUntilTransition={stateInfo.timeUntilTransition}
            currentTime={currentTime}
            onStartSession={(sessionData) => {
              setActiveSessionData(sessionData);
              transitionToActive(sessionData);
            }}
          />
        );
        
      case 'ACTIVE':
        if (!activeSessionData) {
          // Fallback for dev override without session data
          return (
            <div className="p-8 text-center">
              <div className="text-lg font-medium text-foreground mb-2">
                No Active Session Data
              </div>
              <div className="text-muted-foreground mb-4">
                Please start a session from the Spin-Up state
              </div>
              <div className="text-sm text-muted-foreground">
                Session will auto-transition when ready
              </div>
            </div>
          );
        }
        
        return (
          <ActiveSessionState
            sessionData={activeSessionData}
            currentTime={currentTime}
            onEndSession={(sessionNotes, checklist) => {
              // Store checklist for SpinDownState
              setSessionChecklist(checklist);
              transitionToSpinDown();
            }}
          />
        );
        
      case 'SPIN_DOWN':
        if (!activeSessionData) {
          // Fallback for dev override without session data
          return (
            <div className="p-8 text-center">
              <div className="text-lg font-medium text-foreground mb-2">
                No Session Data for Debrief
              </div>
              <div className="text-muted-foreground mb-4">
                Please complete a session from the Active state
              </div>
              <div className="text-sm text-muted-foreground">
                Session will auto-transition when ready
              </div>
            </div>
          );
        }
        
        return (
          <SpinDownState
            sessionData={activeSessionData}
            completedTasks={sessionChecklist.filter(item => item.completed)}
            incompleteTasks={sessionChecklist.filter(item => !item.completed)}
            currentTime={currentTime}
            onCompleteDebrief={(debriefData) => {
              setActiveSessionData(null);
              setSessionChecklist([]);
              // Will transition to TRANQUIL automatically via useSessionState logic
            }}
          />
        );
        
      default:
        return (
          <div className="p-8 text-center">
            <div className="text-lg font-medium text-destructive mb-2">
              Unknown State
            </div>
            <div className="text-muted-foreground">
              State: {currentState}
            </div>
          </div>
        );
    }
  };
  
  return (
    <>
      {/* Session panel container - always rendered */}
      <div className={`relative ${className}`}>
        {/* Consistent container styling across all states */}
        <div className="min-h-[400px] transition-all duration-300 ease-in-out">
          {renderCurrentState()}
        </div>
        
        {/* Re-entry button when theater mode is off during tranquil state */}
        {currentState === 'TRANQUIL' && stateInfo.currentBlock && !theaterModeActive && (
          <button
            onClick={handleReenterTheaterMode}
            className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-sm border border-border rounded-lg 
                       hover:bg-background/90 transition-all duration-200 text-xs text-muted-foreground hover:text-foreground
                       shadow-sm"
            aria-label="Enter tranquil theater mode"
            title="Enter tranquil mode"
          >
            <span className="text-sm">🎭</span>
          </button>
        )}
        
        {/* Dev Mode State Override Panel */}
        {process.env.NODE_ENV === 'development' && devOverrideState && (
          <div className="fixed bottom-4 right-4 z-50 bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg">
            <div className="text-sm font-medium text-yellow-800 mb-2">
              🔧 Dev State Override
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-xs text-yellow-700">
                Current: <strong>{manualStateOverride || stateInfo.state}</strong>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => devOverrideState('TRANQUIL')}
                  className={`px-2 py-1 text-xs rounded ${
                    currentState === 'TRANQUIL' ? 'bg-yellow-300' : 'bg-yellow-200 hover:bg-yellow-250'
                  }`}
                >
                  Tranquil
                </button>
                <button
                  onClick={() => {
                    devOverrideState('SPIN_UP');
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    currentState === 'SPIN_UP' ? 'bg-yellow-300' : 'bg-yellow-200 hover:bg-yellow-250'
                  }`}
                >
                  Spin Up
                </button>
                <button
                  onClick={() => {
                    // Create mock session data for Active state
                    const mockSessionData = {
                      blockId: 'dev-session-' + Date.now(),
                      aiInsights: {
                        momentum_context: 'Dev mode test session',
                        suggested_tasks: ['Test error boundaries', 'Verify auto-save', 'Check dev tools'],
                        estimated_complexity: 'medium',
                        confidence: 0.8,
                        preparation_items: ['Open dev tools', 'Check console'],
                        success_criteria: ['All features working']
                      },
                      userGoal: 'Test the enhanced ActiveSessionState error boundaries',
                      userTasks: ['• Test auto-save retry mechanisms', '• Verify session recovery', '• Check error simulation panel'],
                      startTime: new Date(),
                      nextWorkBlock: stateInfo.nextWorkBlock || {
                        id: 'dev-work-block',
                        startTime: '14:00',
                        endTime: '16:00',
                        label: 'Dev Testing Session',
                        timeCategory: 'DEEP_WORK',
                        startMinutes: 840,
                        endMinutes: 960
                      }
                    };
                    setActiveSessionData(mockSessionData);
                    devOverrideState('ACTIVE');
                  }}
                  className={`px-2 py-1 text-xs rounded ${
                    currentState === 'ACTIVE' ? 'bg-yellow-300' : 'bg-yellow-200 hover:bg-yellow-250'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => devOverrideState('SPIN_DOWN')}
                  className={`px-2 py-1 text-xs rounded ${
                    currentState === 'SPIN_DOWN' ? 'bg-yellow-300' : 'bg-yellow-200 hover:bg-yellow-250'
                  }`}
                >
                  Spin Down
                </button>
              </div>
              <button
                onClick={() => devOverrideState(null)}
                className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Reset Auto
              </button>
            </div>
            {debugInfo && (
              <div className="mt-2 text-xs text-yellow-600">
                {debugInfo.reason} | {debugInfo.currentMinutes}min
              </div>
            )}
          </div>
        )}
        
      </div>
      
    </>
  );
}