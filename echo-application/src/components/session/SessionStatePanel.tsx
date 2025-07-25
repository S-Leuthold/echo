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
  
  // Use mock data for now - will integrate with real data later (FROZEN to prevent re-generation)
  const mockSchedule = useMemo(() => generateMockSchedule(), []);
  
  // Core state management
  const {
    currentState,
    stateInfo,
    currentTime,
    transitionToSpinUp,
    transitionToActive,
    transitionToSpinDown,
    transitionToTranquil,
  } = useSessionState(mockSchedule);
  
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
              // Will transition to ACTIVE automatically via useSessionState logic
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
              // Will transition to SPIN_DOWN automatically via useSessionState logic
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
        
      </div>
      
    </>
  );
}