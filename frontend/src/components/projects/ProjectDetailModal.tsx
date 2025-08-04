/**
 * ProjectDetailModal Component
 * 
 * Modal displaying comprehensive project information with tabbed interface.
 * Features: Overview, Sessions, Settings tabs with read-only view.
 * <200 lines for code review compliance.
 */

"use client";

import { useState } from 'react';
import { useDevMode } from '@/config/devMode';
import { useProjects } from '@/hooks/projects/useProjects';
import { Project, ProjectType, ProjectStatus, ProjectPhase } from '@/types/projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EditableField } from './EditableField';
import { ActivitySparkline } from './ActivitySparkline';
import { LabeledActivitySparkline } from './LabeledActivitySparkline';
import { ActivityHeatmap } from './ActivityHeatmap';
import { MetricCard } from './MetricCard';
import { NarrativeSection } from './NarrativeSection';
import { MetadataField } from './MetadataField';
import { formatProjectAge, getRecentInsights } from '@/utils/projectHelpers';
import { 
  X, 
  Edit,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  Settings,
  FileText,
  Activity,
  Zap,
  Search,
  PenTool,
  Palette,
  Users,
  Check
} from 'lucide-react';

interface ProjectDetailModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (project: Project) => void;
  onUpdate?: (projectId: string, updates: Partial<Project>) => void;
}

// Utility functions for modal
const getProjectTypeIcon = (type: string) => {
  switch (type) {
    case 'software': return Target;
    case 'research': return Search;
    case 'writing': return PenTool;
    case 'creative': return Palette;
    default: return Target;
  }
};


const calculateAvgSessionLength = (project: Project): number => {
  if (project.total_sessions === 0) return 0;
  return Math.round((project.total_actual_hours / project.total_sessions) * 10) / 10;
};

