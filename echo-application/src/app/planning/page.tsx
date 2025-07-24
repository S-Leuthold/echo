"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { IconResolutionService } from "@/lib/icon-resolution";
import { ChevronRight, ChevronLeft, Clock, Calendar, BookOpen, Heart, Brain, Sparkles, Mail, CheckCircle2, Info, Activity, Sun, Coffee, Car, Briefcase, NotebookText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ==============================================================================
// CONSTANTS & CONFIGURATION
// ==============================================================================

const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  TIMEOUTS: {
    CONTEXT_BRIEFING: 60000, // 60 seconds (Claude can take a while)
    ANALYTICS: 5000,         // 5 seconds
    PLAN_GENERATION: 15000   // 15 seconds
  },
  POLL_INTERVALS: {
    BACKGROUND_FETCH: 500    // 500ms
  }
} as const;

const WIZARD_CONFIG = {
  ENERGY_LEVELS: [
    { value: 3, label: 'Low' },
    { value: 5, label: 'Medium' },
    { value: 7, label: 'High' }
  ],
  WORK_ENVIRONMENTS: [
    { value: 'home', label: 'Home' },
    { value: 'cafe', label: 'Cafe' },
    { value: 'office', label: 'Office' }
  ]
} as const;

// ==============================================================================
// WIZARD TYPES & INTERFACES
// ==============================================================================

type WizardStep = 'welcome' | 'day-review' | 'journal' | 'habits' | 'context-briefing' | 'planning-prompts' | 'generated-plan';

interface AnalyticsData {
  categories: Record<string, number>;
  total_time: number;
  focus_time: number;
  productivity_score: number;
}

interface JournalData {
  brainDump: string;
  improvements: string;
  gratitude: string;
}

interface ContextBriefingData {
  briefing: {
    executive_summary?: string;
    email_summary?: {
      action_items: Array<{
        content: string;
        person: string;
        due_date: string;
        timeline: string;
        type: string;
        priority: string;
      }>;
    };
    commitments_deadlines?: {
      urgent_deadlines: Array<{
        title: string;
        description: string;
        days_until: number;
        urgency: string;
        project: string;
      }>;
      reminders: Array<{
        title: string;
        description: string;
        date: string;
        urgency: string;
      }>;
      fixed_meetings: Array<{
        title: string;
        time: string;
        location: string;
      }>;
    };
    session_notes?: {
      pending_commitments: Array<{
        commitment: string;
        context: string;
        days_pending: number;
        priority: string;
        category: string;
      }>;
    };
  };
  selectedTasks: string[];
  selectedAppointments: string[];
}

interface PlanningPromptsData {
  oneThing: string;
  tasks: string[];
  appointments: string[];
  energyLevel: number;
  workEnvironment: string;
}

interface WizardState {
  currentStep: WizardStep;
  data: {
    dayReview?: { analytics: AnalyticsData };
    journal?: JournalData;
    habits?: Record<string, unknown>;
    contextBriefing?: ContextBriefingData;
    planningPrompts?: PlanningPromptsData;
    generatedPlan?: Record<string, unknown>;
  };
}

interface WizardStepProps {
  onNext: (data?: any) => void;
  onPrevious?: () => void;
}

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = 5000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

const getStoredReminders = (): unknown[] => {
  try {
    const savedReminders = localStorage.getItem('echo_reminders');
    return savedReminders ? JSON.parse(savedReminders) : [];
  } catch (error) {
    console.error('Failed to parse stored reminders:', error);
    return [];
  }
};

const setSessionData = (key: string, data: unknown): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to store session data for ${key}:`, error);
  }
};

const getSessionData = <T>(key: string): T | null => {
  try {
    const data = sessionStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Failed to parse session data for ${key}:`, error);
    return null;
  }
};

// ==============================================================================
// STEP 0: WELCOME & TRANSITION
// ==============================================================================

