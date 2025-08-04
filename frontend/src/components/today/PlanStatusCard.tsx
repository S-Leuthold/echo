/**
 * PlanStatusCard - Plan status display and actions
 * 
 * Extracted from Today page as part of Phase 2 refactoring.
 * Handles plan status display, planning navigation, and related actions.
 * 
 * Addresses CODEBASE_REVIEW_REPORT.md Issue #1: Component Size Violation
 */

"use client";

import { useState } from "react";
import { usePlanning } from "@/contexts/PlanningContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DynamicText, TimeAwareText, PlanningModeBadge, TimeContextDisplay, PlanningModeToggle } from "@/components/ui/dynamic-text";
import {
  AlertCircle,
  Plus,
  Calendar,
  Clock,
  Info
} from "lucide-react";
import { PlanStatusInfo } from "./TodayPageContainer";

const logUserAction = async (action: string, data: any = {}) => {
  try {
    // Future: Send to analytics endpoint
    // Silently track user actions for now
    console.log('User action:', action, data);
  } catch (error) {
    // Silently ignore analytics errors
  }
};

interface NoPlanAvailableProps {
  planStatusInfo: PlanStatusInfo;
  todayData?: any;
}

const NoPlanAvailable: React.FC<NoPlanAvailableProps> = ({ planStatusInfo, todayData }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const { setPlanningMode, timeContext, canPlanToday, shouldSuggestSameDay } = usePlanning();
  
  const handlePlanNavigation = async (mode: 'today' | 'tomorrow') => {
    setIsNavigating(true);
    
    // Set planning mode in context
    setPlanningMode(mode, 'no_plan_modal');
    
    await logUserAction('navigate_to_planning', { 
      reason: 'no_plan_available',
      planning_mode: mode,
      time_context: timeContext?.time_period,
      source: 'no_plan_modal'
    });
    
    // Navigate to planning page with mode parameter
    const planningUrl = `/planning?mode=${mode}&source=no_plan_modal`;
    window.location.href = planningUrl;
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-amber-200 bg-amber-50/30">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              No Plan Available
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {planStatusInfo.message}
            </p>
          </div>

          {/* Time Context Display */}
          <div className="bg-white/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <TimeContextDisplay />
            </div>
            
            <div className="flex justify-center">
              <PlanningModeBadge />
            </div>
          </div>

          {/* Email Context (if available) */}
          {todayData?.email_summary && (
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Today's Email Context
              </h4>
              <div className="text-sm text-blue-700 space-y-1">
                {todayData.email_summary.action_items && (
                  <div>
                    <span className="font-medium">Action Items:</span> {todayData.email_summary.action_items.length}
                  </div>
                )}
                {todayData.email_summary.meetings && (
                  <div>
                    <span className="font-medium">Meetings:</span> {todayData.email_summary.meetings.length}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => handlePlanNavigation('today')}
              disabled={isNavigating || !planStatusInfo.canPlanToday}
              className="flex items-center gap-2"
              size="lg"
            >
              <Plus className="w-4 h-4" />
              {isNavigating ? 'Setting up...' : 'Plan Today'}
            </Button>
            
            <Button
              onClick={() => handlePlanNavigation('tomorrow')}
              disabled={isNavigating}
              variant="outline"
              className="flex items-center gap-2"
              size="lg"
            >
              <Calendar className="w-4 h-4" />
              {isNavigating ? 'Setting up...' : 'Plan Tomorrow'}
            </Button>
          </div>

          {!planStatusInfo.canPlanToday && (
            <div className="text-xs text-muted-foreground">
              <TimeAwareText 
                beforeCutoff="You can still plan the rest of today"
                afterCutoff="It's getting late - tomorrow planning is recommended"
                cutoffHour={18}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface PlanStatusCardProps {
  planStatus: 'loading' | 'exists' | 'missing' | 'expired' | 'error';
  planStatusInfo: PlanStatusInfo;
  todayData?: any;
  children?: React.ReactNode;
}

export const PlanStatusCard: React.FC<PlanStatusCardProps> = ({
  planStatus,
  planStatusInfo,
  todayData,
  children
}) => {
  // Show loading state
  if (planStatus === 'loading') {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Loading your day...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (planStatus === 'error') {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-red-200 bg-red-50/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Something went wrong</h3>
              <p className="text-sm text-red-700 mt-1">
                We couldn't load your plan right now. Please try refreshing the page.
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no plan state
  if (planStatus === 'missing') {
    return <NoPlanAvailable planStatusInfo={planStatusInfo} todayData={todayData} />;
  }

  // Show expired plan state
  if (planStatus === 'expired') {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-orange-200 bg-orange-50/30">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-orange-900">Plan Expired</h3>
              <p className="text-sm text-orange-700 mt-1">
                Your plan is from a previous day. Create a new plan to get started.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/planning'}>
              Create New Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show main content for existing plan
  return <>{children}</>;
};