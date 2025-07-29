/**
 * Wizard Orchestration Service
 * 
 * Handles complex AI analysis workflows and cross-hook coordination.
 * Extracted from useHybridProjectState to achieve pure orchestrator pattern.
 * 
 * Phase 6 of hybrid wizard refactoring - service layer abstraction.
 */

import { AcademicProjectParser } from './academic-project-parser';
import { ConversationAnalysis, BriefState } from '@/types/hybrid-wizard';
import { UploadedFile } from '@/components/projects/FileUploadZone';

/**
 * Configuration for orchestration service
 */
export interface OrchestrationConfig {
  /** Enable real-time AI analysis */
  enableRealTimeAnalysis: boolean;
  /** Debounce delay for AI analysis (ms) */
  analysisDebounceDelay: number;
  /** Include file context in analysis */
  includeFileContext: boolean;
}

/**
 * Analysis orchestration result
 */
export interface AnalysisResult {
  /** The analysis result from AI */
  analysis: ConversationAnalysis;
  /** Whether the analysis was successful */
  success: boolean;
  /** Error message if analysis failed */
  error?: string;
}

/**
 * Wizard Orchestration Service
 * 
 * Coordinates complex AI analysis workflows between hooks
 */
export class WizardOrchestrationService {
  private parser: AcademicProjectParser;
  private currentAnalysis: ConversationAnalysis | null = null;

  constructor(private config: OrchestrationConfig) {
    this.parser = new AcademicProjectParser({
      debounce_delay: config.analysisDebounceDelay,
      include_file_context: config.includeFileContext
    });
  }

  /**
   * Analyzes user message input with conversation context
   */
  async analyzeMessage(
    message: string, 
    uploadedFiles: UploadedFile[] = []
  ): Promise<AnalysisResult> {
    if (!this.config.enableRealTimeAnalysis) {
      return {
        analysis: {} as ConversationAnalysis,
        success: false,
        error: 'Real-time analysis is disabled'
      };
    }

    try {
      const analysis = await this.parser.analyzeConversation(
        message,
        uploadedFiles,
        this.currentAnalysis || undefined
      );

      // Cache the analysis for future iterations
      this.currentAnalysis = analysis;

      return {
        analysis,
        success: true
      };
    } catch (error) {
      console.error('Message analysis failed:', error);
      return {
        analysis: {} as ConversationAnalysis,
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }

  /**
   * Analyzes file uploads with existing conversation context
   */
  async analyzeFileUpload(uploadedFiles: UploadedFile[]): Promise<AnalysisResult> {
    if (!this.config.enableRealTimeAnalysis || !this.currentAnalysis) {
      return {
        analysis: {} as ConversationAnalysis,
        success: false,
        error: 'No existing analysis context for file integration'
      };
    }

    if (uploadedFiles.length === 0) {
      return {
        analysis: this.currentAnalysis,
        success: true
      };
    }

    try {
      const updatedAnalysis = await this.parser.analyzeConversation(
        '', // Empty input since we're just adding files
        uploadedFiles,
        this.currentAnalysis
      );

      // Update cached analysis
      this.currentAnalysis = updatedAnalysis;

      return {
        analysis: updatedAnalysis,
        success: true
      };
    } catch (error) {
      console.error('File integration analysis failed:', error);
      return {
        analysis: this.currentAnalysis,
        success: false,
        error: error instanceof Error ? error.message : 'File analysis failed'
      };
    }
  }

  /**
   * Generates active response based on brief field changes
   */
  async generateActiveResponse(
    brief: BriefState,
    field: keyof BriefState,
    triggerAnalyzer: any
  ): Promise<{ message: string; response: any } | null> {
    try {
      const trigger = await triggerAnalyzer.analyzeChange(brief, field);

      if (trigger) {
        const responseMessage = await this.parser.generateActiveResponse(trigger);
        
        const aiResponse = {
          id: `response-${Date.now()}`,
          trigger,
          message: responseMessage,
          dismissed: false,
          created_at: new Date(),
          suggestions: []
        };

        return {
          message: responseMessage,
          response: aiResponse
        };
      }

      return null;
    } catch (error) {
      console.error('Active response generation failed:', error);
      return null;
    }
  }

  /**
   * Gets the current cached analysis
   */
  getCurrentAnalysis(): ConversationAnalysis | null {
    return this.currentAnalysis;
  }

  /**
   * Sets the current cached analysis
   */
  setCurrentAnalysis(analysis: ConversationAnalysis | null): void {
    this.currentAnalysis = analysis;
  }

  /**
   * Clears the current analysis cache
   */
  clearAnalysisCache(): void {
    this.currentAnalysis = null;
  }

  /**
   * Updates service configuration
   */
  updateConfig(newConfig: Partial<OrchestrationConfig>): void {
    Object.assign(this.config, newConfig);
    
    // Update parser configuration if needed
    if (newConfig.analysisDebounceDelay) {
      this.parser = new AcademicProjectParser({
        debounce_delay: newConfig.analysisDebounceDelay,
        include_file_context: this.config.includeFileContext
      });
    }
  }

  /**
   * Resets the orchestration service
   */
  reset(): void {
    this.currentAnalysis = null;
  }
}