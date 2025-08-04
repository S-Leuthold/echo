/**
 * ResponseTriggerAnalyzer Service
 * 
 * Implements the Level 2 Active Response system for the hybrid conversational wizard.
 * Analyzes when AI should respond to user's direct form edits with intelligent
 * suggestions, clarifications, or helpful observations.
 * 
 * Core functionality:
 * - Intelligent trigger detection for form field changes
 * - Context-aware significance analysis
 * - Response priority calculation with user control
 * - Debounced analysis to prevent response spam
 * - User preference learning and adaptation
 * 
 * The goal is to make AI responses feel helpful and timely, not intrusive or chatty.
 */

import { 
  ResponseTrigger, 
  ResponseTriggerType, 
  BriefState,
  AIResponse 
} from '@/types/hybrid-wizard';
import { ProjectType } from '@/types/projects';

/**
 * Configuration for response trigger sensitivity and behavior
 */
interface TriggerAnalysisConfig {
  /** Minimum change threshold to consider responding */
  minimumChangeThreshold: number;
  /** Debounce delay before analyzing changes (ms) */
  debounceDelay: number;
  /** Maximum responses per session to avoid spam */
  maxResponsesPerSession: number;
  /** User's response frequency preference */
  responseFrequency: 'high' | 'medium' | 'low';
  /** Types of triggers user has dismissed (learning) */
  dismissedTriggerTypes: ResponseTriggerType[];
}

/**
 * Default configuration settings
 */
const DEFAULT_CONFIG: TriggerAnalysisConfig = {
  minimumChangeThreshold: 10, // characters
  debounceDelay: 2000, // 2 seconds
  maxResponsesPerSession: 8,
  responseFrequency: 'medium',
  dismissedTriggerTypes: []
};

/**
 * Service class for analyzing when AI should respond to form edits
 * Implements intelligent trigger detection with user preference learning
 */
export class ResponseTriggerAnalyzer {
  private config: TriggerAnalysisConfig;
  private sessionResponseCount: number = 0;
  private analysisTimer: NodeJS.Timeout | null = null;
  private previousBriefState: BriefState | null = null;

