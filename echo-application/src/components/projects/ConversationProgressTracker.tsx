/**
 * ConversationProgressTracker Component
 * 
 * Comprehensive progress tracking for adaptive expert coaching conversations.
 * Shows detailed metrics, stage transitions, confidence scores, and conversation analytics.
 * 
 * Part of the adaptive expert coaching system UI components.
 */

import React from 'react';
import { ConversationState, ConversationAnalytics } from '@/hooks/projects/useConversationState';
import { Clock, MessageSquare, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';

interface ConversationProgressTrackerProps {
  /** Full conversation state */
  conversation: ConversationState;
  /** Show detailed analytics */
  showAnalytics?: boolean;
  /** Show confidence indicators */
  showConfidence?: boolean;
  /** Show project completeness indicators */
  showProjectStatus?: boolean;
  /** Compact mode for dashboard view */
  compact?: boolean;
  /** Custom CSS classes */
  className?: string;
}

/**
 * Confidence score indicator with color coding
 */
const ConfidenceIndicator: React.FC<{
  confidence: number;
  label: string;
  compact: boolean;
}> = ({ confidence, label, compact }) => {
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };
  
  const getConfidenceIcon = (score: number) => {
    if (score >= 0.8) return CheckCircle2;
    if (score >= 0.6) return TrendingUp;
    return AlertCircle;
  };
  
  const Icon = getConfidenceIcon(confidence);
  const colorClasses = getConfidenceColor(confidence);
  
  return (
    <div className={`flex items-center space-x-2 ${compact ? 'text-sm' : ''}`}>
      <Icon className={`w-4 h-4 ${colorClasses.split(' ')[0]}`} />
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClasses}`}>
        {label}: {Math.round(confidence * 100)}%
      </span>
    </div>
  );
};

/**
 * Project completeness status indicator
 */
const ProjectStatusIndicator: React.FC<{
  project: ConversationState['project'];
  compact: boolean;
}> = ({ project, compact }) => {
  const completenessPercentage = project.confidence * 100;
  const missingCount = project.missingInfo.length;
  
  return (
    <div className={`space-y-2 ${compact ? 'space-y-1' : 'space-y-2'}`}>
      {/* Completeness bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
            Project Understanding
          </span>
          <span className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            {Math.round(completenessPercentage)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completenessPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Missing information */}
      {missingCount > 0 && (
        <div className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
          <span className="font-medium">Missing info:</span> {missingCount} items
          {!compact && missingCount <= 3 && (
            <ul className="mt-1 ml-4 list-disc">
              {project.missingInfo.slice(0, 3).map((item, index) => (
                <li key={index} className="text-xs">{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {/* Project completeness status */}
      <div className={`flex items-center space-x-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {project.isComplete ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium">Project definition complete</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-amber-600">Gathering more details...</span>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Analytics summary component
 */
const AnalyticsSummary: React.FC<{
  analytics: ConversationAnalytics;
  compact: boolean;
}> = ({ analytics, compact }) => {
  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes}m`;
    }
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m`;
  };
  
  const duration = formatDuration(analytics.startedAt, analytics.lastActive);
  
  return (
    <div className={`grid grid-cols-2 gap-4 ${compact ? 'gap-2' : 'gap-4'}`}>
      <div className="flex items-center space-x-2">
        <MessageSquare className={`text-blue-600 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        <div>
          <div className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
            {analytics.exchanges}
          </div>
          <div className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            Messages
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Clock className={`text-green-600 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
        <div>
          <div className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
            {duration}
          </div>
          <div className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            Duration
          </div>
        </div>
      </div>
      
      {analytics.stageTransitions > 0 && (
        <div className="flex items-center space-x-2 col-span-2">
          <TrendingUp className={`text-purple-600 ${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          <div>
            <div className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
              {analytics.stageTransitions}
            </div>
            <div className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
              Stage transitions
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Expert persona status indicator
 */
const ExpertPersonaStatus: React.FC<{
  expert: ConversationState['expert'];
  compact: boolean;
}> = ({ expert, compact }) => {
  if (!expert.isActive) return null;
  
  return (
    <div className={`bg-purple-50 border border-purple-200 rounded-lg p-3 ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        <span className={`font-medium text-purple-800 ${compact ? 'text-sm' : 'text-base'}`}>
          Expert Mode Active
        </span>
      </div>
      
      {expert.domain && (
        <div className={`text-purple-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
          Domain: {expert.domain.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
      )}
      
      {expert.detection && !compact && (
        <div className="text-xs text-purple-600 mt-1">
          Confidence: {Math.round(expert.detection.confidence * 100)}%
        </div>
      )}
    </div>
  );
};

/**
 * Main conversation progress tracker component
 */
export const ConversationProgressTracker: React.FC<ConversationProgressTrackerProps> = ({
  conversation,
  showAnalytics = true,
  showConfidence = true,
  showProjectStatus = true,
  compact = false,
  className = ''
}) => {
  const { stage, project, expert, analytics } = conversation;
  
  return (
    <div className={`conversation-progress-tracker space-y-4 ${compact ? 'space-y-3' : 'space-y-4'} ${className}`}>
      {/* Stage progress summary */}
      <div className={`bg-gray-50 rounded-lg p-4 ${compact ? 'p-3' : 'p-4'}`}>
        <h3 className={`font-semibold text-gray-800 mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
          Conversation Progress
        </h3>
        
        <div className="flex items-center justify-between">
          <div className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
            Stage: {stage.current.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </div>
          <div className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
            {Math.round(stage.progress * 100)}% complete
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${stage.progress * 100}%` }}
          />
        </div>
        
        {stage.canTransition && (
          <div className={`text-green-600 font-medium mt-2 ${compact ? 'text-xs' : 'text-sm'}`}>
            ✓ Ready to advance to next stage
          </div>
        )}
      </div>
      
      {/* Expert persona status */}
      <ExpertPersonaStatus expert={expert} compact={compact} />
      
      {/* Project status */}
      {showProjectStatus && (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${compact ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-semibold text-gray-800 mb-3 ${compact ? 'text-sm mb-2' : 'text-base mb-3'}`}>
            Project Status
          </h3>
          <ProjectStatusIndicator project={project} compact={compact} />
        </div>
      )}
      
      {/* Confidence indicators */}
      {showConfidence && project.confidence > 0 && (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${compact ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-semibold text-gray-800 mb-3 ${compact ? 'text-sm mb-2' : 'text-base mb-3'}`}>
            AI Confidence
          </h3>
          <div className="space-y-2">
            <ConfidenceIndicator 
              confidence={project.confidence} 
              label="Understanding" 
              compact={compact} 
            />
            {expert.detection && (
              <ConfidenceIndicator 
                confidence={expert.detection.confidence} 
                label="Domain Detection" 
                compact={compact} 
              />
            )}
          </div>
        </div>
      )}
      
      {/* Analytics */}
      {showAnalytics && analytics.exchanges > 0 && (
        <div className={`bg-white border border-gray-200 rounded-lg p-4 ${compact ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-semibold text-gray-800 mb-3 ${compact ? 'text-sm mb-2' : 'text-base mb-3'}`}>
            Conversation Analytics
          </h3>
          <AnalyticsSummary analytics={analytics} compact={compact} />
        </div>
      )}
    </div>
  );
};

export default ConversationProgressTracker;