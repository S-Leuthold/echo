/**
 * Question Parser Utility
 * 
 * Parses AI responses to extract structured question groups
 * for the unified consultant interface.
 */

export interface QuestionGroup {
  id: string;
  title: string;
  questions: Question[];
  context?: string; // Any preceding context before the questions
}

export interface Question {
  id: string;
  text: string;
  type: 'bullet' | 'numbered' | 'inline';
  answered: boolean;
  answer?: string;
}

export interface ParsedResponse {
  mainContent: string; // The non-question content
  questionGroups: QuestionGroup[];
  hasQuestions: boolean;
}

/**
 * Parse AI response into structured question groups
 */
export function parseAIResponse(message: string): ParsedResponse {
  const lines = message.split('\n');
  const questionGroups: QuestionGroup[] = [];
  let mainContent = '';
  let currentGroup: QuestionGroup | null = null;
  let currentContext = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for bold headers with various formats
    // Matches: **Header:** or **Header** or ### Header or ## Header
    const headerMatch = line.match(/^\*\*(.+?)(?::\*\*|\*\*:?)|^#{2,3}\s+(.+)$/);
    if (headerMatch) {
      // Save previous group if it has questions
      if (currentGroup && currentGroup.questions.length > 0) {
        questionGroups.push(currentGroup);
      } else if (currentGroup) {
        // If the previous group had no questions, add to main content
        mainContent += `\n\n**${currentGroup.title}:**\n${currentContext}`;
      }
      
      // Start new group (handle multiple capture groups)
      const title = headerMatch[1] || headerMatch[2];
      currentGroup = {
        id: `group-${Date.now()}-${i}`,
        title: title.replace(/[:\*]/g, '').trim(), // Clean up any trailing colons or asterisks
        questions: [],
        context: currentContext.trim()
      };
      currentContext = '';
      continue;
    }
    
    // Check for questions within a group
    if (currentGroup) {
      // Bullet point questions
      const bulletMatch = line.match(/^[-•*]\s+(.+\?)$/);
      if (bulletMatch) {
        currentGroup.questions.push({
          id: `q-${Date.now()}-${i}`,
          text: bulletMatch[1],
          type: 'bullet',
          answered: false
        });
        continue;
      }
      
      // Numbered questions
      const numberedMatch = line.match(/^\d+\.\s+(.+\?)$/);
      if (numberedMatch) {
        currentGroup.questions.push({
          id: `q-${Date.now()}-${i}`,
          text: numberedMatch[1],
          type: 'numbered',
          answered: false
        });
        continue;
      }
      
      // Inline questions (questions within paragraphs)
      const inlineQuestions = line.match(/([^.!?]+\?)/g);
      if (inlineQuestions && inlineQuestions.length > 0) {
        inlineQuestions.forEach((q, idx) => {
          currentGroup!.questions.push({
            id: `q-${Date.now()}-${i}-${idx}`,
            text: q.trim(),
            type: 'inline',
            answered: false
          });
        });
        continue;
      }
      
      // If not a question, add to context
      if (line) {
        currentContext += line + '\n';
      }
    } else {
      // Not in a group, add to main content
      mainContent += line + '\n';
    }
  }
  
  // Don't forget the last group - but only if it has questions!
  if (currentGroup && currentGroup.questions.length > 0) {
    questionGroups.push(currentGroup);
  } else if (currentGroup) {
    // If the group has no questions, add its content to main content
    mainContent += `\n\n**${currentGroup.title}:**\n${currentContext}`;
  }
  
  // Filter out any groups without questions
  const groupsWithQuestions = questionGroups.filter(g => g.questions.length > 0);
  
  return {
    mainContent: mainContent.trim(),
    questionGroups: groupsWithQuestions,
    hasQuestions: groupsWithQuestions.length > 0 && groupsWithQuestions.some(g => g.questions.length > 0)
  };
}

/**
 * Format answers from question groups into a natural response
 */
export function formatAnswers(groups: QuestionGroup[]): string {
  const responses: string[] = [];
  
  groups.forEach(group => {
    if (group.questions.some(q => q.answer)) {
      responses.push(`Regarding ${group.title.toLowerCase()}:`);
      
      group.questions.forEach(q => {
        if (q.answer) {
          responses.push(`- ${q.text} ${q.answer}`);
        }
      });
      
      responses.push(''); // Empty line between groups
    }
  });
  
  return responses.join('\n').trim();
}

/**
 * Check if all questions in a group are answered
 */
export function isGroupComplete(group: QuestionGroup): boolean {
  return group.questions.length > 0 && 
         group.questions.every(q => q.answered && q.answer);
}

/**
 * Get unanswered questions from all groups
 */
export function getUnansweredQuestions(groups: QuestionGroup[]): Question[] {
  return groups.flatMap(g => g.questions.filter(q => !q.answered));
}