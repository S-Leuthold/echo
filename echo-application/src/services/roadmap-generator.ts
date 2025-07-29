/**
 * ProjectRoadmapGenerator Service
 * 
 * Specialized service for generating intelligent project roadmaps with timeline phases.
 * Uses Claude Sonnet 4 to create strategic project phases based on project context,
 * type, and user requirements.
 * 
 * Core functionality:
 * - AI-generated project phases with logical progression
 * - Context-aware phase suggestions based on project type
 * - Timeline estimation with realistic duration forecasting
 * - Phase modification and reordering support
 * - Integration with existing project data
 * 
 * Follows single-responsibility principle by focusing solely on roadmap generation.
 */

import { ProjectType } from '@/types/projects';
import { ProjectRoadmap, ProjectRoadmapPhase } from '@/types/projects';
import { ConversationAnalysis } from '@/types/hybrid-wizard';

/**
 * Template roadmaps for different project types
 * Used as fallbacks and for rapid generation
 */
const ROADMAP_TEMPLATES: Record<ProjectType, ProjectRoadmapPhase[]> = {
  software: [
    { id: 'planning', title: 'Planning & Design', goal: 'Define requirements and create system architecture', order: 0, is_current: true, estimated_days: 7 },
    { id: 'development', title: 'Core Development', goal: 'Implement core features and functionality', order: 1, is_current: false, estimated_days: 21 },
    { id: 'testing', title: 'Testing & QA', goal: 'Comprehensive testing and bug resolution', order: 2, is_current: false, estimated_days: 7 },
    { id: 'deployment', title: 'Deployment & Launch', goal: 'Deploy to production and monitor initial performance', order: 3, is_current: false, estimated_days: 3 }
  ],
  research: [
    { id: 'literature', title: 'Literature Review', goal: 'Survey existing research and identify knowledge gaps', order: 0, is_current: true, estimated_days: 14 },
    { id: 'methodology', title: 'Methodology Design', goal: 'Design research methodology and data collection approach', order: 1, is_current: false, estimated_days: 7 },
    { id: 'data-collection', title: 'Data Collection', goal: 'Execute data collection according to methodology', order: 2, is_current: false, estimated_days: 28 },
    { id: 'analysis', title: 'Analysis & Interpretation', goal: 'Analyze results and interpret findings', order: 3, is_current: false, estimated_days: 14 },
    { id: 'documentation', title: 'Documentation & Publishing', goal: 'Write up findings and prepare for publication', order: 4, is_current: false, estimated_days: 21 }
  ],
  writing: [
    { id: 'outline', title: 'Outline & Research', goal: 'Create detailed outline and gather supporting research', order: 0, is_current: true, estimated_days: 7 },
    { id: 'draft', title: 'First Draft', goal: 'Complete initial draft with all major sections', order: 1, is_current: false, estimated_days: 21 },
    { id: 'revision', title: 'Revision & Editing', goal: 'Revise structure, content, and flow', order: 2, is_current: false, estimated_days: 14 },
    { id: 'polish', title: 'Final Polish', goal: 'Copy editing, proofreading, and formatting', order: 3, is_current: false, estimated_days: 7 }
  ],
  creative: [
    { id: 'concept', title: 'Concept Development', goal: 'Develop and refine creative concept and vision', order: 0, is_current: true, estimated_days: 7 },
    { id: 'planning', title: 'Creative Planning', goal: 'Plan execution approach and gather materials', order: 1, is_current: false, estimated_days: 5 },
    { id: 'creation', title: 'Creative Execution', goal: 'Execute main creative work', order: 2, is_current: false, estimated_days: 21 },
    { id: 'refinement', title: 'Refinement & Finalization', goal: 'Polish and finalize creative output', order: 3, is_current: false, estimated_days: 7 }
  ],
  admin: [
    { id: 'assessment', title: 'Assessment & Planning', goal: 'Assess current state and plan administrative changes', order: 0, is_current: true, estimated_days: 3 },
    { id: 'implementation', title: 'Implementation', goal: 'Execute administrative tasks and processes', order: 1, is_current: false, estimated_days: 14 },
    { id: 'verification', title: 'Verification & Documentation', goal: 'Verify completion and document outcomes', order: 2, is_current: false, estimated_days: 3 }
  ],
  personal: [
    { id: 'planning', title: 'Goal Setting & Planning', goal: 'Define clear goals and create action plan', order: 0, is_current: true, estimated_days: 3 },
    { id: 'execution', title: 'Active Work', goal: 'Execute planned activities and track progress', order: 1, is_current: false, estimated_days: 21 },
    { id: 'review', title: 'Review & Adjustment', goal: 'Review progress and make necessary adjustments', order: 2, is_current: false, estimated_days: 3 }
  ]
};

