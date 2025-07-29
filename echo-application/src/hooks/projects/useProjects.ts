/**
 * useProjects Hook
 * 
 * Custom hook for managing projects data and operations.
 * Supports both mock data and real API calls via dev mode.
 * Follows best practices: single responsibility, proper error handling,
 * memoization for performance.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Project, 
  ProjectFilters, 
  ProjectSortBy, 
  SortOrder, 
  UseProjectsReturn,
  ProjectFormData
} from '@/types/projects';
import { 
  mockProjects, 
  simulateApiDelay,
  getProjectsByStatus,
  getActiveProjects 
} from '@/mocks/projectData';
import { useDevMode } from '@/config/devMode';

const INITIAL_FILTERS: ProjectFilters = {
  status: undefined,
  type: undefined,
  phase: undefined,
  momentum: undefined,
  search: undefined
};

export const useProjects = (): UseProjectsReturn => {
  // Dev Mode Configuration
  const { config } = useDevMode();
  
  // State Management
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProjectFilters>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState<ProjectSortBy>('updated_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filtered and Sorted Projects (Memoized for Performance)
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply Filters
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(project => filters.status!.includes(project.status));
    }

    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(project => filters.type!.includes(project.type));
    }

    if (filters.phase && filters.phase.length > 0) {
      filtered = filtered.filter(project => filters.phase!.includes(project.phase));
    }

    if (filters.momentum && filters.momentum.length > 0) {
      filtered = filtered.filter(project => filters.momentum!.includes(project.momentum));
    }

    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm) ||
        project.objective.toLowerCase().includes(searchTerm) ||
        project.current_state.toLowerCase().includes(searchTerm)
      );
    }

    // Apply Sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'updated_date':
          aValue = new Date(a.updated_date).getTime();
          bValue = new Date(b.updated_date).getTime();
          break;
        case 'created_date':
          aValue = new Date(a.created_date).getTime();
          bValue = new Date(b.created_date).getTime();
          break;
        case 'hours_this_week':
          aValue = a.hours_this_week;
          bValue = b.hours_this_week;
          break;
        case 'progress_percentage':
          aValue = a.progress_percentage;
          bValue = b.progress_percentage;
          break;
        default:
          aValue = a.updated_date;
          bValue = b.updated_date;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [projects, filters, sortBy, sortOrder]);

  // Load Projects (Mock Data or Real API based on dev config)
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (config.useMockData) {
        // Mock data path
        await simulateApiDelay(600);
        setProjects(mockProjects);
      } else if (config.useRealAPI) {
        // Real API path (TODO: implement when backend is ready)
        await simulateApiDelay(800);
        // TODO: Replace with actual API call
        // const response = await fetch('/api/projects');
        // const projects = await response.json();
        // setProjects(projects);
        
        // For now, fallback to mock data
        setProjects(mockProjects);
        console.warn('Real API not implemented yet, using mock data');
      } else {
        // No data source configured
        setProjects([]);
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  }, [config.useMockData, config.useRealAPI]);

  // Create Project
  const createProject = useCallback(async (data: ProjectFormData): Promise<Project> => {
    try {
      setLoading(true);
      setError(null);

      // Simulate API delay
      await simulateApiDelay(400);

      // Create new project object
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: data.name,
        description: data.description,
        type: data.type,
        status: 'active',
        phase: data.initial_phase || 'initiation',
        objective: data.objective,
        current_state: 'Project just created. Ready to begin work.',
        total_estimated_hours: data.estimated_hours || 40,
        total_actual_hours: 0,
        hours_this_week: 0,
        hours_last_week: 0,
        progress_percentage: 0,
        momentum: 'medium',
        created_date: new Date().toISOString().split('T')[0],
        updated_date: new Date().toISOString().split('T')[0],
        weekly_summaries: [],
        total_sessions: 0,
        sessions_this_week: 0
      };

      // Add to projects list
      setProjects(prev => [newProject, ...prev]);
      
      return newProject;
    } catch (err) {
      setError('Failed to create project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update Project
  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<Project> => {
    try {
      setLoading(true);
      setError(null);

      await simulateApiDelay(300);

      setProjects(prev => prev.map(project => 
        project.id === id 
          ? { 
              ...project, 
              ...updates, 
              updated_date: new Date().toISOString().split('T')[0] 
            }
          : project
      ));

      const updatedProject = projects.find(p => p.id === id);
      if (!updatedProject) {
        throw new Error('Project not found');
      }

      return { ...updatedProject, ...updates };
    } catch (err) {
      setError('Failed to update project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projects]);

  // Delete Project
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      await simulateApiDelay(300);

      setProjects(prev => prev.filter(project => project.id !== id));
    } catch (err) {
      setError('Failed to delete project');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh Projects
  const refreshProjects = useCallback(async (): Promise<void> => {
    await loadProjects();
  }, [loadProjects]);

  // Set Sorting
  const setSorting = useCallback((newSortBy: ProjectSortBy, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    projects: filteredAndSortedProjects,
    loading,
    error,
    filters,
    sortBy,
    sortOrder,
    setFilters,
    setSorting,
    refreshProjects,
    createProject,
    updateProject,
    deleteProject
  };
};