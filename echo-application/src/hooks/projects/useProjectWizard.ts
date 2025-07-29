/**
 * useProjectWizard Hook
 * 
 * Custom hook for managing multi-step project creation wizard state.
 * Handles step navigation, validation, and form data persistence.
 * Maximum complexity: <100 lines for maintainability.
 */

import { useState, useCallback, useMemo } from 'react';
import { ProjectFormData, ProjectType, ProjectPhase } from '@/types/projects';
import { useProjectTemplates } from './useProjectForm';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  isValid: boolean;
  isOptional: boolean;
}

interface UseProjectWizardReturn {
  // Current state
  currentStep: number;
  currentStepData: WizardStep;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  
  // Form data
  formData: Partial<ProjectFormData>;
  
  // Validation
  canProceed: boolean;
  canGoBack: boolean;
  
  // Actions
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  updateFormData: (updates: Partial<ProjectFormData>) => void;
  resetWizard: () => void;
  
  // Step data
  steps: WizardStep[];
}

const INITIAL_FORM_DATA: Partial<ProjectFormData> = {
  name: '',
  description: '',
  type: 'software',
  objective: ''
};

export const useProjectWizard = (): UseProjectWizardReturn => {
  const { getPhasesByType, getEstimatedHoursByType } = useProjectTemplates();
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<ProjectFormData>>(INITIAL_FORM_DATA);

  // Define wizard steps - Activity-focused redesign
  const steps: WizardStep[] = useMemo(() => [
    {
      id: 'project-essence',
      title: 'Project Essence',
      description: 'What are you working on and why does it matter?',
      isValid: Boolean(formData.name && formData.name.length >= 2 && formData.description && formData.description.length >= 10),
      isOptional: false
    },
    {
      id: 'type-and-ai-setup',
      title: 'Type & AI Setup',
      description: 'Help AI understand your work patterns and goals',
      isValid: Boolean(formData.objective && formData.objective.length >= 15 && formData.type),
      isOptional: false
    },
    {
      id: 'activity-preview',
      title: 'Activity Preview',
      description: 'See how your work will be tracked and visualized',
      isValid: true, // Preview step is always valid
      isOptional: true
    },
    {
      id: 'ready-to-begin',
      title: 'Ready to Begin',
      description: 'Your activity tracking starts now',
      isValid: true,
      isOptional: false
    }
  ], [formData]);

  // Current step data
  const currentStepData = useMemo(() => {
    return steps[currentStep] || steps[0];
  }, [steps, currentStep]);

  // Navigation helpers
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const totalSteps = steps.length;

  // Validation
  const canProceed = useMemo(() => {
    const current = steps[currentStep];
    return current ? current.isValid || current.isOptional : false;
  }, [steps, currentStep]);

  const canGoBack = currentStep > 0;

  // Step navigation
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1 && canProceed) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length, canProceed]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length) {
      setCurrentStep(step);
    }
  }, [steps.length]);

  // Form data management - Simplified for activity-focused approach
  const updateFormData = useCallback((updates: Partial<ProjectFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setFormData(INITIAL_FORM_DATA);
  }, []);

  return {
    // Current state
    currentStep,
    currentStepData,
    totalSteps,
    isFirstStep,
    isLastStep,
    
    // Form data
    formData,
    
    // Validation
    canProceed,
    canGoBack,
    
    // Actions
    nextStep,
    previousStep,
    goToStep,
    updateFormData,
    resetWizard,
    
    // Step data
    steps
  };
};