/**
 * Service class for generating intelligent project roadmaps
 * Specializes in creating timeline phases with logical progression
 */
export class ProjectRoadmapGenerator {
  
  /**
   * Generates a complete project roadmap based on project context
   * Uses AI analysis to create customized phases or falls back to templates
   * 
   * @param analysis Conversation analysis from HybridProjectParser
   * @param projectType Project type for context
   * @param customRequirements Optional custom requirements
   * @returns Complete project roadmap with phases
   */
  public async generateRoadmap(
    analysis: ConversationAnalysis,
    projectType: ProjectType,
    customRequirements?: string[]
  ): Promise<ProjectRoadmap> {
    try {
      // Try AI-generated roadmap first
      const aiRoadmap = await this.generateAIRoadmap(analysis, projectType, customRequirements);
      return aiRoadmap;
    } catch (error) {
      console.error('AI roadmap generation failed, using template:', error);
      // Fallback to template-based roadmap
      return this.generateTemplateRoadmap(projectType, analysis);
    }
  }

  /**
   * Modifies an existing roadmap by adding, removing, or reordering phases
   * Maintains logical phase progression and updates dependencies
   * 
   * @param existingRoadmap Current roadmap
   * @param modification Type of modification to make
   * @param phaseData Data for the modification
   * @returns Updated roadmap
   */
  public async modifyRoadmap(
    existingRoadmap: ProjectRoadmap,
    modification: 'add' | 'remove' | 'reorder' | 'update',
    phaseData: any
  ): Promise<ProjectRoadmap> {
    const updatedRoadmap = { ...existingRoadmap };
    updatedRoadmap.user_modified = true;
    updatedRoadmap.generated_at = new Date().toISOString();

    switch (modification) {
      case 'add':
        updatedRoadmap.phases = this.addPhase(updatedRoadmap.phases, phaseData);
        break;
      case 'remove':
        updatedRoadmap.phases = this.removePhase(updatedRoadmap.phases, phaseData.id);
        break;
      case 'reorder':
        updatedRoadmap.phases = this.reorderPhases(updatedRoadmap.phases, phaseData.newOrder);
        break;
      case 'update':
        updatedRoadmap.phases = this.updatePhase(updatedRoadmap.phases, phaseData);
        break;
    }

    // Recalculate order numbers
    updatedRoadmap.phases = this.normalizePhaseOrder(updatedRoadmap.phases);
    
    return updatedRoadmap;
  }

  /**
   * Suggests additional phases based on project evolution
   * Analyzes current roadmap and suggests logical next steps
   * 
   * @param currentRoadmap Existing roadmap
   * @param projectContext Current project context
   * @returns Suggested additional phases
   */
  public async suggestAdditionalPhases(
    currentRoadmap: ProjectRoadmap,
    projectContext: string
  ): Promise<ProjectRoadmapPhase[]> {
    try {
      const prompt = this.buildPhaseSuggestionPrompt(currentRoadmap, projectContext);
      const response = await this.callAIForSuggestions(prompt);
      return this.parsePhaseSuggestions(response);
    } catch (error) {
      console.error('Phase suggestion failed:', error);
      return []; // Return empty array on failure
    }
  }

