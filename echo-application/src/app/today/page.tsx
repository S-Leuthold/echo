/**
 * Today Page - Refactored Version
 * 
 * Phase 2 refactoring: Component breakdown and error boundaries
 * Reduced from 1000+ lines to focused orchestration component
 * 
 * Addresses CODEBASE_REVIEW_REPORT.md Issues #1, #3, #6
 */

"use client";

import { TodayPageContainer } from "@/components/today/TodayPageContainer";
import { ScheduleDisplay } from "@/components/today/ScheduleDisplay";
import { SessionManager } from "@/components/today/SessionManager";
import { PlanStatusCard } from "@/components/today/PlanStatusCard";
import ErrorBoundary, { SessionErrorFallback, ScheduleErrorFallback } from "@/components/ui/ErrorBoundary";
import { mockCurrentFocus } from "@/mocks/currentFocusData";
import { usePlanStatus } from "@/contexts/PlanStatusContext";
import { useMemo } from "react";

// Data transformation function (moved from main component)
const transformTodayDataToSchedule = (todayData: any, currentTime: Date = new Date()) => {
  if (!todayData || !todayData.blocks) {
    return undefined;
  }
  
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
  };

  return todayData.blocks.map((block: any, index: number) => {
    const startTime = parseTime(block.start_time);
    const endTime = parseTime(block.end_time);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    const duration = endMinutes - startMinutes;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Determine block state
    let state = 'upcoming';
    let progress = 0;
    let isCurrent = false;
    
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      state = 'active';
      isCurrent = true;
      progress = Math.round(((currentMinutes - startMinutes) / duration) * 100);
    } else if (currentMinutes >= endMinutes) {
      state = 'completed';
      progress = 100;
    }
    
    return {
      id: block.id || `block-${index}`,
      startTime: block.start_time,
      endTime: block.end_time,
      label: block.label || 'Untitled Block',
      timeCategory: 'DEEP_WORK', // Simplified for now
      startMinutes: startMinutes,
      endMinutes: endMinutes,
      isCurrent: isCurrent,
      progress: progress,
      emoji: block.icon || '📅',
      strategicNote: `Block: ${block.label}`,
      state: state
    };
  });
};

// Current Focus Component (extracted from original)
function CurrentFocusComponent({ focus }: { focus: typeof mockCurrentFocus }) {
  if (focus.type === 'between') {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 text-lg">✓</span>
          </div>
          <div>
            <h3 className="font-semibold text-green-900">Session Complete</h3>
            <p className="text-sm text-green-700">{focus.message}</p>
          </div>
        </div>
        
        {focus.nextMessage && (
          <div className="bg-white/60 rounded-lg p-4 mt-4">
            <p className="text-sm text-green-800">{focus.nextMessage}</p>
          </div>
        )}
      </div>
    );
  }

  const toggleSubtask = (id: string) => {
    // In a real implementation, this would update state
    console.log('Toggle subtask:', id);
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-6 rounded-xl">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{focus.emoji}</div>
          <div>
            <h3 className="font-semibold text-blue-900">{focus.label}</h3>
            <p className="text-sm text-blue-700">
              {focus.startTime} - {focus.endTime}
            </p>
          </div>
        </div>
        
        {focus.type === 'active' && (
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{focus.progress}%</div>
            <div className="text-xs text-blue-500">Progress</div>
          </div>
        )}
      </div>

      {focus.strategicNote && (
        <div className="bg-white/60 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 leading-relaxed">
            {focus.strategicNote}
          </p>
        </div>
      )}

      {focus.subtasks && focus.subtasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-900">Session Goals</h4>
          {focus.subtasks.map((subtask) => (
            <div 
              key={subtask.id}
              onClick={() => toggleSubtask(subtask.id)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/40 cursor-pointer transition-colors"
            >
              <div className="w-4 h-4 flex-shrink-0">
                {subtask.completed ? (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                ) : (
                  <div className="w-4 h-4 border-2 border-blue-300 rounded-full"></div>
                )}
              </div>
              <span className={`text-sm ${subtask.completed ? 'text-blue-600 line-through' : 'text-blue-800'}`}>
                {subtask.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TodayPage() {
  const { planStatus } = usePlanStatus();

  return (
    <TodayPageContainer>
      {(data) => {
        const {
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
          handleOpenSessionModal,
          handleCloseSessionModal,
          setCurrentSessionState,
        } = data;

        // Memoize schedule transformation
        const transformedSchedule = useMemo(() => {
          return todayData ? transformTodayDataToSchedule(todayData, currentTime) : undefined;
        }, [todayData, currentTime]);

        return (
          <PlanStatusCard
            planStatus={planStatus}
            planStatusInfo={planStatusInfo}
            todayData={todayData}
          >
            <div className="min-h-screen bg-background">
              {/* Header */}
              <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
                <div className="max-w-none mx-auto px-6 h-20 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Today</h1>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {new Date().toLocaleDateString("en-US", { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })} • {currentTime.toLocaleTimeString("en-US", { 
                        hour12: false, 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Content Area - Two Column Layout */}
              <div className="relative">
                {/* Left Content Area - Independent Scrolling */}
                <div className="pr-[30vw]">
                  <div className="min-h-[calc(100vh-80px)] overflow-y-auto">
                    <div className="max-w-none mx-auto p-6 space-y-12">
                      
                      {/* Current Focus */}
                      <ErrorBoundary fallback={<SessionErrorFallback />}>
                        <CurrentFocusComponent focus={mockCurrentFocus} />
                      </ErrorBoundary>

                      {/* Session Management */}
                      <ErrorBoundary fallback={<SessionErrorFallback />}>
                        <SessionManager
                          transformedSchedule={transformedSchedule}
                          onSessionStateChange={setCurrentSessionState}
                          recentSessions={recentSessions}
                          relatedSessions={relatedSessions}
                          sessionsLoading={sessionsLoading}
                          sessionsError={sessionsError}
                          onSessionClick={handleOpenSessionModal}
                          selectedSession={selectedSession}
                          isSessionModalOpen={isSessionModalOpen}
                          onCloseSessionModal={handleCloseSessionModal}
                        />
                      </ErrorBoundary>
                    </div>
                  </div>
                </div>

                {/* Right Calendar Panel - Fixed Sticky Panel */}
                <ErrorBoundary fallback={<ScheduleErrorFallback />}>
                  <ScheduleDisplay
                    todayData={todayData}
                    currentTime={currentTime}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </PlanStatusCard>
        );
      }}
    </TodayPageContainer>
  );
}