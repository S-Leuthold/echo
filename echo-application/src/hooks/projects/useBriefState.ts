/**
 * useBriefState Hook
 * 
 * Extracted brief/form state management logic from useHybridProjectState.
 * Handles project brief fields, roadmap management, and AI analysis integration.
 * 
 * Phase 3 of hybrid wizard refactoring - single responsibility principle.
 */

import { useState, useCallback, useRef } from 'react';
import { 
  BriefState,
  BriefField,
  ConversationAnalysis,
  AcademicDomainInfo,
  AcademicContext 
} from '@/types/hybrid-wizard';
import { AcademicConversationAnalysis } from '@/services/academic-project-parser';
import { ProjectType, ProjectRoadmap, ProjectRoadmapPhase } from '@/types/projects';
import { UploadedFile } from '@/components/projects/FileUploadZone';
import { ProjectRoadmapGenerator } from '@/services/roadmap-generator';

/**
 * Configuration for brief state behavior
 */
export interface BriefStateConfig {
  /** Enable automatic roadmap generation */
  enableRoadmapGeneration: boolean;
}

/**
 * Return type for the useBriefState hook
 */
export interface UseBriefStateReturn {
  // State
  brief: BriefState;
  
  // Actions
  updateBriefField: <K extends keyof BriefState>(field: K, value: BriefState[K] extends BriefField<infer T> ? T : never) => Promise<void>;
  updateBriefFromAnalysis: (analysis: ConversationAnalysis | AcademicConversationAnalysis) => Promise<void>;
  updateRoadmapPhase: (phaseId: string, updates: Partial<ProjectRoadmapPhase>) => Promise<void>;
  reorderRoadmapPhases: (newOrder: string[]) => Promise<void>;
  addUploadedFiles: (files: UploadedFile[]) => void;
  resetBrief: () => void;
  
  // Computed properties
  isReadyForCreation: () => boolean;
  getProjectData: () => {
    name: string;
    description: string;
    type: ProjectType;
    objective: string;
  };
}

/**
 * Creates a brief field with metadata
 */
function createBriefField<T>(value: T, confidence: number = 0.5): BriefField<T> {
  return {
    value,
    confidence,
    source: 'ai-generated',
    is_updating: false,
    is_valid: true
  };
}

/**
 * Creates initial brief state
 */
function createInitialBriefState(): BriefState {
  return {
    name: createBriefField(''),
    type: createBriefField<ProjectType>('personal'),
    description: createBriefField(''),
    objective: createBriefField(''),
    key_deliverables: createBriefField<string[]>([]),
    roadmap: createBriefField<ProjectRoadmap | null>(null),
    academic_domain: undefined,
    academic_context: undefined,
    overall_confidence: 0.5,
    user_modified: false,
    last_updated: new Date(),
    uploaded_files: []
  };
}

/**
 * Brief state management hook with roadmap generation
 */