  /**
   * Generates AI-powered custom roadmap using Claude Sonnet 4
   * Creates phases tailored to specific project requirements
   */
  private async generateAIRoadmap(
    analysis: ConversationAnalysis,
    projectType: ProjectType,
    customRequirements?: string[]
  ): Promise<ProjectRoadmap> {
    const prompt = this.buildRoadmapGenerationPrompt(analysis, projectType, customRequirements);
    const response = await this.callClaudeAPI(prompt);
    const phases = this.parseAIRoadmapResponse(response);
    
    return {
      phases: this.normalizePhaseOrder(phases),
      current_phase_id: phases.length > 0 ? phases[0].id : null,
      ai_confidence: analysis.confidence,
      generated_at: new Date().toISOString(),
      user_modified: false
    };
  }

  /**
   * Generates template-based roadmap as fallback
   * Uses predefined templates with customization based on analysis
   */
  private generateTemplateRoadmap(
    projectType: ProjectType,
    analysis: ConversationAnalysis
  ): ProjectRoadmap {
    const templatePhases = ROADMAP_TEMPLATES[projectType] || ROADMAP_TEMPLATES.personal;
    
    // Customize template phases based on analysis
    const customizedPhases = templatePhases.map(phase => ({
      ...phase,
      id: `${phase.id}-${Date.now()}`, // Unique IDs
      title: this.customizePhaseTitle(phase.title, analysis),
      goal: this.customizePhaseGoal(phase.goal, analysis)
    }));

    return {
      phases: customizedPhases,
      current_phase_id: customizedPhases.length > 0 ? customizedPhases[0].id : null,
      ai_confidence: 0.7, // Medium confidence for template-based
      generated_at: new Date().toISOString(),
      user_modified: false
    };
  }

  /**
   * Builds the AI prompt for roadmap generation
   * Includes project context, requirements, and output format specifications
   */
  private buildRoadmapGenerationPrompt(
    analysis: ConversationAnalysis,
    projectType: ProjectType,
    customRequirements?: string[]
  ): string {
    let prompt = `You are an expert project strategist. Create a logical project roadmap with 3-5 phases for the following project:

Project Type: ${projectType}
Project Name: ${analysis.project_name || 'Unnamed Project'}
Description: ${analysis.description}
Objective: ${analysis.objective || 'Not specified'}
Deliverables: ${analysis.deliverables.join(', ') || 'Not specified'}

`;

    if (customRequirements && customRequirements.length > 0) {
      prompt += `Custom Requirements:\n${customRequirements.map(req => `- ${req}`).join('\n')}\n\n`;
    }

    prompt += `Create a roadmap with phases that:
1. Follow a logical progression from start to finish
2. Are specific to this project type and requirements
3. Include realistic time estimates
4. Have clear, actionable goals

Provide your response as JSON in this format:
{
  "phases": [
    {
      "title": "Phase Name",
      "goal": "One clear sentence describing what this phase achieves",
      "estimated_days": 14
    }
  ]
}

Focus on strategic phases, not micro-tasks. Each phase should represent a significant milestone.`;

    return prompt;
  }

  /**
   * Builds prompt for suggesting additional phases
   */
  private buildPhaseSuggestionPrompt(currentRoadmap: ProjectRoadmap, projectContext: string): string {
    const phasesList = currentRoadmap.phases.map(p => `${p.title}: ${p.goal}`).join('\n');
    
    return `Given this existing project roadmap:

${phasesList}

Project Context: ${projectContext}

Suggest 1-2 additional phases that might be missing or beneficial. Consider:
- Quality assurance phases
- Stakeholder review phases  
- Documentation phases
- Maintenance/follow-up phases

Respond with JSON format:
{
  "suggested_phases": [
    {
      "title": "Phase Name",
      "goal": "Clear phase goal",
      "estimated_days": 7,
      "rationale": "Why this phase would be beneficial"
    }
  ]
}`;
  }

