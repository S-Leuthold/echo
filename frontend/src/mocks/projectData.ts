/**
 * Mock Data for Projects Feature
 * 
 * Comprehensive mock data for testing and development.
 * Includes various project types, statuses, and realistic data.
 */

import { 
  Project, 
  ProjectTemplate, 
  WeeklySummary, 
  ProjectSession,
  ProjectStatsResponse 
} from '@/types/projects';
import { generateMockWeeklyActivity, generateMockDailyActivity } from '@/utils/projectHelpers';

// Project Templates for Wizard
export const mockProjectTemplates: ProjectTemplate[] = [
  {
    id: 'academic-research',
    name: 'Academic Research Project',
    type: 'research',
    description: 'Structured template for academic research with standard phases',
    default_phases: ['planning', 'literature_review', 'experiments', 'data_analysis', 'writing', 'revision', 'submission'],
    suggested_tasks: [
      'Define research question',
      'Literature review',
      'Design methodology',
      'Collect data',
      'Analyze results',
      'Write draft',
      'Peer review',
      'Submit for publication'
    ],
    estimated_duration_weeks: 24
  },
  {
    id: 'software-project',
    name: 'Software Development Project',
    type: 'software',
    description: 'Template for software projects with development lifecycle',
    default_phases: ['design', 'implementation', 'testing', 'deployment', 'maintenance'],
    suggested_tasks: [
      'Requirements gathering',
      'System design',
      'Frontend development',
      'Backend development',
      'Testing',
      'Documentation',
      'Deployment',
      'Bug fixes'
    ],
    estimated_duration_weeks: 16
  },
  {
    id: 'writing-project',
    name: 'Writing Project',
    type: 'writing',
    description: 'Template for books, articles, or long-form writing',
    default_phases: ['planning', 'writing', 'revision'],
    suggested_tasks: [
      'Outline creation',
      'Research',
      'First draft',
      'Self-review',
      'External feedback',
      'Revision',
      'Final edit',
      'Publication'
    ],
    estimated_duration_weeks: 12
  },
  {
    id: 'creative-project',
    name: 'Creative Project',
    type: 'creative',
    description: 'Flexible template for creative endeavors',
    default_phases: ['initiation', 'execution', 'monitoring', 'closure'],
    suggested_tasks: [
      'Concept development',
      'Initial sketches/prototypes',
      'Iterative development',
      'Feedback incorporation',
      'Final production',
      'Launch/exhibition'
    ],
    estimated_duration_weeks: 8
  }
];

// Weekly Summaries for Echo Project
const echoWeeklySummaries: WeeklySummary[] = [
  {
    id: 'echo-week-2025-01-26',
    project_id: 'echo-platform',
    week_ending: '2025-01-26',
    hours_invested: 12.5,
    sessions_count: 5,
    summary: 'Focused on stabilizing the time-aware planning system and laying groundwork for projects feature. Successfully resolved several critical bugs in plan detection and date handling that were causing confusion in the UI.',
    key_accomplishments: [
      'Fixed time-aware planning logic for tomorrow vs today modes',
      'Implemented date-based plan storage with proper localStorage keys',
      'Added AI narrative preservation when loading existing plans',
      'Removed demo UI elements and cleaned up planning interface',
      'Completed comprehensive analysis of database schema for projects support'
    ],
    decisions_made: [
      'Use date-specific localStorage keys (echo_plan_YYYY-MM-DD) instead of single key',
      'Preserve original AI-generated summaries when loading existing plans',
      'Prioritize UI stability over aggressive refactoring based on lessons learned',
      'Start projects feature with mock data to focus on UX before backend integration'
    ],
    blockers_encountered: [
      'Planning page refactor initially broke sophisticated UI - had to revert and take different approach',
      'TypeScript generic syntax issues in JSX context required syntax adjustments'
    ],
    next_week_focus: 'Begin projects tab implementation with focus on component architecture and mock data integration',
    tasks_completed: 8,
    phase_change: {
      from: 'implementation',
      to: 'implementation',
      reason: 'Continuing implementation phase with new projects feature'
    },
    generated_at: '2025-01-26T18:00:00Z',
    ai_confidence: 0.92
  },
  {
    id: 'echo-week-2025-01-19',
    project_id: 'echo-platform',
    week_ending: '2025-01-19',
    hours_invested: 15.2,
    sessions_count: 6,
    summary: 'Major milestone week implementing the Command Center redesign and planning system overhaul. Successfully shipped unified planning experience with significant UI improvements.',
    key_accomplishments: [
      'Completed Command Center redesign with professional styling',
      'Implemented toast notification system replacing intrusive modals',
      'Added smooth UI transitions and animations throughout planning flow',
      'Enhanced button states and user feedback mechanisms',
      'Unified section headers with consistent ALL CAPS • GOLD • ICON styling'
    ],
    decisions_made: [
      'Use toast notifications instead of modal dialogs for better UX',
      'Implement 300ms transition timing for professional feel',
      'Standardize on amber-500 color for accent elements',
      'Use staggered animations (200-400ms delays) for content reveals'
    ],
    blockers_encountered: [
      'Initial toast implementation had z-index conflicts with planning timeline',
      'Animation timing required several iterations to feel natural'
    ],
    next_week_focus: 'Focus on date handling improvements and planning system refinements',
    tasks_completed: 12,
    generated_at: '2025-01-19T17:30:00Z',
    ai_confidence: 0.95
  }
];

