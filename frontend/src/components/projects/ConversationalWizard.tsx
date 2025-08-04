/**
 * ConversationalWizard Component
 * 
 * AI-powered conversational project creation wizard.
 * Supports file uploads and intelligent project synthesis.
 * <200 lines for component maintainability.
 */

"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileUploadZone, UploadedFile } from './FileUploadZone';
import { useProjects } from '@/hooks/projects/useProjects';
import { ProjectFormData } from '@/types/projects';
import { 
  Sparkles, 
  X, 
  ArrowRight, 
  Edit, 
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Wand2
} from 'lucide-react';

interface ConversationalWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

interface ConversationStep {
  id: string;
  type: 'ai-question' | 'user-response' | 'ai-synthesis' | 'user-validation';
  content: string;
  timestamp: Date;
}

interface ProjectSynthesis {
  name: string;
  description: string;
  type: string;
  objective: string;
  successCriteria: string[];
  confidence: number;
}

export const ConversationalWizard: React.FC<ConversationalWizardProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { createProject } = useProjects();
  
  // Conversation state
  const [conversation, setConversation] = useState<ConversationStep[]>([
    {
      id: 'initial',
      type: 'ai-question',
      content: "Let's create your project! Tell me what you're working on. You can describe it here or upload any relevant files - requirements, sketches, notes, anything that gives context.",
      timestamp: new Date()
    }
  ]);
  
  const [currentResponse, setCurrentResponse] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [synthesis, setSynthesis] = useState<ProjectSynthesis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'gathering' | 'synthesis' | 'validation' | 'complete'>('gathering');

  // Handle user response submission
  const handleSubmitResponse = useCallback(async () => {
    if (!currentResponse.trim() && uploadedFiles.length === 0) return;

    // Add user response to conversation
    const userStep: ConversationStep = {
      id: `user-${Date.now()}`,
      type: 'user-response',
      content: currentResponse || '[Files uploaded]',
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userStep]);
    setCurrentResponse('');
    setIsProcessing(true);

    try {
      // Simulate AI processing (in real implementation, this would call an LLM API)
      await simulateAIProcessing(currentResponse, uploadedFiles);
    } catch (err) {
      setError('Failed to process your input. Please try again.');
      setIsProcessing(false);
    }
  }, [currentResponse, uploadedFiles]);

  // Simulate AI processing and synthesis
  const simulateAIProcessing = async (userInput: string, files: UploadedFile[]) => {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock AI synthesis based on input
    const mockSynthesis: ProjectSynthesis = {
      name: extractProjectName(userInput) || 'My New Project',
      description: generateDescription(userInput, files),
      type: inferProjectType(userInput, files),
      objective: generateObjective(userInput),
      successCriteria: generateSuccessCriteria(userInput),
      confidence: 0.85
    };

    setSynthesis(mockSynthesis);
    setCurrentStep('synthesis');
    setIsProcessing(false);

    // Add AI synthesis to conversation
    const aiStep: ConversationStep = {
      id: `ai-${Date.now()}`,
      type: 'ai-synthesis',
      content: `Based on what you've shared, here's what I understand about your project. Does this look right?`,
      timestamp: new Date()
    };

    setConversation(prev => [...prev, aiStep]);
  };

  // Helper functions for mock AI processing
  const extractProjectName = (input: string): string | null => {
    const patterns = [
      /building (?:a |an )?(.+?)(?:\s+for|\s+that|\s+to|$)/i,
      /creating (?:a |an )?(.+?)(?:\s+for|\s+that|\s+to|$)/i,
      /working on (?:a |an )?(.+?)(?:\s+for|\s+that|\s+to|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1);
      }
    }
    return null;
  };

  const generateDescription = (input: string, files: UploadedFile[]): string => {
    let description = input.substring(0, 200);
    if (files.length > 0) {
      description += ` (Enhanced with ${files.length} supporting file${files.length > 1 ? 's' : ''})`;
    }
    return description;
  };

  const inferProjectType = (input: string, files: UploadedFile[]): string => {
    const lower = input.toLowerCase();
    if (lower.includes('dashboard') || lower.includes('app') || lower.includes('website') || lower.includes('code')) return 'software';
    if (lower.includes('research') || lower.includes('study') || lower.includes('analysis')) return 'research';
    if (lower.includes('writing') || lower.includes('article') || lower.includes('book')) return 'writing';
    if (lower.includes('design') || lower.includes('creative')) return 'creative';
    return 'software';
  };

  const generateObjective = (input: string): string => {
    return `Successfully complete this project by delivering a high-quality solution that meets the requirements outlined in the description.`;
  };

  const generateSuccessCriteria = (input: string): string[] => {
    return [
      'Deliver a working solution that meets requirements',
      'Complete within reasonable timeline',
      'Achieve user satisfaction and adoption'
    ];
  };

  // Handle files uploaded
  const handleFilesUploaded = (files: UploadedFile[]) => {
    setUploadedFiles(files);
  };

  // Handle synthesis edit
  const handleEditSynthesis = (field: keyof ProjectSynthesis, value: string) => {
    if (!synthesis) return;
    setSynthesis(prev => prev ? { ...prev, [field]: value } : null);
  };

  // Handle project creation
  const handleCreateProject = async () => {
    if (!synthesis) return;

    setIsProcessing(true);
    try {
      const formData: ProjectFormData = {
        name: synthesis.name,
        description: synthesis.description,
        type: synthesis.type as any,
        objective: synthesis.objective
      };

      const project = await createProject(formData);
      onSuccess?.(project.id);
      onClose();
    } catch (err) {
      setError('Failed to create project. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't render if not open (moved to JSX level to follow Rules of Hooks)
  return !isOpen ? null : (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Create New Project</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentStep === 'gathering' && (
            <div className="flex-1 p-6 space-y-6">
              {/* Conversation */}
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {conversation.map((step) => (
                  <div key={step.id} className={`flex gap-3 ${step.type.startsWith('ai') ? '' : 'justify-end'}`}>
                    {step.type.startsWith('ai') && (
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-accent" />
                      </div>
                    )}
                    <div className={`max-w-md p-3 rounded-lg ${
                      step.type.startsWith('ai') 
                        ? 'bg-muted/50 text-foreground' 
                        : 'bg-accent text-accent-foreground ml-auto'
                    }`}>
                      <p className="text-sm">{step.content}</p>
                    </div>
                  </div>
                ))}
                
                {isProcessing && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground">Processing your input...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* File Upload */}
              <FileUploadZone 
                onFilesUploaded={handleFilesUploaded}
                className="border-t border-border pt-6"
              />

              {/* Response Input */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Describe your project, what you're trying to achieve, any challenges you're facing..."
                  value={currentResponse}
                  onChange={(e) => setCurrentResponse(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSubmitResponse}
                    disabled={isProcessing || (!currentResponse.trim() && uploadedFiles.length === 0)}
                    className="gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {uploadedFiles.length > 0 ? 'Analyze Project' : 'Continue'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'synthesis' && synthesis && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-semibold text-foreground">Project Analysis</h3>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(synthesis.confidence * 100)}% confidence
                  </Badge>
                </div>

                {/* Editable synthesis */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Project Name</label>
                    <Textarea
                      value={synthesis.name}
                      onChange={(e) => handleEditSynthesis('name', e.target.value)}
                      rows={1}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Description</label>
                    <Textarea
                      value={synthesis.description}
                      onChange={(e) => handleEditSynthesis('description', e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Project Type</label>
                    <div className="flex gap-2">
                      {['software', 'research', 'writing', 'creative', 'admin', 'personal'].map((type) => (
                        <Button
                          key={type}
                          variant={synthesis.type === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleEditSynthesis('type', type)}
                          className="capitalize"
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Success Objective</label>
                    <Textarea
                      value={synthesis.objective}
                      onChange={(e) => handleEditSynthesis('objective', e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('gathering')}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Context
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={isProcessing}
                    className="gap-2"
                  >
                    {isProcessing ? (
                      <>Creating...</>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Create Project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};