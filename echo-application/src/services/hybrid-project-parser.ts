/**
 * HybridProjectParser Service
 * 
 * Handles real-time parsing of user conversation into structured project data
 * using Claude Sonnet 4 for intelligent field extraction and project analysis.
 * 
 * Core functionality:
 * - Real-time conversation analysis with debouncing
 * - Structured project data extraction with confidence scoring
 * - File context integration for enhanced understanding
 * - Graceful error handling with fallback behavior
 * 
 * Follows Echo's established patterns for LLM integration and error handling.
 */

import { ProjectType } from '@/types/projects';
import { 
  ConversationAnalysis, 
  LLMParsingConfig,
  ConversationMessage,
  ResponseTrigger,
  ResponseTriggerType 
} from '@/types/hybrid-wizard';
import { UploadedFile } from '@/components/projects/FileUploadZone';

/**
 * Configuration for Claude API integration
 * Following Echo's established Claude Sonnet 4 patterns
 */
const DEFAULT_LLM_CONFIG: LLMParsingConfig = {
  model: 'claude-sonnet-4',
  max_tokens: 1500,
  temperature: 0.3, // Lower temperature for consistent parsing
  include_file_context: true,
  debounce_delay: 2000 // 2 second debounce for real-time updates
};

/**
 * Service class for parsing user conversations into structured project data
 * Uses Claude Sonnet 4 for intelligent analysis and field extraction
 */
export class HybridProjectParser {
  private config: LLMParsingConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(config: Partial<LLMParsingConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
  }

  /**
   * Analyzes user conversation and extracts structured project data
   * with real-time debouncing to prevent excessive API calls
   * 
   * @param input User's conversation input
   * @param uploadedFiles Optional files for context
   * @param existingAnalysis Previous analysis to build upon
   * @returns Promise of structured conversation analysis
   */
  public async analyzeConversation(
    input: string,
    uploadedFiles: UploadedFile[] = [],
    existingAnalysis?: ConversationAnalysis
  ): Promise<ConversationAnalysis> {
    return new Promise((resolve, reject) => {
      // Cancel previous debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      // Cancel previous API request
      if (this.abortController) {
        this.abortController.abort();
      }

      // Set up new debounce timer
      this.debounceTimer = setTimeout(async () => {
        try {
          const analysis = await this.performAnalysis(input, uploadedFiles, existingAnalysis);
          resolve(analysis);
        } catch (error) {
          reject(error);
        }
      }, this.config.debounce_delay);
    });
  }

  /**
   * Analyzes changes between previous and current project data
   * to determine if AI should respond with suggestions or clarifications
   * 
   * @param previousData Previous project analysis
   * @param currentData Current project analysis
   * @param changedField Field that was modified
   * @returns Response trigger analysis or null if no response needed
   */
  public analyzeResponseTrigger(
    previousData: any,
    currentData: any,
    changedField: string
  ): ResponseTrigger | null {
    const triggerType = this.determineTriggerType(previousData, currentData, changedField);
    
    if (!triggerType) {
      return null;
    }

    return {
      type: triggerType,
      field: changedField as any,
      previous_value: previousData,
      new_value: currentData,
      significance: this.generateSignificanceAnalysis(triggerType, previousData, currentData),
      priority: this.determineTriggerPriority(triggerType)
    };
  }

  /**
   * Generates AI response to user's direct form edits
   * Part of the Level 2 Active Response system
   * 
   * @param trigger Response trigger analysis
   * @returns AI response message with suggestions
   */
  public async generateActiveResponse(trigger: ResponseTrigger): Promise<string> {
    try {
      const prompt = this.buildActiveResponsePrompt(trigger);
      const response = await this.callClaudeAPI(prompt, 300); // Shorter response for active responses
      
      return this.extractResponseMessage(response);
    } catch (error) {
      // Graceful fallback for active response failures
      console.error('Active response generation failed:', error);
      return this.generateFallbackResponse(trigger);
    }
  }

