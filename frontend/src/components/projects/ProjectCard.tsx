/**
 * ProjectCard Component
 * 
 * Displays a single project in a card format with key information,
 * progress indicators, and action buttons. Following design system
 * patterns from the existing codebase.
 * 
 * Max ~150 lines to follow code review recommendations.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivitySparkline } from './ActivitySparkline';
import { formatProjectAge } from '@/utils/projectHelpers';
import { 
  Clock, 
  Calendar, 
  Edit,
  Trash2,
  Zap,
  Target
} from 'lucide-react';
import { Project, ProjectCardProps } from '@/types/projects';

// Format project type for display
const formatProjectType = (type: Project['type']): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onEdit,
  onDelete,
  showActions = true,
  compact = false
}) => {
  // Memoized calculations for performance
  const projectAge = useMemo(() => {
    return formatProjectAge(project.created_date);
  }, [project.created_date]);

  return (
    <Card 
      className="flex-shrink-0 hover:shadow-md transition-all duration-200 cursor-pointer group border-border/50"
      onClick={() => onSelect?.(project)}
      style={{ 
        scrollSnapAlign: 'start',
        width: 'calc((100% - 2rem) / 3)'
      }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate group-hover:text-accent transition-colors">
              {project.name}
            </h3>
            <div className="mt-1">
              <span className="text-xs text-muted-foreground">
                {formatProjectType(project.type)}
              </span>
            </div>
          </div>
          
          {showActions && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(project);
                }}
                className="h-7 w-7 p-0"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(project);
                }}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Description */}
        {!compact && (
          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {project.description}
          </p>
        )}

        {/* Recent Activity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Recent Activity</span>
          </div>
          <ActivitySparkline 
            weeklyHours={project.weekly_activity_hours} 
            width={120}
            height={24}
          />
        </div>

        {/* Key Metrics */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* Time this week */}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{project.hours_this_week}h</span>
          </div>
          
          {/* Sessions this week */}
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{project.sessions_this_week} sessions</span>
          </div>
          
          {/* Project age */}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className="truncate">{projectAge}</span>
          </div>
        </div>


        {/* Current State Preview (non-compact only) */}
        {!compact && project.current_state && (
          <div className="border-t border-border/50 pt-2 mt-2">
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              <span className="font-medium">Current: </span>
              {project.current_state}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};