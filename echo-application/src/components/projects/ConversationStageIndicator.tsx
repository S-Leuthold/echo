/**
 * ConversationStageIndicator Component
 * 
 * Visual indicator for the three-stage conversation flow in the adaptive expert coaching system.
 * Shows current stage, progress, and transition states with smooth animations.
 * 
 * Part of the adaptive expert coaching system UI components.
 */

import React from 'react';
import { ConversationStage } from '@/hooks/projects/useConversationState';
import { CheckCircle, MessageCircle, UserCheck, Brain } from 'lucide-react';

interface ConversationStageIndicatorProps {
  /** Current conversation stage */
  currentStage: ConversationStage;
  /** Progress within current stage (0-1) */
  progress: number;
  /** Whether stage can transition to next */
  canTransition: boolean;
  /** Show detailed stage descriptions */
  showDescriptions?: boolean;
  /** Compact mode for smaller spaces */
  compact?: boolean;
  /** Custom CSS classes */
  className?: string;
}

interface StageConfig {
  id: ConversationStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    inactive: string;
    active: string;
    completed: string;
  };
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    id: 'discovery',
    label: 'Discovery',
    description: 'Understanding your project goals and requirements',
    icon: MessageCircle,
    color: {
      inactive: 'text-gray-400 border-gray-200',
      active: 'text-blue-600 border-blue-300 bg-blue-50',
      completed: 'text-green-600 border-green-300 bg-green-50'
    }
  },
  {
    id: 'confirmation',
    label: 'Confirmation',
    description: 'Reviewing and confirming project understanding',
    icon: UserCheck,
    color: {
      inactive: 'text-gray-400 border-gray-200',
      active: 'text-amber-600 border-amber-300 bg-amber-50',
      completed: 'text-green-600 border-green-300 bg-green-50'
    }
  },
  {
    id: 'expert_coaching',
    label: 'Expert Coaching',
    description: 'Receiving specialized guidance for your project',
    icon: Brain,
    color: {
      inactive: 'text-gray-400 border-gray-200',
      active: 'text-purple-600 border-purple-300 bg-purple-50',
      completed: 'text-green-600 border-green-300 bg-green-50'
    }
  }
];

/**
 * Determines the visual state of a stage based on current progress
 */
function getStageState(
  stageId: ConversationStage, 
  currentStage: ConversationStage,
  canTransition: boolean
): 'inactive' | 'active' | 'completed' {
  const stageOrder: ConversationStage[] = ['discovery', 'confirmation', 'expert_coaching'];
  const currentIndex = stageOrder.indexOf(currentStage);
  const stageIndex = stageOrder.indexOf(stageId);
  
  if (stageIndex < currentIndex) {
    return 'completed';
  } else if (stageIndex === currentIndex) {
    return 'active';
  } else {
    return 'inactive';
  }
}

/**
 * Progress bar component for current stage
 */
const StageProgressBar: React.FC<{
  progress: number;
  isActive: boolean;
  color: string;
}> = ({ progress, isActive, color }) => {
  if (!isActive) return null;
  
  return (
    <div className="mt-2">
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1 text-center">
        {Math.round(progress * 100)}% complete
      </div>
    </div>
  );
};

/**
 * Individual stage indicator component
 */
const StageIndicator: React.FC<{
  config: StageConfig;
  state: 'inactive' | 'active' | 'completed';
  progress?: number;
  showDescription: boolean;
  compact: boolean;
}> = ({ config, state, progress = 0, showDescription, compact }) => {
  const Icon = config.icon;
  const isActive = state === 'active';
  const isCompleted = state === 'completed';
  
  const baseClasses = "flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-300";
  const stateClasses = config.color[state];
  
  return (
    <div className={`${baseClasses} ${stateClasses} ${compact ? 'p-2' : 'p-3'}`}>
      <div className="flex items-center justify-center mb-2">
        {isCompleted ? (
          <CheckCircle className={`w-6 h-6 ${config.color.completed.split(' ')[0]}`} />
        ) : (
          <Icon className={`w-6 h-6 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
        )}
      </div>
      
      <div className={`font-medium text-center ${compact ? 'text-sm' : 'text-base'}`}>
        {config.label}
      </div>
      
      {showDescription && !compact && (
        <div className="text-xs text-gray-600 text-center mt-1">
          {config.description}
        </div>
      )}
      
      <StageProgressBar 
        progress={progress} 
        isActive={isActive}
        color={config.color.active.includes('blue') ? 'bg-blue-500' : 
               config.color.active.includes('amber') ? 'bg-amber-500' : 'bg-purple-500'}
      />
    </div>
  );
};

/**
 * Connection line between stages
 */
const StageConnection: React.FC<{
  fromCompleted: boolean;
  toActive: boolean;
}> = ({ fromCompleted, toActive }) => {
  const lineColor = fromCompleted ? 'bg-green-300' : 'bg-gray-200';
  
  return (
    <div className="flex items-center justify-center px-2">
      <div className={`w-8 h-0.5 ${lineColor} transition-colors duration-300`} />
    </div>
  );
};

/**
 * Main conversation stage indicator component
 */
export const ConversationStageIndicator: React.FC<ConversationStageIndicatorProps> = ({
  currentStage,
  progress,
  canTransition,
  showDescriptions = true,
  compact = false,
  className = ''
}) => {
  return (
    <div className={`conversation-stage-indicator ${className}`}>
      {/* Stage indicators */}
      <div className="flex items-center justify-center space-x-2">
        {STAGE_CONFIGS.map((config, index) => {
          const state = getStageState(config.id, currentStage, canTransition);
          const isCurrentStage = config.id === currentStage;
          
          return (
            <React.Fragment key={config.id}>
              <StageIndicator
                config={config}
                state={state}
                progress={isCurrentStage ? progress : 0}
                showDescription={showDescriptions}
                compact={compact}
              />
              
              {/* Connection line (not for last stage) */}
              {index < STAGE_CONFIGS.length - 1 && (
                <StageConnection
                  fromCompleted={state === 'completed'}
                  toActive={STAGE_CONFIGS[index + 1] && 
                    getStageState(STAGE_CONFIGS[index + 1].id, currentStage, canTransition) === 'active'}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Current stage summary */}
      {!compact && (
        <div className="mt-4 text-center">
          <div className="text-sm font-medium text-gray-700">
            Current Stage: {STAGE_CONFIGS.find(s => s.id === currentStage)?.label}
          </div>
          {canTransition && (
            <div className="text-xs text-green-600 mt-1">
              Ready to proceed to next stage
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationStageIndicator;