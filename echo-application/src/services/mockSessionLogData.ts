/**
 * Mock LLM Data Service for Session Log Generation
 * 
 * Simulates LLM processing of session debrief data into structured markdown.
 * In production, this would call the actual Claude API for synthesis.
 */

interface SessionDebriefData {
  accomplishments: string;
  outstanding: string;
  finalNotes: string;
  sessionMetadata: {
    duration: number;
    category: string;
    originalGoal: string;
  };
}

interface SessionStartData {
  blockId: string;
  aiInsights: any;
  userGoal: string;
  userTasks: string[];
  startTime: Date;
  nextWorkBlock?: any;
}

interface ChecklistItem {
  id: string;
  task: string;
  completed: boolean;
}

/**
 * Session log generation result with separated metadata and content
 */
export interface SessionLogResult {
  metadata: {
    title: string;
    date: string;
    duration: string;
    category: string;
    completedAt: string;
  };
  content: string;
}

/**
 * Generate a realistic session log from debrief data
 */
export async function generateSessionLog(
  debriefData: SessionDebriefData,
  sessionData: SessionStartData,
  completedTasks: ChecklistItem[] = [],
  incompleteTasks: ChecklistItem[] = []
): Promise<SessionLogResult> {
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const today = new Date();
  const sessionTitle = sessionData.nextWorkBlock?.label || 'Deep Work Session';
  const category = debriefData.sessionMetadata?.category?.replace('_', ' ') || 'Deep Work';
  const duration = formatDuration(debriefData.sessionMetadata.duration);
  
  // Pre-format dates to avoid template literal issues
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = today.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Build accomplishments section
  const accomplishmentsSection = buildAccomplishmentsSection(
    debriefData.accomplishments,
    completedTasks
  );
  
  // Build outstanding section
  const outstandingSection = buildOutstandingSection(
    debriefData.outstanding,
    incompleteTasks
  );
  
  // Build insights section
  const insightsSection = buildInsightsSection(
    debriefData.finalNotes,
    sessionData.userGoal,
    accomplishmentsSection.length > 0
  );
  
  // Generate next steps
  const nextStepsSection = buildNextStepsSection(
    debriefData.outstanding,
    incompleteTasks,
    category
  );
  
  // Separate content without metadata line - WITH TEST MARKDOWN
  const content = `# Session Log: ${sessionTitle}

## What I Accomplished

${accomplishmentsSection}

**Test markdown elements:**
- This is a bullet point (created with "- ")
- **Bold text** and *italic text* should render properly
- Here's a [test link](https://example.com)

### Test Sub-heading

1. Numbered list item one
2. Numbered list item two
3. Numbered list item three

## Outstanding Items

${outstandingSection}

> This is a blockquote to test formatting

## Key Insights

${insightsSection}

- [ ] This is an unchecked task
- [x] This is a checked task
- [ ] Another task to verify checkboxes work

## Next Steps

${nextStepsSection}

---

*Session completed at ${formattedTime}*

**Instructions for testing:**
- Try typing "- " to create bullet points
- Try typing "1. " to create numbered lists  
- Try typing "# " to create headings
- Use **bold** and *italic* formatting`;

  // Return separated metadata and content
  return {
    metadata: {
      title: sessionTitle,
      date: formattedDate,
      duration: duration,
      category: category,
      completedAt: formattedTime
    },
    content: content.trim()
  };
}

/**
 * Helper functions for building each section
 */

function buildAccomplishmentsSection(
  userAccomplishments: string,
  completedTasks: ChecklistItem[]
): string {
  let section = '';
  
  if (userAccomplishments.trim()) {
    // Process user's natural language into bullet points if not already formatted
    const accomplishmentLines = userAccomplishments
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`);
    
    section += accomplishmentLines.join('\n');
  }
  
  // Add completed tasks that aren't already mentioned
  if (completedTasks.length > 0) {
    const taskBullets = completedTasks.map(task => `• ✅ ${task.task}`);
    
    if (section) {
      section += '\n' + taskBullets.join('\n');
    } else {
      section = taskBullets.join('\n');
    }
  }
  
  return section || '• Made steady progress on session objectives';
}

function buildOutstandingSection(
  userOutstanding: string,
  incompleteTasks: ChecklistItem[]
): string {
  let section = '';
  
  if (userOutstanding.trim()) {
    const outstandingLines = userOutstanding
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`);
    
    section += outstandingLines.join('\n');
  }
  
  // Add incomplete tasks
  if (incompleteTasks.length > 0) {
    const taskBullets = incompleteTasks.map(task => `• ⏳ ${task.task}`);
    
    if (section) {
      section += '\n' + taskBullets.join('\n');
    } else {
      section = taskBullets.join('\n');
    }
  }
  
  return section || '• All planned items completed for this session';
}

function buildInsightsSection(
  finalNotes: string,
  originalGoal: string,
  hasAccomplishments: boolean
): string {
  let insights = [];
  
  // Add insights from final notes if provided
  if (finalNotes.trim()) {
    insights.push(`• ${finalNotes.trim()}`);
  }
  
  // Add contextual insights based on session performance
  if (hasAccomplishments) {
    insights.push('• Session maintained good focus and momentum throughout');
  }
  
  if (originalGoal) {
    insights.push(`• Made meaningful progress toward the primary goal: ${originalGoal}`);
  }
  
  // Add some variety to insights
  const contextualInsights = [
    '• Time allocation was effective for the planned scope',
    '• Good balance between execution and documentation',
    '• Clear next steps identified for continued progress'
  ];
  
  insights.push(contextualInsights[Math.floor(Math.random() * contextualInsights.length)]);
  
  return insights.join('\n');
}

function buildNextStepsSection(
  userOutstanding: string,
  incompleteTasks: ChecklistItem[],
  category: string
): string {
  let nextSteps = [];
  
  // Extract actionable items from outstanding work
  if (incompleteTasks.length > 0) {
    nextSteps.push(`• Continue with ${incompleteTasks.length} remaining task${incompleteTasks.length > 1 ? 's' : ''} from this session`);
  }
  
  if (userOutstanding.trim()) {
    nextSteps.push('• Address the outstanding items noted above');
  }
  
  // Add category-specific recommendations
  const categoryRecommendations: { [key: string]: string[] } = {
    'Deep Work': [
      '• Schedule follow-up deep work session to maintain momentum',
      '• Review and refine approach based on today\'s learnings'
    ],
    'Meetings': [
      '• Follow up on action items with relevant stakeholders',
      '• Schedule any necessary follow-up meetings'
    ],
    'Planning': [
      '• Implement the plans developed in this session',
      '• Set up tracking for planned initiatives'
    ]
  };
  
  const recommendations = categoryRecommendations[category] || categoryRecommendations['Deep Work'];
  nextSteps.push(recommendations[0]);
  
  return nextSteps.join('\n');
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours} hr ${mins} min`;
  } else if (hours > 0) {
    return `${hours} hr`;
  } else {
    return `${mins} min`;
  }
}