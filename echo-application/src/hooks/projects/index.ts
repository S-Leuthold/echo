/**
 * Projects Hooks Export Index
 * 
 * Centralized exports for all project-related hooks.
 */

export { useProjects } from './useProjects';
export { useProjectForm, useProjectTemplates } from './useProjectForm';
export { useProjectWizard } from './useProjectWizard';
export { useHybridProjectState } from './useHybridProjectState';

// Re-export types for convenience
export type {
  UseProjectsReturn,
  UseProjectFormReturn
} from '@/types/projects';