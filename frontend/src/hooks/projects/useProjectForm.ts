/**
 * useProjectForm Hook
 * 
 * Custom hook for managing project creation/editing forms.
 * Handles validation, state management, and form submission.
 */

import { useState, useCallback, useMemo } from 'react';
import { 
  ProjectFormData, 
  UseProjectFormReturn, 
  Project,
  ProjectType,
  ProjectPhase 
} from '@/types/projects';

const INITIAL_FORM_DATA: ProjectFormData = {
  name: '',
  description: '',
  type: 'software',
  objective: '',
  estimated_hours: undefined,
  initial_phase: undefined
};

// Validation Rules
const validateField = (field: keyof ProjectFormData, value: string | number | undefined): string => {
  switch (field) {
    case 'name':
      if (!value || (typeof value === 'string' && value.trim().length < 2)) {
        return 'Project name must be at least 2 characters';
      }
      if (typeof value === 'string' && value.length > 100) {
        return 'Project name must be less than 100 characters';
      }
      break;
    
    case 'description':
      if (!value || (typeof value === 'string' && value.trim().length < 10)) {
        return 'Description must be at least 10 characters';
      }
      if (typeof value === 'string' && value.length > 500) {
        return 'Description must be less than 500 characters';
      }
      break;
    
    case 'objective':
      if (!value || (typeof value === 'string' && value.trim().length < 10)) {
        return 'Objective must be at least 10 characters';
      }
      if (typeof value === 'string' && value.length > 300) {
        return 'Objective must be less than 300 characters';
      }
      break;
    
    case 'estimated_hours':
      if (value !== undefined) {
        const hours = typeof value === 'string' ? parseInt(value) : value;
        if (isNaN(hours) || hours < 1) {
          return 'Estimated hours must be at least 1';
        }
        if (hours > 1000) {
          return 'Estimated hours must be less than 1000';
        }
      }
      break;
  }
  
  return '';
};

interface UseProjectFormOptions {
  initialData?: Partial<ProjectFormData>;
  onSubmit?: (data: ProjectFormData) => Promise<Project | null>;
}

export const useProjectForm = (options: UseProjectFormOptions = {}): UseProjectFormReturn => {
  const { initialData, onSubmit } = options;
  
  // Form State
  const [formData, setFormData] = useState<ProjectFormData>({
    ...INITIAL_FORM_DATA,
    ...initialData
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const isValid = useMemo(() => {
    const requiredFields: (keyof ProjectFormData)[] = ['name', 'description', 'objective'];
    
    // Check if all required fields are filled
    const hasRequiredFields = requiredFields.every(field => {
      const value = formData[field];
      return value && typeof value === 'string' && value.trim().length > 0;
    });
    
    // Check if there are any validation errors
    const hasNoErrors = Object.keys(errors).length === 0;
    
    return hasRequiredFields && hasNoErrors;
  }, [formData, errors]);

  // Update Field
  const updateField = useCallback((field: keyof ProjectFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear existing error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Validate field
    const error = validateField(field, value);
    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
    }
  }, [errors]);

  // Validate All Fields
  const validateAllFields = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    
    (Object.keys(formData) as (keyof ProjectFormData)[]).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Reset Form
  const resetForm = useCallback(() => {
    setFormData({ ...INITIAL_FORM_DATA, ...initialData });
    setErrors({});
    setIsSubmitting(false);
  }, [initialData]);

  // Submit Form
  const submitForm = useCallback(async (): Promise<Project | null> => {
    if (!isValid || isSubmitting) {
      return null;
    }

    // Final validation
    if (!validateAllFields()) {
      return null;
    }

    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        const result = await onSubmit(formData);
        if (result) {
          // Success - reset form
          resetForm();
          return result;
        }
      }
      return null;
    } catch (error) {
      // Handle submission errors
      setErrors(prev => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Failed to submit form'
      }));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, validateAllFields, onSubmit, formData, resetForm]);

  return {
    formData,
    isValid,
    errors,
    isSubmitting,
    updateField,
    resetForm,
    submitForm
  };
};

// Utility Hook for Project Templates
export const useProjectTemplates = () => {
  // Define phase templates for different project types
  const getPhasesByType = useCallback((type: ProjectType): ProjectPhase[] => {
    switch (type) {
      case 'research':
        return ['planning', 'literature_review', 'experiments', 'data_analysis', 'writing', 'revision', 'submission'];
      case 'software':
        return ['design', 'implementation', 'testing', 'deployment', 'maintenance'];
      case 'writing':
        return ['planning', 'writing', 'revision'];
      case 'creative':
        return ['initiation', 'execution', 'monitoring', 'closure'];
      case 'admin':
      case 'personal':
      default:
        return ['initiation', 'execution', 'monitoring', 'closure'];
    }
  }, []);

  // Get suggested estimated hours by type
  const getEstimatedHoursByType = useCallback((type: ProjectType): number => {
    switch (type) {
      case 'research':
        return 120;
      case 'software':
        return 80;
      case 'writing':
        return 60;
      case 'creative':
        return 40;
      case 'admin':
        return 20;
      case 'personal':
        return 30;
      default:
        return 40;
    }
  }, []);

  return {
    getPhasesByType,
    getEstimatedHoursByType
  };
};