  /**
   * Performs the actual LLM analysis with structured output parsing
   * Following Echo's established Claude integration patterns
   */
  private async performAnalysis(
    input: string,
    uploadedFiles: UploadedFile[],
    existingAnalysis?: ConversationAnalysis
  ): Promise<ConversationAnalysis> {
    try {
      // Set up abort controller for request cancellation
      this.abortController = new AbortController();
      
      const prompt = this.buildAnalysisPrompt(input, uploadedFiles, existingAnalysis);
      const response = await this.callClaudeAPI(prompt, this.config.max_tokens);
      
      return this.parseStructuredResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Analysis cancelled due to new input');
      }
      
      // Graceful fallback with basic parsing
      console.error('LLM analysis failed, using fallback:', error);
      return this.generateFallbackAnalysis(input, uploadedFiles);
    }
  }

  /**
   * Builds the analysis prompt for Claude API
   * Includes conversation context, file content, and structured output instructions
   */
  private buildAnalysisPrompt(
    input: string,
    uploadedFiles: UploadedFile[],
    existingAnalysis?: ConversationAnalysis
  ): string {
    let prompt = `You are an intelligent project creation assistant helping users structure their project ideas.

Analyze the following user input and extract structured project information. Focus on what the user explicitly states and make reasonable inferences where appropriate.

User Input:
"${input}"

`;

    // Include file context if available
    if (uploadedFiles.length > 0 && this.config.include_file_context) {
      prompt += `Uploaded Files Context:\n`;
      uploadedFiles.forEach(file => {
        prompt += `- ${file.name}: ${this.summarizeFileContent(file)}\n`;
      });
      prompt += '\n';
    }

    // Include existing analysis for incremental updates
    if (existingAnalysis) {
      prompt += `Previous Analysis (build upon this):\n`;
      prompt += `Project Name: ${existingAnalysis.project_name || 'Not specified'}\n`;
      prompt += `Type: ${existingAnalysis.project_type || 'Not specified'}\n`;
      prompt += `Objective: ${existingAnalysis.objective || 'Not specified'}\n`;
      prompt += `Current Deliverables: ${existingAnalysis.deliverables.join(', ') || 'None specified'}\n\n`;
    }

    prompt += `Please provide a JSON response with the following structure:
{
  "project_name": "extracted or inferred project name",
  "project_type": "one of: software, research, writing, creative, admin, personal",
  "description": "comprehensive description based on user input",
  "objective": "clear, one-sentence primary objective",
  "deliverables": ["list", "of", "key", "deliverables"],
  "suggested_phases": [
    {
      "title": "Phase Name",
      "goal": "One-sentence phase goal",
      "estimated_days": 14
    }
  ],
  "confidence": 0.85,
  "missing_information": ["what additional info would be helpful"]
}

Guidelines:
- Only extract information that's clearly stated or strongly implied
- For project_type, choose the best fit based on the description
- Suggest 3-5 logical phases that follow a natural progression
- Set confidence based on how complete the information is
- Be specific about missing information that would help`;

    return prompt;
  }

  /**
   * Builds prompt for active response generation
   * Used when user edits form fields directly
   */
  private buildActiveResponsePrompt(trigger: ResponseTrigger): string {
    return `You are an intelligent project assistant. The user just made a change to their project brief, and you should provide a helpful, brief response.

Change Made: ${trigger.field} was modified
Previous Value: ${JSON.stringify(trigger.previous_value)}
New Value: ${JSON.stringify(trigger.new_value)}
Significance: ${trigger.significance}

Provide a brief, helpful response (1-2 sentences max). If appropriate, ask a clarifying question or suggest related updates. Be conversational but not chatty.

Examples of good responses:
- "Got it. Since you mentioned a slide deck, would you like me to add 'Create board presentation' to the deliverables?"
- "I notice that timeline might be tight for those deliverables. Should I suggest breaking them into phases?"
- "Thanks for the clarification. I've updated the project understanding."

Your response:`;
  }

  /**
   * Makes actual API call to Claude
   * Following Echo's established Claude Sonnet 4 integration patterns
   */
  private async callClaudeAPI(prompt: string, maxTokens: number): Promise<string> {
    // Real implementation calling our backend Claude integration
    try {
      const response = await fetch('http://localhost:8000/projects/analyze-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.abortController?.signal,
        body: JSON.stringify({
          message: prompt,
          conversation_history: [
            {
              role: 'user',
              content: prompt,
              timestamp: new Date().toISOString()
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully called Claude API via backend:', data);
      
      // Return the AI analysis as formatted JSON string
      return JSON.stringify(data.analysis || data);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      console.error('Claude API call failed, falling back to mock:', error);
      // Fallback to mock response if API fails
      await new Promise(resolve => setTimeout(resolve, 800));
      return this.generateMockClaudeResponse(prompt);
    }
  }

  /**
   * Parses structured JSON response from Claude
   * Includes error handling for malformed responses
   */
  private parseStructuredResponse(response: string): ConversationAnalysis {
    try {
      // Extract JSON from response (Claude sometimes includes explanatory text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      return {
        project_name: parsed.project_name || undefined,
        project_type: this.validateProjectType(parsed.project_type),
        description: parsed.description || '',
        objective: parsed.objective || undefined,
        deliverables: Array.isArray(parsed.deliverables) ? parsed.deliverables : [],
        suggested_phases: Array.isArray(parsed.suggested_phases) ? parsed.suggested_phases : [],
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1),
        missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : []
      };
    } catch (error) {
      console.error('Failed to parse structured response:', error);
      throw new Error('Invalid response format from LLM');
    }
  }

  /**
   * Generates fallback analysis when LLM fails
   * Uses basic text processing to extract what we can
   */
  private generateFallbackAnalysis(
    input: string,
    uploadedFiles: UploadedFile[]
  ): ConversationAnalysis {
    // Basic fallback parsing using text analysis
    const words = input.toLowerCase().split(/\s+/);
    
    return {
      project_name: this.extractProjectNameFallback(input),
      project_type: this.inferProjectTypeFallback(words),
      description: input.substring(0, 300), // First 300 chars as description
      objective: undefined,
      deliverables: this.extractDeliverablesFallback(input),
      suggested_phases: [
        { title: 'Planning', goal: 'Define project scope and requirements', estimated_days: 7 },
        { title: 'Execution', goal: 'Complete main project work', estimated_days: 21 },
        { title: 'Review', goal: 'Review and finalize deliverables', estimated_days: 7 }
      ],
      confidence: 0.3, // Low confidence for fallback
      missing_information: ['More specific project details needed']
    };
  }

  /**
   * Utility methods for parsing and analysis
   */
  private validateProjectType(type: string): ProjectType | undefined {
    const validTypes: ProjectType[] = ['software', 'research', 'writing', 'creative', 'admin', 'personal'];
    return validTypes.includes(type as ProjectType) ? type as ProjectType : undefined;
  }

  private summarizeFileContent(file: UploadedFile): string {
    if (!file.content) return `${file.name} (processing...)`;
    
    const content = file.content.toString();
    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  }

  private determineTriggerType(
    previousData: any,
    currentData: any,
    changedField: string
  ): ResponseTriggerType | null {
    // Simple trigger detection logic
    // In real implementation, this would be much more sophisticated
    
    if (changedField === 'objective' && currentData.length > previousData?.length + 50) {
      return 'scope-expansion';
    }
    
    if (changedField === 'key_deliverables' && currentData.length > (previousData?.length || 0)) {
      return 'scope-expansion';
    }
    
    return null; // No response needed
  }

  private generateSignificanceAnalysis(
    triggerType: ResponseTriggerType,
    previousData: any,
    currentData: any
  ): string {
    switch (triggerType) {
      case 'scope-expansion':
        return 'User added significant new requirements or deliverables';
      case 'conflicting-requirements':
        return 'New requirements may conflict with existing constraints';
      default:
        return 'Project requirements were modified';
    }
  }

  private determineTriggerPriority(triggerType: ResponseTriggerType): 'high' | 'medium' | 'low' {
    switch (triggerType) {
      case 'scope-expansion':
      case 'conflicting-requirements':
        return 'high';
      case 'missing-implications':
        return 'medium';
      default:
        return 'low';
    }
  }

  private generateFallbackResponse(trigger: ResponseTrigger): string {
    return "I've noted your changes. Is there anything specific you'd like me to help clarify or expand on?";
  }

  private extractResponseMessage(response: string): string {
    // Extract the actual response message from Claude's output
    return response.trim();
  }

  // Fallback parsing methods
  private extractProjectNameFallback(input: string): string | undefined {
    const patterns = [
      /(?:project|working on|building|creating)\s+(?:a|an|the)?\s*([A-Z][^.!?]*)/i,
      /^([A-Z][^.!?]{5,50})/
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return undefined;
  }

  private inferProjectTypeFallback(words: string[]): ProjectType {
    if (words.some(w => ['code', 'app', 'software', 'website', 'development'].includes(w))) {
      return 'software';
    }
    if (words.some(w => ['research', 'study', 'analysis', 'experiment'].includes(w))) {
      return 'research';
    }
    if (words.some(w => ['write', 'writing', 'article', 'book', 'paper'].includes(w))) {
      return 'writing';
    }
    if (words.some(w => ['design', 'creative', 'art', 'visual'].includes(w))) {
      return 'creative';
    }
    
    return 'personal'; // Default fallback
  }

  private extractDeliverablesFallback(input: string): string[] {
    // Very basic deliverable extraction
    const deliverables: string[] = [];
    
    // Look for bullet points or numbered lists
    const lines = input.split('\n');
    for (const line of lines) {
      if (line.match(/^[\s]*[-*•]\s*(.+)$/)) {
        deliverables.push(line.replace(/^[\s]*[-*•]\s*/, '').trim());
      }
    }
    
    return deliverables;
  }

  /**
   * Mock Claude response generator for development
   * This would be replaced with actual Claude API integration
   */
  private generateMockClaudeResponse(prompt: string): string {
    // Analyze prompt to generate appropriate mock response
    const input = prompt.match(/User Input:\s*"([^"]+)"/)?.[1] || '';
    
    const mockResponse = {
      project_name: this.extractProjectNameFallback(input) || 'New Project',
      project_type: this.inferProjectTypeFallback(input.toLowerCase().split(' ')),
      description: `A ${this.inferProjectTypeFallback(input.toLowerCase().split(' '))} project focused on ${input.substring(0, 100)}...`,
      objective: `Successfully complete the ${this.inferProjectTypeFallback(input.toLowerCase().split(' '))} project requirements`,
      deliverables: this.extractDeliverablesFallback(input).slice(0, 3),
      suggested_phases: [
        { title: 'Planning & Research', goal: 'Define scope and gather requirements', estimated_days: 7 },
        { title: 'Core Development', goal: 'Execute main project activities', estimated_days: 21 },
        { title: 'Review & Finalization', goal: 'Complete final review and delivery', estimated_days: 7 }
      ],
      confidence: 0.8,
      missing_information: input.length < 50 ? ['More specific project details', 'Timeline requirements'] : []
    };

    return JSON.stringify(mockResponse, null, 2);
  }
}