  constructor(config: Partial<TriggerAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyzes changes in brief state to determine if AI should respond
   * Uses debouncing to prevent excessive analysis during rapid editing
   * 
   * @param currentBrief Current brief state after user edit
   * @param changedField Field that was modified
   * @returns Promise of response trigger or null if no response needed
   */
  public async analyzeChange(
    currentBrief: BriefState,
    changedField: keyof BriefState
  ): Promise<ResponseTrigger | null> {
    return new Promise((resolve) => {
      // Cancel previous analysis timer
      if (this.analysisTimer) {
        clearTimeout(this.analysisTimer);
      }

      // Set up debounced analysis
      this.analysisTimer = setTimeout(async () => {
        try {
          const trigger = await this.performTriggerAnalysis(currentBrief, changedField);
          resolve(trigger);
        } catch (error) {
          console.error('Trigger analysis failed:', error);
          resolve(null);
        }
      }, this.config.debounceDelay);
    });
  }

  /**
   * Updates user preferences based on their interaction with AI responses
   * Learns from dismissed responses to reduce unwanted interruptions
   * 
   * @param response The AI response that was dismissed
   * @param dismissalReason Why the user dismissed it
   */
  public learnFromDismissal(response: AIResponse, dismissalReason?: string): void {
    const triggerType = response.trigger.type;
    
    // Track dismissed trigger types to reduce similar responses
    if (!this.config.dismissedTriggerTypes.includes(triggerType)) {
      this.config.dismissedTriggerTypes.push(triggerType);
    }

    // Adapt response frequency based on dismissal patterns
    if (this.sessionResponseCount > 0) {
      const dismissalRate = this.config.dismissedTriggerTypes.length / this.sessionResponseCount;
      if (dismissalRate > 0.5 && this.config.responseFrequency === 'high') {
        this.config.responseFrequency = 'medium';
      } else if (dismissalRate > 0.7 && this.config.responseFrequency === 'medium') {
        this.config.responseFrequency = 'low';
      }
    }
  }

  /**
   * Updates configuration based on user preferences
   * 
   * @param updates Configuration updates
   */
  public updateConfig(updates: Partial<TriggerAnalysisConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Resets session counters (call when starting new project creation)
   */
  public resetSession(): void {
    this.sessionResponseCount = 0;
    this.previousBriefState = null;
    this.config.dismissedTriggerTypes = [];
  }

  /**
   * Performs the actual trigger analysis
   * Determines if and why AI should respond to the change
   */
  private async performTriggerAnalysis(
    currentBrief: BriefState,
    changedField: keyof BriefState
  ): Promise<ResponseTrigger | null> {
    // Check session limits
    if (this.sessionResponseCount >= this.config.maxResponsesPerSession) {
      return null;
    }

    // Check if we have previous state for comparison
    if (!this.previousBriefState) {
      this.previousBriefState = currentBrief;
      return null;
    }

    const previousValue = this.previousBriefState[changedField];
    const currentValue = currentBrief[changedField];

    // Determine trigger type and significance
    const triggerType = this.determineTriggerType(
      changedField,
      previousValue,
      currentValue,
      currentBrief
    );

    if (!triggerType) {
      this.previousBriefState = currentBrief;
      return null;
    }

    // Check if user has consistently dismissed this type of trigger
    if (this.config.dismissedTriggerTypes.includes(triggerType)) {
      this.previousBriefState = currentBrief;
      return null;
    }

    // Calculate significance and priority
    const significance = this.calculateSignificance(triggerType, previousValue, currentValue, currentBrief);
    const priority = this.calculatePriority(triggerType, significance, changedField);

    // Check if this trigger meets our response threshold
    if (!this.shouldRespond(triggerType, priority, significance)) {
      this.previousBriefState = currentBrief;
      return null;
    }

    this.sessionResponseCount++;
    this.previousBriefState = currentBrief;

    return {
      type: triggerType,
      field: changedField,
      previous_value: previousValue,
      new_value: currentValue,
      significance,
      priority
    };
  }

  /**
   * Determines the type of trigger based on the change made
   * Uses sophisticated heuristics to categorize the change
   */
  private determineTriggerType(
    field: keyof BriefState,
    previousValue: any,
    currentValue: any,
    briefState: BriefState
  ): ResponseTriggerType | null {
    // Extract actual values from BriefField wrappers
    const prevVal = previousValue?.value || previousValue;
    const currVal = currentValue?.value || currentValue;

    // Field-specific trigger detection
    switch (field) {
      case 'objective':
        return this.analyzeObjectiveChange(prevVal, currVal);
      
      case 'key_deliverables':
        return this.analyzeDeliverablesChange(prevVal, currVal);
      
      case 'description':
        return this.analyzeDescriptionChange(prevVal, currVal, briefState);
      
      case 'type':
        return this.analyzeTypeChange(prevVal, currVal, briefState);
      
      case 'roadmap':
        return this.analyzeRoadmapChange(prevVal, currVal);
      
      default:
        return null;
    }
  }

  /**
   * Field-specific trigger analysis methods
   */
  private analyzeObjectiveChange(previous: string, current: string): ResponseTriggerType | null {
    if (!previous || !current) return null;

    const lengthIncrease = current.length - previous.length;
    
    // Significant expansion suggests scope growth
    if (lengthIncrease > 50) {
      return 'scope-expansion';
    }

    // Look for new requirements or constraints
    const newWords = this.extractNewWords(previous, current);
    if (this.containsConstraintWords(newWords)) {
      return 'conflicting-requirements';
    }

    // Look for implications that suggest missing components
    if (this.containsImplicationWords(newWords)) {
      return 'missing-implications';
    }

    return null;
  }

  private analyzeDeliverablesChange(previous: string[], current: string[]): ResponseTriggerType | null {
    if (!Array.isArray(previous) || !Array.isArray(current)) return null;

    // New deliverables added
    if (current.length > previous.length) {
      const newDeliverables = current.slice(previous.length);
      
      // Check if new deliverables suggest additional phases
      if (this.suggestsAdditionalPhases(newDeliverables)) {
        return 'missing-implications';
      }
      
      return 'scope-expansion';
    }

    // Deliverables removed - might suggest scope reduction
    if (current.length < previous.length) {
      return 'significant-pivot';
    }

    // Check for conflicting deliverables
    if (this.hasConflictingDeliverables(current)) {
      return 'conflicting-requirements';
    }

    return null;
  }

  private analyzeDescriptionChange(previous: string, current: string, briefState: BriefState): ResponseTriggerType | null {
    if (!previous || !current) return null;

    const lengthChange = current.length - previous.length;
    
    // Major description changes might suggest pivot
    if (Math.abs(lengthChange) > 100) {
      return 'significant-pivot';
    }

    // Look for technology or methodology mentions that might need clarification
    const newWords = this.extractNewWords(previous, current);
    if (this.containsTechnicalTerms(newWords)) {
      return 'clarification-needed';
    }

    return null;
  }

  private analyzeTypeChange(previous: ProjectType, current: ProjectType, briefState: BriefState): ResponseTriggerType | null {
    if (!previous || previous === current) return null;

    // Project type change is always significant
    return 'significant-pivot';
  }

  private analyzeRoadmapChange(previous: any, current: any): ResponseTriggerType | null {
    // Roadmap changes are handled by the roadmap generator
    // We mainly look for user modifications that might need clarification
    
    if (!previous?.value && current?.value) {
      // New roadmap generated - check if it aligns with other fields
      return 'suggestion-opportunity';
    }

    return null;
  }

  /**
   * Calculates the significance of a change
   * Higher significance = more likely to trigger response
   */
  private calculateSignificance(
    triggerType: ResponseTriggerType,
    previousValue: any,
    currentValue: any,
    briefState: BriefState
  ): string {
    const baseSignificance = this.getBaseSignificance(triggerType);
    const contextualFactors = this.getContextualFactors(triggerType, briefState);
    
    return `${baseSignificance} ${contextualFactors}`.trim();
  }

  private getBaseSignificance(triggerType: ResponseTriggerType): string {
    switch (triggerType) {
      case 'scope-expansion':
        return 'User added significant new requirements that may affect timeline and resource planning.';
      case 'conflicting-requirements':
        return 'Detected potential conflict between project requirements that may need resolution.';
      case 'missing-implications':
        return 'User\'s changes suggest additional project components that weren\'t initially considered.';
      case 'significant-pivot':
        return 'Major change in project direction that may require updating other project elements.';
      case 'clarification-needed':
        return 'User mentioned concepts that might benefit from clarification or elaboration.';
      case 'suggestion-opportunity':
        return 'Opportunity to provide helpful suggestions based on project evolution.';
      default:
        return 'Project requirements were modified in a way that might benefit from AI input.';
    }
  }

  private getContextualFactors(triggerType: ResponseTriggerType, briefState: BriefState): string {
    // Add context based on current project state
    const factors: string[] = [];
    
    if (briefState.overall_confidence < 0.7) {
      factors.push('Low project confidence suggests need for clarification.');
    }
    
    if (briefState.roadmap.value?.phases.length > 5) {
      factors.push('Complex roadmap may benefit from simplification suggestions.');
    }
    
    return factors.join(' ');
  }

  /**
   * Calculates priority of response based on trigger type and context
   */
  private calculatePriority(
    triggerType: ResponseTriggerType,
    significance: string,
    field: keyof BriefState
  ): 'high' | 'medium' | 'low' {
    // High priority triggers that should almost always get responses
    if (['conflicting-requirements', 'significant-pivot'].includes(triggerType)) {
      return 'high';
    }

    // Medium priority triggers based on field importance
    if (['scope-expansion', 'missing-implications'].includes(triggerType)) {
      return field === 'objective' ? 'high' : 'medium';
    }

    // Low priority for suggestions and clarifications
    return 'low';
  }

  /**
   * Determines if we should respond based on all factors
   */
  private shouldRespond(
    triggerType: ResponseTriggerType,
    priority: 'high' | 'medium' | 'low',
    significance: string
  ): boolean {
    // Always respond to high priority triggers
    if (priority === 'high') {
      return true;
    }

    // Response frequency affects medium and low priority triggers
    switch (this.config.responseFrequency) {
      case 'high':
        return true; // Respond to all triggers
      case 'medium':
        return priority === 'medium'; // Only medium and high
      case 'low':
        return false; // Only high priority (handled above)
      default:
        return priority === 'high';
    }
  }

  /**
   * Utility methods for text analysis
   */
  private extractNewWords(previous: string, current: string): string[] {
    const prevWords = new Set(previous.toLowerCase().split(/\s+/));
    const currWords = current.toLowerCase().split(/\s+/);
    
    return currWords.filter(word => !prevWords.has(word) && word.length > 3);
  }

  private containsConstraintWords(words: string[]): boolean {
    const constraintWords = [
      'deadline', 'budget', 'limited', 'constraint', 'requirement',
      'must', 'cannot', 'restriction', 'timeline', 'urgent'
    ];
    
    return words.some(word => constraintWords.includes(word));
  }

  private containsImplicationWords(words: string[]): boolean {
    const implicationWords = [
      'presentation', 'meeting', 'stakeholder', 'approval', 'review',
      'testing', 'deployment', 'documentation', 'training', 'maintenance'
    ];
    
    return words.some(word => implicationWords.includes(word));
  }

  private containsTechnicalTerms(words: string[]): boolean {
    const technicalTerms = [
      'algorithm', 'framework', 'methodology', 'protocol', 'architecture',
      'integration', 'api', 'database', 'analytics', 'machine learning'
    ];
    
    return words.some(word => technicalTerms.includes(word));
  }

  private suggestsAdditionalPhases(deliverables: string[]): boolean {
    const phaseIndicators = [
      'testing', 'review', 'approval', 'documentation', 'training',
      'deployment', 'maintenance', 'monitoring', 'validation'
    ];
    
    return deliverables.some(deliverable => 
      phaseIndicators.some(indicator => 
        deliverable.toLowerCase().includes(indicator)
      )
    );
  }

  private hasConflictingDeliverables(deliverables: string[]): boolean {
    // Simple conflict detection - in real implementation, this would be more sophisticated
    const conflicts = [
      ['minimal', 'comprehensive'],
      ['quick', 'thorough'],
      ['simple', 'complex'],
      ['basic', 'advanced']
    ];
    
    const lowerDeliverables = deliverables.map(d => d.toLowerCase());
    
    return conflicts.some(([word1, word2]) => 
      lowerDeliverables.some(d => d.includes(word1)) &&
      lowerDeliverables.some(d => d.includes(word2))
    );
  }
}