function WelcomeStep({ onNext }: Pick<WizardStepProps, 'onNext'>) {
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      // Just start analytics in background (low cost, safe to preload)
      fetchWithTimeout(
        `${API_CONFIG.BASE_URL}/analytics`,
        {},
        API_CONFIG.TIMEOUTS.ANALYTICS
      )
        .then(response => response.json())
        .then(data => setSessionData('echo_analytics', data))
        .catch(error => console.error('Failed to fetch analytics:', error));
        
    } catch (error) {
      console.error('Failed to start background tasks:', error);
    } finally {
      // Always proceed to next step, even if background tasks fail
      onNext();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-8">
      <div className="max-w-2xl text-center space-y-8">
        {/* Elegant header with icon */}
        <div className="space-y-6">
          <div className="w-20 h-20 mx-auto bg-accent/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-accent" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-serif font-light text-foreground">
              Hey Sam, ready to wrap up today<br />and plan tomorrow?
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
              It's been a productive day. Let's take a moment to reflect and set you up for an even better tomorrow.
            </p>
          </div>
        </div>

        {/* Call to action */}
        <div className="pt-4">
          <Button 
            onClick={handleStart}
            disabled={isLoading}
            size="lg"
            className="px-8 py-3 text-lg font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                Let's do this
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 1: DAY REVIEW
// ==============================================================================

function DayReviewStep({ onNext, onPrevious }: WizardStepProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if analytics data is already available from sessionStorage
    const storedAnalytics = getSessionData<AnalyticsData>('echo_analytics');
    if (storedAnalytics) {
      setAnalytics(storedAnalytics);
      setLoading(false);
      return;
    }

    // If no stored data, wait briefly then fetch directly
    const checkForAnalytics = setInterval(() => {
      const analyticsData = sessionStorage.getItem('echo_analytics');
      if (analyticsData) {
        try {
          const data = JSON.parse(analyticsData);
          setAnalytics(data);
          setLoading(false);
          clearInterval(checkForAnalytics);
        } catch (error) {
          console.error('Failed to parse analytics data:', error);
        }
      }
    }, 500);

    // Fallback: if no data after 5 seconds, fetch directly
    const fallbackTimeout = setTimeout(() => {
      if (loading) {
        const fetchAnalytics = async () => {
          try {
            const response = await fetch('http://localhost:8000/analytics');
            const data = await response.json();
            setAnalytics(data);
            sessionStorage.setItem('echo_analytics', JSON.stringify(data));
          } catch (error) {
            console.error('Failed to fetch analytics:', error);
          } finally {
            setLoading(false);
            clearInterval(checkForAnalytics);
          }
        };
        fetchAnalytics();
      }
    }, 5000);

    return () => {
      clearInterval(checkForAnalytics);
      clearTimeout(fallbackTimeout);
    };
  }, [loading]);

  const handleContinue = (): void => {
    onNext({ analytics });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Clock className="w-8 h-8 mx-auto animate-spin text-accent" />
          <p className="text-muted-foreground">Loading today's data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="max-w-4xl w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-serif font-light text-foreground">
            What Happened Today?
          </h1>
          <p className="text-muted-foreground">
            Here's your day at a glance
          </p>
        </div>

        {/* Condensed Timeline */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Timeline Bar */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Timeline Overview</h3>
                
                <div className="h-12 bg-muted/30 rounded-lg overflow-hidden flex">
                  {analytics?.categories && Object.entries(analytics.categories).map(([category, time]: [string, any]) => {
                    const percentage = (time / analytics.total_time) * 100;
                    const colors = {
                      'Personal': 'bg-personal',
                      'Deep Work': 'bg-deep-work', 
                      'Meetings': 'bg-meetings',
                      'Health': 'bg-health',
                      'Transit': 'bg-muted-foreground'
                    };
                    
                    return (
                      <div
                        key={category}
                        className={`${colors[category] || 'bg-muted'} flex items-center justify-center text-xs font-medium text-white`}
                        style={{ width: `${percentage}%` }}
                        title={`${category}: ${(time / 60).toFixed(1)}h`}
                      >
                        {percentage > 15 ? category : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="text-2xl font-light text-foreground">
                    {analytics ? `${(analytics.focus_time / 60).toFixed(1)} hours` : '0 hours'}
                  </div>
                  <div className="text-sm text-muted-foreground">Total focused time</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-2xl font-light text-foreground">
                    {analytics ? `${analytics.productivity_score}%` : '0%'}
                  </div>
                  <div className="text-sm text-muted-foreground">Productivity score</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4">
          {onPrevious && (
            <Button 
              onClick={onPrevious}
              size="lg"
              variant="outline"
              className="px-6 py-3"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          <Button 
            onClick={handleContinue}
            size="lg"
            variant="default"
            className="px-8 py-3 ml-auto"
          >
            Continue to Reflection
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 2: JOURNAL REFLECTION
// ==============================================================================

function JournalStep({ onNext, onPrevious }: WizardStepProps) {
  const [brainDump, setBrainDump] = useState("");
  const [improvements, setImprovements] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState(0);

  const prompts = [
    {
      title: "What happened today?",
      subtitle: "(Brain dump everything)",
      value: brainDump,
      setter: setBrainDump,
      placeholder: "Let everything out... what happened, how it felt, what you accomplished, what surprised you..."
    },
    {
      title: "What would you do differently if you could repeat today?",
      subtitle: "",
      value: improvements,
      setter: setImprovements,
      placeholder: "Think about what you learned and what you'd adjust..."
    },
    {
      title: "What are you grateful for today?",
      subtitle: "",
      value: gratitude,
      setter: setGratitude,
      placeholder: "End on a positive note..."
    }
  ];

  const currentPromptData = prompts[currentPrompt];
  const canAdvance = currentPromptData.value.trim().length > 0;
  const isLastPrompt = currentPrompt === prompts.length - 1;

  const handleNext = (): void => {
    if (isLastPrompt) {
      const journalData: JournalData = { brainDump, improvements, gratitude };
      onNext(journalData);
    } else {
      setCurrentPrompt(currentPrompt + 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="max-w-2xl w-full space-y-12">
        {/* Progress indicator */}
        <div className="flex justify-center space-x-2">
          {prompts.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentPrompt ? 'bg-accent' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Current Prompt */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-light text-foreground">
              {currentPromptData.title}
            </h1>
            {currentPromptData.subtitle && (
              <p className="text-lg text-muted-foreground">
                {currentPromptData.subtitle}
              </p>
            )}
          </div>

          {/* Text Area */}
          <div className="pt-4">
            <Textarea
              value={currentPromptData.value}
              onChange={(e) => currentPromptData.setter(e.target.value)}
              placeholder={currentPromptData.placeholder}
              className="min-h-[200px] text-lg leading-relaxed resize-none border-border/50 focus:border-accent transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          {onPrevious && (
            <Button 
              onClick={onPrevious}
              size="lg"
              variant="outline"
              className="px-6 py-3"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext}
            disabled={!canAdvance}
            size="lg"
            className="px-8 py-3 ml-auto"
          >
            {isLastPrompt ? 'Continue to Habits' : 'Next'}
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 3: HABIT TRACKER (Placeholder)
// ==============================================================================

function HabitsStep({ onNext, onPrevious }: WizardStepProps) {
  const handleContinue = (): void => {
    onNext({ habits: "placeholder" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="max-w-2xl w-full text-center space-y-12">
        <div className="space-y-6">
          <Heart className="w-16 h-16 mx-auto text-accent" />
          
          <div className="space-y-4">
            <h1 className="text-3xl font-serif font-light text-foreground">
              Habit Tracking
            </h1>
            
            <p className="text-lg text-muted-foreground">
              Habit tracking functionality will be built here.<br />
              This will include streaks, progress tracking, and habit configuration.
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          {onPrevious && (
            <Button 
              onClick={onPrevious}
              size="lg"
              variant="outline"
              className="px-6 py-3"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          <Button 
            onClick={handleContinue}
            size="lg"
            className="px-8 py-3 ml-auto"
          >
            Continue to Context Briefing
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 4: CONTEXT BRIEFING
// ==============================================================================

function ContextBriefingStep({ onNext, onPrevious }: WizardStepProps) {
  const [briefing, setBriefing] = useState<ContextBriefingData['briefing'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        setLoading(true);
        
        // Clear legacy localStorage reminder data that overrides backend config
        localStorage.removeItem('echo_reminders');
        console.log('🧹 Cleared stale localStorage reminder data');
        
        console.log('🚀 Fetching context briefing from API...');
        const response = await fetch('http://localhost:8000/context-briefing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 API Response received:', data);
        console.log('🔍 Executive Summary:', data.executive_summary);
        console.log('⚠️ Reminders count:', data.commitments_deadlines?.reminders?.length || 0);
        setBriefing(data);
        
      } catch (error) {
        console.error('Failed to fetch context briefing:', error);
        setBriefing(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBriefing();
  }, []);

  const addTaskToPlan = (task: { title?: string; content?: string; commitment?: string }): void => {
    const taskTitle = task.title || task.content || task.commitment || 'Unknown Task';
    console.log('Adding task to plan:', taskTitle, 'Current selected:', selectedTasks);
    if (!selectedTasks.includes(taskTitle)) {
      setSelectedTasks([...selectedTasks, taskTitle]);
    }
  };

  const addAppointmentToPlan = (appointment: { time: string; title: string }): void => {
    const appointmentTitle = `${appointment.time}: ${appointment.title}`;
    if (!selectedAppointments.includes(appointmentTitle)) {
      setSelectedAppointments([...selectedAppointments, appointmentTitle]);
    }
  };

  const handleContinue = (): void => {
    const contextData: ContextBriefingData = {
      briefing: briefing || {},
      selectedTasks,
      selectedAppointments
    };
    onNext(contextData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="w-8 h-8 mx-auto animate-pulse text-accent" />
          <p className="text-muted-foreground">Analyzing tomorrow's context...</p>
          <p className="text-sm text-muted-foreground/70">This was started when you clicked "Let's do this"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-serif font-light text-foreground">
            Here's the Lay of the Land
          </h1>
          <p className="text-muted-foreground">
            Your intelligent briefing for tomorrow
          </p>
        </div>

        {/* Flowing Memo Layout - Single Column */}
        <div className="space-y-16 max-w-4xl mx-auto">
          
          {/* Executive Summary - Most Prominent */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <Brain className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-semibold text-foreground">Executive Summary</h2>
            </div>
            {briefing?.executive_summary ? (
              <div className="prose prose-lg max-w-none">
                <p className="text-foreground leading-relaxed text-lg">
                  {briefing.executive_summary}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Your AI assistant is ready to analyze tomorrow's context once data is available.
              </p>
            )}
          </section>

          {/* Email Summary */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <Mail className="w-5 h-5 text-accent" />
              <h3 className="text-xl font-medium text-foreground">Email Summary</h3>
            </div>
            {briefing?.email_summary?.action_items && briefing.email_summary.action_items.length > 0 ? (
              <div className="space-y-4">
                {briefing.email_summary.action_items.map((task: any, index: number) => (
                  <div key={index} className="flex items-start justify-between gap-6 py-4">
                    <div className="flex-1">
                      <div className="font-medium text-foreground mb-2">{task.content}</div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Due: {task.due_date} • Timeline: {task.timeline} • From: {task.person}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {task.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`text-xs font-medium shrink-0 border transition-all duration-200 ${selectedTasks.includes(task.content) 
                        ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' 
                        : 'border-accent text-accent hover:bg-accent/10 hover:text-accent-foreground'}`}
                      onClick={() => addTaskToPlan(task)}
                    >
                      {selectedTasks.includes(task.content) ? '✓ Added' : '+ Add to Plan'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No email action items requiring attention. Your inbox is clear.
              </p>
            )}
          </section>

          {/* Commitments & Deadlines */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <Calendar className="w-5 h-5 text-accent" />
              <h3 className="text-xl font-medium text-foreground">Commitments & Deadlines</h3>
            </div>
            
            {/* Urgent Deadlines */}
            {briefing?.commitments_deadlines?.urgent_deadlines && briefing.commitments_deadlines.urgent_deadlines.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-3 uppercase tracking-wide">Urgent Deadlines</h4>
                <div className="space-y-4">
                  {briefing.commitments_deadlines.urgent_deadlines.map((deadline: any, index: number) => (
                    <div key={index} className="flex items-start justify-between gap-6 py-4 border-l-4 border-red-500 pl-4">
                      <div className="flex-1">
                        <div className="font-medium text-foreground mb-2">{deadline.title}</div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {deadline.description} • Due in {deadline.days_until} days
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">
                            {deadline.urgency.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {deadline.project}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={`text-xs font-medium shrink-0 border transition-all duration-200 ${selectedTasks.includes(deadline.title) 
                          ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' 
                          : 'border-accent text-accent hover:bg-accent/10 hover:text-accent-foreground'}`}
                        onClick={() => addTaskToPlan(deadline)}
                      >
                        {selectedTasks.includes(deadline.title) ? '✓ Added' : '+ Add to Plan'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reminders */}
            {briefing?.commitments_deadlines?.reminders && briefing.commitments_deadlines.reminders.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-accent mb-3 uppercase tracking-wide">Reminders</h4>
                <div className="space-y-4">
                  {briefing.commitments_deadlines.reminders.map((reminder: any, index: number) => (
                    <div key={index} className="flex items-start justify-between gap-6 py-3 border-l-4 border-accent pl-4">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{reminder.title}</div>
                        <div className="text-xs text-muted-foreground/70 font-medium tracking-wide">{reminder.description}</div>
                        {reminder.date && reminder.date !== 'ongoing' && (
                          <div className="text-xs text-muted-foreground/70 font-medium tracking-wide mt-1">Due: {reminder.date}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {reminder.urgency}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fixed Meetings */}
            {briefing?.commitments_deadlines?.fixed_meetings && briefing.commitments_deadlines.fixed_meetings.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Fixed Meetings</h4>
                <div className="space-y-4">
                  {briefing.commitments_deadlines.fixed_meetings.map((meeting: any, index: number) => (
                    <div key={index} className="flex items-start justify-between gap-6 py-3">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{meeting.title}</div>
                        <div className="text-sm text-muted-foreground">{meeting.time} • {meeting.location}</div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={`text-xs font-medium shrink-0 border transition-all duration-200 ${selectedAppointments.includes(`${meeting.time}: ${meeting.title}`) 
                          ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' 
                          : 'border-accent text-accent hover:bg-accent/10 hover:text-accent-foreground'}`}
                        onClick={() => addAppointmentToPlan(meeting)}
                      >
                        {selectedAppointments.includes(`${meeting.time}: ${meeting.title}`) ? '✓ Added' : '+ Add to Plan'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {(!briefing?.commitments_deadlines?.reminders?.length && 
              !briefing?.commitments_deadlines?.fixed_meetings?.length && 
              !briefing?.commitments_deadlines?.urgent_deadlines?.length) && (
              <p className="text-muted-foreground italic">
                No urgent deadlines, reminders, or meetings scheduled. Perfect for deep work.
              </p>
            )}
          </section>

          {/* Session Notes */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <NotebookText className="w-5 h-5 text-accent" />
              <h3 className="text-xl font-medium text-foreground">Session Notes</h3>
            </div>
            {briefing?.session_notes?.pending_commitments && briefing.session_notes.pending_commitments.length > 0 ? (
              <div className="space-y-4">
                {briefing.session_notes.pending_commitments.map((task: any, index: number) => (
                  <div key={index} className="flex items-start justify-between gap-6 py-4 border-l-4 border-accent pl-4">
                    <div className="flex-1">
                      <div className="font-medium text-foreground mb-2">{task.commitment}</div>
                      <div className="text-sm text-muted-foreground mb-3">
                        {task.context} • {task.days_pending} days pending
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`text-xs font-medium shrink-0 border transition-all duration-200 ${selectedTasks.includes(task.commitment) 
                        ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' 
                        : 'border-accent text-accent hover:bg-accent/10 hover:text-accent-foreground'}`}
                      onClick={() => addTaskToPlan(task)}
                    >
                      {selectedTasks.includes(task.commitment) ? '✓ Added' : '+ Add to Plan'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No pending commitments from recent sessions. You're all caught up.
              </p>
            )}
          </section>

        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-4">
          {onPrevious && (
            <Button 
              onClick={onPrevious}
              size="lg"
              variant="outline"
              className="px-6 py-3"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          <Button 
            onClick={handleContinue}
            size="lg"
            className="px-8 py-3 ml-auto"
          >
            Continue to Planning
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 5: PLANNING PROMPTS
// ==============================================================================

interface PlanningPromptsStepProps extends WizardStepProps {
  wizardData: WizardState['data'];
}

function PlanningPromptsStep({ onNext, onPrevious, wizardData }: PlanningPromptsStepProps) {
  // Pre-populate with selected items from context briefing
  const selectedTasks = wizardData.contextBriefing?.selectedTasks || [];
  const selectedAppointments = wizardData.contextBriefing?.selectedAppointments || [];
  
  const [oneThing, setOneThing] = useState("");
  const [tasks, setTasks] = useState<string[]>(
    selectedTasks.length > 0 ? [...selectedTasks, ""] : [""]
  );
  
  console.log('PlanningPromptsStep received selectedTasks:', selectedTasks);
  const [appointments, setAppointments] = useState<string[]>(
    selectedAppointments.length > 0 ? [...selectedAppointments, ""] : [""]
  );
  const [energyLevel, setEnergyLevel] = useState(7);
  const [workEnvironment, setWorkEnvironment] = useState("home");

  const addTask = (): void => setTasks([...tasks, ""]);
  const updateTask = (index: number, value: string): void => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };
  const removeTask = (index: number): void => setTasks(tasks.filter((_, i) => i !== index));

  const addAppointment = (): void => setAppointments([...appointments, ""]);
  const updateAppointment = (index: number, value: string): void => {
    const newAppointments = [...appointments];
    newAppointments[index] = value;
    setAppointments(newAppointments);
  };
  const removeAppointment = (index: number): void => setAppointments(appointments.filter((_, i) => i !== index));

  const handleGenerate = (): void => {
    const planningData: PlanningPromptsData = {
      oneThing,
      tasks: tasks.filter(t => t.trim()),
      appointments: appointments.filter(a => a.trim()),
      energyLevel,
      workEnvironment
    };
    onNext(planningData);
  };

  const canGenerate = oneThing.trim().length > 0;

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-serif font-light text-foreground">
            Your Intentions for Tomorrow
          </h1>
        </div>

        <div className="space-y-8">
          {/* One Thing */}
          <div className="space-y-3">
            <label className="text-lg font-medium text-foreground">
              What's the ONE thing that must get done tomorrow?
            </label>
            <Input
              value={oneThing}
              onChange={(e) => setOneThing(e.target.value)}
              placeholder="The most important thing..."
              className="text-lg p-4 border-border/50 focus:border-accent"
            />
          </div>

          {/* Tasks */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              What other tasks are on your radar?
            </label>
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={task}
                    onChange={(e) => updateTask(index, e.target.value)}
                    placeholder={`Task ${index + 1}...`}
                    className="flex-1"
                  />
                  {tasks.length > 1 && (
                    <Button 
                      onClick={() => removeTask(index)}
                      variant="ghost" 
                      size="sm"
                      className="px-3"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={addTask} variant="ghost" size="sm" className="text-accent">
                + Add task
              </Button>
            </div>
          </div>

          {/* Appointments */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Any fixed meetings or appointments?
            </label>
            <div className="space-y-2">
              {appointments.map((appointment, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={appointment}
                    onChange={(e) => updateAppointment(index, e.target.value)}
                    placeholder="9:00 AM - Meeting with team..."
                    className="flex-1"
                  />
                  {appointments.length > 1 && (
                    <Button 
                      onClick={() => removeAppointment(index)}
                      variant="ghost" 
                      size="sm"
                      className="px-3"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={addAppointment} variant="ghost" size="sm" className="text-accent">
                + Add appointment
              </Button>
            </div>
          </div>

          {/* Energy & Environment */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Expected Energy</label>
              <div className="flex gap-2">
                {WIZARD_CONFIG.ENERGY_LEVELS.map((energy) => (
                  <button
                    key={energy.value}
                    onClick={() => setEnergyLevel(energy.value)}
                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors flex-1 ${
                      energyLevel === energy.value 
                        ? 'border-accent bg-accent text-accent-foreground shadow-sm' 
                        : 'border-muted-foreground/20 bg-background text-foreground hover:border-accent hover:bg-accent/5'
                    }`}
                  >
                    {energy.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Work Environment</label>
              <div className="flex gap-2">
                {WIZARD_CONFIG.WORK_ENVIRONMENTS.map((env) => (
                  <button
                    key={env.value}
                    onClick={() => setWorkEnvironment(env.value)}
                    className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors flex-1 ${
                      workEnvironment === env.value 
                        ? 'border-accent bg-accent text-accent-foreground shadow-sm' 
                        : 'border-muted-foreground/20 bg-background text-foreground hover:border-accent hover:bg-accent/5'
                    }`}
                  >
                    {env.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-8">
          {onPrevious && (
            <Button 
              onClick={onPrevious}
              size="lg"
              variant="outline"
              className="px-6 py-3"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          <Button 
            onClick={handleGenerate}
            disabled={!canGenerate}
            size="lg"
            className="px-12 py-4 text-lg bg-accent hover:bg-accent/90 ml-auto"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Tomorrow's Plan
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 6: GENERATED PLAN (Simplified for now)
// ==============================================================================

// Timeline utility functions
const parseTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

const mapBlockTypeToCategory = (blockType: string, label: string = '') => {
  // Enhanced mapping based on block type and label content
  if (blockType === 'anchor') {
    if (label.toLowerCase().includes('gym') || label.toLowerCase().includes('workout')) return 'HEALTH';
    if (label.toLowerCase().includes('breakfast') || label.toLowerCase().includes('lunch') || label.toLowerCase().includes('dinner')) return 'MEALS';
    if (label.toLowerCase().includes('commute') || label.toLowerCase().includes('drive')) return 'TRANSIT';
    return 'PERSONAL';
  }
  
  if (label.toLowerCase().includes('email') || label.toLowerCase().includes('admin')) return 'SHALLOW_WORK';
  if (label.toLowerCase().includes('meeting') || label.toLowerCase().includes('call')) return 'MEETINGS';
  if (label.toLowerCase().includes('personal') || label.toLowerCase().includes('break')) return 'PERSONAL';
  
  return 'DEEP_WORK'; // Default for flex blocks
};

const getBlockIcon = (label: string, timeCategory: string) => {
  // Use IconResolutionService logic but simplified for this context
  const lowerLabel = label.toLowerCase();
  
  if (lowerLabel.includes('email') || lowerLabel.includes('admin')) return Mail;
  if (lowerLabel.includes('gym') || lowerLabel.includes('workout')) return Activity;
  if (lowerLabel.includes('breakfast') || lowerLabel.includes('lunch') || lowerLabel.includes('dinner')) return Coffee;
  if (lowerLabel.includes('commute') || lowerLabel.includes('drive')) return Car;
  if (lowerLabel.includes('meeting') || lowerLabel.includes('call')) return Calendar;
  if (lowerLabel.includes('morning') || lowerLabel.includes('routine')) return Sun;
  
  return Briefcase; // Default work icon
};

const transformPlanToTimeline = (planData: any) => {
  if (!planData || !planData.blocks) return [];
  
  return planData.blocks.map((block: any, index: number) => {
    const startTime = parseTime(block.start);
    const endTime = parseTime(block.end);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    const duration = endMinutes - startMinutes;
    
    const timeCategory = mapBlockTypeToCategory(block.type, block.label);
    const IconComponent = getBlockIcon(block.label, timeCategory);
    
    // Check if this block is from user config (anchor/fixed) vs AI-generated (flex)
    const isConfigBlock = block.type === 'anchor' || block.type === 'fixed';
    
    return {
      id: `block-${index}`,
      startTime: block.start.substring(0, 5), // Format as HH:MM
      endTime: block.end.substring(0, 5),
      label: block.label,
      timeCategory,
      icon: IconComponent,
      duration: `${Math.floor(duration / 60)}h ${duration % 60}m`,
      startMinutes,
      endMinutes,
      isConfigBlock, // Locked config blocks vs flexible AI blocks
      note: block.note || '',
      rationale: block.rationale || '',
    };
  });
};

// Config Wizard styling functions (matching weekly-calendar.tsx)
const getCategoryBorderColor = (category: string) => {
  const colorMap: { [key: string]: string } = {
    'deep_work': 'border-deep-work-active',
    'shallow_work': 'border-shallow-work-active', 
    'meetings': 'border-meetings-active',
    'personal': 'border-personal-active',
    'health': 'border-health-active',
    'rest': 'border-rest-active',
    'admin': 'border-admin-active',
    'work': 'border-work-active',
    'exercise': 'border-exercise-active',
    'learning': 'border-learning-active',
    'research': 'border-research-active',
    'writing': 'border-writing-active',
    'planning': 'border-planning-active',
    'social': 'border-social-active',
    'meals': 'border-meals-active'
  };
  return colorMap[category.toLowerCase()] || 'border-muted';
};

const getCategoryAccentColor = (category: string) => {
  const colorMap: { [key: string]: string } = {
    'deep_work': 'text-deep-work-active',
    'shallow_work': 'text-shallow-work-active', 
    'meetings': 'text-meetings-active',
    'personal': 'text-personal-active',
    'health': 'text-health-active',
    'rest': 'text-rest-active',
    'admin': 'text-admin-active',
    'work': 'text-work-active',
    'exercise': 'text-exercise-active',
    'learning': 'text-learning-active',
    'research': 'text-research-active',
    'writing': 'text-writing-active',
    'planning': 'text-planning-active',
    'social': 'text-social-active',
    'meals': 'text-meals-active'
  };
  return colorMap[category.toLowerCase()] || 'text-muted-foreground';
};

function PlanTimeline({ schedule }: { schedule: any[] }) {
  if (!schedule || schedule.length === 0) return null;
  
  // 1. ESTABLISH CONSISTENT VERTICAL SCALE
  const SCALE_FACTOR = 2; // 2 pixels per minute - mathematical constant for all calculations
  const DAY_START_MINUTES = 5 * 60; // Start calendar at 5:00 AM (300 minutes)
  const DAY_END_MINUTES = 22 * 60; // End calendar at 10:00 PM (1320 minutes)
  const TOTAL_DAY_DURATION = DAY_END_MINUTES - DAY_START_MINUTES; // 17 hours = 1020 minutes
  const TIMELINE_HEIGHT = TOTAL_DAY_DURATION * SCALE_FACTOR; // 1020 * 2 = 2040px
  
  // 2. CALCULATE VERTICAL POSITION with collision buffer
  const getBlockTop = (startMinutes: number, blockIndex: number) => {
    const baseTop = (startMinutes - DAY_START_MINUTES) * SCALE_FACTOR;
    // Add 3px buffer for each block to prevent overlaps
    const bufferOffset = blockIndex * 3;
    return baseTop + bufferOffset;
  };
  
  // 3. CALCULATE BLOCK HEIGHT (direct duration calculation)
  const getBlockHeight = (durationMinutes: number) => {
    return durationMinutes * SCALE_FACTOR;
  };
  
  // Map our time categories to config wizard categories
  const mapToConfigCategory = (timeCategory: string, label: string) => {
    switch (timeCategory) {
      case "DEEP_WORK": return "deep_work";
      case "SHALLOW_WORK": return label.toLowerCase().includes('admin') || label.toLowerCase().includes('email') ? "admin" : "shallow_work";
      case "MEETINGS": return "meetings";
      case "PERSONAL": return "personal";
      case "HEALTH": return "health";
      case "MEALS": return "meals";
      case "TRANSIT": return "personal";
      case "PLANNING": return "planning";
      case "RESEARCH": return "research";
      default: return "work";
    }
  };
  
  // Tier system matching config wizard
  const getTier = (duration: number) => {
    if (duration > 60) return 'tall'; // > 60 minutes
    if (duration >= 30) return 'medium'; // 30+ minutes (changed from > 30)
    return 'short'; // < 30 minutes
  };

  return (
    <TooltipProvider>
      <div className="relative">
        <h2 className="text-lg font-semibold text-foreground mb-6">Your Intelligent Schedule</h2>
        
        {/* Scrollable timeline container */}
        <div className="relative h-[65vh] overflow-y-auto border border-border rounded-lg bg-muted/20">
          <div className="relative" style={{ height: TIMELINE_HEIGHT }}>
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          {/* Time markers every 30 minutes like config wizard */}
          {Array.from({ length: 35 }, (_, i) => {
            const totalMinutes = (5 * 60) + (i * 30); // Start at 5 AM, increment by 30 minutes
            const hour = Math.floor(totalMinutes / 60);
            const minute = totalMinutes % 60;
            
            if (hour > 22) return null; // Stop at 10 PM
            
            const top = getBlockTop(totalMinutes, 0); // No buffer offset for time markers
            const isHourMark = minute === 0;
            const timeLabel = hour >= 12 ? 
              `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} PM` : 
              `${hour}:${minute.toString().padStart(2, '0')} AM`;
            
            return (
              <div key={`${hour}-${minute}`} className="absolute left-0 right-0 flex items-center" style={{ top: `${top}px` }}>
                <div className={`text-xs w-16 text-right pr-2 ${
                  isHourMark ? 'text-muted-foreground font-medium' : 'text-muted-foreground/70'
                }`}>
                  {timeLabel}
                </div>
                <div className={`flex-1 h-px ml-2 ${
                  isHourMark ? 'bg-border/30' : 'bg-border/15'
                }`} />
              </div>
            );
          }).filter(Boolean)}
          
          {/* Schedule blocks */}
          {schedule.map((block, index) => {
            const duration = block.endMinutes - block.startMinutes;
            const tier = getTier(duration);
            const configCategory = mapToConfigCategory(block.timeCategory, block.label);
            const borderColor = getCategoryBorderColor(configCategory);
            const accentColor = getCategoryAccentColor(configCategory);
            
            // Mathematical positioning: exact top and height based on time with collision buffer
            const blockTop = getBlockTop(block.startMinutes, index);
            const blockHeight = getBlockHeight(duration);
            
            // Use Config Wizard's clean card styling - all blocks now use solid borders
            const blockStyle = `bg-card/90 border-2 ${borderColor} border-solid hover:bg-card shadow-sm`;
            
            const IconComponent = block.icon;
            
            return (
              <Tooltip key={block.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute left-20 right-4 rounded-md cursor-pointer transition-all hover:shadow-md z-10 ${blockStyle}`}
                    style={{ 
                      top: `${blockTop}px`,
                      height: `${Math.max(blockHeight, 24)}px`, // Reduce minimum height for short blocks
                      padding: duration >= 30 ? '8px 12px' : '4px 8px' // Less padding for short blocks
                    }}
                  >
                    {/* Config wizard tiered content */}
                    <div className="h-full flex items-center overflow-hidden">
                      {tier === 'tall' && (
                        <div className="flex flex-col justify-center w-full">
                          {/* Top line: Icon + Title */}
                          <div className="flex items-center gap-1 mb-1 text-foreground">
                            <IconComponent size={12} className={`flex-shrink-0 ${accentColor}`} />
                            <span className="font-medium text-xs truncate text-left">{block.label}</span>
                          </div>
                          {/* Bottom line: Time range */}
                          <div className="text-xs opacity-70 text-left text-foreground">
                            {block.startTime} - {block.endTime}
                          </div>
                        </div>
                      )}
                      
                      {tier === 'medium' && (
                        <div className="flex flex-col justify-center w-full">
                          {/* Top line: Icon + Title */}
                          <div className="flex items-center gap-1 mb-0.5 text-foreground">
                            <IconComponent size={12} className={`flex-shrink-0 ${accentColor}`} />
                            <span className="font-medium text-xs truncate text-left">{block.label}</span>
                          </div>
                          {/* Bottom line: Time range */}
                          <div className="text-xs opacity-70 text-left text-foreground">
                            {block.startTime} - {block.endTime}
                          </div>
                        </div>
                      )}
                      
                      {tier === 'short' && (
                        <div className="flex items-center gap-1 justify-start w-full text-foreground">
                          <IconComponent size={12} className={`flex-shrink-0 ${accentColor}`} />
                          <span className="font-medium text-xs truncate text-left">{block.label}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="text-xs font-medium">{block.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {block.startTime} - {block.endTime}
                    </p>
                    {block.rationale && (
                      <p className="text-xs text-foreground">{block.rationale}</p>
                    )}
                    {block.note && (
                      <p className="text-xs italic text-muted-foreground">"{block.note}"</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
          </div>
        </div>
        
      </div>
    </TooltipProvider>
  );
}

interface GeneratedPlanStepProps {
  planningData: PlanningPromptsData;
  onRefine: (data: unknown) => void;
  onPrevious?: () => void;
}

function GeneratedPlanStep({ planningData, onRefine, onPrevious }: GeneratedPlanStepProps) {
  const [plan, setPlan] = useState<{ blocks: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [planSaved, setPlanSaved] = useState(false);

  useEffect(() => {
    console.log('GeneratedPlanStep received planningData:', planningData);
    const generatePlan = async (): Promise<void> => {
      try {
        // First, load user config to get anchors and fixed events
        const configResponse = await fetch('http://localhost:8000/config/load');
        const userConfig = await configResponse.json();
        
        // Get today's day of the week
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const todaySchedule = userConfig.weekly_schedule?.[today] || {};
        
        // Extract anchors and fixed events for today
        const anchors = todaySchedule.anchors || [];
        const fixedEvents = todaySchedule.fixed || [];
        
        // Convert anchors and fixed events to strings for the API
        const scheduledItems = [
          ...anchors.map(anchor => `${anchor.time}: ${anchor.task} (${anchor.category})`),
          ...fixedEvents.map(event => `${event.time}: ${event.task}`)
        ];
        
        // Use existing plan generation API with full config data
        const response = await fetch('http://localhost:8000/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            most_important: planningData.oneThing,
            todos: planningData.tasks,
            energy_level: planningData.energyLevel.toString(),
            non_negotiables: planningData.appointments.join(', '),
            avoid_today: "",
            fixed_events: scheduledItems
          })
        });
        
        const result = await response.json();
        console.log('Plan API response:', result);
        setPlan(result);
      } catch (error) {
        console.error('Failed to generate plan:', error);
      } finally {
        setLoading(false);
      }
    };

    generatePlan();
  }, [planningData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Calendar className="w-8 h-8 mx-auto animate-pulse text-accent" />
          <p className="text-muted-foreground">Crafting your perfect day...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-serif font-light text-foreground">
            Tomorrow's Plan
          </h1>
          <p className="text-muted-foreground">
            Your intelligent schedule is ready
          </p>
        </div>

        {/* Visual Timeline Display */}
        {plan?.blocks && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <PlanTimeline schedule={transformPlanToTimeline(plan)} />
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {planSaved && (
          <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Plan saved successfully!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                Your schedule is ready for tomorrow
              </p>
            </CardContent>
          </Card>
        )}

        {/* Navigation and Actions */}
        <div className="flex justify-between items-center pt-8">
          {onPrevious && (
            <Button 
              onClick={onPrevious}
              size="lg"
              variant="outline"
              className="px-6 py-3"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          
          <div className="flex gap-4 ml-auto">
            <Button 
              onClick={() => onRefine(plan)}
              variant="outline"
              size="lg"
              className="px-8 py-3"
            >
              Offer Refinement
            </Button>
            
            <Button 
              onClick={() => {
                // Save the plan data
                const planData = {
                  timestamp: new Date().toISOString(),
                  blocks: plan?.blocks || [],
                  metadata: {
                    generated_at: new Date().toISOString(),
                    wizard_completed: true
                  }
                };
                
                // Store in localStorage for now (could be enhanced to save to server)
                localStorage.setItem('echo_current_plan', JSON.stringify(planData));
                
                // TODO: Also save to server endpoint
                setPlanSaved(true);
              }}
              size="lg"
              className="px-8 py-3"
            >
              Save Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// MAIN WIZARD COMPONENT
// ==============================================================================

export default function PlanningWizard() {
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'welcome',
    data: {}
  });

  const nextStep = (stepData?: any) => {
    const steps: WizardStep[] = ['welcome', 'day-review', 'journal', 'habits', 'context-briefing', 'planning-prompts', 'generated-plan'];
    const currentIndex = steps.indexOf(wizardState.currentStep);
    const nextStep = steps[currentIndex + 1];
    
    if (nextStep) {
      // Convert kebab-case to camelCase for consistent data keys
      const dataKey = wizardState.currentStep.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
      console.log(`Saving step data for ${wizardState.currentStep} with key ${dataKey}:`, stepData);
      
      setWizardState({
        currentStep: nextStep,
        data: {
          ...wizardState.data,
          [dataKey]: stepData
        }
      });
    }
  };

  const previousStep = () => {
    const steps: WizardStep[] = ['welcome', 'day-review', 'journal', 'habits', 'context-briefing', 'planning-prompts', 'generated-plan'];
    const currentIndex = steps.indexOf(wizardState.currentStep);
    const prevStep = steps[currentIndex - 1];
    
    if (prevStep) {
      setWizardState({
        currentStep: prevStep,
        data: wizardState.data // Keep existing data
      });
    }
  };

  const handleRefinement = (planData: any) => {
    // For now, go back to planning prompts step to allow modifications
    console.log('Refinement requested for:', planData);
    setWizardState({
      currentStep: 'planning-prompts',
      data: wizardState.data
    });
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (wizardState.currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={() => nextStep()} />;
      case 'day-review':
        return <DayReviewStep onNext={nextStep} onPrevious={previousStep} />;
      case 'journal':
        return <JournalStep onNext={nextStep} onPrevious={previousStep} />;
      case 'habits':
        return <HabitsStep onNext={nextStep} onPrevious={previousStep} />;
      case 'context-briefing':
        return <ContextBriefingStep onNext={nextStep} onPrevious={previousStep} />;
      case 'planning-prompts':
        return <PlanningPromptsStep onNext={nextStep} onPrevious={previousStep} wizardData={wizardState.data} />;
      case 'generated-plan':
        console.log('Rendering GeneratedPlanStep with wizardState.data:', wizardState.data);
        return <GeneratedPlanStep planningData={wizardState.data.planningPrompts} onRefine={handleRefinement} onPrevious={previousStep} />;
      default:
        return <WelcomeStep onNext={() => nextStep()} />;
    }
  };

  return (
    <div className="relative">
      {/* Wizard Steps */}
      <div className="transition-all duration-500 ease-in-out">
        {renderCurrentStep()}
      </div>
    </div>
  );
}