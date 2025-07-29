/**
 * ProjectRoadmapVisualization Component
 * 
 * Visual timeline component that displays project phases as a vertical roadmap.
 * Shows the strategic progression of project phases with clean design and
 * interactive editing capabilities.
 * 
 * Core functionality:
 * - Vertical timeline with connecting lines
 * - Current phase highlighting with amber accent
 * - Inline editing for phase titles and goals
 * - Duration estimates with visual indicators
 * - Smooth animations for phase updates
 * 
 * Design follows Echo's clean aesthetic with subtle connections and clear hierarchy.
 */

"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ProjectRoadmapVisualizationProps } from '@/types/hybrid-wizard';
import { ProjectRoadmapPhase } from '@/types/projects';
import { 
  Circle,
  CheckCircle,
  Edit,
  Plus,
  Clock,
  Target,
  GripVertical
} from 'lucide-react';

/**
 * Visual roadmap component with timeline layout
 */
export const ProjectRoadmapVisualization: React.FC<ProjectRoadmapVisualizationProps> = ({
  roadmap,
  editable = false,
  onPhaseEdit,
  onPhaseReorder,
  onPhaseAdd,
  onPhaseDelete
}) => {
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProjectRoadmapPhase>>({});

  if (!roadmap) return null;

  // Handle phase editing
  const handleEditStart = (phase: ProjectRoadmapPhase) => {
    if (!editable) return;
    
    setEditingPhase(phase.id);
    setEditForm({
      title: phase.title,
      goal: phase.goal,
      estimated_days: phase.estimated_days
    });
  };

  const handleEditSave = () => {
    if (!editingPhase || !onPhaseEdit) return;
    
    onPhaseEdit(editingPhase, editForm);
    setEditingPhase(null);
    setEditForm({});
  };

  const handleEditCancel = () => {
    setEditingPhase(null);
    setEditForm({});
  };

  // Render individual phase
  const renderPhase = (phase: ProjectRoadmapPhase, index: number, isLast: boolean) => {
    const isEditing = editingPhase === phase.id;
    const isCurrent = phase.is_current;

    return (
      <div key={phase.id} className="relative">
        
        {/* Connecting Line (except for last item) */}
        {!isLast && (
          <div className="absolute left-4 top-12 w-0.5 h-16 bg-border/30" />
        )}

        {/* Phase Content */}
        <div className={`flex items-start gap-4 p-4 rounded-lg transition-all duration-300 ${
          isCurrent 
            ? 'bg-accent/5 border border-accent/20' 
            : 'hover:bg-muted/30'
        } ${
          isEditing ? 'ring-2 ring-accent/20' : ''
        }`}>
          
          {/* Phase Icon */}
          <div className="flex-shrink-0 mt-1">
            {isCurrent ? (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center animate-pulse">
                <Target className="w-4 h-4 text-white" />
              </div>
            ) : index < roadmap.phases.findIndex(p => p.is_current) ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <Circle className="w-8 h-8 text-muted-foreground" />
            )}
          </div>

          {/* Phase Details */}
          <div className="flex-1 space-y-2">
            {isEditing ? (
              /* Editing Mode */
              <div className="space-y-3">
                <Input
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Phase title"
                  className="font-medium"
                />
                <Textarea
                  value={editForm.goal || ''}
                  onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
                  placeholder="Phase goal"
                  rows={2}
                  className="resize-none text-sm"
                />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={editForm.estimated_days || ''}
                    onChange={(e) => setEditForm({ ...editForm, estimated_days: parseInt(e.target.value) || undefined })}
                    placeholder="Days"
                    className="w-20 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                
                {/* Edit Actions */}
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleEditSave} className="h-7 text-xs">
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleEditCancel} className="h-7 text-xs">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* Display Mode */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium transition-colors ${
                    isCurrent ? 'text-accent' : 'text-foreground'
                  }`}>
                    {phase.title}
                  </h4>
                  
                  <div className="flex items-center gap-2">
                    {/* Duration Badge */}
                    {phase.estimated_days && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{phase.estimated_days}d</span>
                      </div>
                    )}
                    
                    {/* Edit Button */}
                    {editable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(phase)}
                        className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {phase.goal}
                </p>

                {/* Current Phase Indicator */}
                {isCurrent && (
                  <div className="flex items-center gap-2 text-xs text-accent font-medium">
                    <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                    <span>Current Phase</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drag Handle (if reorderable) */}
          {editable && onPhaseReorder && (
            <div className="flex-shrink-0 mt-2 opacity-40 hover:opacity-100 cursor-grab">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      
      {/* Roadmap Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-medium text-foreground">Project Timeline</h4>
          <p className="text-xs text-muted-foreground">
            {roadmap.phases.length} phases • 
            {roadmap.user_modified ? 'Modified by user' : 'AI generated'}
          </p>
        </div>
        
        {editable && onPhaseAdd && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPhaseAdd?.({
              title: 'New Phase',
              goal: 'Define phase objective',
              order: roadmap.phases.length,
              is_current: false
            })}
            className="gap-2 text-xs"
          >
            <Plus className="w-3 h-3" />
            Add Phase
          </Button>
        )}
      </div>

      {/* Phases Timeline */}
      <div className="space-y-2">
        {roadmap.phases
          .sort((a, b) => a.order - b.order)
          .map((phase, index, array) => 
            renderPhase(phase, index, index === array.length - 1)
          )}
      </div>

      {/* Roadmap Footer */}
      <div className="pt-4 border-t border-border/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Generated {new Date(roadmap.generated_at).toLocaleDateString()}
          </span>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="w-3 h-3 text-muted-foreground" />
              <span>Upcoming</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Visual Design Philosophy:
 * - Clean vertical timeline with subtle connecting lines
 * - Current phase highlighted with amber accent and pulse animation
 * - Completed phases shown with green checkmarks
 * - Future phases with simple circles
 * - Inline editing maintains visual context
 * 
 * Interactive Features:
 * - Click to edit phase titles and goals
 * - Duration editing with dedicated input
 * - Drag handles for reordering (when enabled)
 * - Add phase button for expansion
 * 
 * Animation Strategy:
 * - Smooth transitions for phase state changes
 * - Pulse animation for current phase indicator
 * - Fade transitions for edit mode switching
 * - Hover effects for interactive elements
 * 
 * Accessibility:
 * - Clear visual hierarchy with semantic structure
 * - Keyboard navigation for all interactive elements
 * - Status indicators use both color and icons
 * - Clear labeling for screen readers
 */