  /**
   * Mock Claude API call for development
   * In production, this would use actual Claude API integration
   */
  private async callClaudeAPI(prompt: string): Promise<string> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock response based on prompt analysis
    return this.generateMockRoadmapResponse(prompt);
  }

  /**
   * Mock AI call for phase suggestions
   */
  private async callAIForSuggestions(prompt: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return `{
      "suggested_phases": [
        {
          "title": "Quality Review",
          "goal": "Comprehensive quality review and stakeholder approval",
          "estimated_days": 5,
          "rationale": "Ensures quality standards are met before final delivery"
        }
      ]
    }`;
  }

  /**
   * Parses AI response into roadmap phases
   */
  private parseAIRoadmapResponse(response: string): ProjectRoadmapPhase[] {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const parsed = JSON.parse(jsonMatch[0]);
      const phases = parsed.phases || [];
      
      return phases.map((phase: any, index: number) => ({
        id: `phase-${index}-${Date.now()}`,
        title: phase.title || `Phase ${index + 1}`,
        goal: phase.goal || 'Complete phase objectives',
        order: index,
        is_current: index === 0,
        estimated_days: phase.estimated_days || 14
      }));
    } catch (error) {
      console.error('Failed to parse AI roadmap response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  /**
   * Parses phase suggestions from AI response
   */
  private parsePhaseSuggestions(response: string): ProjectRoadmapPhase[] {
    try {
      const parsed = JSON.parse(response);
      const suggestions = parsed.suggested_phases || [];
      
      return suggestions.map((suggestion: any, index: number) => ({
        id: `suggested-${index}-${Date.now()}`,
        title: suggestion.title,
        goal: suggestion.goal,
        order: 999, // Will be normalized later
        is_current: false,
        estimated_days: suggestion.estimated_days || 7
      }));
    } catch (error) {
      console.error('Failed to parse phase suggestions:', error);
      return [];
    }
  }

  /**
   * Phase manipulation utilities
   */
  private addPhase(phases: ProjectRoadmapPhase[], newPhase: Partial<ProjectRoadmapPhase>): ProjectRoadmapPhase[] {
    const phase: ProjectRoadmapPhase = {
      id: `phase-${Date.now()}`,
      title: newPhase.title || 'New Phase',
      goal: newPhase.goal || 'Complete phase objectives',
      order: newPhase.order ?? phases.length,
      is_current: false,
      estimated_days: newPhase.estimated_days || 14
    };
    
    return [...phases, phase];
  }

  private removePhase(phases: ProjectRoadmapPhase[], phaseId: string): ProjectRoadmapPhase[] {
    return phases.filter(phase => phase.id !== phaseId);
  }

  private updatePhase(phases: ProjectRoadmapPhase[], updateData: Partial<ProjectRoadmapPhase> & { id: string }): ProjectRoadmapPhase[] {
    return phases.map(phase => 
      phase.id === updateData.id 
        ? { ...phase, ...updateData }
        : phase
    );
  }

  private reorderPhases(phases: ProjectRoadmapPhase[], newOrder: string[]): ProjectRoadmapPhase[] {
    const phaseMap = new Map(phases.map(p => [p.id, p]));
    
    return newOrder.map((id, index) => {
      const phase = phaseMap.get(id);
      if (!phase) throw new Error(`Phase ${id} not found`);
      
      return { ...phase, order: index };
    });
  }

  private normalizePhaseOrder(phases: ProjectRoadmapPhase[]): ProjectRoadmapPhase[] {
    return phases
      .sort((a, b) => a.order - b.order)
      .map((phase, index) => ({ ...phase, order: index }));
  }

  /**
   * Template customization utilities
   */
  private customizePhaseTitle(templateTitle: string, analysis: ConversationAnalysis): string {
    // Basic customization - in real implementation, this would be more sophisticated
    if (analysis.project_name && templateTitle.includes('Planning')) {
      return `${analysis.project_name} Planning & Design`;
    }
    return templateTitle;
  }

  private customizePhaseGoal(templateGoal: string, analysis: ConversationAnalysis): string {
    // Basic customization based on analysis
    return templateGoal;
  }

  /**
   * Mock response generator for development
   */
  private generateMockRoadmapResponse(prompt: string): string {
    // Analyze prompt to determine project type and generate appropriate phases
    const projectType = prompt.match(/Project Type: (\w+)/)?.[1] as ProjectType || 'personal';
    const template = ROADMAP_TEMPLATES[projectType] || ROADMAP_TEMPLATES.personal;
    
    const mockPhases = template.map(phase => ({
      title: phase.title,
      goal: phase.goal,
      estimated_days: phase.estimated_days || 14
    }));

    return JSON.stringify({ phases: mockPhases }, null, 2);
  }
}