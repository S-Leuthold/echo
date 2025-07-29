/**
 * AcademicProjectParser Service
 * 
 * Enhanced version of HybridProjectParser with academic domain intelligence.
 * Integrates AcademicDomainDetector for specialized academic project analysis.
 * 
 * Core functionality:
 * - Academic domain detection and confidence scoring
 * - Real-time conversation analysis with domain-aware responses
 * - Academic file type recognition and context integration
 * - Specialized prompts for research, grant writing, and academic software
 * 
 * Extends Echo's established patterns for LLM integration with academic focus.
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
 * Academic domain information for enhanced project parsing
 */
export interface AcademicDomainInfo {
  domain: string;
  confidence: number;
  description: string;
  reasoning: string;
  alternative_domains?: Array<[string, number]>;
}

/**
 * Enhanced conversation analysis with academic domain context
 */
export interface AcademicConversationAnalysis extends ConversationAnalysis {
  academic_domain?: AcademicDomainInfo;
  academic_context?: {
    methodology?: string;
    tools_mentioned?: string[];
    file_types_detected?: string[];
    research_stage?: string;
  };
}

/**
 * Configuration for academic-focused Claude API integration
 */
const ACADEMIC_LLM_CONFIG: LLMParsingConfig = {
  model: 'claude-sonnet-4-20250514', // Correct model ID per CLAUDE.md
  max_tokens: 1500,
  temperature: 0.3,
  include_file_context: true,
  debounce_delay: 2000
};

/**
 * Academic project types mapping
 */
const ACADEMIC_PROJECT_TYPES: Record<string, ProjectType> = {
  'research_analysis': 'research',
  'scientific_software': 'software',
  'grant_writing': 'writing',
  'academic_writing': 'writing',
  'data_science': 'research',
  'general_project': 'personal'
};

/**
 * Service class for parsing academic conversations into structured project data
 * Uses AcademicDomainDetector for intelligent domain-aware analysis
 */
export class AcademicProjectParser {
  private config: LLMParsingConfig;
  private debounceTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;

  constructor(config: Partial<LLMParsingConfig> = {}) {
    this.config = { ...ACADEMIC_LLM_CONFIG, ...config };
  }

