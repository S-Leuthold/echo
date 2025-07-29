/**
 * Projects Components Export Index
 * 
 * Centralized exports for all project-related components.
 * Following best practices for clean imports.
 */

// Core Components
export { ProjectCard } from './ProjectCard';
export { ProjectList } from './ProjectList';
export { ProjectWizard } from './ProjectWizard';
export { ConversationalWizard } from './ConversationalWizard';
export { ProjectDetailModal } from './ProjectDetailModal';

// Hybrid Conversational Wizard Components
export { HybridProjectCreator } from './HybridProjectCreator';
export { ConversationPane } from './ConversationPane';
export { LiveProjectBrief } from './LiveProjectBrief';
export { ProjectRoadmapVisualization } from './ProjectRoadmapVisualization';

// Utility Components
export { WizardStep } from './WizardStep';
export { FileUploadZone } from './FileUploadZone';
export { EditableField } from './EditableField';
export { ActivitySparkline } from './ActivitySparkline';
export { LabeledActivitySparkline } from './LabeledActivitySparkline';
export { ActivityHeatmap } from './ActivityHeatmap';
export { MetricCard } from './MetricCard';
export { NarrativeSection } from './NarrativeSection';
export { MetadataField } from './MetadataField';

// Error Boundaries (when created)
// export { ProjectErrorBoundary } from './ProjectErrorBoundary';

// Adaptive Expert Coaching Components
export { ConversationStageIndicator } from './ConversationStageIndicator';
export { ConversationProgressTracker } from './ConversationProgressTracker';
export { ConversationMessageList } from './ConversationMessageList';
export { ConversationInput } from './ConversationInput';
export { AdaptiveCoachingInterface } from './AdaptiveCoachingInterface';

// Re-export project hooks for convenience
export { 
  useProjects, 
  useProjectForm, 
  useProjectWizard,
  useProjectTemplates,
  useConversationState
} from '@/hooks/projects';