// Weekly Summaries for MAOM-N Project
const maomWeeklySummaries: WeeklySummary[] = [
  {
    id: 'maom-week-2025-01-26',
    project_id: 'maom-manuscript',
    week_ending: '2025-01-26',
    hours_invested: 6.5,
    sessions_count: 3,
    summary: 'Continued revision work on methodology section with focus on statistical analysis clarification. Made good progress on reviewer comments from previous submission.',
    key_accomplishments: [
      'Revised statistical methodology section for clarity',
      'Addressed 3 of 5 major reviewer comments',
      'Updated figures with better resolution and labeling',
      'Refined discussion section conclusions'
    ],
    decisions_made: [
      'Use mixed-effects models instead of simple regression for better accuracy',
      'Include additional demographic controls based on reviewer suggestions',
      'Restructure discussion to emphasize practical implications'
    ],
    blockers_encountered: [
      'Waiting on co-author feedback for results interpretation',
      'Need access to additional dataset for robustness checks'
    ],
    next_week_focus: 'Complete remaining reviewer comments and prepare resubmission package',
    tasks_completed: 4,
    generated_at: '2025-01-26T16:45:00Z',
    ai_confidence: 0.88
  }
];

// Mock Projects Data
export const mockProjects: Project[] = [
  {
    id: 'echo-platform',
    name: 'Echo Platform Development',
    description: 'Building an AI-powered daily planning system that adapts to user needs and provides intelligent context for productivity.',
    type: 'software',
    status: 'active',
    phase: 'implementation',
    objective: 'Create a production-ready daily planning system with AI-powered context briefings, session management, and intelligent scheduling.',
    current_state: 'Currently implementing projects feature with focus on component architecture and database integration. System has solid foundation with planning, session management, and analytics capabilities operational.',
    total_estimated_hours: 400,
    total_actual_hours: 127.7,
    hours_this_week: 12.5,
    hours_last_week: 15.2,
    progress_percentage: 67,
    momentum: 'high',
    created_date: '2024-09-15',
    updated_date: '2025-01-26',
    last_session_date: '2025-01-26',
    weekly_summaries: echoWeeklySummaries,
    total_sessions: 23,
    sessions_this_week: 5,
    weekly_activity_hours: generateMockWeeklyActivity(8, 'consistent'),
    daily_activity_hours: generateMockDailyActivity('consistent')
  },
  {
    id: 'maom-manuscript',
    name: 'MAOM-N | Manuscript Revision',
    description: 'Revising academic manuscript on machine learning applications in organizational management for resubmission to top-tier journal.',
    type: 'research',
    status: 'active',
    phase: 'revision',
    objective: 'Successfully publish research findings in a high-impact academic journal to advance the field and support career progression.',
    current_state: 'In revision phase addressing reviewer comments from Journal of Applied Psychology. 3 of 5 major comments addressed, 2 remaining require additional analysis.',
    total_estimated_hours: 120,
    total_actual_hours: 89.3,
    hours_this_week: 6.5,
    hours_last_week: 8.0,
    progress_percentage: 85,
    momentum: 'medium',
    created_date: '2024-06-01',
    updated_date: '2025-01-26',
    last_session_date: '2025-01-25',
    weekly_summaries: maomWeeklySummaries,
    total_sessions: 31,
    sessions_this_week: 3,
    weekly_activity_hours: generateMockWeeklyActivity(8, 'ramping_up'),
    daily_activity_hours: generateMockDailyActivity('ramping_up')
  },
  {
    id: 'personal-website',
    name: 'PersonalSite | Portfolio Redesign',
    description: 'Complete redesign of personal website with modern tech stack, improved portfolio showcase, and blog functionality.',
    type: 'creative',
    status: 'on_hold',
    phase: 'design',
    objective: 'Create a professional online presence that effectively showcases work, skills, and thought leadership in AI and productivity.',
    current_state: 'On hold pending completion of higher priority projects. Initial design mockups completed, technology stack selected (Next.js, Tailwind, MDX).',
    total_estimated_hours: 60,
    total_actual_hours: 12.5,
    hours_this_week: 0,
    hours_last_week: 0,
    progress_percentage: 15,
    momentum: 'stalled',
    created_date: '2024-11-20',
    updated_date: '2025-01-10',
    last_session_date: '2025-01-08',
    weekly_summaries: [],
    total_sessions: 4,
    sessions_this_week: 0,
    weekly_activity_hours: generateMockWeeklyActivity(8, 'ramping_down'),
    daily_activity_hours: generateMockDailyActivity('ramping_down')
  },
  {
    id: 'ai-research-lab',
    name: 'AI Research | Lab Setup',
    description: 'Establishing infrastructure and workflows for AI research experiments, including compute resources, data pipelines, and experiment tracking.',
    type: 'research',
    status: 'active',
    phase: 'initiation',
    objective: 'Build scalable research infrastructure that enables rapid experimentation and reproducible results for AI/ML research projects.',
    current_state: 'Early setup phase. Evaluating cloud compute options, designing experiment tracking workflows, and establishing data management protocols.',
    total_estimated_hours: 80,
    total_actual_hours: 18.5,
    hours_this_week: 4.0,
    hours_last_week: 6.5,
    progress_percentage: 25,
    momentum: 'medium',
    created_date: '2025-01-05',
    updated_date: '2025-01-26',
    last_session_date: '2025-01-24',
    weekly_summaries: [],
    total_sessions: 6,
    sessions_this_week: 2,
    weekly_activity_hours: generateMockWeeklyActivity(8, 'sporadic'),
    daily_activity_hours: generateMockDailyActivity('sporadic')
  },
  {
    id: 'mobile-app-prototype',
    name: 'EchoMobile | iOS Prototype',
    description: 'Building native iOS companion app for Echo platform with core planning and session management features.',
    type: 'software',
    status: 'active',
    phase: 'design',
    objective: 'Create seamless mobile experience that syncs with web platform and enables on-the-go planning and session tracking.',
    current_state: 'Design phase focusing on SwiftUI architecture and API integration patterns. Core wireframes completed, beginning prototype development.',
    total_estimated_hours: 150,
    total_actual_hours: 22.5,
    hours_this_week: 8.5,
    hours_last_week: 12.0,
    progress_percentage: 15,
    momentum: 'high',
    created_date: '2025-01-10',
    updated_date: '2025-01-26',
    last_session_date: '2025-01-26',
    weekly_summaries: [],
    total_sessions: 8,
    sessions_this_week: 4,
    weekly_activity_hours: generateMockWeeklyActivity(8, 'ramping_up'),
    daily_activity_hours: generateMockDailyActivity('ramping_up')
  },
  {
    id: 'productivity-book',
    name: 'Productivity Systems Book',
    description: 'Writing a comprehensive guide to building personal productivity systems using AI assistance and systematic approaches.',
    type: 'writing',
    status: 'backlog',
    phase: 'planning',
    objective: 'Publish a practical guide that helps knowledge workers build sustainable productivity systems with modern tools and AI assistance.',
    current_state: 'In backlog awaiting completion of current active projects. Outline drafted, initial research completed, target publication timeline set for late 2025.',
    total_estimated_hours: 200,
    total_actual_hours: 8.5,
    hours_this_week: 0,
    hours_last_week: 0,
    progress_percentage: 5,
    momentum: 'stalled',
    created_date: '2024-12-01',
    updated_date: '2025-01-15',
    last_session_date: '2025-01-15',
    weekly_summaries: [],
    total_sessions: 3,
    sessions_this_week: 0,
    weekly_activity_hours: generateMockWeeklyActivity(8, 'peaked'),
    daily_activity_hours: generateMockDailyActivity('peaked')
  },
  {
    id: 'conference-presentation',
    name: 'AI in Productivity | Conference Talk',
    description: 'Developing presentation on AI-assisted productivity systems for upcoming tech conference, including demo preparation and slides.',
    type: 'creative',
    status: 'completed',
    phase: 'closure',
    objective: 'Deliver compelling presentation that showcases practical applications of AI in productivity and generates interest in research.',
    current_state: 'Successfully completed. Presentation delivered at TechConf 2024, received positive feedback, follow-up conversations scheduled with 3 potential collaborators.',
    total_estimated_hours: 40,
    total_actual_hours: 42.5,
    hours_this_week: 0,
    hours_last_week: 0,
    progress_percentage: 100,
    momentum: 'high',
    created_date: '2024-10-01',
    updated_date: '2024-12-15',
    last_session_date: '2024-12-10',
    weekly_summaries: [],
    total_sessions: 18,
    sessions_this_week: 0,
    weekly_activity_hours: [0, 0, 0, 0, 0, 0, 0, 0], // Completed project, no recent activity
    daily_activity_hours: [] // Completed project, no daily activity data
  }
];

