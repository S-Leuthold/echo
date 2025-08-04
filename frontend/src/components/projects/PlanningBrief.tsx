/**
 * PlanningBrief Component
 * 
 * Planning-focused version of the project brief panel that shows
 * key planning elements extracted from the conversation.
 */

import React, { useState } from 'react';
import { BriefState } from '@/types/hybrid-wizard';
import { 
  Calendar,
  Target,
  Milestone,
  ListChecks,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Plus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface PlanningBriefProps {
  brief: BriefState;
  onFieldEdit: <K extends keyof BriefState>(field: K, value: BriefState[K]['value']) => void;
  readOnly?: boolean;
}

export const PlanningBrief: React.FC<PlanningBriefProps> = ({
  brief,
  onFieldEdit,
  readOnly = false
}) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newDeliverable, setNewDeliverable] = useState('');
  const [newMilestone, setNewMilestone] = useState('');

  const handleAddDeliverable = () => {
    if (newDeliverable.trim()) {
      const currentDeliverables = brief.key_deliverables.value || [];
      onFieldEdit('key_deliverables', [...currentDeliverables, newDeliverable.trim()]);
      setNewDeliverable('');
    }
  };

  const handleRemoveDeliverable = (index: number) => {
    const currentDeliverables = brief.key_deliverables.value || [];
    onFieldEdit('key_deliverables', currentDeliverables.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-muted-foreground">Project Plan</h2>
        <p className="text-sm text-muted-foreground">Building your project structure in real-time</p>
      </div>

      {/* Project Name & Objective */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Project Name
          </label>
          {editingField === 'name' ? (
            <div className="flex gap-2">
              <Input
                value={brief.name.value}
                onChange={(e) => onFieldEdit('name', e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                autoFocus
                className="flex-1"
              />
              <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div 
              className="p-3 rounded-lg border bg-card hover:bg-accent/5 cursor-text transition-colors"
              onClick={() => !readOnly && setEditingField('name')}
            >
              {brief.name.value || <span className="text-muted-foreground">Click to add project name...</span>}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Primary Objective
          </label>
          {editingField === 'objective' ? (
            <div className="flex gap-2">
              <Textarea
                value={brief.objective.value}
                onChange={(e) => onFieldEdit('objective', e.target.value)}
                onBlur={() => setEditingField(null)}
                rows={2}
                autoFocus
                className="flex-1 resize-none"
              />
              <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div 
              className="p-3 rounded-lg border bg-card hover:bg-accent/5 cursor-text transition-colors min-h-[60px]"
              onClick={() => !readOnly && setEditingField('objective')}
            >
              {brief.objective.value || <span className="text-muted-foreground">What do you want to achieve?</span>}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent" />
          Timeline
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground mb-1">Duration</div>
            <div className="font-medium">
              {brief.roadmap?.value?.phases?.length > 0 
                ? `${brief.roadmap.value.phases.reduce((total, phase) => total + (phase.estimated_days || 0), 0)} days`
                : 'Not set'
              }
            </div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground mb-1">Start Date</div>
            <div className="font-medium">Today</div>
          </div>
        </div>
      </div>

      {/* Key Deliverables */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-accent" />
          Key Deliverables
        </label>
        <div className="space-y-2">
          {(brief.key_deliverables.value || []).map((deliverable, index) => (
            <div key={index} className="flex items-center gap-2 p-2 rounded-lg border bg-card group">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="flex-1 text-sm">{deliverable}</span>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveDeliverable(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <div className="flex gap-2">
              <Input
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDeliverable()}
                placeholder="Add a deliverable..."
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddDeliverable} disabled={!newDeliverable.trim()}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Project Phases/Roadmap */}
      {brief.roadmap?.value && brief.roadmap.value.phases.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Milestone className="w-4 h-4 text-accent" />
            Project Phases
          </label>
          <div className="space-y-2">
            {brief.roadmap.value.phases.map((phase, index) => (
              <div key={phase.id} className="p-3 rounded-lg border bg-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-medium text-sm">
                      Phase {index + 1}: {phase.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{phase.goal}</div>
                  </div>
                  {phase.estimated_days && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {phase.estimated_days}d
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Criteria */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent" />
          Success Criteria
        </label>
        <div className="p-3 rounded-lg border bg-card text-sm text-muted-foreground">
          What will success look like for this project?
        </div>
      </div>
    </div>
  );
};

export default PlanningBrief;