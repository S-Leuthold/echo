import { Block } from '@/hooks/useSessionState';
import { IconResolutionService } from '@/lib/icon-resolution';

/**
 * Mock Session Data Service
 * Production-grade mock data for testing all session states
 */

// Rich mock schedule with diverse block types for comprehensive state testing
export const generateMockSchedule = (): Block[] => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Base schedule template that adapts to current time
  const scheduleTemplate = [
    // Morning routine
    {
      id: 'morning-reading',
      startTime: '06:00',
      endTime: '06:30',
      label: 'Personal | Morning Reading',
      timeCategory: 'PERSONAL',
      emoji: '📚',
      strategicNote: 'Start the day with clarity and intention.'
    },
    {
      id: 'morning-exercise',
      startTime: '06:30',
      endTime: '07:30',
      label: 'Health | Morning Workout',
      timeCategory: 'HEALTH',
      emoji: '💪',
      strategicNote: 'Energy investment that pays dividends all day.'
    },
    {
      id: 'breakfast',
      startTime: '07:30',
      endTime: '08:00',
      label: 'Personal | Breakfast',
      timeCategory: 'MEALS',
      emoji: '🍳',
      strategicNote: 'Fuel your body and mind for the day ahead.'
    },
    // Work blocks
    {
      id: 'deep-work-1',
      startTime: '09:00',
      endTime: '11:00',
      label: 'Echo Development | Frontend Architecture',
      timeCategory: 'DEEP_WORK',
      emoji: '🚀',
      strategicNote: 'Core development time - build the session state system that transforms Echo into a thinking tool.'
    },
    {
      id: 'admin-email',
      startTime: '11:00',
      endTime: '11:30',
      label: 'Admin | Email Processing',
      timeCategory: 'ADMIN',
      emoji: '📧',
      strategicNote: 'Quick email triage - maintain inbox zero and identify action items.'
    },
    {
      id: 'team-standup',
      startTime: '12:00',
      endTime: '12:30',
      label: 'Team Standup',
      timeCategory: 'MEETINGS',
      emoji: '🤝',
      strategicNote: 'Quick alignment check - status, blockers, next steps.'
    },
    // Lunch break
    {
      id: 'lunch',
      startTime: '12:30',
      endTime: '13:30',
      label: 'Personal | Lunch & Walk',
      timeCategory: 'MEALS',
      emoji: '🥗',
      strategicNote: 'Nourish your body and clear your mind.'
    },
    // Afternoon work
    {
      id: 'deep-work-2',
      startTime: '14:00',
      endTime: '16:00',
      label: 'Echo Development | State Machine Implementation',
      timeCategory: 'DEEP_WORK',
      emoji: '⚙️',
      strategicNote: 'Complex implementation work - the heart of the session management system.'
    },
    {
      id: 'research',
      startTime: '16:00',
      endTime: '17:00',
      label: 'Research | UX Patterns Study',
      timeCategory: 'RESEARCH',
      emoji: '🔍',
      strategicNote: 'Explore design patterns that inspire better user experiences.'
    },
    // Evening routine
    {
      id: 'personal-time',
      startTime: '18:00',
      endTime: '19:00',
      label: 'Personal | Dinner Prep',
      timeCategory: 'PERSONAL',
      emoji: '👨‍🍳',
      strategicNote: 'Transition from work mode to personal time.'
    },
    {
      id: 'dinner',
      startTime: '19:00',
      endTime: '20:00',
      label: 'Personal | Dinner',
      timeCategory: 'MEALS',
      emoji: '🍽️',
      strategicNote: 'Enjoy a mindful meal and disconnect from work.'
    },
    {
      id: 'evening-reflection',
      startTime: '21:00',
      endTime: '21:30',
      label: 'Personal | Evening Reflection',
      timeCategory: 'PERSONAL',
      emoji: '🌅',
      strategicNote: 'Reflect on the day and prepare for tomorrow.'
    }
  ];
  
  // Convert to Block objects with computed properties
  return scheduleTemplate.map(block => {
    const [startHours, startMinutes] = block.startTime.split(':').map(Number);
    const [endHours, endMinutes] = block.endTime.split(':').map(Number);
    const startMinutesTotal = startHours * 60 + startMinutes;
    const endMinutesTotal = endHours * 60 + endMinutes;
    const duration = endMinutesTotal - startMinutesTotal;
    
    return {
      ...block,
      startMinutes: startMinutesTotal,
      endMinutes: endMinutesTotal,
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      // Add icon resolution
      icon: IconResolutionService.resolveIcon(
        block.label, 
        block.timeCategory.toLowerCase(), 
        block.emoji
      ).icon
    };
  });
};

/**
 * Test scenarios for different times of day
 * Useful for development and testing state transitions
 */
