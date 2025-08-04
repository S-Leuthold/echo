/**
 * QuestionGroups Component
 * 
 * Displays parsed question groups from AI responses with individual
 * input fields for each question, allowing structured responses.
 */

import React, { useState, useCallback } from 'react';
import { QuestionGroup, Question, isGroupComplete } from '@/utils/questionParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Send,
  MessageSquare
} from 'lucide-react';

interface QuestionGroupsProps {
  groups: QuestionGroup[];
  onSubmitAnswers: (groups: QuestionGroup[]) => void;
  onQuestionAnswer: (groupId: string, questionId: string, answer: string) => void;
  isProcessing?: boolean;
  className?: string;
}

export const QuestionGroups: React.FC<QuestionGroupsProps> = ({
  groups,
  onSubmitAnswers,
  onQuestionAnswer,
  isProcessing = false,
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(groups.map(g => g.id)) // Start with all expanded
  );
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleAnswerChange = useCallback((groupId: string, questionId: string, answer: string) => {
    const key = `${groupId}-${questionId}`;
    setLocalAnswers(prev => ({
      ...prev,
      [key]: answer
    }));
    onQuestionAnswer(groupId, questionId, answer);
  }, [onQuestionAnswer]);

  const handleSubmitGroup = useCallback((group: QuestionGroup) => {
    // Update the group with local answers
    const updatedGroup = {
      ...group,
      questions: group.questions.map(q => {
        const key = `${group.id}-${q.id}`;
        const answer = localAnswers[key];
        return answer ? { ...q, answer, answered: true } : q;
      })
    };

    // Submit just this group
    onSubmitAnswers([updatedGroup]);
  }, [localAnswers, onSubmitAnswers]);

  const handleSubmitAll = useCallback(() => {
    // Update all groups with local answers
    const updatedGroups = groups.map(group => ({
      ...group,
      questions: group.questions.map(q => {
        const key = `${group.id}-${q.id}`;
        const answer = localAnswers[key];
        return answer ? { ...q, answer, answered: true } : q;
      })
    }));

    onSubmitAnswers(updatedGroups);
  }, [groups, localAnswers, onSubmitAnswers]);

  const allAnswered = groups.every(g => 
    g.questions.every(q => {
      const key = `${g.id}-${q.id}`;
      return localAnswers[key]?.trim();
    })
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={`question-groups space-y-3 ${className}`}>
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.id);
        const groupAnswered = group.questions.every(q => {
          const key = `${group.id}-${q.id}`;
          return localAnswers[key]?.trim();
        });

        return (
          <Card key={group.id} className="overflow-hidden">
            <CardHeader 
              className="cursor-pointer py-3"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronRight 
                    className={`w-4 h-4 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                  <CardTitle className="text-sm font-medium">
                    {group.title}
                  </CardTitle>
                  <Badge variant="outline" className="ml-2">
                    {group.questions.length} question{group.questions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {groupAnswered && (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 pb-4">
                {group.context && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {group.context}
                  </p>
                )}

                <div className="space-y-3">
                  {group.questions.map(question => {
                    const key = `${group.id}-${question.id}`;
                    const value = localAnswers[key] || '';
                    const isAnswered = value.trim() !== '';

                    return (
                      <div key={question.id} className="space-y-1">
                        <div className="flex items-start gap-2">
                          {isAnswered ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground mt-0.5" />
                          )}
                          <label 
                            htmlFor={key}
                            className="text-sm text-foreground flex-1"
                          >
                            {question.text}
                          </label>
                        </div>
                        
                        <div className="ml-6">
                          {question.text.length > 50 ? (
                            <Textarea
                              id={key}
                              value={value}
                              onChange={(e) => handleAnswerChange(group.id, question.id, e.target.value)}
                              placeholder="Your answer..."
                              className="min-h-[60px] text-sm"
                              disabled={isProcessing}
                            />
                          ) : (
                            <Input
                              id={key}
                              value={value}
                              onChange={(e) => handleAnswerChange(group.id, question.id, e.target.value)}
                              placeholder="Your answer..."
                              className="text-sm"
                              disabled={isProcessing}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {group.questions.length > 1 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubmitGroup(group)}
                      disabled={!groupAnswered || isProcessing}
                      className="gap-2"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Answer {group.title}
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {groups.length > 1 && (
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="default"
            onClick={handleSubmitAll}
            disabled={!allAnswered || isProcessing}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            Submit All Answers
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestionGroups;