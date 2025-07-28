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
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  CheckCircle2,
  Circle,
  FileText,
  BookOpen,
  ExternalLink
} from "lucide-react";

// Category color mapping
const getCategoryColor = (category: string) => {
  switch (category) {
    case 'DEEP_WORK': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'MEETINGS': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'ADMIN': return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'RESEARCH': return 'bg-green-100 text-green-800 border-green-200';
    case 'PERSONAL': return 'bg-orange-100 text-orange-800 border-orange-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showAllRelated, setShowAllRelated] = useState(false);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
              <div className="h-3 bg-muted rounded w-4/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardContent className="p-6">
          <div className="text-red-600 text-sm">
            Failed to load session history: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasRecentSessions = recentSessions.length > 0;
  const hasRelatedSessions = relatedSessions.length > 0;

  if (!hasRecentSessions && !hasRelatedSessions) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-muted-foreground text-sm text-center">
            No session history available yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedRecent = showAllRecent ? recentSessions : recentSessions.slice(0, 3);
  const displayedRelated = showAllRelated ? relatedSessions : relatedSessions.slice(0, 2);

  return (
    <div className="space-y-6">
      {hasRecentSessions && (
        <Card className="w-full">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Recent Sessions</h3>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="space-y-3">
              {displayedRecent.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionClick(session)}
                  className="group p-3 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/5 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent-foreground line-clamp-1">
                      {session.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ml-2 flex-shrink-0 ${getCategoryColor(session.timeCategory)}`}
                    >
                      {session.timeCategory.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {session.summary}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>

            {recentSessions.length > 3 && (
              <Collapsible open={showAllRecent} onOpenChange={setShowAllRecent}>
                <CollipsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-center">
                    <span className="text-xs">
                      {showAllRecent ? 'Show Less' : `Show ${recentSessions.length - 3} More`}
                    </span>
                    {showAllRecent ? (
                      <ChevronUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                </CollipsibleTrigger>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {hasRelatedSessions && (
        <Card className="w-full">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">Related to Current Work</h3>
              <Target className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="space-y-3">
              {displayedRelated.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionClick(session)}
                  className="group p-3 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/5 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent-foreground line-clamp-1">
                      {session.title}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ml-2 flex-shrink-0 ${getCategoryColor(session.timeCategory)}`}
                    >
                      {session.timeCategory.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {session.summary}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(session.timestamp).toLocaleDateString()}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>

            {relatedSessions.length > 2 && (
              <Collapsible open={showAllRelated} onOpenChange={setShowAllRelated}>
                <CollipsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-center">
                    <span className="text-xs">
                      {showAllRelated ? 'Show Less' : `Show ${relatedSessions.length - 2} More`}
                    </span>
                    {showAllRelated ? (
                      <ChevronUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ChevronDown className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                </CollipsibleTrigger>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}
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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <span className="ml-2">{new Date(selectedSession.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 text-xs ${getCategoryColor(selectedSession.timeCategory)}`}
                    >
                      {selectedSession.timeCategory.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{selectedSession.summary}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Session Log</h4>
                  <div className="bg-muted/50 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap">
                    {selectedSession.content || 'No detailed log available for this session.'}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};