// Mock Project Sessions
export const mockProjectSessions: ProjectSession[] = [
  {
    id: 'session-echo-1',
    project_id: 'echo-platform',
    title: 'Projects Feature: TypeScript Interfaces & Mock Data',
    date: '2025-01-26',
    start_time: '09:00',
    end_time: '11:30',
    duration_minutes: 150,
    category: 'DEEP_WORK',
    notes_summary: 'Created comprehensive TypeScript interfaces for projects feature. Defined Project, WeeklySummary, and supporting types. Built extensive mock data with realistic project examples.',
    tags: ['typescript', 'interfaces', 'mock-data', 'projects']
  },
  {
    id: 'session-echo-2',
    project_id: 'echo-platform',
    title: 'Planning System: Date Handling Bug Fixes',
    date: '2025-01-25',
    start_time: '14:00',
    end_time: '16:00',
    duration_minutes: 120,
    category: 'DEEP_WORK',
    notes_summary: 'Fixed critical bugs in plan detection for tomorrow vs today modes. Updated localStorage to use date-specific keys. Ensured AI narrative preservation.',
    tags: ['bug-fixes', 'planning', 'localStorage', 'date-handling']
  },
  {
    id: 'session-maom-1',
    project_id: 'maom-manuscript',
    title: 'Methodology Section Revision',
    date: '2025-01-25',
    start_time: '10:00',
    end_time: '12:00',
    duration_minutes: 120,
    category: 'RESEARCH',
    notes_summary: 'Revised statistical methodology section based on reviewer comments. Clarified mixed-effects model rationale and updated analysis approach.',
    tags: ['revision', 'methodology', 'statistics', 'reviewer-comments']
  }
];

// Mock Stats Response
export const mockProjectStats: ProjectStatsResponse = {
  total_projects: 7,
  active_projects: 4,
  total_hours_all_time: 321.0,
  total_hours_this_week: 31.5,
  total_hours_last_week: 41.7,
  most_active_project: {
    id: 'echo-platform',
    name: 'Echo Platform Development',
    hours_this_week: 12.5
  },
  completion_rate: 14.3 // 1 completed out of 7 total
};

// Utility function to get project by ID
export const getProjectById = (id: string): Project | undefined => {
  return mockProjects.find(project => project.id === id);
};

// Utility function to get projects by status
export const getProjectsByStatus = (status: string): Project[] => {
  return mockProjects.filter(project => project.status === status);
};

// Utility function to get active projects
export const getActiveProjects = (): Project[] => {
  return mockProjects.filter(project => project.status === 'active');
};

// Utility function to simulate API delay
export const simulateApiDelay = (ms: number = 800): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};