/**
 * Projects Hooks Export Index
 * 
 * Centralized exports for all project-related hooks.
 */

export { useProjects } from './useProjects';
export { useProjectForm, useProjectTemplates } from './useProjectForm';
export { useProjectWizard } from './useProjectWizard';
export { useHybridProjectState } from './useHybridProjectState';
export { useConversationState } from './useConversationState';

// Re-export types for convenience
export type {
  UseProjectsReturn,
  UseProjectFormReturn
} from '@/types/projects';

export type {
  UseConversationStateReturn,
  ConversationState,
  ConversationMessage,
  ConversationConfig
} from './useConversationState';