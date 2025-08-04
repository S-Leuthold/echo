/**
 * TodayPageContainer - Data fetching and state management container
 * 
 * Extracted from Today page as part of Phase 2 refactoring.
 * Handles all data fetching, API calls, and top-level state management.
 * 
 * Addresses CODEBASE_REVIEW_REPORT.md Issue #1: Component Size Violation
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePlanStatus } from "@/contexts/PlanStatusContext";
import { usePlanning } from "@/contexts/PlanningContext";
import { sessionApi } from "@/services/sessionApiService";
import { SessionHistoryItem } from "@/types/sessionApi";

// Types
export type PlanStatus = 'loading' | 'exists' | 'missing' | 'expired' | 'error';

export interface PlanStatusInfo {
  status: PlanStatus;
  canPlanToday: boolean;
  shouldPlanTomorrow: boolean;
  message: string;
  actionText: string;
}

export interface TodayPageData {
  currentTime: Date;
  planStatusInfo: PlanStatusInfo;
  todayData: any;
  recentSessions: SessionHistoryItem[];
  relatedSessions: SessionHistoryItem[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  selectedSession: SessionHistoryItem | null;
  isSessionModalOpen: boolean;
  currentSessionState: string;
}

export interface TodayPageActions {
  handleOpenSessionModal: (session: SessionHistoryItem) => void;
  handleCloseSessionModal: () => void;
  setCurrentSessionState: (state: string) => void;
  refreshData: () => Promise<void>;
}

// Utility functions
const getPlanStatusInfo = (): PlanStatusInfo => {
  const now = new Date();
  const currentHour = now.getHours();
  
  // If it's after 6 PM, suggest planning tomorrow instead of today
  const shouldPlanTomorrow = currentHour >= 18;
  const canPlanToday = currentHour < 18;
  
  return {
    status: 'missing',
    canPlanToday,
    shouldPlanTomorrow,
    message: shouldPlanTomorrow 
      ? "No plan found for today. Since it's evening, let's plan tomorrow instead."
      : "No plan found for today. You can still plan the rest of your day.",
    actionText: shouldPlanTomorrow ? "Plan Tomorrow" : "Plan Today"
  };
};

const logUserAction = async (action: string, data: any = {}) => {
  try {
    // Future: Send to analytics endpoint
    // Silently track user actions for now
    console.log('User action:', action, data);
  } catch (error) {
    // Silently ignore analytics errors
  }
};

/**
 * Custom hook for managing Today page data and state
 */
export const useTodayPageData = (): TodayPageData & TodayPageActions => {
  // Use shared plan status context instead of local state
  const { planStatus, todayData, error, isLoading } = usePlanStatus();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentSessionState, setCurrentSessionState] = useState<string>('TRANQUIL');
  
  // Session data state management
  const [recentSessions, setRecentSessions] = useState<SessionHistoryItem[]>([]);
  const [relatedSessions, setRelatedSessions] = useState<SessionHistoryItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  
  // Session modal state
  const [selectedSession, setSelectedSession] = useState<SessionHistoryItem | null>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second
    
    return () => clearInterval(timer);
  }, []);

  // Load session data from API with context awareness
  const loadSessionData = useCallback(async () => {
    if (sessionsLoading) return;
    
    // Ensure sessionApi is available
    if (!sessionApi) {
      return;
    }
    
    setSessionsLoading(true);
    setSessionsError(null);
    
    try {
      // Always load recent sessions
      const recentResponse = await sessionApi.getRecentSessions(6);
      
      if (recentResponse.success) {
        setRecentSessions(recentResponse.data.sessions);
      }
      
      // Load related sessions only for work blocks (not personal blocks)
      const currentBlock = todayData?.current_block;
      const isPersonalBlock = currentBlock?.type === 'PERSONAL' || currentBlock?.type === 'HEALTH' || currentBlock?.type === 'MEALS';
      
      if (!isPersonalBlock && currentBlock?.label) {
        // Extract project from block label (format: "project | task")
        // We need to match the full project format used in mock data
        let projectContext = 'Admin | Operations'; // default fallback
        
        const pipeIndex = currentBlock.label.indexOf('|');
        if (pipeIndex > 0) {
          const projectPrefix = currentBlock.label.substring(0, pipeIndex).trim();
          // Map common prefixes to full project names
          const projectMap = {
            'echo': 'echo | Platform Development',
            'MAOM-N': 'MAOM-N | Manuscript Revision', 
            'PersonalSite': 'PersonalSite | Portfolio Redesign',
            'Admin': 'Admin | Operations',
            'Research': 'Research | AI Integration'
          };
          projectContext = projectMap[projectPrefix] || `${projectPrefix} | Development`;
        }
        
        const relatedResponse = await sessionApi.getRelatedSessions({
          projectContext: projectContext,
          timeCategory: currentBlock.type,
          limit: 4
        });
        
        if (relatedResponse.success) {
          setRelatedSessions(relatedResponse.data.sessions);
        }
      } else {
        // Clear related sessions for personal blocks
        setRelatedSessions([]);
      }
      
    } catch (error) {
      setSessionsError('Failed to load session history');
    } finally {
      setSessionsLoading(false);
    }
  }, [todayData, sessionsLoading]);

  // Load session data when component mounts or todayData changes
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Log page visit (context handles the actual data loading)
  useEffect(() => {
    logUserAction('page_load', { page: 'today' });
  }, []);

  // Action handlers
  const handleOpenSessionModal = (session: SessionHistoryItem) => {
    setSelectedSession(session);
    setIsSessionModalOpen(true);
  };

  const handleCloseSessionModal = () => {
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  };

  const refreshData = async () => {
    await loadSessionData();
  };

  // Compute derived data
  const planStatusInfo = useMemo(() => getPlanStatusInfo(), []);

  return {
    // Data
    currentTime,
    planStatusInfo,
    todayData,
    recentSessions,
    relatedSessions,
    sessionsLoading,
    sessionsError,
    selectedSession,
    isSessionModalOpen,
    currentSessionState,
    
    // Actions
    handleOpenSessionModal,
    handleCloseSessionModal,
    setCurrentSessionState,
    refreshData,
  };
};

/**
 * Container component that provides data to Today page children
 */
interface TodayPageContainerProps {
  children: (data: TodayPageData & TodayPageActions) => React.ReactNode;
}

export const TodayPageContainer: React.FC<TodayPageContainerProps> = ({ children }) => {
  const data = useTodayPageData();
  
  return <>{children(data)}</>;
};