  /**
   * Analyzes academic conversation with domain detection
   * 
   * @param input User's conversation input
   * @param uploadedFiles Optional files for context
   * @param existingAnalysis Previous analysis to build upon
   * @returns Promise of structured academic conversation analysis
   */
  public async analyzeConversation(
    input: string,
    uploadedFiles: UploadedFile[] = [],
    existingAnalysis?: AcademicConversationAnalysis
  ): Promise<AcademicConversationAnalysis> {
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
          const analysis = await this.performAcademicAnalysis(input, uploadedFiles, existingAnalysis);
          resolve(analysis);
        } catch (error) {
          reject(error);
        }
      }, this.config.debounce_delay);
    });
  }

  /**
   * Generates domain-aware response for user interactions
   * 
   * @param trigger Response trigger analysis
   * @param domainInfo Current academic domain context
   * @returns AI response message with domain-specific suggestions
   */
  public async generateAcademicResponse(
    trigger: ResponseTrigger, 
    domainInfo?: AcademicDomainInfo
  ): Promise<string> {
    try {
      const prompt = this.buildAcademicResponsePrompt(trigger, domainInfo);
      const response = await this.callClaudeAPI(prompt, 300);
      
      return this.extractResponseMessage(response);
    } catch (error) {
      console.error('Academic response generation failed:', error);
      return this.generateAcademicFallbackResponse(trigger, domainInfo);
    }
  }

  /**
   * Performs the actual LLM analysis with academic domain detection
   */
  private async performAcademicAnalysis(
    input: string,
    uploadedFiles: UploadedFile[],
    existingAnalysis?: AcademicConversationAnalysis
  ): Promise<AcademicConversationAnalysis> {
    try {
      // Set up abort controller for request cancellation
      this.abortController = new AbortController();
      
      // Build conversation messages for domain detection
      const messages = this.buildConversationMessages(input, existingAnalysis);
      const fileNames = uploadedFiles.map(f => f.name);
      
      const prompt = this.buildAcademicAnalysisPrompt(input, uploadedFiles, existingAnalysis);
      const response = await this.callAcademicAPI(prompt, messages, fileNames);
      
      return this.parseAcademicResponse(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Analysis cancelled due to new input');
      }
      
      console.error('Academic LLM analysis failed, using fallback:', error);
      return this.generateAcademicFallbackAnalysis(input, uploadedFiles);
    }
  }

  /**
   * Builds conversation messages for domain detection
   */
  private buildConversationMessages(
    input: string, 
    existingAnalysis?: AcademicConversationAnalysis
  ): ConversationMessage[] {
    const messages: ConversationMessage[] = [];
    
    // Add existing conversation context if available
    if (existingAnalysis?.description) {
      messages.push({
        role: 'user',
        content: existingAnalysis.description,
        timestamp: new Date(Date.now() - 60000).toISOString() // 1 minute ago
      });
    }
    
    // Add current input
    messages.push({
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    });
    
    return messages;
  }

  /**
   * Builds the academic analysis prompt for Claude API
   */
  private buildAcademicAnalysisPrompt(
    input: string,
    uploadedFiles: UploadedFile[],
    existingAnalysis?: AcademicConversationAnalysis
  ): string {
    let prompt = `You are an intelligent academic project assistant helping researchers and academics structure their project ideas.

Analyze the following user input and extract structured project information with academic context awareness. Focus on research methodologies, academic tools, and scholarly deliverables.

User Input:
"${input}"

`;

    // Include file context with academic focus
    if (uploadedFiles.length > 0 && this.config.include_file_context) {
      prompt += `Uploaded Files Context:\n`;
      uploadedFiles.forEach(file => {
        const fileType = this.classifyAcademicFile(file.name);
        prompt += `- ${file.name} (${fileType}): ${this.summarizeAcademicFileContent(file)}\n`;
      });
      prompt += '\n';
    }

    // Include existing analysis for incremental updates
    if (existingAnalysis) {
      prompt += `Previous Analysis (build upon this):\n`;
      prompt += `Project Name: ${existingAnalysis.project_name || 'Not specified'}\n`;
      prompt += `Type: ${existingAnalysis.project_type || 'Not specified'}\n`;
      prompt += `Academic Domain: ${existingAnalysis.academic_domain?.domain || 'Not detected'}\n`;
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
  "missing_information": ["what additional info would be helpful"],
  "academic_context": {
    "methodology": "research methodology if mentioned",
    "tools_mentioned": ["academic tools referenced"],
    "research_stage": "planning|data-collection|analysis|writing|review"
  }
}

Guidelines for Academic Projects:
- Recognize research methodologies (qualitative, quantitative, mixed methods)
- Identify academic tools (R, Python, LaTeX, Zotero, etc.)
- Understand academic deliverables (papers, grants, software packages, datasets)
- Consider research timelines and academic schedules
- Suggest phases appropriate for academic work (literature review, data collection, analysis, writing)
- Be familiar with academic file types (.tex, .bib, .R, .py, .csv, etc.)`;

    return prompt;
  }

  /**
   * Builds prompt for academic response generation
   */
  private buildAcademicResponsePrompt(
    trigger: ResponseTrigger, 
    domainInfo?: AcademicDomainInfo
  ): string {
    let domainContext = '';
    if (domainInfo) {
      domainContext = `\nAcademic Domain Context: ${domainInfo.description} (${Math.round(domainInfo.confidence * 100)}% confidence)`;
    }

    return `You are an intelligent academic assistant. The user just made a change to their academic project brief, and you should provide a helpful, brief response with academic context awareness.

Change Made: ${trigger.field} was modified
Previous Value: ${JSON.stringify(trigger.previous_value)}
New Value: ${JSON.stringify(trigger.new_value)}
Significance: ${trigger.significance}${domainContext}

Provide a brief, helpful response (1-2 sentences max) that demonstrates understanding of academic work. If appropriate, ask a clarifying question or suggest related academic considerations.

Examples of good academic responses:
- "Since you're working on an R package, would you like me to add 'Create comprehensive documentation with roxygen2' to the deliverables?"
- "I notice you mentioned statistical analysis. Should I suggest adding a data validation phase before your main analysis?"
- "For grant writing, would you like me to include a literature review phase in your timeline?"

Your response:`;
  }

  /**
   * Calls the enhanced academic API endpoint
   */
  private async callAcademicAPI(
    prompt: string, 
    messages: ConversationMessage[], 
    fileNames: string[]
  ): Promise<any> {
    try {
      const response = await fetch('http://localhost:8000/projects/analyze-academic-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: this.abortController?.signal,
        body: JSON.stringify({
          message: prompt,
          conversation_history: messages,
          uploaded_files: fileNames,
          enable_domain_detection: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Academic API call failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully called Academic API via backend:', data);
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      console.error('Academic API call failed, falling back to standard endpoint:', error);
      // Fallback to standard conversation analysis
      return this.callClaudeAPI(prompt, this.config.max_tokens);
    }
  }

  /**
   * Calls standard Claude API as fallback
   */
  private async callClaudeAPI(prompt: string, maxTokens: number): Promise<string> {
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
      return JSON.stringify(data.analysis || data);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      console.error('Claude API call failed, using mock:', error);
      await new Promise(resolve => setTimeout(resolve, 800));
      return this.generateMockAcademicResponse(prompt);
    }
  }

  /**
   * Parses academic response with domain information
   */
  private parseAcademicResponse(response: any): AcademicConversationAnalysis {
    try {
      // Handle both string and object responses
      let parsed;
      if (typeof response === 'string') {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = response;
      }

      // Extract academic domain information if available
      let academic_domain: AcademicDomainInfo | undefined;
      if (response.domain_detection) {
        academic_domain = {
          domain: response.domain_detection.domain,
          confidence: response.domain_detection.confidence,
          description: this.getAcademicDomainDescription(response.domain_detection.domain),
          reasoning: response.domain_detection.reasoning || '',
          alternative_domains: response.domain_detection.alternative_domains
        };
      }

      // Extract academic context
      const academic_context = {
        methodology: parsed.academic_context?.methodology,
        tools_mentioned: parsed.academic_context?.tools_mentioned || [],
        file_types_detected: response.file_types_detected || [],
        research_stage: parsed.academic_context?.research_stage
      };

      // Extract values from structured backend response format
      const extractValue = (field: any) => {
        if (field && typeof field === 'object' && 'value' in field) {
          return field.value;
        }
        return field;
      };

      return {
        project_name: extractValue(parsed.project_name) || undefined,
        project_type: this.validateProjectType(extractValue(parsed.project_type)),
        description: extractValue(parsed.description) || '',
        objective: extractValue(parsed.objective) || undefined,
        deliverables: Array.isArray(extractValue(parsed.key_deliverables || parsed.deliverables)) 
          ? extractValue(parsed.key_deliverables || parsed.deliverables) : [],
        suggested_phases: this.convertNextStepsToPhases(extractValue(parsed.next_steps) || []),
        confidence: Math.min(Math.max(extractValue(parsed.overall_confidence || parsed.confidence) || 0.5, 0), 1),
        missing_information: this.determineMissingInfo(parsed),
        academic_domain,
        academic_context
      };
    } catch (error) {
      console.error('Failed to parse academic response:', error);
      throw new Error('Invalid response format from Academic LLM');
    }
  }

  /**
   * Gets human-readable description for academic domain
   */
  private getAcademicDomainDescription(domain: string): string {
    const descriptions: Record<string, string> = {
      'research_analysis': 'Research & Data Analysis',
      'scientific_software': 'Scientific Software Development',
      'grant_writing': 'Grant Writing & Funding Applications',
      'academic_writing': 'Academic Writing & Publishing',
      'data_science': 'Data Science & Statistical Analysis',
      'general_project': 'General Academic Project'
    };
    return descriptions[domain] || domain.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Classifies academic file types
   */
  private classifyAcademicFile(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop();
    const classifications: Record<string, string> = {
      'r': 'R Script',
      'rmd': 'R Markdown',
      'qmd': 'Quarto Document',
      'py': 'Python Script',
      'ipynb': 'Jupyter Notebook',
      'tex': 'LaTeX Document',
      'bib': 'Bibliography',
      'csv': 'Data File',
      'xlsx': 'Spreadsheet',
      'docx': 'Word Document',
      'pdf': 'PDF Document',
      'md': 'Markdown'
    };
    return classifications[extension || ''] || 'Document';
  }

  /**
   * Summarizes academic file content with context
   */
  private summarizeAcademicFileContent(file: UploadedFile): string {
    if (!file.content) return `${this.classifyAcademicFile(file.name)} (processing...)`;
    
    const content = file.content.toString();
    const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
    
    // Add academic context clues
    if (file.name.endsWith('.r') || file.name.endsWith('.R')) {
      return `R script - ${preview}`;
    } else if (file.name.endsWith('.py')) {
      return `Python script - ${preview}`;
    } else if (file.name.endsWith('.tex')) {
      return `LaTeX document - ${preview}`;
    } else if (file.name.endsWith('.csv')) {
      return `Data file - ${preview}`;
    }
    
    return preview;
  }

  /**
   * Generates academic fallback analysis
   */
  private generateAcademicFallbackAnalysis(
    input: string,
    uploadedFiles: UploadedFile[]
  ): AcademicConversationAnalysis {
    const words = input.toLowerCase().split(/\s+/);
    const academicDomain = this.inferAcademicDomain(words, uploadedFiles);
    
    return {
      project_name: this.extractProjectNameFallback(input),
      project_type: ACADEMIC_PROJECT_TYPES[academicDomain] || 'research',
      description: input.substring(0, 300),
      objective: undefined,
      deliverables: this.extractAcademicDeliverablesFallback(input, academicDomain),
      suggested_phases: this.generateAcademicPhases(academicDomain),
      confidence: 0.3,
      missing_information: ['More specific academic project details needed'],
      academic_domain: {
        domain: academicDomain,
        confidence: 0.5,
        description: this.getAcademicDomainDescription(academicDomain),
        reasoning: 'Fallback domain detection based on keywords and file types'
      },
      academic_context: {
        tools_mentioned: this.extractToolsFallback(words),
        file_types_detected: uploadedFiles.map(f => f.name.split('.').pop() || ''),
        research_stage: 'planning'
      }
    };
  }

  /**
   * Infers academic domain from keywords and files
   */
  private inferAcademicDomain(words: string[], uploadedFiles: UploadedFile[]): string {
    // Check file extensions first
    const extensions = uploadedFiles.map(f => f.name.split('.').pop()?.toLowerCase() || '');
    if (extensions.some(ext => ['r', 'rmd', 'py', 'ipynb'].includes(ext))) {
      return 'scientific_software';
    }
    if (extensions.some(ext => ['tex', 'bib'].includes(ext))) {
      return 'academic_writing';
    }
    if (extensions.some(ext => ['csv', 'xlsx', 'dta'].includes(ext))) {
      return 'data_science';
    }

    // Check keywords
    if (words.some(w => ['grant', 'funding', 'proposal', 'nsf', 'nih'].includes(w))) {
      return 'grant_writing';
    }
    if (words.some(w => ['package', 'software', 'code', 'algorithm'].includes(w))) {
      return 'scientific_software';
    }
    if (words.some(w => ['paper', 'manuscript', 'article', 'publication'].includes(w))) {
      return 'academic_writing';
    }
    if (words.some(w => ['data', 'analysis', 'statistics', 'model'].includes(w))) {
      return 'data_science';
    }
    if (words.some(w => ['research', 'study', 'experiment', 'hypothesis'].includes(w))) {
      return 'research_analysis';
    }

    return 'general_project';
  }

  /**
   * Utility methods inherited and adapted from HybridProjectParser
   */
  private validateProjectType(type: string): ProjectType | undefined {
    const validTypes: ProjectType[] = ['software', 'research', 'writing', 'creative', 'admin', 'personal'];
    return validTypes.includes(type as ProjectType) ? type as ProjectType : undefined;
  }

  private convertNextStepsToPhases(nextSteps: any[]): any[] {
    if (!Array.isArray(nextSteps)) {
      return [];
    }

    return nextSteps.map((step, index) => {
      if (typeof step === 'string') {
        return {
          title: `Phase ${index + 1}`,
          goal: step,
          estimated_days: 14
        };
      } else if (step && typeof step === 'object') {
        return {
          title: step.title || `Phase ${index + 1}`,
          goal: step.goal || step.description || String(step),
          estimated_days: step.estimated_days || 14
        };
      }
      return {
        title: `Phase ${index + 1}`,
        goal: String(step),
        estimated_days: 14
      };
    });
  }

  private determineMissingInfo(parsed: any): string[] {
    const missing: string[] = [];
    
    const extractValue = (field: any) => field && typeof field === 'object' && 'value' in field ? field.value : field;
    const getConfidence = (field: any) => field && typeof field === 'object' && 'confidence' in field ? field.confidence : 1;

    if (!extractValue(parsed.project_name) || getConfidence(parsed.project_name) < 0.5) {
      missing.push('Project name or title');
    }
    
    if (!extractValue(parsed.objective) || getConfidence(parsed.objective) < 0.5) {
      missing.push('Clear project objective');
    }

    const deliverables = extractValue(parsed.key_deliverables || parsed.deliverables);
    if (!Array.isArray(deliverables) || deliverables.length === 0) {
      missing.push('Specific deliverables or research outputs');
    }

    return missing;
  }

  private extractProjectNameFallback(input: string): string | undefined {
    const patterns = [
      /(?:project|working on|building|creating|developing)\s+(?:a|an|the)?\s*([A-Z][^.!?]*)/i,
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

  private extractAcademicDeliverablesFallback(input: string, domain: string): string[] {
    const deliverables: string[] = [];
    
    // Domain-specific deliverables
    const domainDeliverables: Record<string, string[]> = {
      'research_analysis': ['Research report', 'Data analysis', 'Methodology documentation'],
      'scientific_software': ['Software package', 'Documentation', 'Unit tests'],
      'grant_writing': ['Grant proposal', 'Budget justification', 'Literature review'],
      'academic_writing': ['Manuscript', 'Abstract', 'References'],
      'data_science': ['Data analysis', 'Statistical models', 'Visualizations']
    };
    
    if (domainDeliverables[domain]) {
      deliverables.push(...domainDeliverables[domain]);
    }
    
    return deliverables;
  }

  private generateAcademicPhases(domain: string): any[] {
    const phaseTemplates: Record<string, any[]> = {
      'research_analysis': [
        { title: 'Literature Review', goal: 'Review existing research and establish theoretical foundation', estimated_days: 14 },
        { title: 'Data Collection', goal: 'Gather and prepare research data', estimated_days: 21 },
        { title: 'Analysis', goal: 'Conduct statistical analysis and interpret results', estimated_days: 28 },
        { title: 'Writing & Review', goal: 'Document findings and peer review', estimated_days: 14 }
      ],
      'scientific_software': [
        { title: 'Design & Planning', goal: 'Define software architecture and requirements', estimated_days: 7 },
        { title: 'Core Development', goal: 'Implement main functionality and algorithms', estimated_days: 35 },
        { title: 'Testing & Documentation', goal: 'Create tests, documentation, and examples', estimated_days: 14 },
        { title: 'Release & Distribution', goal: 'Package and distribute software', estimated_days: 7 }
      ],
      'grant_writing': [
        { title: 'Preparation', goal: 'Research funding opportunities and requirements', estimated_days: 7 },
        { title: 'Draft Writing', goal: 'Write proposal sections and gather supporting materials', estimated_days: 28 },
        { title: 'Review & Revision', goal: 'Internal review and revisions', estimated_days: 14 },
        { title: 'Submission', goal: 'Final formatting and submission', estimated_days: 3 }
      ],
      'academic_writing': [
        { title: 'Planning & Outlining', goal: 'Develop structure and outline', estimated_days: 7 },
        { title: 'First Draft', goal: 'Write initial complete draft', estimated_days: 21 },
        { title: 'Revision', goal: 'Revise and improve draft', estimated_days: 14 },
        { title: 'Peer Review & Submission', goal: 'External review and journal submission', estimated_days: 7 }
      ]
    };
    
    return phaseTemplates[domain] || phaseTemplates['research_analysis'];
  }

  private extractToolsFallback(words: string[]): string[] {
    const tools = [];
    const academicTools = ['r', 'python', 'stata', 'spss', 'latex', 'zotero', 'mendeley', 'jupyter', 'rstudio'];
    
    for (const tool of academicTools) {
      if (words.includes(tool)) {
        tools.push(tool);
      }
    }
    
    return tools;
  }

  private generateAcademicFallbackResponse(trigger: ResponseTrigger, domainInfo?: AcademicDomainInfo): string {
    if (domainInfo) {
      const domain = domainInfo.domain;
      if (domain === 'research_analysis') {
        return "I've noted your research changes. Would you like me to suggest appropriate methodological considerations?";
      } else if (domain === 'scientific_software') {
        return "Thanks for the update. Should I add testing and documentation phases to your development timeline?";
      } else if (domain === 'grant_writing') {
        return "I see the changes to your grant proposal. Do you need help with budget justification or impact statements?";
      }
    }
    
    return "I've noted your changes. Is there anything specific about your academic project you'd like me to help clarify?";
  }

  private extractResponseMessage(response: string): string {
    return response.trim();
  }

  private generateMockAcademicResponse(prompt: string): string {
    const input = prompt.match(/User Input:\s*"([^"]+)"/)?.[1] || '';
    const words = input.toLowerCase().split(' ');
    const domain = this.inferAcademicDomain(words, []);
    
    const mockResponse = {
      project_name: this.extractProjectNameFallback(input) || 'Academic Project',
      project_type: ACADEMIC_PROJECT_TYPES[domain] || 'research',
      description: `An academic ${domain.replace('_', ' ')} project focused on ${input.substring(0, 100)}...`,
      objective: `Successfully complete the ${domain.replace('_', ' ')} requirements`,
      deliverables: this.extractAcademicDeliverablesFallback(input, domain),
      suggested_phases: this.generateAcademicPhases(domain),
      confidence: 0.7,
      missing_information: input.length < 50 ? ['More specific academic details', 'Research methodology'] : [],
      academic_context: {
        methodology: domain === 'research_analysis' ? 'To be determined' : undefined,
        tools_mentioned: this.extractToolsFallback(words),
        research_stage: 'planning'
      }
    };

    return JSON.stringify(mockResponse, null, 2);
  }
}