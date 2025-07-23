"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { IconResolutionService } from "@/lib/icon-resolution";
import { ChevronRight, Clock, Calendar, BookOpen, Heart, Brain, Sparkles, Mail } from "lucide-react";

// ==============================================================================
// WIZARD TYPES & INTERFACES
// ==============================================================================

type WizardStep = 'welcome' | 'day-review' | 'journal' | 'habits' | 'context-briefing' | 'planning-prompts' | 'generated-plan';

interface WizardState {
  currentStep: WizardStep;
  data: {
    dayReview?: any;
    journal?: {
      brainDump: string;
      improvements: string;
      gratitude: string;
    };
    habits?: any;
    contextBriefing?: any;
    planningPrompts?: {
      oneThing: string;
      tasks: string[];
      appointments: string[];
      energyLevel: number;
      workEnvironment: string;
    };
    generatedPlan?: any;
  };
}

// ==============================================================================
// STEP 0: WELCOME & TRANSITION
// ==============================================================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
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
            onClick={onNext}
            size="lg"
            className="px-8 py-3 text-lg font-medium bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            Let's do this
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 1: DAY REVIEW
// ==============================================================================

function DayReviewStep({ onNext }: { onNext: (data: any) => void }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('http://localhost:8000/analytics');
        const data = await response.json();
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const handleContinue = () => {
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

        {/* Continue Button */}
        <div className="text-center pt-4">
          <Button 
            onClick={handleContinue}
            size="lg"
            variant="default"
            className="px-8 py-3"
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

function JournalStep({ onNext }: { onNext: (data: any) => void }) {
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

  const handleNext = () => {
    if (isLastPrompt) {
      onNext({ brainDump, improvements, gratitude });
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
        <div className="flex justify-center">
          <Button 
            onClick={handleNext}
            disabled={!canAdvance}
            size="lg"
            className="px-8 py-3"
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

function HabitsStep({ onNext }: { onNext: (data: any) => void }) {
  const handleContinue = () => {
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

        <Button 
          onClick={handleContinue}
          size="lg"
          className="px-8 py-3"
        >
          Continue to Context Briefing
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ==============================================================================
// STEP 4: CONTEXT BRIEFING
// ==============================================================================

function ContextBriefingStep({ onNext }: { onNext: (data: any) => void }) {
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const response = await fetch('http://localhost:8000/context-briefing');
        const data = await response.json();
        setBriefing(data);
      } catch (error) {
        console.error('Failed to fetch context briefing:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBriefing();
  }, []);

  const handleContinue = () => {
    onNext({ briefing });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="w-8 h-8 mx-auto animate-pulse text-accent" />
          <p className="text-muted-foreground">Analyzing tomorrow's context...</p>
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

        {/* Briefing Display */}
        <div className="space-y-6">
          {/* Email Section */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-medium text-foreground">On Your Plate</h3>
              </div>
              <div className="text-foreground leading-relaxed">
                {briefing?.sections?.email || 'No new email items to review.'}
              </div>
            </CardContent>
          </Card>

          {/* Calendar Section */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-medium text-foreground">Confirmed Schedule</h3>
              </div>
              <div className="text-foreground leading-relaxed">
                {briefing?.sections?.calendar || 'No fixed events scheduled.'}
              </div>
            </CardContent>
          </Card>

          {/* Sessions Section */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-medium text-foreground">From Recent Sessions</h3>
              </div>
              <div className="text-foreground leading-relaxed">
                {briefing?.sections?.sessions || 'No recent session insights available.'}
              </div>
            </CardContent>
          </Card>

          {/* Reminders Section */}
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-5 h-5 text-accent" />
                <h3 className="text-lg font-medium text-foreground">Deadlines & Reminders</h3>
              </div>
              <div className="text-foreground leading-relaxed">
                {briefing?.sections?.reminders || 'No upcoming reminders.'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="text-center pt-4">
          <Button 
            onClick={handleContinue}
            size="lg"
            className="px-8 py-3"
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

function PlanningPromptsStep({ onNext }: { onNext: (data: any) => void }) {
  const [oneThing, setOneThing] = useState("");
  const [tasks, setTasks] = useState<string[]>([""]);
  const [appointments, setAppointments] = useState<string[]>([""]);
  const [energyLevel, setEnergyLevel] = useState(7);
  const [workEnvironment, setWorkEnvironment] = useState("home");

  const addTask = () => setTasks([...tasks, ""]);
  const updateTask = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };
  const removeTask = (index: number) => setTasks(tasks.filter((_, i) => i !== index));

  const addAppointment = () => setAppointments([...appointments, ""]);
  const updateAppointment = (index: number, value: string) => {
    const newAppointments = [...appointments];
    newAppointments[index] = value;
    setAppointments(newAppointments);
  };
  const removeAppointment = (index: number) => setAppointments(appointments.filter((_, i) => i !== index));

  const handleGenerate = () => {
    const data = {
      oneThing,
      tasks: tasks.filter(t => t.trim()),
      appointments: appointments.filter(a => a.trim()),
      energyLevel,
      workEnvironment
    };
    onNext(data);
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
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 1, label: 'Very Low' },
                  { value: 3, label: 'Low' },
                  { value: 5, label: 'Medium' },
                  { value: 7, label: 'High' },
                  { value: 10, label: 'Very High' }
                ].map((energy) => (
                  <button
                    key={energy.value}
                    onClick={() => setEnergyLevel(energy.value)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
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
                {[
                  { value: 'home', label: 'Home' },
                  { value: 'cafe', label: 'Cafe' },
                  { value: 'office', label: 'Office' }
                ].map((env) => (
                  <button
                    key={env.value}
                    onClick={() => setWorkEnvironment(env.value)}
                    className={`px-4 py-2 rounded-md border font-medium transition-colors ${
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

        {/* Generate Button */}
        <div className="text-center pt-8">
          <Button 
            onClick={handleGenerate}
            disabled={!canGenerate}
            size="lg"
            className="px-12 py-4 text-lg bg-accent hover:bg-accent/90"
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

function GeneratedPlanStep({ planningData, onRefine }: { planningData: any; onRefine: (data: any) => void }) {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generatePlan = async () => {
      try {
        // First, load user config to get anchors and fixed events
        const configResponse = await fetch('http://localhost:8000/config/load');
        const userConfig = await configResponse.json();
        
        // Get today's day of the week
        const today = new Date().toLocaleDateString('en-US', { weekday: 'lowercase' });
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

        {/* Plan Display - Compact Timeline View */}
        {plan?.blocks && (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-6">
              <div className="space-y-3">
                {plan.blocks.map((block: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 py-2">
                    {/* Time */}
                    <div className="text-sm font-mono text-muted-foreground w-20 flex-shrink-0">
                      {block.start.substring(0, 5)}
                    </div>
                    
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {(() => {
                        const iconResult = IconResolutionService.resolveIconByName(block.icon || 'Calendar');
                        const IconComponent = iconResult.icon;
                        return <IconComponent className="w-4 h-4 text-accent" />;
                      })()}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {block.label}
                      </div>
                      {block.note && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {block.note}
                        </div>
                      )}
                    </div>
                    
                    {/* Duration */}
                    <div className="text-xs text-muted-foreground flex-shrink-0">
                      {(() => {
                        const start = new Date(`2000-01-01T${block.start}`);
                        const end = new Date(`2000-01-01T${block.end}`);
                        const diff = (end.getTime() - start.getTime()) / (1000 * 60);
                        return `${Math.round(diff)}m`;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Refinement Option */}
        <div className="text-center pt-8">
          <Button 
            onClick={() => onRefine(plan)}
            variant="outline"
            size="lg"
            className="px-8 py-3 mr-4"
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
              alert('Plan saved successfully!');
            }}
            size="lg"
            className="px-8 py-3"
          >
            Save Plan
          </Button>
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
      setWizardState({
        currentStep: nextStep,
        data: {
          ...wizardState.data,
          [wizardState.currentStep.replace('-', '')]: stepData
        }
      });
    }
  };

  const handleRefinement = (planData: any) => {
    // TODO: Implement refinement interface
    console.log('Refinement requested for:', planData);
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (wizardState.currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={() => nextStep()} />;
      case 'day-review':
        return <DayReviewStep onNext={nextStep} />;
      case 'journal':
        return <JournalStep onNext={nextStep} />;
      case 'habits':
        return <HabitsStep onNext={nextStep} />;
      case 'context-briefing':
        return <ContextBriefingStep onNext={nextStep} />;
      case 'planning-prompts':
        return <PlanningPromptsStep onNext={nextStep} />;
      case 'generated-plan':
        return <GeneratedPlanStep planningData={wizardState.data.planningprompts} onRefine={handleRefinement} />;
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