export const useBriefState = (
  config: BriefStateConfig
): UseBriefStateReturn => {
  // Brief state
  const [brief, setBrief] = useState<BriefState>(createInitialBriefState);

  // Roadmap generator service (using ref to maintain identity across renders)
  const roadmapGeneratorRef = useRef(new ProjectRoadmapGenerator());

  /**
   * Updates a brief field with user input
   */
  const updateBriefField = useCallback(async <K extends keyof BriefState>(
    field: K,
    value: BriefState[K]['value']
  ) => {
    setBrief(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value,
        source: 'user-edited',
        is_updating: false
      },
      user_modified: true,
      last_updated: new Date()
    }));
  }, []);

  /**
   * Updates brief from AI analysis results
   */
  const updateBriefFromAnalysis = useCallback(async (analysis: ConversationAnalysis | AcademicConversationAnalysis) => {
    // Check if this is an academic analysis with domain information
    const academicAnalysis = analysis as AcademicConversationAnalysis;
    
    setBrief(prev => ({
      ...prev,
      name: analysis.project_name 
        ? createBriefField(analysis.project_name, analysis.confidence)
        : prev.name,
      type: analysis.project_type
        ? createBriefField(analysis.project_type, analysis.confidence)
        : prev.type,
      description: createBriefField(analysis.description, analysis.confidence),
      objective: analysis.objective
        ? createBriefField(analysis.objective, analysis.confidence)
        : prev.objective,
      key_deliverables: createBriefField(analysis.deliverables, analysis.confidence),
      academic_domain: academicAnalysis.academic_domain
        ? createBriefField(academicAnalysis.academic_domain, academicAnalysis.academic_domain.confidence)
        : prev.academic_domain,
      academic_context: academicAnalysis.academic_context
        ? createBriefField(academicAnalysis.academic_context, analysis.confidence)
        : prev.academic_context,
      overall_confidence: analysis.confidence,
      last_updated: new Date()
    }));

    // Generate roadmap if we have enough information
    if (config.enableRoadmapGeneration && analysis.project_type && analysis.objective) {
      try {
        const roadmap = await roadmapGeneratorRef.current.generateRoadmap(
          analysis,
          analysis.project_type
        );

        setBrief(prev => ({
          ...prev,
          roadmap: createBriefField(roadmap, analysis.confidence)
        }));
      } catch (error) {
        console.error('Roadmap generation failed:', error);
      }
    }
  }, [config.enableRoadmapGeneration]);

  /**
   * Updates a specific roadmap phase
   */
  const updateRoadmapPhase = useCallback(async (
    phaseId: string,
    updates: Partial<ProjectRoadmapPhase>
  ) => {
    if (!brief.roadmap.value) return;

    try {
      const updatedRoadmap = await roadmapGeneratorRef.current.modifyRoadmap(
        brief.roadmap.value,
        'update',
        { id: phaseId, ...updates }
      );

      setBrief(prev => ({
        ...prev,
        roadmap: createBriefField(updatedRoadmap, prev.roadmap.confidence),
        user_modified: true,
        last_updated: new Date()
      }));
    } catch (error) {
      console.error('Roadmap phase update failed:', error);
    }
  }, [brief.roadmap.value]);

  /**
   * Reorders roadmap phases
   */
  const reorderRoadmapPhases = useCallback(async (newOrder: string[]) => {
    if (!brief.roadmap.value) return;

    try {
      const updatedRoadmap = await roadmapGeneratorRef.current.modifyRoadmap(
        brief.roadmap.value,
        'reorder',
        { newOrder }
      );

      setBrief(prev => ({
        ...prev,
        roadmap: createBriefField(updatedRoadmap, prev.roadmap.confidence),
        user_modified: true,
        last_updated: new Date()
      }));
    } catch (error) {
      console.error('Roadmap reorder failed:', error);
    }
  }, [brief.roadmap.value]);

  /**
   * Adds uploaded files to the brief
   */
  const addUploadedFiles = useCallback((files: UploadedFile[]) => {
    setBrief(prev => ({
      ...prev,
      uploaded_files: [...prev.uploaded_files, ...files],
      last_updated: new Date()
    }));
  }, []);

  /**
   * Resets brief to initial state
   */
  const resetBrief = useCallback(() => {
    setBrief(createInitialBriefState());
  }, []);

  /**
   * Determines if the brief is ready for project creation
   */
  const isReadyForCreation = useCallback((): boolean => {
    return !!(
      brief.name.value &&
      brief.type.value &&
      brief.objective.value &&
      brief.overall_confidence > 0.6
    );
  }, [brief.name.value, brief.type.value, brief.objective.value, brief.overall_confidence]);

  /**
   * Gets project data in format needed for project creation
   */
  const getProjectData = useCallback(() => {
    return {
      name: brief.name.value,
      description: brief.description.value,
      type: brief.type.value,
      objective: brief.objective.value
    };
  }, [brief.name.value, brief.description.value, brief.type.value, brief.objective.value]);

  return {
    brief,
    updateBriefField,
    updateBriefFromAnalysis,
    updateRoadmapPhase,
    reorderRoadmapPhases,
    addUploadedFiles,
    resetBrief,
    isReadyForCreation,
    getProjectData
  };
};