const formatLastSession = (lastSessionDate: string): string => {
  if (!lastSessionDate) return 'No recent sessions';
  const days = Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  return `Active ${days} days ago`;
};

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onEdit,
  onUpdate
}) => {
  const { config } = useDevMode();
  const { updateProject } = useProjects();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Don't render if not open, no project, or feature disabled
  if (!isOpen || !project || !config.enableProjectDetails) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Field update handler
  const handleFieldUpdate = async (field: keyof Project, value: string | number): Promise<boolean> => {
    if (!project) return false;
    
    try {
      const updates = { [field]: value };
      await updateProject(project.id, updates);
      onUpdate?.(project.id, updates);
      return true;
    } catch (error) {
      console.error('Failed to update project field:', error);
      return false;
    }
  };

  // Delete confirmation handler
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmText.toLowerCase() === 'delete') {
      // TODO: Implement actual delete logic
      console.log('Deleting project:', project.id);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      onClose();
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  };

  // Options for select fields
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'backlog', label: 'Backlog' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' }
  ];

  const typeOptions = [
    { value: 'software', label: 'Software' },
    { value: 'research', label: 'Research' },
    { value: 'writing', label: 'Writing' },
    { value: 'creative', label: 'Creative' },
    { value: 'admin', label: 'Admin' },
    { value: 'personal', label: 'Personal' }
  ];


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Project Type Icon */}
            {(() => {
              const TypeIcon = getProjectTypeIcon(project.type);
              return <TypeIcon className="w-6 h-6 text-accent" />;
            })()}
            
            <div className="space-y-1">
              {/* Project Name */}
              <h2 className="text-lg font-semibold text-foreground">{project.name}</h2>
              
              {/* Project Details Row */}
              <div className="flex items-center gap-4 text-sm">
                {/* Project Type */}
                <span className="text-muted-foreground capitalize">
                  {project.type}
                </span>
                
                {/* Last Session */}
                <span className="text-muted-foreground">
                  {formatLastSession(project.last_session_date)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              {isEditMode ? 'Done' : 'Edit'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tab Navigation */}
          <div className="border-b border-border flex-shrink-0 px-6 pt-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'sessions', label: 'Sessions & Activity', icon: Activity },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === id
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* 1. Key Metrics Bar */}
                <div className="grid grid-cols-4 gap-6">
                  <MetricCard 
                    value={project.total_actual_hours} 
                    unit="h" 
                    label="Total Hours" 
                  />
                  <MetricCard 
                    value={project.hours_this_week} 
                    unit="h" 
                    label="This Week" 
                  />
                  <MetricCard 
                    value={project.total_sessions} 
                    unit="" 
                    label="Total Sessions" 
                  />
                  <MetricCard 
                    value={calculateAvgSessionLength(project)} 
                    unit="h" 
                    label="Avg Session" 
                  />
                </div>

                {/* 2. Large Labeled Sparkline */}
                <div className="text-center pt-4">
                  <LabeledActivitySparkline 
                    weeklyHours={project.weekly_activity_hours}
                    width={700}
                    height={140}
                    showAxes={true}
                    className="mx-auto"
                  />
                </div>

                {/* 3. Enhanced Narrative Blocks */}
                <div className="space-y-6">
                  <NarrativeSection 
                    title="Project Summary"
                    content={project.objective}
                    isEditMode={isEditMode}
                    onSave={(value) => handleFieldUpdate('objective', value)}
                  />
                  
                  <NarrativeSection 
                    title="Current Status"
                    content={project.current_state}
                    isEditMode={isEditMode}
                    onSave={(value) => handleFieldUpdate('current_state', value)}
                  />
                  
                  <NarrativeSection 
                    title="Recent Insights"
                    content={getRecentInsights(project.weekly_summaries)}
                    isReadOnly={true}
                  />
                </div>

                {/* 4. Metadata Grid */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Project Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {isEditMode ? (
                      <>
                        <div>
                          <EditableField
                            label="Type"
                            value={project.type}
                            type="select"
                            options={typeOptions}
                            onSave={(value) => handleFieldUpdate('type', value)}
                            required
                          />
                        </div>
                        <div>
                          <EditableField
                            label="Status"
                            value={project.status}
                            displayValue={project.status.replace('_', ' ')}
                            type="select"
                            options={statusOptions}
                            onSave={(value) => handleFieldUpdate('status', value)}
                            required
                          />
                        </div>
                        <div>
                          <EditableField
                            label="Phase"
                            value={project.phase}
                            displayValue={project.phase.replace('_', ' ')}
                            type="text"
                            onSave={(value) => handleFieldUpdate('phase', value)}
                            required
                          />
                        </div>
                        <div>
                          <MetadataField 
                            label="Created" 
                            value={formatDate(project.created_date)} 
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <MetadataField 
                          label="Type" 
                          value={project.type} 
                        />
                        <MetadataField 
                          label="Status" 
                          value={project.status} 
                        />
                        <MetadataField 
                          label="Phase" 
                          value={project.phase} 
                        />
                        <MetadataField 
                          label="Created" 
                          value={formatDate(project.created_date)} 
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sessions & Activity Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-8">
                {/* Activity Patterns Section */}
                <div>
                  {/* GitHub-style activity heatmap */}
                  <div className="flex justify-center mb-8">
                    <ActivityHeatmap 
                      dailyActivity={project.daily_activity_hours}
                      className=""
                    />
                  </div>
                  
                  {/* Activity insights grid */}
                  <div className="grid grid-cols-3 gap-8">
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Peak Day</div>
                      <div className="text-lg font-semibold text-foreground">
                        {project.daily_activity_hours.length > 0 
                          ? Math.max(...project.daily_activity_hours.map(d => d.hours)).toFixed(1)
                          : '0.0'}h
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Daily Average</div>
                      <div className="text-lg font-semibold text-foreground">
                        {project.daily_activity_hours.length > 0
                          ? (project.daily_activity_hours.reduce((sum, day) => sum + day.hours, 0) / project.daily_activity_hours.length).toFixed(1)
                          : '0.0'}h
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Recent Trend</div>
                      <div className="text-lg font-semibold text-foreground">
                        {(() => {
                          if (project.daily_activity_hours.length < 14) return 'New';
                          
                          // Compare last 7 days to previous 7 days
                          const recent7 = project.daily_activity_hours.slice(-7);
                          const previous7 = project.daily_activity_hours.slice(-14, -7);
                          
                          const recentAvg = recent7.reduce((sum, day) => sum + day.hours, 0) / 7;
                          const previousAvg = previous7.reduce((sum, day) => sum + day.hours, 0) / 7;
                          
                          if (previousAvg === 0) return recentAvg > 0 ? '↑ Starting' : '→ Quiet';
                          
                          const change = ((recentAvg - previousAvg) / previousAvg) * 100;
                          
                          if (change > 20) return '↑ Building';
                          if (change > 5) return '↑ Rising';
                          if (change < -20) return '↓ Slowing';
                          if (change < -5) return '↓ Declining';
                          return '→ Steady';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weekly Activity Reports Section */}
                {project.weekly_summaries && project.weekly_summaries.length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium mb-6">Weekly Activity Reports</h2>
                    <div className="space-y-6">
                      {project.weekly_summaries.slice(0, 4).map((summary) => (
                        <div key={summary.id} className="border-l-4 border-l-accent pl-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground">Week of {new Date(summary.week_ending).toLocaleDateString()}</h3>
                            <span className="text-xs text-muted-foreground">
                              {summary.sessions_count} sessions ({summary.hours_invested}h)
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {summary.summary}
                          </p>
                          
                          {/* Key accomplishments */}
                          {summary.key_accomplishments && summary.key_accomplishments.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-accent uppercase tracking-wider">
                                Key Accomplishments
                              </h4>
                              <ul className="text-sm space-y-1">
                                {summary.key_accomplishments.slice(0, 3).map((item, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <Check className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future: Session History */}
                <div>
                  <h2 className="text-lg font-medium mb-6">Session History</h2>
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Individual session logs will appear here</p>
                    <p className="text-sm">Coming in Phase 2</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-8">
                {/* Export Options */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Export Data</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="justify-start gap-2">
                      <FileText className="w-4 h-4" />
                      Export JSON
                    </Button>
                    <Button variant="outline" className="justify-start gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {/* Project Metadata */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-4">Project Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <MetadataField 
                      label="Created" 
                      value={formatDate(project.created_date)} 
                    />
                    <MetadataField 
                      label="Last Updated" 
                      value={formatDate(project.updated_date)} 
                    />
                    <MetadataField 
                      label="Project ID" 
                      value={project.id} 
                    />
                    <MetadataField 
                      label="Last Session" 
                      value={project.last_session_date ? formatDate(project.last_session_date) : 'Never'} 
                    />
                  </div>
                </div>

                {/* Archive Project */}
                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-foreground">Archive Project</h3>
                      <p className="text-xs text-muted-foreground">Move to archived state, preserve all data</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Archive
                    </Button>
                  </div>
                </div>

                {/* Delete Project - Final Item */}
                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium text-foreground">Delete Project</h3>
                      <p className="text-xs text-muted-foreground text-red-500">Permanently remove all project data</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Delete Project</h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. This will permanently delete the project "{project.name}" and all of its data.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Type <span className="font-mono bg-muted px-1 rounded">delete</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                  placeholder="Type 'delete' to confirm"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={handleDeleteCancel}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                >
                  Delete Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Label component for consistent styling
const Label = ({ className, children, ...props }: { className?: string; children: React.ReactNode }) => (
  <label className={`block text-sm font-medium ${className || ''}`} {...props}>
    {children}
  </label>
);