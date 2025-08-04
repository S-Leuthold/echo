/**
 * ProjectWizard Component
 * 
 * Multi-step modal for creating new projects with templates.
 * Manages wizard flow, validation, and form submission.
 * <200 lines for code review compliance.
 */

"use client";

import { useState } from 'react';
import { useDevMode } from '@/config/devMode';
import { useProjectWizard } from '@/hooks/projects/useProjectWizard';
import { useProjects } from '@/hooks/projects/useProjects';
import { useProjectTemplates } from '@/hooks/projects/useProjectForm';
import { WizardStep } from './WizardStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ProjectType, ProjectPhase } from '@/types/projects';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Wand2,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Clock,
  Target
} from 'lucide-react';

interface ProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
}

export const ProjectWizard: React.FC<ProjectWizardProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { config } = useDevMode();
  const { createProject } = useProjects();
  const { getPhasesByType } = useProjectTemplates();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    currentStep,
    currentStepData,
    totalSteps,
    isFirstStep,
    isLastStep,
    formData,
    canProceed,
    canGoBack,
    nextStep,
    previousStep,
    updateFormData,
    resetWizard,
    steps
  } = useProjectWizard();

  // Don't render if not open or feature is disabled
  if (!isOpen || !config.enableProjectWizard) {
    return null;
  }

  // Handle form field updates
  const handleFieldUpdate = (field: keyof typeof formData) => (value: string | number) => {
    updateFormData({ [field]: value });
  };

  // Handle wizard completion - Activity-focused approach
  const handleComplete = async () => {
    if (!formData.name || !formData.description || !formData.objective || !formData.type) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const project = await createProject({
        name: formData.name,
        description: formData.description,
        type: formData.type,
        objective: formData.objective
        // Removed initial_phase - will be AI-determined
      });

      // Success
      resetWizard();
      onSuccess?.(project.id);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close with reset
  const handleClose = () => {
    resetWizard();
    setSubmitError(null);
    onClose();
  };

  // Render step content - Activity-focused redesign
  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'project-essence':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="project-name" className="text-sm font-medium text-foreground">What are you calling this project? *</Label>
              <Input
                id="project-name"
                placeholder="e.g., Echo Platform Development, Personal Website Redesign..."
                value={formData.name || ''}
                onChange={(e) => handleFieldUpdate('name')(e.target.value)}
                className="w-full text-base"
              />
              <p className="text-xs text-muted-foreground">This will appear on your project cards and activity tracking.</p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="project-description" className="text-sm font-medium text-foreground">What's this project about? *</Label>
              <Textarea
                id="project-description"
                placeholder="Describe what you're building, researching, or creating. Focus on what makes this project meaningful to you..."
                value={formData.description || ''}
                onChange={(e) => handleFieldUpdate('description')(e.target.value)}
                rows={4}
                className="w-full resize-none text-base"
              />
              <p className="text-xs text-muted-foreground">A clear description helps AI understand your work patterns and provide better insights.</p>
            </div>
          </div>
        );

      case 'type-and-ai-setup':
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="project-type" className="text-sm font-medium text-foreground">What type of work is this? *</Label>
              <Select
                value={formData.type || 'software'}
                onValueChange={handleFieldUpdate('type')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="software">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">Software Development</span>
                      <span className="text-xs text-muted-foreground">Coding, building, and deploying applications</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="research">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">Research</span>
                      <span className="text-xs text-muted-foreground">Academic research, analysis, and documentation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="writing">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">Writing</span>
                      <span className="text-xs text-muted-foreground">Articles, books, documentation, and content creation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="creative">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">Creative</span>
                      <span className="text-xs text-muted-foreground">Design, art, music, and creative projects</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">Administrative</span>
                      <span className="text-xs text-muted-foreground">Process improvement, organization, and planning</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="personal">
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium">Personal</span>
                      <span className="text-xs text-muted-foreground">Learning, hobbies, and personal development</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">This helps AI understand your work patterns and suggest optimal session lengths.</p>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="project-objective" className="text-sm font-medium text-foreground">What success looks like *</Label>
              <Textarea
                id="project-objective"
                placeholder="Describe what you want to achieve. What will success look like? What impact are you hoping to make?"
                value={formData.objective || ''}
                onChange={(e) => handleFieldUpdate('objective')(e.target.value)}
                rows={4}
                className="w-full resize-none text-base"
              />
              <p className="text-xs text-muted-foreground">AI uses this to provide context-aware insights and track meaningful progress.</p>
            </div>
          </div>
        );

      case 'activity-preview':
        return (
          <div className="space-y-8">
            {/* Activity Tracking Preview */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">How your activity will be tracked</h4>
              <div className="bg-muted/30 rounded-lg p-6 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Daily Activity Heatmap</div>
                  <div className="text-xs text-muted-foreground">See your work patterns over time, just like GitHub contributions</div>
                  
                  {/* Mock heatmap preview */}
                  <div className="flex items-center gap-1 mt-3">
                    <span className="text-xs text-muted-foreground mr-2">6 months:</span>
                    {Array.from({ length: 26 }, (_, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-sm"
                        style={{
                          backgroundColor: i < 5 ? 'transparent' : 
                                         i < 10 ? '#fef3c7' :
                                         i < 15 ? '#fde68a' :
                                         i < 20 ? '#fbbf24' : '#f59e0b'
                        }}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">Today</span>
                  </div>
                </div>
                
                <div className="border-t border-border/50 pt-4 space-y-2">
                  <div className="text-sm font-medium text-foreground">Session Insights</div>
                  <div className="text-xs text-muted-foreground">AI analyzes your work sessions to provide intelligent insights</div>
                  <div className="text-xs text-muted-foreground">• Peak productivity times • Focus pattern recognition • Progress trends</div>
                </div>
              </div>
            </div>

            {/* Project Card Preview */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Your project card</h4>
              <div className="bg-card border border-border rounded-lg p-4 space-y-3 max-w-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h5 className="font-medium text-foreground text-sm truncate">
                      {formData.name || 'Your Project Name'}
                    </h5>
                    <p className="text-xs text-muted-foreground capitalize">
                      {formData.type || 'software'} • AI-managed phases
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">Active</Badge>
                </div>
                
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {formData.description || 'Your project description will appear here...'}
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Activity starts tracking today</span>
                  <span className="text-accent font-medium">Ready to begin</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'ready-to-begin':
        return (
          <div className="space-y-8">
            {/* Project Summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                <h4 className="text-lg font-semibold text-foreground">{formData.name}</h4>
              </div>
              
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="font-medium capitalize">{formData.type}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">AI Status:</span>
                    <div className="font-medium text-accent">Ready to learn</div>
                  </div>
                </div>
                
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</div>
                  <p className="text-sm text-foreground">{formData.description}</p>
                </div>
                
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success Vision</div>
                  <p className="text-sm text-foreground">{formData.objective}</p>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">What happens next</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent mt-0.5">1</div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">Start your first session</div>
                    <div className="text-xs text-muted-foreground">Begin working and let AI learn your patterns</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent mt-0.5">2</div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">AI learns your rhythm</div>
                    <div className="text-xs text-muted-foreground">Project phases and insights develop based on your actual work</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent mt-0.5">3</div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-foreground">Track meaningful progress</div>
                    <div className="text-xs text-muted-foreground">Watch your activity heatmap grow and get intelligent weekly insights</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {submitError && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="w-4 h-4" />
                {submitError}
              </div>
            )}

            {/* Ready message */}
            <div className="bg-accent/10 rounded-lg p-4">
              <div className="flex items-center gap-2 text-accent">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Your activity tracking begins now</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Create your project and start your first work session whenever you're ready.
              </p>
            </div>
          </div>
        );

      default:
        return <div>Step not found</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-foreground">Create New Project</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Wizard Content */}
        <div className="p-6">
          <WizardStep
            title={currentStepData.title}
            description={currentStepData.description}
            currentStep={currentStep}
            totalSteps={totalSteps}
            isValid={currentStepData.isValid}
            isOptional={currentStepData.isOptional}
          >
            {renderStepContent()}
          </WizardStep>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={previousStep}
            disabled={!canGoBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            {isLastStep ? (
              <Button
                onClick={handleComplete}
                disabled={!canProceed || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>Creating...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed}
                className="gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};