/**
 * ProjectList Component
 * 
 * Displays a list of projects with loading states, empty states,
 * and error handling. Maintains <200 lines for code review compliance.
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { ProjectCard } from './ProjectCard';
import { ProjectListProps } from '@/types/projects';
import { 
  AlertCircle, 
  FolderPlus, 
  Search, 
  Target,
  Pause,
  List,
  CheckCircle,
  Archive,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// Loading Skeleton Component
const ProjectCardSkeleton = () => (
  <div className="border border-border/50 rounded-lg p-4 space-y-3 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="flex items-center gap-2">
          <div className="h-5 bg-muted rounded w-16"></div>
          <div className="h-3 bg-muted rounded w-12"></div>
        </div>
      </div>
    </div>
    <div className="h-8 bg-muted rounded"></div>
    <div className="space-y-1">
      <div className="h-2 bg-muted rounded w-full"></div>
      <div className="h-1 bg-muted rounded w-full"></div>
    </div>
    <div className="flex items-center justify-between">
      <div className="h-3 bg-muted rounded w-20"></div>
      <div className="h-3 bg-muted rounded w-16"></div>
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ 
  message, 
  showCreateButton, 
  onCreateProject 
}: { 
  message: string; 
  showCreateButton?: boolean;
  onCreateProject?: () => void;
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
      <FolderPlus className="w-8 h-8 text-muted-foreground" />
    </div>
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground">No Projects Found</h3>
      <p className="text-muted-foreground max-w-md">
        {message}
      </p>
    </div>
    {showCreateButton && onCreateProject && (
      <button 
        onClick={onCreateProject}
        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
      >
        <FolderPlus className="w-4 h-4" />
        Create Your First Project
      </button>
    )}
  </div>
);

// Error State Component
const ErrorState = ({ error, onRetry }: { error: string; onRetry?: () => void }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
    <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
      <AlertCircle className="w-8 h-8 text-destructive" />
    </div>
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-foreground">Error Loading Projects</h3>
      <p className="text-muted-foreground max-w-md">
        {error}
      </p>
    </div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
      >
        Try Again
      </button>
    )}
  </div>
);

// Hook to manage scroll indicators
const useScrollIndicators = (scrollRef: React.RefObject<HTMLDivElement>) => {
  const [scrollState, setScrollState] = useState({ 
    canScrollLeft: false, 
    canScrollRight: false 
  });

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setScrollState({
        canScrollLeft: scrollLeft > 0,
        canScrollRight: scrollLeft < scrollWidth - clientWidth - 1
      });
    };

    // Initial check
    updateScrollState();

    // Listen for scroll events
    container.addEventListener('scroll', updateScrollState);
    
    // Listen for resize events
    window.addEventListener('resize', updateScrollState);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [scrollRef]);

  return scrollState;
};

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  loading = false,
  error = null,
  onProjectSelect,
  onProjectEdit,
  onProjectDelete,
  onCreateProject,
  emptyStateMessage = "Start by creating your first project to organize your work and track progress."
}) => {
  // State for accordion sections - initially all expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    active: true,
    on_hold: true,
    backlog: true,
    completed: true,
    archived: true
  });

  // Refs for scroll containers - must be at top level
  const scrollRefs = {
    active: useRef<HTMLDivElement>(null),
    on_hold: useRef<HTMLDivElement>(null),
    backlog: useRef<HTMLDivElement>(null),
    completed: useRef<HTMLDivElement>(null),
    archived: useRef<HTMLDivElement>(null)
  };

  // Scroll indicators for each section
  const activeScrollState = useScrollIndicators(scrollRefs.active);
  const onHoldScrollState = useScrollIndicators(scrollRefs.on_hold);
  const backlogScrollState = useScrollIndicators(scrollRefs.backlog);
  const completedScrollState = useScrollIndicators(scrollRefs.completed);
  const archivedScrollState = useScrollIndicators(scrollRefs.archived);

  // Toggle section expansion
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Memoized project grouping for better organization
  const groupedProjects = useMemo(() => {
    const groups = {
      active: projects.filter(p => p.status === 'active'),
      on_hold: projects.filter(p => p.status === 'on_hold'),
      backlog: projects.filter(p => p.status === 'backlog'),
      completed: projects.filter(p => p.status === 'completed'),
      archived: projects.filter(p => p.status === 'archived')
    };

    return groups;
  }, [projects]);

  const hasAnyProjects = useMemo(() => {
    return projects && projects.length > 0;
  }, [projects]);

  // Loading State
  if (loading && !hasAnyProjects) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error && !hasAnyProjects) {
    return <ErrorState error={error} />;
  }

  // Empty State
  if (!loading && !hasAnyProjects) {
    return <EmptyState 
      message={emptyStateMessage} 
      showCreateButton 
      onCreateProject={onCreateProject}
    />;
  }

  // Render Projects by Status Groups
  const renderProjectGroup = (title: string, projectList: typeof projects, status: string) => {
    if (projectList.length === 0) return null;

    const isExpanded = expandedSections[status];
    const scrollRef = scrollRefs[status as keyof typeof scrollRefs];
    
    // Get the correct scroll state for this section
    let scrollState;
    switch (status) {
      case 'active':
        scrollState = activeScrollState;
        break;
      case 'on_hold':
        scrollState = onHoldScrollState;
        break;
      case 'backlog':
        scrollState = backlogScrollState;
        break;
      case 'completed':
        scrollState = completedScrollState;
        break;
      case 'archived':
        scrollState = archivedScrollState;
        break;
      default:
        scrollState = { canScrollLeft: false, canScrollRight: false };
    }

    const { canScrollLeft, canScrollRight } = scrollState;

    return (
      <div key={status} className="space-y-3">
        {/* Clickable Header */}
        <button
          onClick={() => toggleSection(status)}
          className="flex items-center gap-2 w-full -mx-2 px-2 py-1 rounded-md transition-colors group"
        >
          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" />
          )}
          
          {/* Status Icon */}
          {status === 'active' && <Target className="w-5 h-5 text-accent" />}
          {status === 'on_hold' && <Pause className="w-5 h-5 text-accent" />}
          {status === 'backlog' && <List className="w-5 h-5 text-accent" />}
          {status === 'completed' && <CheckCircle className="w-5 h-5 text-accent" />}
          {status === 'archived' && <Archive className="w-5 h-5 text-accent" />}
          
          <h3 className="text-sm font-bold tracking-wider text-accent uppercase">
            {title}
          </h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {projectList.length}
          </span>
        </button>
        
        {/* Collapsible Content */}
        {isExpanded && (
          <div className={`scroll-indicator-container animate-in fade-in-50 slide-in-from-top-2 duration-200 ${
            canScrollLeft ? 'scrolled-left' : ''
          } ${
            !canScrollRight ? 'scrolled-right' : ''
          }`}>
            <div ref={scrollRef} className="horizontal-scroll-container pb-2 -mx-2 px-2">
              <div className="flex gap-4">
                {projectList.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={onProjectSelect}
                    onEdit={onProjectEdit}
                    onDelete={onProjectDelete}
                    showActions={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {loading && hasAnyProjects && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
          Updating projects...
        </div>
      )}

      {/* Active Projects */}
      {renderProjectGroup('Active Projects', groupedProjects.active, 'active')}
      
      {/* On Hold Projects */}
      {renderProjectGroup('On Hold', groupedProjects.on_hold, 'on_hold')}
      
      {/* Backlog Projects */}
      {renderProjectGroup('Backlog', groupedProjects.backlog, 'backlog')}
      
      {/* Completed Projects */}
      {renderProjectGroup('Completed', groupedProjects.completed, 'completed')}
      
      {/* Archived Projects */}
      {renderProjectGroup('Archived', groupedProjects.archived, 'archived')}

      {/* Error overlay for updates */}
      {error && hasAnyProjects && (
        <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};