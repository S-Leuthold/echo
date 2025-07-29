/**
 * LiveProjectBrief Component
 * 
 * Right pane of the hybrid wizard - the "live whiteboard" where structured project
 * data appears in real-time as the user converses with AI. This is where the 
 * "magic moment" occurs as fields animate in and populate based on conversation.
 * 
 * Core functionality:
 * - Real-time field population with smooth animations
 * - Bi-directional editing (AI updates + user edits)
 * - Confidence indicators showing AI certainty
 * - Integrated roadmap timeline visualization
 * - Smooth transitions following Echo's 300ms standard
 * 
 * The component creates the feeling of collaborating with an intelligent consultant
 * who takes notes on a whiteboard as you speak.
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LiveProjectBriefProps } from '@/types/hybrid-wizard';
import { ProjectType } from '@/types/projects';
import { ProjectRoadmapVisualization } from './ProjectRoadmapVisualization';
import { 
  Target,
  FileText,
  Zap,
  Map,
  Edit,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react';

/**
 * Live project brief component with real-time field updates
 */
export const LiveProjectBrief: React.FC<LiveProjectBriefProps> = ({
  brief,
  onFieldEdit,
  onPhaseEdit,
  readOnly = false
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);

  // Handle field editing with visual feedback
  const handleFieldEdit = async (field: keyof typeof brief, value: any) => {
    if (readOnly) return;
    
    setEditingField(field);
    await onFieldEdit(field, value);
    
    // Clear editing state after animation
    setTimeout(() => setEditingField(null), 300);
  };

  // Confidence indicators removed for cleaner UI

  // Render field with animation and editing capabilities
  const renderEditableField = (
    field: keyof typeof brief,
    label: string,
    icon: React.ReactNode,
    type: 'input' | 'textarea' | 'select' = 'input',
    options?: string[]
  ) => {
    const fieldData = brief[field];
    const isEditing = editingField === field;
    const isEmpty = !fieldData.value || (Array.isArray(fieldData.value) && fieldData.value.length === 0);

    return (
      <div className={`space-y-2 p-4 rounded-lg border transition-all duration-300 ${
        isEditing 
          ? 'border-accent/50 bg-accent/5 shadow-sm' 
          : isEmpty 
            ? 'border-border/30 bg-muted/20' 
            : 'border-border/50 bg-background'
      } ${
        fieldData.is_updating ? 'animate-pulse' : ''
      }`}>
        
        {/* Field Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 text-accent flex-shrink-0">
              {icon}
            </div>
            <span className="text-sm font-medium text-foreground">{label}</span>
            {fieldData.source === 'ai-generated' && (
              <Sparkles className="w-3 h-3 text-accent" />
            )}
          </div>
          
        </div>

        {/* Field Content */}
        <div className="space-y-2">
          {type === 'input' && (
            <Input
              value={fieldData.value as string || ''}
              onChange={(e) => handleFieldEdit(field, e.target.value)}
              placeholder={`AI will populate ${label.toLowerCase()} based on your conversation...`}
              disabled={readOnly}
              className={`transition-all duration-200 ${
                isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
              }`}
            />
          )}

          {type === 'textarea' && (
            <Textarea
              value={fieldData.value as string || ''}
              onChange={(e) => handleFieldEdit(field, e.target.value)}
              placeholder={`AI will populate ${label.toLowerCase()} based on your conversation...`}
              disabled={readOnly}
              rows={3}
              className={`resize-none transition-all duration-200 ${
                isEmpty ? 'text-muted-foreground/50' : 'text-foreground'
              }`}
            />
          )}

          {type === 'select' && options && (
            <div className="flex flex-wrap gap-2">
              {options.map((option) => (
                <Button
                  key={option}
                  variant={fieldData.value === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFieldEdit(field, option)}
                  disabled={readOnly}
                  className={`capitalize transition-all duration-200 ${
                    fieldData.value === option 
                      ? 'bg-accent hover:bg-accent/90 text-accent-foreground' 
                      : 'hover:border-accent/50'
                  }`}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {/* Deliverables Special Case */}
          {field === 'key_deliverables' && (
            <div className="space-y-2">
              {(fieldData.value as string[] || []).map((deliverable, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm animate-in slide-in-from-left-4 duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="flex-1">{deliverable}</span>
                </div>
              ))}
              {(fieldData.value as string[] || []).length === 0 && (
                <div className="text-sm text-muted-foreground/50 italic">
                  Key deliverables will appear here as you describe your project...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Field Status Indicator */}
        {fieldData.is_updating && (
          <div className="flex items-center gap-2 text-xs text-accent">
            <div className="w-3 h-3 animate-spin rounded-full border border-accent border-t-transparent" />
            <span>AI is updating this field...</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 min-h-0">
        
        {/* Project Name as Document Title */}
        <div className="border-b border-border/20 pb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2 cursor-text hover:bg-muted/20 rounded p-2 -m-2 transition-colors">
            {brief.name.value || 'Untitled Project'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-sm text-xs font-medium">
              <Zap className="w-3 h-3" />
              {brief.type.value || 'Project Type'}
            </span>
            {brief.name.source === 'ai-generated' && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Sparkles className="w-3 h-3 text-accent" />
                AI Generated
              </span>
            )}
          </div>
        </div>

        {/* Project Description */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Description</h3>
          <div className="cursor-text hover:bg-muted/10 rounded p-3 -m-3 transition-colors min-h-[2.5rem]">
            {brief.description.value ? (
              <p className="text-sm text-foreground leading-relaxed">
                {brief.description.value}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">
                Click to add project description...
              </p>
            )}
          </div>
        </div>

        {/* Primary Objective */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Primary Objective</h3>
          <div className="cursor-text hover:bg-muted/10 rounded p-3 -m-3 transition-colors min-h-[2.5rem]">
            {brief.objective.value ? (
              <p className="text-sm text-foreground leading-relaxed">
                {brief.objective.value}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/50 italic">
                Click to define the main goal of this project...
              </p>
            )}
          </div>
        </div>

        {/* Key Deliverables */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Key Deliverables</h3>
          <div className="space-y-2">
            {brief.key_deliverables.value && (brief.key_deliverables.value as string[]).length > 0 ? (
              (brief.key_deliverables.value as string[]).map((deliverable, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-2 p-2 hover:bg-muted/10 rounded transition-colors cursor-text"
                >
                  <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{deliverable}</span>
                </div>
              ))
            ) : (
              <div className="cursor-text hover:bg-muted/10 rounded p-3 -m-3 transition-colors">
                <p className="text-sm text-muted-foreground/50 italic">
                  Click to add key deliverables for this project...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Project Roadmap */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Project Timeline</h3>
          <div className="bg-muted/10 rounded-lg p-4">
            {brief.roadmap.value ? (
              <ProjectRoadmapVisualization
                roadmap={brief.roadmap.value}
                editable={!readOnly}
                onPhaseEdit={onPhaseEdit}
              />
            ) : (
              <div className="text-center py-6 text-muted-foreground/50">
                <Map className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  Timeline phases will appear as you describe your project approach...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Brief Status - Subtle Footer */}
        <div className="pt-6 border-t border-border/20">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-accent" />
              <span>AI is continuously updating this brief</span>
            </div>
            <span>Last updated: {brief.last_updated.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Animation Strategy:
 * - Field Population: 300ms fade-in with slide-up effect when AI populates
 * - User Edits: Immediate visual feedback with amber glow during editing
 * - Confidence Updates: Smooth progress bar animations over 500ms
 * - Deliverables: Staggered slide-in with 100ms delays between items
 * 
 * Interaction Design:
 * - Fields start empty/muted and "come alive" as AI populates them
 * - Confidence indicators provide transparency into AI certainty
 * - Bi-directional editing feels immediate and responsive
 * - Visual hierarchy guides attention to most important fields
 * 
 * Accessibility:
 * - Clear section headers with proper semantic structure
 * - Confidence indicators include text percentages
 * - Loading states clearly communicate AI processing
 * - All interactive elements are keyboard accessible
 * - Color coding is supplemented with icons and text
 */