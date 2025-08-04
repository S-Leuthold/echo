/**
 * useWizardFlow Hook Tests
 * 
 * Tests for the extracted wizard flow management hook.
 * Covers phase transitions, AI responses, project readiness, and configuration.
 * 
 * Part of hybrid wizard refactoring validation.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useWizardFlow } from '../useWizardFlow';
import { ConversationAnalysis, BriefState } from '@/types/hybrid-wizard';

// Mock the ResponseTriggerAnalyzer
jest.mock('@/services/response-trigger-analyzer', () => ({
  ResponseTriggerAnalyzer: jest.fn().mockImplementation(() => ({
    analyzeChange: jest.fn(),
    learnFromDismissal: jest.fn(),
    updateConfig: jest.fn(),
    resetSession: jest.fn()
  }))
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const mockAnalysis: ConversationAnalysis = {
  project_name: 'Test Project',
  project_type: 'personal',
  objective: 'Build a test application',
  description: 'A comprehensive test project',
  deliverables: ['Feature 1', 'Feature 2'],
  confidence: 0.9,
  missing_information: [],
  suggested_questions: []
};

const mockBriefState: BriefState = {
  name: { value: 'Test Project', confidence: 0.9, source: 'ai-generated', is_updating: false, is_valid: true },
  type: { value: 'personal', confidence: 0.9, source: 'ai-generated', is_updating: false, is_valid: true },
  description: { value: 'Test description', confidence: 0.8, source: 'ai-generated', is_updating: false, is_valid: true },
  objective: { value: 'Test objective', confidence: 0.9, source: 'ai-generated', is_updating: false, is_valid: true },
  key_deliverables: { value: ['Deliverable 1'], confidence: 0.8, source: 'ai-generated', is_updating: false, is_valid: true },
  roadmap: { value: null, confidence: 0.5, source: 'ai-generated', is_updating: false, is_valid: true },
  overall_confidence: 0.8,
  user_modified: false,
  last_updated: new Date(),
  uploaded_files: []
};

const mockUserModifiedBrief: BriefState = {
  ...mockBriefState,
  user_modified: true
};

const mockAIResponse = {
  id: 'test-response-1',
  trigger: { type: 'field_change', field: 'name' },
  message: 'Great project name!',
  dismissed: false,
  created_at: new Date(),
  suggestions: []
};

// ============================================================================
// Hook Tests
// ============================================================================

describe('useWizardFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default flow state', () => {
      const { result } = renderHook(() => useWizardFlow());

      expect(result.current.flowState).toEqual({
        phase: 'gathering',
        ai_responses: [],
        can_create_project: false,
        error: null
      });
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        enableActiveResponses: false,
        analysisDebounceDelay: 5000,
        maxResponsesPerSession: 20
      };

      const { result } = renderHook(() => useWizardFlow(customConfig));

      // Configuration is internal, but we can test that the hook initializes
      expect(result.current.flowState.phase).toBe('gathering');
    });
  });

  describe('phase management', () => {
    it('should update phase based on analysis and brief state', () => {
      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.updatePhase(mockAnalysis, mockBriefState);
      });

      // High confidence analysis should move to 'refining' phase
      expect(result.current.flowState.phase).toBe('refining');
    });

    it('should set phase to finalizing when brief is user modified and analysis has low confidence', () => {
      const { result } = renderHook(() => useWizardFlow());

      const lowConfidenceAnalysis = {
        ...mockAnalysis,
        confidence: 0.5
      };

      act(() => {
        result.current.updatePhase(lowConfidenceAnalysis, mockUserModifiedBrief);
      });

      expect(result.current.flowState.phase).toBe('finalizing');
    });

    it('should manually set phase', () => {
      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.setPhase('complete');
      });

      expect(result.current.flowState.phase).toBe('complete');
    });

    it('should return to gathering phase for low confidence analysis', () => {
      const lowConfidenceAnalysis = {
        ...mockAnalysis,
        confidence: 0.3
      };

      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.updatePhase(lowConfidenceAnalysis, mockBriefState);
      });

      expect(result.current.flowState.phase).toBe('gathering');
    });
  });

  describe('AI response management', () => {
    it('should add AI responses', () => {
      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.addAIResponse(mockAIResponse);
      });

      expect(result.current.flowState.ai_responses).toHaveLength(1);
      expect(result.current.flowState.ai_responses[0]).toEqual(mockAIResponse);
    });

    it('should dismiss AI responses', () => {
      const { result } = renderHook(() => useWizardFlow());

      // Add response first
      act(() => {
        result.current.addAIResponse(mockAIResponse);
      });

      // Dismiss it
      act(() => {
        result.current.dismissResponse('test-response-1');
      });

      expect(result.current.flowState.ai_responses[0].dismissed).toBe(true);
    });

    it('should clear all AI responses', () => {
      const { result } = renderHook(() => useWizardFlow());

      // Add multiple responses
      act(() => {
        result.current.addAIResponse(mockAIResponse);
        result.current.addAIResponse({ ...mockAIResponse, id: 'test-response-2' });
      });

      expect(result.current.flowState.ai_responses).toHaveLength(2);

      // Clear all
      act(() => {
        result.current.clearAIResponses();
      });

      expect(result.current.flowState.ai_responses).toHaveLength(0);
    });

    it('should handle dismissing non-existent response gracefully', () => {
      const { result } = renderHook(() => useWizardFlow());

      // Try to dismiss non-existent response
      act(() => {
        result.current.dismissResponse('non-existent-id');
      });

      // Should not throw or change state
      expect(result.current.flowState.ai_responses).toHaveLength(0);
    });
  });

  describe('project creation readiness', () => {
    it('should update project readiness based on analysis', () => {
      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.updateProjectReadiness(mockAnalysis);
      });

      // Analysis has all required fields and high confidence
      expect(result.current.flowState.can_create_project).toBe(true);
    });

    it('should not allow creation for incomplete analysis', () => {
      const incompleteAnalysis = {
        ...mockAnalysis,
        project_name: '',
        confidence: 0.4
      };

      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.updateProjectReadiness(incompleteAnalysis);
      });

      expect(result.current.flowState.can_create_project).toBe(false);
    });

    it('should manually set project readiness', () => {
      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.setProjectReadiness(true);
      });

      expect(result.current.flowState.can_create_project).toBe(true);
    });
  });

  describe('error management', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useWizardFlow());

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.flowState.error).toBe('Test error message');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.flowState.error).toBe(null);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const { result } = renderHook(() => useWizardFlow());

      // This tests that updateConfig doesn't throw
      act(() => {
        result.current.updateConfig({
          enableActiveResponses: false,
          maxResponsesPerSession: 15
        });
      });

      // Configuration update is internal, but should not affect flow state
      expect(result.current.flowState.phase).toBe('gathering');
    });
  });

  describe('reset functionality', () => {
    it('should reset flow to initial state', () => {
      const { result } = renderHook(() => useWizardFlow());

      // Modify state
      act(() => {
        result.current.setPhase('complete');
        result.current.addAIResponse(mockAIResponse);
        result.current.setProjectReadiness(true);
        result.current.setError('Test error');
      });

      // Verify state is modified
      expect(result.current.flowState.phase).toBe('complete');
      expect(result.current.flowState.ai_responses).toHaveLength(1);
      expect(result.current.flowState.can_create_project).toBe(true);
      expect(result.current.flowState.error).toBe('Test error');

      // Reset
      act(() => {
        result.current.resetFlow();
      });

      // Should be back to initial state
      expect(result.current.flowState).toEqual({
        phase: 'gathering',
        ai_responses: [],
        can_create_project: false,
        error: null
      });
    });
  });

  describe('trigger analyzer integration', () => {
    it('should provide access to trigger analyzer', () => {
      const { result } = renderHook(() => useWizardFlow());

      const triggerAnalyzer = result.current.getTriggerAnalyzer();

      expect(triggerAnalyzer).toBeDefined();
      expect(typeof triggerAnalyzer.analyzeChange).toBe('function');
      expect(typeof triggerAnalyzer.learnFromDismissal).toBe('function');
    });
  });

  describe('phase determination logic', () => {
    it('should handle edge cases in phase determination', () => {
      const { result } = renderHook(() => useWizardFlow());

      // Test with minimal analysis
      const minimalAnalysis = {
        ...mockAnalysis,
        project_name: '',
        objective: '',
        confidence: 0.5
      };

      act(() => {
        result.current.updatePhase(minimalAnalysis, mockBriefState);
      });

      expect(result.current.flowState.phase).toBe('gathering');
    });

    it('should prioritize high confidence analysis over user modification', () => {
      const { result } = renderHook(() => useWizardFlow());

      // High confidence analysis takes precedence over user modification
      act(() => {
        result.current.updatePhase(mockAnalysis, mockUserModifiedBrief);
      });

      expect(result.current.flowState.phase).toBe('refining');
    });
  });
});