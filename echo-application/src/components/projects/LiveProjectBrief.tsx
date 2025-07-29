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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LiveProjectBriefProps } from '@/types/hybrid-wizard';
import { ProjectType } from '@/types/projects';
import { ProjectRoadmapVisualization } from './ProjectRoadmapVisualization';
import { EditableField } from './EditableField';
import { 
  Target,
  FileText,
  Zap,
  Map,
  Edit,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Plus,
  X
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
  const [editingDeliverable, setEditingDeliverable] = useState<number | null>(null);
  const [newDeliverable, setNewDeliverable] = useState('');

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
          {editingField === 'name' ? (
            <div className="space-y-2">
              <Input
                value={brief.name.value as string || ''}
                onChange={(e) => onFieldEdit('name', e.target.value)}
                placeholder="Enter project name..."
                className="text-2xl font-bold h-auto py-2"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
                className="h-8"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          ) : (
            <h1 
              className="text-2xl font-bold text-foreground mb-2 cursor-text hover:bg-muted/20 rounded p-2 -m-2 transition-colors"
              onClick={() => !readOnly && setEditingField('name')}
            >
              {brief.name.value || 'Untitled Project'}
            </h1>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {editingField === 'type' ? (
              <div className="flex gap-2">
                <Select 
                  value={brief.type.value as string || 'personal'}
                  onValueChange={(value) => {
                    onFieldEdit('type', value);
                    setEditingField(null);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="learning">Learning</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingField(null)}
                  className="h-7 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 text-accent rounded-sm text-xs font-medium cursor-pointer hover:bg-accent/20 transition-colors"
                onClick={() => !readOnly && setEditingField('type')}
              >
                <Zap className="w-3 h-3" />
                {brief.type.value || 'Project Type'}
              </span>
            )}
            {brief.name.source === 'ai-generated' && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Sparkles className="w-3 h-3 text-accent" />
                AI Generated
              </span>
            )}
          </div>
        </div>

        {/* Academic Domain Information */}
        {brief.academic_domain && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Academic Domain</h3>
            <div className="p-4 rounded-lg border border-border/50 bg-accent/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground capitalize">
                    {brief.academic_domain.value?.domain?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-accent">
                  <span>{Math.round((brief.academic_domain.value?.confidence || 0) * 100)}% confidence</span>
                </div>
              </div>
              
              {brief.academic_domain.value?.description && (
                <p className="text-sm text-muted-foreground mb-3">
                  {brief.academic_domain.value.description}
                </p>
              )}
              
              {brief.academic_domain.value?.reasoning && (
                <div className="text-xs text-muted-foreground/80 bg-muted/30 rounded p-2">
                  <strong>Detection reasoning:</strong> {brief.academic_domain.value.reasoning}
                </div>
              )}
              
              {brief.academic_context?.value && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    {brief.academic_context.value.research_stage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Research Stage:</span>
                        <span className="text-foreground capitalize">{brief.academic_context.value.research_stage.replace('_', ' ')}</span>
                      </div>
                    )}
                    {brief.academic_context.value.methodology && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Methodology:</span>
                        <span className="text-foreground">{brief.academic_context.value.methodology}</span>
                      </div>
                    )}
                    {brief.academic_context.value.tools_mentioned && brief.academic_context.value.tools_mentioned.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tools:</span>
                        <span className="text-foreground">{brief.academic_context.value.tools_mentioned.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Description */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Description</h3>
          {editingField === 'description' ? (
            <div className="space-y-2">
              <Textarea
                value={brief.description.value as string || ''}
                onChange={(e) => onFieldEdit('description', e.target.value)}
                placeholder="Enter project description..."
                disabled={readOnly}
                rows={3}
                className="resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingField(null)}
                  className="h-8"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="cursor-text hover:bg-muted/10 rounded p-3 -m-3 transition-colors min-h-[2.5rem]"
              onClick={() => !readOnly && setEditingField('description')}
            >
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
          )}
        </div>

        {/* Primary Objective */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Primary Objective</h3>
          {editingField === 'objective' ? (
            <div className="space-y-2">
              <Textarea
                value={brief.objective.value as string || ''}
                onChange={(e) => onFieldEdit('objective', e.target.value)}
                placeholder="Enter primary objective..."
                disabled={readOnly}
                rows={2}
                className="resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingField(null)}
                  className="h-8"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div 
              className="cursor-text hover:bg-muted/10 rounded p-3 -m-3 transition-colors min-h-[2.5rem]"
              onClick={() => !readOnly && setEditingField('objective')}
            >
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
          )}
        </div>

        {/* Key Deliverables */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground/80 uppercase tracking-wider">Key Deliverables</h3>
          <div className="space-y-2">
            {brief.key_deliverables.value && (brief.key_deliverables.value as string[]).length > 0 && (
              (brief.key_deliverables.value as string[]).map((deliverable, index) => (
                <div 
                  key={index}
                  className="group flex items-start gap-2 p-2 hover:bg-muted/10 rounded transition-colors"
                >
                  <CheckCircle className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  {editingDeliverable === index ? (
                    <div className="flex-1 space-y-2">
                      <Input
                        value={deliverable}
                        onChange={(e) => {
                          const newDeliverables = [...(brief.key_deliverables.value as string[])];
                          newDeliverables[index] = e.target.value;
                          onFieldEdit('key_deliverables', newDeliverables);
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingDeliverable(null)}
                          className="h-6 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newDeliverables = (brief.key_deliverables.value as string[]).filter((_, i) => i !== index);
                            onFieldEdit('key_deliverables', newDeliverables);
                            setEditingDeliverable(null);
                          }}
                          className="h-6 text-xs text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <span 
                      className="flex-1 text-sm text-foreground cursor-text"
                      onClick={() => !readOnly && setEditingDeliverable(index)}
                    >
                      {deliverable}
                    </span>
                  )}
                  {!readOnly && editingDeliverable !== index && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      onClick={() => setEditingDeliverable(index)}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))
            )}
            
            {/* Add new deliverable */}
            {editingField === 'new_deliverable' ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newDeliverable}
                    onChange={(e) => setNewDeliverable(e.target.value)}
                    placeholder="Enter new deliverable..."
                    className="flex-1 h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDeliverable.trim()) {
                        const currentDeliverables = (brief.key_deliverables.value as string[]) || [];
                        onFieldEdit('key_deliverables', [...currentDeliverables, newDeliverable.trim()]);
                        setNewDeliverable('');
                        setEditingField(null);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingField(null);
                      setNewDeliverable('');
                    }}
                    className="h-8"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <div 
                className="cursor-text hover:bg-muted/10 rounded p-3 -m-3 transition-colors flex items-center gap-2 text-sm"
                onClick={() => !readOnly && setEditingField('new_deliverable')}
              >
                <Plus className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground/70">
                  {(!brief.key_deliverables.value || (brief.key_deliverables.value as string[]).length === 0) 
                    ? "Click to add key deliverables for this project..."
                    : "Add another deliverable..."}
                </span>
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