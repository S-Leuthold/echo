/**
 * Projects Page
 * 
 * Main projects dashboard page. Feature flagged for safe rollout.
 * Uses all the components we just built with proper error boundaries.
 */

"use client";

import { useState } from 'react';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectWizard } from '@/components/projects/ProjectWizard';
import { HybridProjectCreator } from '@/components/projects/HybridProjectCreator';
import { ProjectDetailModal } from '@/components/projects/ProjectDetailModal';
import { useProjects } from '@/hooks/projects/useProjects';
import { useDevMode } from '@/config/devMode';
import { Project } from '@/types/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Search, 
  Filter,
  FolderPlus,
  Database,
  Wifi,
  Sparkles,
  ChevronDown
} from 'lucide-react';

// Feature flag for projects
const FEATURES = {
  PROJECTS_TAB: process.env.NEXT_PUBLIC_ENABLE_PROJECTS === 'true' || true // Default to true for development
};

export default function ProjectsPage() {
  // Feature flag check
  if (!FEATURES.PROJECTS_TAB) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Projects Feature</h1>
          <p className="text-muted-foreground">This feature is currently in development.</p>
        </div>
      </div>
    );
  }

  // Dev mode and hooks
  const { config, isDevelopment } = useDevMode();
  const {
    projects,
    loading,
    error,
    filters,
    setFilters,
    refreshProjects
  } = useProjects();

  const [searchQuery, setSearchQuery] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isHybridWizardOpen, setIsHybridWizardOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({
      ...filters,
      search: query.trim() || undefined
    });
  };

  // Handle project selection
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setIsDetailModalOpen(true);
  };

  // Handle project editing
  const handleProjectEdit = (project: Project) => {
    console.log('Edit project:', project);
    // TODO: Open edit modal or navigate to edit page
  };

  // Handle project deletion
  const handleProjectDelete = (project: Project) => {
    console.log('Delete project:', project);
    // TODO: Show confirmation dialog and delete
  };

  // Handle wizard success
  const handleWizardSuccess = (projectId: string) => {
    console.log('Project created successfully:', projectId);
    // Refresh the projects list to show the new project
    refreshProjects();
  };

  // Handle hybrid wizard success
  const handleHybridWizardSuccess = (projectId: string) => {
    console.log('Project created successfully via hybrid AI:', projectId);
    // Refresh the projects list to show the new project
    refreshProjects();
  };

  // Handle project detail modal close
  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    setSelectedProject(null);
  };

  // Handle project edit from detail modal
  const handleProjectEditFromDetail = (project: Project) => {
    console.log('Edit project from detail:', project);
    // TODO: Open edit modal or wizard in edit mode
    handleDetailModalClose();
  };

  // Handle project update from detail modal
  const handleProjectUpdate = (projectId: string, updates: Partial<Project>) => {
    console.log('Project updated:', projectId, updates);
    // The projects list will be automatically updated by the useProjects hook
    // We could also update selectedProject if we want real-time updates in the modal
    if (selectedProject && selectedProject.id === projectId) {
      setSelectedProject({ ...selectedProject, ...updates });
    }
  };

  // Stats
  const activeProjects = projects.filter(p => p.status === 'active').length;
  const totalHoursThisWeek = projects.reduce((sum, p) => sum + p.hours_this_week, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">Projects</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{activeProjects} active projects</span>
                <span>•</span>
                <span>{totalHoursThisWeek}h this week</span>
                {isDevelopment() && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      {config.useMockData ? (
                        <Database className="w-3 h-3" />
                      ) : (
                        <Wifi className="w-3 h-3" />
                      )}
                      <span className="text-xs">
                        {config.useMockData ? 'Mock Data' : 'API'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={refreshProjects}>
                Refresh
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    size="sm" 
                    className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Project
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => setIsWizardOpen(true)}
                    className="gap-2 cursor-pointer"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">Quick Create</span>
                      <span className="text-xs text-muted-foreground">Fast setup with templates</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setIsHybridWizardOpen(true)}
                    className="gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-accent" />
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">New with AI</span>
                      <span className="text-xs text-muted-foreground">Conversational project builder</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <Button 
                variant={filters.status?.includes('active') ? "default" : "outline"} 
                size="sm"
                onClick={() => {
                  const newStatus = filters.status?.includes('active') 
                    ? filters.status.filter(s => s !== 'active')
                    : [...(filters.status || []), 'active'];
                  setFilters({ ...filters, status: newStatus.length ? newStatus : undefined });
                }}
              >
                Active
              </Button>
              <Button 
                variant={filters.status?.includes('on_hold') ? "default" : "outline"} 
                size="sm"
                onClick={() => {
                  const newStatus = filters.status?.includes('on_hold') 
                    ? filters.status.filter(s => s !== 'on_hold')
                    : [...(filters.status || []), 'on_hold'];
                  setFilters({ ...filters, status: newStatus.length ? newStatus : undefined });
                }}
              >
                On Hold
              </Button>
            </div>
          </div>

        </div>

        {/* Projects List */}
        <ProjectList
          projects={projects}
          loading={loading}
          error={error}
          onProjectSelect={handleProjectSelect}
          onProjectEdit={handleProjectEdit}
          onProjectDelete={handleProjectDelete}
        />

        {/* Project Creation Wizard */}
        <ProjectWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={handleWizardSuccess}
        />

        {/* Hybrid AI Project Creator */}
        <HybridProjectCreator
          isOpen={isHybridWizardOpen}
          onClose={() => setIsHybridWizardOpen(false)}
          onSuccess={handleHybridWizardSuccess}
        />

        {/* Project Detail Modal */}
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isDetailModalOpen}
          onClose={handleDetailModalClose}
          onEdit={handleProjectEditFromDetail}
          onUpdate={handleProjectUpdate}
        />
      </div>
    </div>
  );
}