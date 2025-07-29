/**
 * SessionManager - Session state logic and session-related UI components
 * 
 * Extracted from Today page as part of Phase 2 refactoring.
 * Handles session state management, session notes, and session modal.
 * 
 * Addresses CODEBASE_REVIEW_REPORT.md Issue #1: Component Size Violation
 */

"use client";

import { useState } from "react";
import { SessionStatePanel } from "@/components/session/SessionStatePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SessionHistoryItem } from "@/types/sessionApi";
import { IconResolutionService } from "@/lib/icon-resolution";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  CheckCircle2,
  Circle,
  FileText,
  BookOpen,
  ExternalLink,
  AlertCircle
} from "lucide-react";

// Category color mapping for original styling
const getCategoryColor = (category: string) => {
  switch (category) {
    case "DEEP_WORK": return "text-deep-work border-deep-work/20 bg-deep-work/10";
    case "MEETINGS": return "text-meetings border-meetings/20 bg-meetings/10";
    case "PERSONAL": return "text-personal border-personal/20 bg-personal/10";
    case "HEALTH": return "text-health border-health/20 bg-health/10";
    case "RESEARCH": return "text-research border-research/20 bg-research/10";
    case "PLANNING": return "text-planning border-planning/20 bg-planning/10";
    default: return "text-muted-foreground border-border bg-muted/20";
  }
};

interface SessionNoteReviewProps {
  recentSessions: SessionHistoryItem[];
  relatedSessions: SessionHistoryItem[];
  loading: boolean;
  error: string | null;
  onSessionClick: (session: SessionHistoryItem) => void;
}

const SessionNoteReview: React.FC<SessionNoteReviewProps> = ({
  recentSessions,
  relatedSessions,
  loading,
  error,
  onSessionClick
}) => {
  return (
    <div className="space-y-8">
      {/* Related Sessions - Database View - Only show if we have related sessions */}
      {relatedSessions.length > 0 && (
        <Card className="bg-muted/20 border-border/50">
          <CardContent className="px-3 py-1">
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                  RELATED SESSIONS
                </div>
                
                {loading ? (
                  <div className="flex items-center gap-2 text-muted-foreground pl-3">
                    <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading related sessions...</span>
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-destructive pl-3">
                    <AlertCircle className="w-3 h-3" />
                    <span className="text-sm">{error}</span>
                  </div>
                ) : (
                  <div className="space-y-2 pl-3">
                    {relatedSessions.map((session) => (
                      <div key={session.id} className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-base mt-0.5">{session.emoji}</span>
                          <div className="flex-1">
                            <div className="text-sm text-foreground font-medium leading-relaxed">
                              {session.title}
                            </div>
                            <div className="text-xs text-muted-foreground/80 mt-1">
                              {new Date(session.date).toLocaleDateString("en-US", { 
                                month: "short", 
                                day: "numeric" 
                              })} • {session.timeRange}
                              {session.attendees && (
                                <span> • {session.attendees.length} attendees</span>
                              )}
                            </div>
                            {session.snippet && (
                              <div className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
                                {session.snippet}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs px-2 py-0.5 border ${getCategoryColor(session.timeCategory)}`}>
                            {session.timeCategory.replace('_', ' ').toLowerCase()}
                          </Badge>
                          {session.totalTasks > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {session.tasksCompleted}/{session.totalTasks}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Sessions - Echo Insights Style */}
      <Card className="bg-muted/20 border-border/50">
        <CardContent className="px-3 py-1">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-3">
              <div className="text-xs font-normal text-muted-foreground/70 uppercase tracking-widest">
                RECENT SESSIONS
              </div>
              
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground pl-3">
                  <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Loading recent sessions...</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-destructive pl-3">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-sm">{error}</span>
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="text-sm text-muted-foreground pl-3">
                  No recent sessions found
                </div>
              ) : (
                <div className="space-y-2 pl-3">
                  {recentSessions.map((session) => {
                    // Get Lucide icon for session (remove emojis)
                    const { icon: SessionIcon } = IconResolutionService.resolveIcon(
                      session.title, 
                      session.timeCategory.toLowerCase()
                    );
                    
                    // Format relative date
                    const sessionDate = new Date(session.date);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    let relativeDate;
                    if (sessionDate.toDateString() === today.toDateString()) {
                      relativeDate = "Today";
                    } else if (sessionDate.toDateString() === yesterday.toDateString()) {
                      relativeDate = "Yesterday";
                    } else {
                      relativeDate = sessionDate.toLocaleDateString("en-US", { 
                        month: "short", 
                        day: "numeric" 
                      });
                    }
                    
                    return (
                      <div 
                        key={session.id} 
                        onClick={() => onSessionClick(session)}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <SessionIcon className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="text-sm text-foreground font-medium">
                              {session.title}
                            </div>
                            <div className="text-xs text-muted-foreground/80 mt-0.5">
                              {relativeDate} • {session.timeRange} • {session.duration}m
                            </div>
                          </div>
                        </div>
                        
                        {/* Session stats */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {session.totalTasks > 0 && (
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{session.tasksCompleted}/{session.totalTasks}</span>
                            </div>
                          )}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface SessionManagerProps {
  transformedSchedule: any;
  onSessionStateChange: (state: string) => void;
  recentSessions: SessionHistoryItem[];
  relatedSessions: SessionHistoryItem[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  onSessionClick: (session: SessionHistoryItem) => void;
  selectedSession: SessionHistoryItem | null;
  isSessionModalOpen: boolean;
  onCloseSessionModal: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  transformedSchedule,
  onSessionStateChange,
  recentSessions,
  relatedSessions,
  sessionsLoading,
  sessionsError,
  onSessionClick,
  selectedSession,
  isSessionModalOpen,
  onCloseSessionModal,
}) => {
  return (
    <>
      {/* Session State Panel - State-driven co-pilot experience */}
      <SessionStatePanel 
        schedule={transformedSchedule}
        onSessionStateChange={onSessionStateChange}
      />
      
      {/* Session Notes Review - Generous spacing */}
      <div className="relative">
        <SessionNoteReview 
          recentSessions={recentSessions}
          relatedSessions={relatedSessions}
          loading={sessionsLoading}
          error={sessionsError}
          onSessionClick={onSessionClick}
        />
      </div>
      
      {/* Session Log Modal */}
      <Dialog open={isSessionModalOpen} onOpenChange={onCloseSessionModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              {selectedSession?.title || 'Session Log'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedSession && (
              <>
                {/* Session Metadata */}
                <div className="bg-muted/20 border border-border/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span><strong>Date:</strong> {selectedSession.date}</span>
                    <span><strong>Time:</strong> {selectedSession.timeRange}</span>
                    <span><strong>Duration:</strong> {selectedSession.duration}m</span>
                  </div>
                  {selectedSession.project && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Project:</strong> {selectedSession.project}
                    </div>
                  )}
                </div>
                
                {/* Session Content */}
                <div className="border border-border/30 rounded-lg p-6 bg-card/30 min-h-[400px]">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {selectedSession.content || "No session notes available."}
                    </pre>
                  </div>
                </div>
                
                {/* Session Stats */}
                {selectedSession.totalTasks > 0 && (
                  <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Task Completion</span>
                      <span className="text-sm text-muted-foreground">
                        {selectedSession.tasksCompleted} of {selectedSession.totalTasks} completed
                      </span>
                    </div>
                    <div className="mt-2 w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all"
                        style={{ width: `${(selectedSession.tasksCompleted / selectedSession.totalTasks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};