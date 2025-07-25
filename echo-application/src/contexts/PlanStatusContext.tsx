"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
type PlanStatus = 'loading' | 'exists' | 'missing' | 'expired' | 'error';

interface PlanStatusContextType {
  planStatus: PlanStatus;
  todayData: any;
  error: string | null;
  refreshPlanStatus: () => Promise<void>;
  isLoading: boolean;
}

// Create the context
const PlanStatusContext = createContext<PlanStatusContextType | undefined>(undefined);

// Provider component
interface PlanStatusProviderProps {
  children: ReactNode;
}

export function PlanStatusProvider({ children }: PlanStatusProviderProps) {
  const [planStatus, setPlanStatus] = useState<PlanStatus>('loading');
  const [todayData, setTodayData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // API call to check plan status with caching
  const checkTodayPlan = async (): Promise<{ exists: boolean; data?: any; error?: string }> => {
    // Simple client-side cache (5 minutes)
    const cacheKey = 'plan_status_check';
    const cacheTimeout = 5 * 60 * 1000; // 5 minutes
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTimeout) {
        console.log('[PlanStatusContext] Using cached plan status');
        return data;
      }
    }
    
    try {
      const response = await fetch('http://localhost:8000/today');
      if (response.ok) {
        const data = await response.json();
        
        // Check if there are actually scheduled blocks (not just empty response)
        const hasBlocks = data.blocks && data.blocks.length > 0;
        
        const result = hasBlocks ? 
          { exists: true, data } : 
          { exists: false, data }; // Include email data even without blocks
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
        
        return result;
      } else if (response.status === 404) {
        const result = { exists: false };
        // Cache 404 response too
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
        return result;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.error('Error checking today\'s plan:', error);
      const result = { exists: false, error: error.message };
      // Don't cache errors - allow retry
      return result;
    }
  };

  const logUserAction = async (action: string, data: any = {}) => {
    try {
      console.log(`[Plan Context] ${action}:`, {
        timestamp: new Date().toISOString(),
        action,
        data
      });
      // Future: Send to analytics endpoint
    } catch (error) {
      console.error('Error logging user action:', error);
    }
  };

  // Function to refresh plan status
  const refreshPlanStatus = async () => {
    if (isLoading) return; // Prevent concurrent calls
    
    try {
      setIsLoading(true);
      await logUserAction('plan_status_refresh');
      
      const planCheck = await checkTodayPlan();
      
      if (planCheck.exists) {
        setPlanStatus('exists');
        setTodayData(planCheck.data);
        await logUserAction('plan_found', { date: new Date().toISOString().split('T')[0] });
      } else {
        setPlanStatus('missing');
        setTodayData(planCheck.data); // Include email data even when no plan
        await logUserAction('no_plan_found', { 
          date: new Date().toISOString().split('T')[0],
          error: planCheck.error 
        });
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error loading plan status:', err);
      setPlanStatus('error');
      setError(err.message);
    } finally {
      setIsLoading(false);
      setHasInitialized(true);
    }
  };

  // Initialize on mount (only once)
  useEffect(() => {
    if (!hasInitialized) {
      refreshPlanStatus();
    }
  }, [hasInitialized]);

  const contextValue: PlanStatusContextType = {
    planStatus,
    todayData,
    error,
    refreshPlanStatus,
    isLoading
  };

  return (
    <PlanStatusContext.Provider value={contextValue}>
      {children}
    </PlanStatusContext.Provider>
  );
}

// Custom hook to use the context
export function usePlanStatus() {
  const context = useContext(PlanStatusContext);
  if (context === undefined) {
    throw new Error('usePlanStatus must be used within a PlanStatusProvider');
  }
  return context;
}