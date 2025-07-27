"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IconResolutionService } from "@/lib/icon-resolution";
import { PlanTimeline } from "@/components/shared/PlanTimeline";
import { PlanningModeDemo } from "@/components/shared/PlanningModeDemo";
import { DynamicText, TimeAwareText, PlanningModeBadge, TimeContextDisplay, ConditionalPlanningContent, PlanningModeToggle } from "@/components/ui/dynamic-text";
import { usePlanning } from "@/contexts/PlanningContext";
import { ToastProvider, useToast } from "@/contexts/ToastContext";
import { ChevronRight, ChevronLeft, Clock, Calendar, BookOpen, Heart, Brain, Sparkles, Mail, CheckCircle2, Info, Activity, Sun, Coffee, Car, Briefcase, NotebookText } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ==============================================================================
// CONSTANTS & CONFIGURATION
// ==============================================================================

const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',
  TIMEOUTS: {
    CONTEXT_BRIEFING: 120000, // 120 seconds (multiple AI calls)
    ANALYTICS: 5000,          // 5 seconds
    PLAN_GENERATION: 30000    // 30 seconds
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
  ],
  TASK_DURATIONS: [
    { value: '15min', label: '15 min' },
    { value: '30min', label: '30 min' },
    { value: '45min', label: '45 min' },
    { value: '1h', label: '1 hour' },
    { value: '1h 15min', label: '1h 15min' },
    { value: '1h 30min', label: '1h 30min' },
    { value: '1h 45min', label: '1h 45min' },
    { value: '2h', label: '2 hours' }
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

interface TaskWithTime {
  title: string;
  estimatedTime: string; // e.g., "2h", "30min", "1h 30min"
}

interface AppointmentWithTime {
  title: string;
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "10:30"
}

interface PlanningPromptsData {
  oneThing: string;
  tasks: TaskWithTime[];
  appointments: AppointmentWithTime[];
  energyLevel: number;
  workEnvironment: string;
  routineOverrides: string;
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
  const { planningMode, timeContext, canPlanToday, setPlanningMode } = usePlanning();
  
  // Determine if we should skip reflection based on planning mode
  const skipReflection = planningMode === 'today';

  const handleStart = async (): Promise<void> => {
    setIsLoading(true);
    
    try {
      if (planningMode === 'tomorrow' && !skipReflection) {
        // Traditional flow: start analytics for day review
        fetchWithTimeout(
          `${API_CONFIG.BASE_URL}/analytics`,
          {},
          API_CONFIG.TIMEOUTS.ANALYTICS
        )
          .then(response => response.json())
          .then(data => setSessionData('echo_analytics', data))
          .catch(error => console.error('Failed to fetch analytics:', error));
      } else {
        // Same-day flow: start context briefing preload instead
        fetchWithTimeout(
          `${API_CONFIG.BASE_URL}/context-briefing`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              mode: planningMode,
              current_time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
             })
          },
          API_CONFIG.TIMEOUTS.CONTEXT_BRIEFING
        )
          .then(response => response.json())
          .then(data => setSessionData('echo_context_briefing', data))
          .catch(error => console.error('Failed to preload context briefing:', error));
      }
        
    } catch (error) {
      console.error('Failed to start background tasks:', error);
    } finally {
      // Pass planning mode info to next step
      onNext({ planningMode, skipReflection });
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
              <TimeAwareText
                morning="Good morning Sam! Ready to plan your day?"
                afternoon="Hey Sam, want to plan the rest of your day?"
                evening="Hey Sam, ready to wrap up today and plan tomorrow?"
                night="Working late? Let's plan tomorrow while you reflect on today"
                default="Hey Sam, ready to wrap up today and plan tomorrow?"
              />
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
              <DynamicText 
                todayText="Let's make the most of your remaining time and create a focused plan for the rest of your day."
              >
                It's been a productive day. Let's take a moment to reflect and set you up for an even better tomorrow.
              </DynamicText>
            </p>
          </div>
        </div>

        {/* Call to action */}
        <div className="pt-6">
          <Button 
            onClick={handleStart}
            disabled={isLoading}
            size="lg"
            className="px-8 py-3 text-lg font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isLoading ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                <DynamicText>Starting...</DynamicText>
              </>
            ) : (
              <>
                <DynamicText 
                  todayText="Let's plan your day"
                >
                  Let's do this
                </DynamicText>
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
          
          {/* Subtle planning mode switch */}
          <div className="flex justify-center pt-4">
            {planningMode === 'today' && canPlanToday ? (
              <button
                onClick={() => setPlanningMode('tomorrow', 'user_choice')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-dotted hover:decoration-solid"
              >
                Plan tomorrow instead
              </button>
            ) : (
              canPlanToday && (
                <button
                  onClick={() => setPlanningMode('today', 'user_choice')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-dotted hover:decoration-solid"
                >
                  Plan today instead
                </button>
              )
            )}
          </div>
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
  const { planningMode, timeContext } = usePlanning();

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        setLoading(true);
        
        // Clear legacy localStorage reminder data that overrides backend config
        localStorage.removeItem('echo_reminders');
        console.log('🧹 Cleared stale localStorage reminder data');
        
        console.log(`🚀 Fetching context briefing from API (${planningMode} mode)...`);
        
        // Prepare request with planning mode and time context
        const requestBody = {
          mode: planningMode,
          current_time: timeContext?.schedulable_start_time || new Date().toTimeString().slice(0,5)
        };
        
        const response = await fetchWithTimeout('http://localhost:8000/context-briefing', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }, API_CONFIG.TIMEOUTS.CONTEXT_BRIEFING);
        
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
          <p className="text-muted-foreground">
            <DynamicText todayText="Analyzing your current context...">
              Analyzing tomorrow's context...
            </DynamicText>
          </p>
          <p className="text-sm text-muted-foreground/70">
            <DynamicText todayText="Gathering real-time intelligence for your planning">
              This was started when you clicked "Let's do this"
            </DynamicText>
          </p>
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
            <DynamicText todayText="Here's Your Current Situation">
              Here's the Lay of the Land
            </DynamicText>
          </h1>
          <p className="text-muted-foreground">
            <DynamicText todayText="Your intelligent briefing for today's remaining time">
              Your intelligent briefing for tomorrow
            </DynamicText>
          </p>
        </div>

        {/* Flowing Memo Layout - Single Column */}
        <div className="space-y-16 max-w-4xl mx-auto">
          
          {/* Executive Summary - Most Prominent */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold tracking-wider text-accent uppercase">
                EXECUTIVE • SUMMARY
              </h3>
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
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold tracking-wider text-accent uppercase">
                EMAIL • SUMMARY
              </h3>
            </div>
            
            {/* Scrollable email container */}
            <div className="max-h-[25vh] overflow-y-auto pr-2 space-y-4">
              {/* Action Items */}
              {briefing?.email_summary?.action_items && briefing.email_summary.action_items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Action Items</h4>
                  <div className="space-y-2">
                    {briefing.email_summary.action_items.map((task: any, index: number) => (
                      <div key={index} className="flex items-center justify-between gap-4 py-2 px-3 border-l-4 border-accent bg-accent/5 rounded-r-md hover:bg-accent/10 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{task.content}</div>
                          <div className="text-xs text-muted-foreground">
                            {task.person} • Due: {task.due_date} • {task.timeline}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`text-xs font-medium shrink-0 h-7 px-2 border transition-all duration-200 ${selectedTasks.includes(task.content) 
                            ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' 
                            : 'border-accent text-accent hover:bg-accent/10 hover:text-accent-foreground'}`}
                          onClick={() => addTaskToPlan(task)}
                        >
                          {selectedTasks.includes(task.content) ? '✓' : '+'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response Needed */}
              {briefing?.email_summary?.response_needed && briefing.email_summary.response_needed.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Response Needed</h4>
                  <div className="space-y-2">
                    {briefing.email_summary.response_needed.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between gap-4 py-2 px-3 border-l-4 border-accent bg-accent/5 rounded-r-md hover:bg-accent/10 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{item.content}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.person} • {item.days_old} days old • {item.urgency}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`text-xs font-medium shrink-0 h-7 px-2 border transition-all duration-200 ${selectedTasks.includes(item.content) 
                            ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' 
                            : 'border-accent text-accent hover:bg-accent/10 hover:text-accent-foreground'}`}
                          onClick={() => addTaskToPlan(item)}
                        >
                          {selectedTasks.includes(item.content) ? '✓' : '+'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Information Updates */}
              {briefing?.email_summary?.information && briefing.email_summary.information.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Information Updates</h4>
                  <div className="space-y-2">
                    {briefing.email_summary.information.map((item: any, index: number) => (
                      <div key={index} className="flex items-center gap-4 py-2 px-3 border-l-4 border-accent bg-accent/5 rounded-r-md hover:bg-accent/10 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground text-sm truncate">{item.content}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.person} • {item.timestamp_context}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(!briefing?.email_summary?.action_items?.length && 
                !briefing?.email_summary?.response_needed?.length && 
                !briefing?.email_summary?.information?.length) && (
                <p className="text-muted-foreground italic">
                  No email items requiring attention. Your inbox is clear.
                </p>
              )}
            </div>
          </section>

          {/* Commitments & Deadlines */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold tracking-wider text-accent uppercase">
                COMMITMENTS • DEADLINES
              </h3>
            </div>
            
            {/* Scrollable commitments container */}
            <div className="max-h-[25vh] overflow-y-auto pr-2 space-y-4">
            
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
            </div>
          </section>

          {/* Session Notes */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <NotebookText className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-bold tracking-wider text-accent uppercase">
                SESSION • NOTES
              </h3>
            </div>
            
            {/* Scrollable session notes container */}
            <div className="max-h-[25vh] overflow-y-auto pr-2 space-y-4">
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
            </div>
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
  const { planningMode } = usePlanning();
  
  const [oneThing, setOneThing] = useState("");
  const [tasks, setTasks] = useState<TaskWithTime[]>(
    selectedTasks.length > 0 
      ? [...selectedTasks.map(task => ({ title: task, estimatedTime: "" })), { title: "", estimatedTime: "" }]
      : [{ title: "", estimatedTime: "" }]
  );
  
  console.log('PlanningPromptsStep received selectedTasks:', selectedTasks);
  const [appointments, setAppointments] = useState<AppointmentWithTime[]>(
    selectedAppointments.length > 0 
      ? [...selectedAppointments.map(apt => {
          // Parse existing natural language appointments like "9:00 AM - Meeting with team"
          const timeMatch = apt.match(/^([0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?(?:\s*-\s*[0-9]{1,2}:[0-9]{2}\s*(?:AM|PM)?)?)/i);
          if (timeMatch) {
            const [startTime, endTime] = apt.split(' - ');
            return {
              title: apt.replace(timeMatch[0], '').replace(/^\s*-?\s*/, '').trim(),
              startTime: startTime.trim(),
              endTime: endTime ? endTime.split(' ')[0] + ' ' + endTime.split(' ')[1] : ""
            };
          }
          return { title: apt, startTime: "", endTime: "" };
        }), { title: "", startTime: "", endTime: "" }]
      : [{ title: "", startTime: "", endTime: "" }]
  );
  const [energyLevel, setEnergyLevel] = useState(7);
  const [workEnvironment, setWorkEnvironment] = useState("home");
  const [routineOverrides, setRoutineOverrides] = useState("");

  const addTask = (): void => setTasks([...tasks, { title: "", estimatedTime: "" }]);
  const updateTask = (index: number, field: 'title' | 'estimatedTime', value: string): void => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };
  const removeTask = (index: number): void => setTasks(tasks.filter((_, i) => i !== index));

  const addAppointment = (): void => setAppointments([...appointments, { title: "", startTime: "", endTime: "" }]);
  const updateAppointment = (index: number, field: 'title' | 'startTime' | 'endTime', value: string): void => {
    const newAppointments = [...appointments];
    newAppointments[index] = { ...newAppointments[index], [field]: value };
    setAppointments(newAppointments);
  };
  const removeAppointment = (index: number): void => setAppointments(appointments.filter((_, i) => i !== index));

  const handleGenerate = (): void => {
    const planningData: PlanningPromptsData = {
      oneThing,
      tasks: tasks.filter(t => t.title.trim()),
      appointments: appointments.filter(a => a.title.trim()),
      energyLevel,
      workEnvironment,
      routineOverrides
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
            <DynamicText todayText="Focus Your Remaining Time">
              Your Intentions for Tomorrow
            </DynamicText>
          </h1>
        </div>

        <div className="space-y-8">
          {/* One Thing */}
          <div className="space-y-3">
            <label className="text-lg font-medium text-foreground">
              <DynamicText todayText="What's the ONE thing that must get done in your remaining time?">
                What's the ONE thing that must get done tomorrow?
              </DynamicText>
            </label>
            <Input
              value={oneThing}
              onChange={(e) => setOneThing(e.target.value)}
              placeholder={planningMode === 'today' ? "Focus on what matters most today..." : "The most important thing..."}
              className="text-lg p-4 border-border/50 focus:border-accent"
            />
          </div>

          {/* Tasks with Time Estimates */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              <DynamicText todayText="What other tasks can fit in your remaining time?">
                What other tasks are on your radar?
              </DynamicText>
            </label>
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div key={index} className="flex gap-3">
                  <Input
                    value={task.title}
                    onChange={(e) => updateTask(index, 'title', e.target.value)}
                    placeholder={`Task ${index + 1}...`}
                    className="flex-1"
                  />
                  <Select
                    value={task.estimatedTime}
                    onValueChange={(value) => updateTask(index, 'estimatedTime', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {WIZARD_CONFIG.TASK_DURATIONS.map((duration) => (
                        <SelectItem key={duration.value} value={duration.value}>
                          {duration.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <p className="text-xs text-muted-foreground mt-2">
                Time estimates help the AI create a more realistic schedule (max 2h for deep work)
              </p>
            </div>
          </div>

          {/* Appointments with Structured Times */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Any fixed meetings or appointments?
            </label>
            <div className="space-y-3">
              {appointments.map((appointment, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <Input
                    value={appointment.title}
                    onChange={(e) => updateAppointment(index, 'title', e.target.value)}
                    placeholder="Meeting with team..."
                    className="flex-1"
                  />
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <Input
                    type="time"
                    value={appointment.startTime}
                    onChange={(e) => updateAppointment(index, 'startTime', e.target.value)}
                    className="w-28"
                    placeholder="09:00"
                  />
                  <span className="text-muted-foreground text-sm flex-shrink-0">to</span>
                  <Input
                    type="time"
                    value={appointment.endTime}
                    onChange={(e) => updateAppointment(index, 'endTime', e.target.value)}
                    className="w-28"
                    placeholder="10:30"
                  />
                  {appointments.length > 1 && (
                    <Button 
                      onClick={() => removeAppointment(index)}
                      variant="ghost" 
                      size="sm"
                      className="px-3 flex-shrink-0"
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button onClick={addAppointment} variant="ghost" size="sm" className="text-accent">
                + Add appointment
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Structured times help the AI schedule around your fixed commitments
              </p>
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

          {/* Routine Overrides */}
          <div className="space-y-4">
            <label className="text-lg font-medium text-foreground">
              Any changes to your usual routine today?
            </label>
            <Textarea
              value={routineOverrides}
              onChange={(e) => setRoutineOverrides(e.target.value)}
              placeholder="e.g., 'Skip breakfast for late brunch at 10:30' or 'Move gym session to evening' or 'Need extra prep time for big presentation'"
              className="min-h-[80px] text-base leading-relaxed border-border/50 focus:border-accent"
            />
            <p className="text-xs text-muted-foreground">
              This will override your config blocks and usual schedule - be specific about timing and changes
            </p>
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
            <DynamicText todayText="Generate Today's Plan">
              Generate Tomorrow's Plan
            </DynamicText>
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
  const safeLabel = (label || '').toLowerCase();
  
  if (blockType === 'anchor') {
    if (safeLabel.includes('gym') || safeLabel.includes('workout')) return 'HEALTH';
    if (safeLabel.includes('breakfast') || safeLabel.includes('lunch') || safeLabel.includes('dinner')) return 'MEALS';
    if (safeLabel.includes('commute') || safeLabel.includes('drive')) return 'TRANSIT';
    return 'PERSONAL';
  }
  
  if (safeLabel.includes('email') || safeLabel.includes('admin')) return 'SHALLOW_WORK';
  if (safeLabel.includes('meeting') || safeLabel.includes('call')) return 'MEETINGS';
  if (safeLabel.includes('personal') || safeLabel.includes('break')) return 'PERSONAL';
  
  return 'DEEP_WORK'; // Default for flex blocks
};

const getBlockIcon = (label: string, timeCategory: string) => {
  // Use IconResolutionService logic but simplified for this context
  const lowerLabel = (label || '').toLowerCase();
  
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
    
    const timeCategory = mapBlockTypeToCategory(block.type, block.title);
    const IconComponent = getBlockIcon(block.title, timeCategory);
    
    // Check if this block is from user config (anchor/fixed) vs AI-generated (flex)
    const isConfigBlock = block.type === 'anchor' || block.type === 'fixed';
    
    return {
      id: `block-${index}`,
      startTime: block.start.substring(0, 5), // Format as HH:MM
      endTime: block.end.substring(0, 5),
      label: block.title,
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


interface GeneratedPlanStepProps {
  planningData: PlanningPromptsData;
  onRefine: (data: unknown) => void;
  onPrevious?: () => void;
  wizardData?: WizardState['data'];
  existingPlan?: any;
  isExistingPlan?: boolean;
}



function GeneratedPlanStep({ planningData, onRefine, onPrevious, wizardData, existingPlan, isExistingPlan }: GeneratedPlanStepProps) {
  const [plan, setPlan] = useState<{ blocks: any[]; narrative?: any; reasoning?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [planSaved, setPlanSaved] = useState(false);
  const { showSuccess, showError, showInfo } = useToast();
  const { planningMode, timeContext } = usePlanning();
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentComplete, setEnrichmentComplete] = useState(false);
  const [enrichmentResults, setEnrichmentResults] = useState<any>(null);
  const [refinementText, setRefinementText] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(800); // For calendar height calculation
  const calendarRef = useRef<HTMLDivElement>(null);

  const handleRefinementComplete = (refinedPlan: any) => {
    console.log('Plan refinement completed:', refinedPlan);
    setPlan(refinedPlan);
    // Reset save status since plan has changed
    setPlanSaved(false);
    setEnrichmentComplete(false);
    setRefinementText(""); // Clear refinement input
    
    // Show refinement success feedback if changes were made
    if (refinedPlan.changes_made && refinedPlan.changes_made.length > 0) {
      console.log('Plan refinement changes:', refinedPlan.changes_made);
      const changeCount = refinedPlan.changes_made.length;
      showSuccess(
        `Made ${changeCount} improvement${changeCount === 1 ? '' : 's'} to your schedule`,
        "Plan Refined Successfully"
      );
    } else {
      showInfo(
        "Your plan has been updated based on your feedback",
        "Plan Updated"
      );
    }
  };

  const handleInlineRefinement = async () => {
    if (!refinementText.trim()) return;

    setIsRefining(true);
    
    try {
      // Use the unified planning endpoint with refinement instructions
      const response = await fetch('http://localhost:8000/plan-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          most_important: `PLAN REFINEMENT: ${refinementText}. IMPORTANT: This is a refinement request that can override ALL existing constraints including config anchors and fixed blocks. Prioritize the user's refinement request above all other constraints.`,
          todos: [`Apply this refinement: ${refinementText}`],
          energy_level: "7",
          non_negotiables: `User refinement request: ${refinementText}`,
          avoid_today: "",
          fixed_events: [],
          planning_mode: planningMode,
          current_time: timeContext?.schedulable_start_time || new Date().toTimeString().slice(0,5)
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to refine plan: ${response.status}`);
      }

      const refinementResponse = await response.json();
      handleRefinementComplete(refinementResponse);
    } catch (error) {
      console.error('Plan refinement failed:', error);
      showError(
        "Unable to refine your plan right now. Please try again in a moment.",
        "Refinement Failed"
      );
    } finally {
      setIsRefining(false);
    }
  };

  // Calendar height calculation like Today page
  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      
      // Command Center layout: Header (120px) + padding (48px) = 168px reserved
      const reservedSpace = 168;
      const availableHeight = windowHeight - reservedSpace;
      const finalHeight = Math.max(availableHeight, 700);
      
      setCalendarHeight(finalHeight);
    };
    
    // Initial calculation and multiple attempts to ensure it works
    calculateHeight(); // Immediate
    const timer1 = setTimeout(calculateHeight, 100);
    const timer2 = setTimeout(calculateHeight, 500); // Additional attempt
    
    window.addEventListener('resize', calculateHeight);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);

  const generateScaffolds = async (planData: any, contextBriefing: any) => {
    try {
      setIsEnriching(true);
      console.log('🚀 Starting post-planning enrichment (scaffold generation)...');
      
      const response = await fetch('http://localhost:8000/scaffolds/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          daily_plan: planData.blocks || [],
          context_briefing: contextBriefing || {},
          force_refresh: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const results = await response.json();
      console.log('✅ Scaffold generation completed:', results);
      
      setEnrichmentResults(results);
      setEnrichmentComplete(true);
      
      return results;
    } catch (error) {
      console.error('❌ Scaffold generation failed:', error);
      // Don't block the user flow if enrichment fails
      setEnrichmentComplete(true); // Mark as complete even if failed
      return null;
    } finally {
      setIsEnriching(false);
    }
  };

  useEffect(() => {
    console.log('GeneratedPlanStep received planningData:', planningData);
    
    // If we have an existing plan, use it instead of generating a new one
    if (isExistingPlan && existingPlan) {
      console.log('Loading existing plan:', existingPlan);
      setPlan(existingPlan);
      setPlanSaved(true); // Mark as saved since it's an existing plan
      setLoading(false);
      return;
    }
    
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
        
        // Convert structured data to backend format
        const taskStrings = planningData.tasks.map(task => 
          task.estimatedTime ? `${task.title} (${task.estimatedTime})` : task.title
        );
        
        const appointmentStrings = planningData.appointments.map(appointment => {
          if (appointment.startTime && appointment.endTime) {
            return `${appointment.startTime} - ${appointment.endTime}: ${appointment.title}`;
          } else if (appointment.startTime) {
            return `${appointment.startTime}: ${appointment.title}`;
          } else {
            return appointment.title;
          }
        });
        
        // Use new Claude-based plan generation API 
        const response = await fetch('http://localhost:8000/plan-v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            most_important: planningData.oneThing,
            todos: taskStrings,
            energy_level: planningData.energyLevel.toString(),
            non_negotiables: appointmentStrings.join(', '),
            avoid_today: "",
            fixed_events: scheduledItems,
            routine_overrides: planningData.routineOverrides || "",
            planning_mode: planningMode,
            current_time: timeContext?.schedulable_start_time || new Date().toTimeString().slice(0,5)
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
  }, [planningData, isExistingPlan, existingPlan]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <Calendar className="w-8 h-8 mx-auto animate-pulse text-accent" />
          <p className="text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
            Crafting your perfect day...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in slide-in-from-bottom-6 duration-500">
      {/* Command Center Header */}
      <div className="bg-card border-b border-border px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-serif font-light text-foreground">
            Your plan for the day
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and confirm your optimized schedule
          </p>
        </div>
      </div>

      {/* Command Center Layout */}
      <div className="min-h-[calc(100vh-120px)]">
        
        {/* Left Column: The Conversation (70% width) */}
        <div className="overflow-y-auto border-r border-border animate-in slide-in-from-left-8 duration-700" style={{ width: '70vw', paddingRight: '0', marginRight: '30vw' }}>
          <div className="p-8 max-w-4xl mx-auto space-y-8">
            
            {/* Part A: AI Narrative Summary */}
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-accent" />
                <h3 className="text-sm font-bold tracking-wider text-accent uppercase">
                  SUMMARY
                </h3>
              </div>
              
              {plan?.narrative?.summary ? (
                <div className="prose prose-foreground max-w-none space-y-6">
                  <p className="text-foreground leading-relaxed text-base">
                    {plan.narrative.summary}
                  </p>
                  
                  {/* Integrated AI Questions as natural prompts */}
                  {plan?.narrative?.questions && plan.narrative.questions.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border/30">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                        A few things I'm wondering about:
                      </p>
                      {plan.narrative.questions.map((question: any, index: number) => (
                        <div key={index} className="text-foreground leading-relaxed">
                          <p className="italic text-muted-foreground">
                            • {question.question}
                          </p>
                          {question.context && (
                            <p className="text-sm text-muted-foreground/70 ml-3 mt-1">
                              {question.context}
                            </p>
                          )}
                        </div>
                      ))}
                      <p className="text-sm text-muted-foreground/70 italic pt-2">
                        Feel free to address any of these in the refinement box below, or save your plan as-is.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/30 border border-border rounded-lg p-6">
                  <p className="text-muted-foreground italic">
                    Your AI assistant is analyzing your requirements and will provide a detailed explanation of the scheduling decisions once the plan is generated.
                  </p>
                </div>
              )}
            </section>

            {/* Part C: User Refinement Input */}
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-accent" />
                <h3 className="text-sm font-bold tracking-wider text-accent uppercase">
                  MAKE • ADJUSTMENTS
                </h3>
              </div>
              
              <div className="space-y-4">
                <Textarea
                  value={refinementText}
                  onChange={(e) => setRefinementText(e.target.value)}
                  placeholder="Tell me what you'd like to change about your schedule. For example: 'Move the deep work block to earlier in the day' or 'Add more time for email processing' or 'I need a longer break after lunch'"
                  className="min-h-[120px] text-base leading-relaxed border-border/50 focus:border-accent resize-none"
                />
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Changes will update your schedule instantly while preserving your core requirements.
                  </p>
                  
                  <Button
                    onClick={handleInlineRefinement}
                    disabled={!refinementText.trim() || isRefining}
                    variant="outline"
                    className="px-6 transition-all duration-300 ease-in-out"
                  >
                    <div className="flex items-center transition-all duration-200 ease-in-out">
                      {isRefining ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin transition-transform duration-200" />
                          <span className="animate-in fade-in slide-in-from-left-2 duration-300">Refining...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 transition-all duration-200 ease-in-out" />
                          <span className="transition-all duration-200 ease-in-out">Refine Plan</span>
                        </>
                      )}
                    </div>
                  </Button>
                </div>
              </div>
            </section>

            
            {/* Navigation */}
            <section className="space-y-4 pt-8 border-t border-border">
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
                  onClick={async () => {
                    try {
                      // Save the plan data
                      const planData = {
                        timestamp: new Date().toISOString(),
                        blocks: plan?.blocks || [],
                        narrative: plan?.narrative || {},
                        metadata: {
                          generated_at: new Date().toISOString(),
                          wizard_completed: true
                        }
                      };
                      
                      // Store in localStorage for now (could be enhanced to save to server)
                      localStorage.setItem('echo_current_plan', JSON.stringify(planData));
                      
                      // Mark plan as saved
                      setPlanSaved(true);
                      
                      // Show success toast
                      showSuccess(
                        planningMode === 'today' 
                          ? "Your schedule is ready for the rest of today" 
                          : "Your schedule is ready for tomorrow",
                        "Plan Saved Successfully!"
                      );
                      
                      // Reset save state after brief success display
                      setTimeout(() => {
                        setPlanSaved(false);
                      }, 3000); // Show "Plan Saved" for 3 seconds, then allow re-saving
                      
                      // Trigger post-planning enrichment (scaffold generation)
                      // Get context briefing data from wizard state if available
                      const contextBriefing = wizardData?.contextBriefing?.briefing || {};
                      await generateScaffolds(planData, contextBriefing);
                      
                    } catch (error) {
                      console.error('Failed to save plan:', error);
                      showError(
                        "There was an issue saving your plan. Please try again.",
                        "Save Failed"
                      );
                    }
                  }}
                  size="lg"
                  className="px-8 py-3 ml-auto transition-all duration-300 ease-in-out"
                  disabled={planSaved}
                >
                  <div className="flex items-center transition-all duration-200 ease-in-out">
                    {planSaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600 animate-in fade-in zoom-in duration-300" />
                        <span className="animate-in fade-in slide-in-from-left-2 duration-300">Plan Saved</span>
                      </>
                    ) : (
                      <span className="transition-all duration-200 ease-in-out">Save Plan</span>  
                    )}
                  </div>
                </Button>
              </div>
              
              {/* Early next-day planning link - only show if we're viewing an existing plan */}
              {isExistingPlan && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => {
                      // Clear existing plan state and restart wizard for tomorrow
                      setShouldSkipToCommandCenter(false);
                      setExistingPlan(null);
                      setPlanningMode('tomorrow', 'user_choice');
                      setWizardState({
                        currentStep: 'welcome',
                        data: {}
                      });
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-dotted hover:decoration-solid"
                  >
                    Plan tomorrow instead
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Right Column: The Visual Plan (30% width) */}
        <div className="bg-muted/20 flex flex-col h-screen fixed right-0 top-0 w-[30vw] animate-in slide-in-from-right-8 duration-700" style={{ animationDelay: '300ms' }}>
          <div className="px-6 pt-6 pb-2 flex-shrink-0" style={{ height: '120px' }}>
            {/* Header space - matches main header height */}
          </div>
          
          <div ref={calendarRef} className="flex-1 px-6 pb-6 overflow-hidden">
            {plan?.blocks ? (
              <div className="animate-in fade-in duration-500" key={JSON.stringify(plan.blocks)}>
                <PlanTimeline 
                  schedule={transformPlanToTimeline(plan)} 
                  context="command-center"
                  availableHeight={calendarHeight}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center animate-in fade-in duration-300">
                <div className="text-center space-y-4">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground animate-pulse" />
                  <p className="text-muted-foreground">
                    Your schedule will appear here
                  </p>
                </div>
              </div>
            )}
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
  const [showDemo, setShowDemo] = useState(false);
  const { planningMode, setPlanningMode } = usePlanning();
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'welcome',
    data: {}
  });
  const [existingPlan, setExistingPlan] = useState<any>(null);
  const [shouldSkipToCommandCenter, setShouldSkipToCommandCenter] = useState(false);

  // Handle URL parameters for planning mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    
    if (modeParam === 'today' || modeParam === 'tomorrow') {
      setPlanningMode(modeParam, 'url_parameter');
    }
  }, [setPlanningMode]);

  // Check for existing plan and determine if we should skip to Command Center
  useEffect(() => {
    const checkExistingPlan = async () => {
      try {
        const currentHour = new Date().getHours();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Check if it's before 6 PM (18:00)
        const isBeforeEvening = currentHour < 18;
        
        if (!isBeforeEvening) {
          return; // After 6 PM, use normal planning flow
        }
        
        // Check for saved plan in localStorage
        const savedPlan = localStorage.getItem('echo_current_plan');
        if (savedPlan) {
          try {
            const planData = JSON.parse(savedPlan);
            const planDate = new Date(planData.timestamp).toISOString().split('T')[0];
            
            // If there's a plan for today, skip to Command Center
            if (planDate === today && planData.blocks && planData.blocks.length > 0) {
              console.log('Found existing plan for today, skipping to Command Center');
              setExistingPlan(planData);
              setShouldSkipToCommandCenter(true);
              
              // Set up wizard state to show Command Center directly
              setWizardState({
                currentStep: 'generated-plan',
                data: {
                  planningPrompts: {
                    oneThing: "Existing plan loaded",
                    tasks: [],
                    appointments: [],
                    energyLevel: 7,
                    workEnvironment: "home",
                    routineOverrides: ""
                  }
                }
              });
              return;
            }
          } catch (error) {
            console.error('Error parsing saved plan:', error);
          }
        }
        
        // Also check for plan file from API (fallback)
        const response = await fetch(`http://localhost:8000/today`);
        if (response.ok) {
          const todayData = await response.json();
          if (todayData.blocks && todayData.blocks.length > 0) {
            console.log('Found existing plan from API, skipping to Command Center');  
            
            // Convert API format to expected format
            const apiPlan = {
              blocks: todayData.blocks.map((block: any) => ({
                start: block.start_time,
                end: block.end_time,
                title: block.label,
                type: block.type,
                note: block.note || '',
                icon: block.icon || 'Calendar',
                priority: 'medium',
                energy_requirement: 'medium'
              })),
              narrative: {
                summary: "Your existing schedule has been loaded. You can review it below and make any adjustments needed.",
                questions: []
              },
              timestamp: new Date().toISOString()
            };
            
            setExistingPlan(apiPlan);
            setShouldSkipToCommandCenter(true);
            
            setWizardState({
              currentStep: 'generated-plan',
              data: {
                planningPrompts: {
                  oneThing: "Existing plan loaded",
                  tasks: [],
                  appointments: [],
                  energyLevel: 7,
                  workEnvironment: "home",
                  routineOverrides: ""
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error checking for existing plan:', error);
      }
    };
    
    checkExistingPlan();
  }, []);

  // Define step flows based on planning mode
  const getStepFlow = (mode: 'today' | 'tomorrow'): WizardStep[] => {
    if (mode === 'today') {
      // Streamlined same-day flow: skip reflection steps
      return ['welcome', 'context-briefing', 'planning-prompts', 'generated-plan'];
    } else {
      // Traditional tomorrow planning flow: include all reflection steps
      return ['welcome', 'day-review', 'journal', 'habits', 'context-briefing', 'planning-prompts', 'generated-plan'];
    }
  };

  const nextStep = (stepData?: any) => {
    const steps = getStepFlow(planningMode);
    const currentIndex = steps.indexOf(wizardState.currentStep);
    const nextStep = steps[currentIndex + 1];
    
    if (nextStep) {
      // Convert kebab-case to camelCase for consistent data keys
      const dataKey = wizardState.currentStep.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
      console.log(`Saving step data for ${wizardState.currentStep} with key ${dataKey} (${planningMode} mode):`, stepData);
      
      setWizardState({
        currentStep: nextStep,
        data: {
          ...wizardState.data,
          [dataKey]: stepData,
          // Store planning mode in wizard data
          planningMode: planningMode
        }
      });
    }
  };

  const previousStep = () => {
    const steps = getStepFlow(planningMode);
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
        return <WelcomeStep onNext={nextStep} />;
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
        return <GeneratedPlanStep 
          planningData={wizardState.data.planningPrompts} 
          onRefine={handleRefinement} 
          onPrevious={shouldSkipToCommandCenter ? undefined : previousStep} 
          wizardData={wizardState.data}
          existingPlan={existingPlan}
          isExistingPlan={shouldSkipToCommandCenter}
        />;
      default:
        return <WelcomeStep onNext={() => nextStep()} />;
    }
  };

  // Show demo if requested
  if (showDemo) {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50">
          <Button onClick={() => setShowDemo(false)} variant="outline">
            ← Back to Planning
          </Button>
        </div>
        <PlanningModeDemo />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="relative">
        {/* Demo Toggle - Remove this in production */}
        <div className="fixed top-4 right-4 z-50">
          <Button onClick={() => setShowDemo(true)} variant="outline" size="sm">
            🧪 Demo Planning Context
          </Button>
        </div>
        
        {/* Wizard Steps */}
        <div className="transition-all duration-500 ease-in-out">
          {renderCurrentStep()}
        </div>
      </div>
    </ToastProvider>
  );
}