export const getTestScenario = (scenario: string): Block[] => {
  const baseSchedule = generateMockSchedule();
  
  switch (scenario) {
    case 'morning-tranquil':
      // During breakfast - should be tranquil
      return baseSchedule;
      
    case 'pre-work-spinup':
      // 5 minutes before deep work - should be spin-up
      return baseSchedule.map(block => 
        block.id === 'deep-work-1' 
          ? { ...block, startTime: '08:55', startMinutes: 8 * 60 + 55 }
          : block
      );
      
    case 'lunch-tranquil':
      // During lunch - should be tranquil
      return baseSchedule;
      
    case 'no-upcoming-work':
      // After work hours - should be tranquil with no transitions
      return baseSchedule.filter(block => 
        !['DEEP_WORK', 'ADMIN', 'MEETINGS'].includes(block.timeCategory) ||
        block.endMinutes < 17 * 60 // Before 5 PM
      );
      
    default:
      return baseSchedule;
  }
};

/**
 * Mock session context data for different work types
 * This will be used for Spin-Up and Active states
 */
export const getMockSessionContext = (blockId: string) => {
  const contexts: Record<string, any> = {
    'deep-work-1': {
      momentum_context: "Last session on frontend architecture made good progress on component structure. The state management foundation is ready for the session panel integration.",
      email_pressure: [
        "Design review feedback from Sarah pending response",
        "Sprint planning meeting needs agenda prep"
      ],
      suggested_tasks: [
        "Complete SessionStatePanel component architecture",
        "Implement state transition animations",
        "Test state detection accuracy with mock data",
        "Document component API for team review"
      ],
      estimated_complexity: "high",
      confidence: 0.85
    },
    'deep-work-2': {
      momentum_context: "State machine foundation is solid from morning session. Ready to implement the complex transition logic and user interaction flows.",
      email_pressure: [
        "No immediate email dependencies for implementation work"
      ],
      suggested_tasks: [
        "Build state transition handlers",
        "Implement timer and progress tracking",
        "Add session data persistence",
        "Create development debugging tools"
      ],
      estimated_complexity: "high",
      confidence: 0.90
    },
    'admin-email': {
      momentum_context: "Email processing routine - maintain focus on quick triage and action item identification.",
      email_pressure: [
        "Client follow-up from yesterday needs response",
        "Team sync request from product manager",
        "Invoice approval waiting in inbox"
      ],
      suggested_tasks: [
        "Process all emails with 2-minute rule",
        "Schedule follow-up actions in calendar",
        "Update project status for client",
        "Clear notification backlog"
      ],
      estimated_complexity: "medium",
      confidence: 0.95
    },
    'research': {
      momentum_context: "Research session focused on UX patterns. Previous sessions identified interesting interaction paradigms worth exploring.",
      email_pressure: [
        "No email dependencies for research work"
      ],
      suggested_tasks: [
        "Study state-driven interface patterns",
        "Document inspiring design examples", 
        "Sketch interaction flow concepts",
        "Prepare findings summary for team"
      ],
      estimated_complexity: "low",
      confidence: 0.80
    }
  };
  
  return contexts[blockId] || {
    momentum_context: "Starting fresh with this work session.",
    email_pressure: [],
    suggested_tasks: [
      "Review session objectives",
      "Organize workspace and tools",
      "Begin focused work"
    ],
    estimated_complexity: "medium",
    confidence: 0.75
  };
};

/**
 * Mock messages for different tranquil states
 * Context-aware messaging based on block type
 */
export const getTranquilMessage = (block: Block | null): string => {
  if (!block) {
    return "Take a moment to breathe and be present.";
  }
  
  const messageMap: Record<string, string[]> = {
    'MEALS': [
      "Enjoy your meal mindfully.",
      "Nourish your body and soul.",
      "Savor this moment of nourishment."
    ],
    'HEALTH': [
      "Honor your body with movement.",
      "Feel your strength and vitality.",
      "This investment pays dividends all day."
    ],
    'PERSONAL': [
      "This is your time. Enjoy it fully.",
      "Disconnect from work and be present.",
      "Rest is productive too."
    ],
    'TRANSIT': [
      "Use this transition time wisely.",
      "Prepare mentally for what's ahead.",
      "Enjoy the journey."
    ]
  };
  
  const messages = messageMap[block.timeCategory] || ["Take a moment to center yourself."];
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Development utilities for testing state transitions
 */
export const createTestBlock = (
  id: string,
  startTime: string,
  endTime: string,
  label: string,
  timeCategory: string
): Block => {
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  return {
    id,
    startTime,
    endTime,
    label,
    timeCategory,
    startMinutes: startHours * 60 + startMinutes,
    endMinutes: endHours * 60 + endMinutes,
    emoji: '🔧',
    strategicNote: 'Test block for development'
  };
};

export const getCurrentTestBlock = (): Block => {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const endTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  return createTestBlock(
    'current-test',
    currentTime,
    endTime,
    'Test | Current Block',
    'PERSONAL'
  );
};