"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
// Simple Modal Component
function Modal({ isOpen, onClose, title, children }: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
import { 
  Sunset,
  Sunrise,
  Calendar,
  Target,
  Lightbulb,
  CheckCircle2,
  Clock,
  BarChart3,
  Sparkles,
  ArrowRight,
  Edit3,
  Save,
  RefreshCw,
  Mail,
  AlertCircle,
  ExternalLink,
  User
} from "lucide-react";

// Mock data for today's condensed timeline
const mockTodaySummary = {
  date: "2025-01-21",
  totalHours: 8.5,
  deepWorkHours: 4.2,
  meetingHours: 1.5,
  personalHours: 2.8,
  segments: [
    { category: "PERSONAL", duration: 0.5, color: "bg-personal" },
    { category: "HEALTH", duration: 0.5, color: "bg-health" },
    { category: "DEEP_WORK", duration: 2.0, color: "bg-deep-work" },
    { category: "MEETINGS", duration: 0.5, color: "bg-meetings" },
    { category: "DEEP_WORK", duration: 2.0, color: "bg-deep-work" },
    { category: "PERSONAL", duration: 1.0, color: "bg-personal" },
    { category: "SHALLOW_WORK", duration: 1.0, color: "bg-shallow-work" },
    { category: "PERSONAL", duration: 1.0, color: "bg-personal" }
  ],
  keyStats: [
    { label: "Total Focus Time", value: "6.5 hours", icon: Target },
    { label: "Deep Work Ratio", value: "49%", icon: BarChart3 },
    { label: "Sessions Completed", value: "7/8", icon: CheckCircle2 }
  ]
};

// Mock data for email summary
const mockEmailSummary = {
  totalEmails: 23,
  unreadEmails: 8,
  urgentEmails: 2,
  actionItems: [
    {
      id: "1",
      from: "Dr. Evans",
      subject: "Grant proposal feedback needed",
      priority: "High",
      timeEstimate: "30 min",
      category: "Review & Respond"
    },
    {
      id: "2", 
      from: "Team Lead",
      subject: "Sprint planning adjustments",
      priority: "Medium",
      timeEstimate: "15 min",
      category: "Quick Reply"
    },
    {
      id: "3",
      from: "Conference Committee",
      subject: "Presentation slot confirmation",
      priority: "Medium",
      timeEstimate: "5 min",
      category: "Confirm"
    }
  ],
  summary: "Moderate inbox day. Two items need deeper attention, rest can be handled quickly."
};

// Mock data for planning modes
type PlanningMode = "daily" | "weekly";

function CondensedTimeline({ summary }: { summary: typeof mockTodaySummary }) {
  const totalDuration = summary.segments.reduce((acc, seg) => acc + seg.duration, 0);

  return (
    <div className="space-y-4">
      {/* Visual Timeline Bar */}
      <div className="w-full h-8 bg-muted rounded-lg overflow-hidden flex shadow-lg">
        {summary.segments.map((segment, index) => (
          <div
            key={index}
            className={`${segment.color} transition-all duration-300 hover:brightness-110`}
            style={{ width: `${(segment.duration / totalDuration) * 100}%` }}
            title={`${segment.category}: ${segment.duration}h`}
          />
        ))}
      </div>
      
      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-4">
        {summary.keyStats.map((stat, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
            <stat.icon className="w-4 h-4 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {stat.label}
              </div>
              <div className="text-sm text-foreground font-semibold">
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmailSummaryPanel() {
  const [emailData, setEmailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    fetchEmailSummary();
  }, []);

  const fetchEmailSummary = async () => {
    try {
      const response = await fetch('http://localhost:8000/email-summary');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEmailData(data);
    } catch (err) {
      console.error('Failed to fetch email summary:', err);
      setError(err.message);
      // Fallback to mock data
      setEmailData(mockEmailSummary);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "text-accent border-accent/30 bg-accent/10";
      case "Medium": return "text-primary border-primary/30 bg-primary/10";
      default: return "text-muted-foreground border-border bg-muted/20";
    }
  };

  const handleEmailClick = (item) => {
    setSelectedEmail(item);
    setShowEmailModal(true);
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    setSelectedEmail(null);
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-3">
            <Mail className="w-5 h-5 text-accent" />
            Today's Email Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <RefreshCw className="w-5 h-5 animate-spin text-accent mr-2" />
            <span className="text-muted-foreground">Loading email summary...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-card-foreground flex items-center gap-3">
          <Mail className="w-5 h-5 text-accent" />
          Today's Email Summary
          {error && (
            <AlertCircle className="w-4 h-4 text-yellow-500" title="Using fallback data" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="text-lg font-semibold text-foreground">{emailData?.totalEmails || emailData?.total_emails || 0}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="text-lg font-semibold text-foreground">{emailData?.unreadEmails || emailData?.unread_emails || 0}</div>
            <div className="text-xs text-muted-foreground">Unread</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-accent/20">
            <div className="text-lg font-semibold text-accent">{emailData?.urgentEmails || emailData?.urgent_emails || 0}</div>
            <div className="text-xs text-muted-foreground">Urgent</div>
          </div>
        </div>
        
        {/* Summary */}
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-sm text-foreground italic">"{emailData?.summary || 'No email summary available'}"</p>
        </div>
        
        {/* Action Items */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Top Action Items
          </div>
          {emailData?.actionItems?.length > 0 || emailData?.action_items?.length > 0 ? (
            (emailData.actionItems || emailData.action_items).map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-border/50"
                onClick={() => handleEmailClick(item)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">
                      {item.from}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.subject}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <Badge className={`text-xs px-2 py-0.5 ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {item.timeEstimate || item.time_estimate}
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/70" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-3 text-center text-muted-foreground">
              No action items found
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Email Detail Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={closeEmailModal}
        title="Email Details"
      >
        {selectedEmail && (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                From
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground font-medium">
                  {selectedEmail.from}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Subject
              </div>
              <div className="text-sm text-foreground">
                {selectedEmail.subject}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  Priority
                </div>
                <Badge className={`text-xs px-2 py-0.5 ${getPriorityColor(selectedEmail.priority)}`}>
                  {selectedEmail.priority}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                  Est. Time
                </div>
                <div className="text-sm text-foreground">
                  {selectedEmail.timeEstimate || selectedEmail.time_estimate}
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Category
              </div>
              <div className="text-sm text-foreground">
                {selectedEmail.category}
              </div>
            </div>
            
            <div className="border-t border-border pt-4 mt-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">
                Suggested Action
              </div>
              <div className="text-sm text-foreground bg-muted/30 p-3 rounded-lg">
                {selectedEmail.specificDescription || `Based on the priority and content, schedule this email response during your ${selectedEmail.priority === "High" ? "morning focus time" : "afternoon admin block"} for optimal productivity.`}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function DailyReflectionSection({ reflectionData, setReflectionData, isReflectionSubmitted, setIsReflectionSubmitted }) {
  const energyLevels = ["Low", "Medium", "High"];
  const workEnvironments = ["Home", "Office", "Travel", "Mixed"];

  // Check if reflection has substantial content
  const hasSubstantialReflection = () => {
    return reflectionData.dayRating && 
           reflectionData.energyLevel && 
           reflectionData.whatHappened.trim().length > 10 &&
           reflectionData.tomorrow.topPriority.trim().length > 0;
  };

  if (isReflectionSubmitted && hasSubstantialReflection()) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Sunset className="w-12 h-12 text-accent mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              Day planned, enjoy the evening 🌅
            </h3>
            <p className="text-muted-foreground">
              Your reflection has been saved and tomorrow's priorities are set. 
              Time to unwind and prepare for a productive tomorrow.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => setIsReflectionSubmitted(false)}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Reflection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Day Review Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-3">
            <Clock className="w-5 h-5 text-accent" />
            Today's Reflection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Day Rating & Energy */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                How was today? (1-10)
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={reflectionData.dayRating}
                onChange={(e) => setReflectionData(prev => ({ ...prev, dayRating: e.target.value }))}
                className="bg-muted border-border text-foreground"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                Energy Level
              </label>
              <div className="flex gap-2">
                {energyLevels.map((level) => (
                  <Button
                    key={level}
                    variant={reflectionData.energyLevel === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReflectionData(prev => ({ ...prev, energyLevel: level }))}
                    className={reflectionData.energyLevel === level 
                      ? "bg-accent text-accent-foreground border-accent" 
                      : "border-border text-muted-foreground hover:bg-muted"
                    }
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Reflection Questions */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                What happened today?
              </label>
              <Textarea
                value={reflectionData.whatHappened}
                onChange={(e) => setReflectionData(prev => ({ ...prev, whatHappened: e.target.value }))}
                className="bg-muted border-border text-foreground min-h-[120px] resize-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                What worked well today?
              </label>
              <Textarea
                value={reflectionData.whatWorked}
                onChange={(e) => setReflectionData(prev => ({ ...prev, whatWorked: e.target.value }))}
                className="bg-muted border-border text-foreground min-h-[80px] resize-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                What drained your energy?
              </label>
              <Textarea
                value={reflectionData.whatDrained}
                onChange={(e) => setReflectionData(prev => ({ ...prev, whatDrained: e.target.value }))}
                className="bg-muted border-border text-foreground min-h-[80px] resize-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                Key insights or learnings
              </label>
              <Textarea
                value={reflectionData.keyInsights}
                onChange={(e) => setReflectionData(prev => ({ ...prev, keyInsights: e.target.value }))}
                className="bg-muted border-border text-foreground min-h-[80px] resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tomorrow's Preparation */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-3">
            <Sunrise className="w-5 h-5 text-accent" />
            Tomorrow's Preparation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top Priority */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
              What's the ONE thing that must get done tomorrow?
            </label>
            <Input
              value={reflectionData.tomorrow.topPriority}
              onChange={(e) => setReflectionData(prev => ({ 
                ...prev, 
                tomorrow: { ...prev.tomorrow, topPriority: e.target.value }
              }))}
              className="bg-muted border-border text-foreground text-lg font-medium"
            />
          </div>

          {/* Possible Tasks */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
              What tasks are candidates for tomorrow? (Projects, objectives, specific work)
            </label>
            <Textarea
              value={reflectionData.tomorrow.possibleTasks}
              onChange={(e) => setReflectionData(prev => ({ 
                ...prev, 
                tomorrow: { ...prev.tomorrow, possibleTasks: e.target.value }
              }))}
              placeholder="e.g., Echo development - frontend fixes, Grant proposal writing, Paper review for Nature, Team meeting prep, Admin tasks..."
              className="bg-muted border-border text-foreground min-h-[100px] resize-none"
            />
          </div>

          {/* Context & Environment */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                Expected Energy Level
              </label>
              <div className="flex gap-2">
                {energyLevels.map((level) => (
                  <Button
                    key={level}
                    variant={reflectionData.tomorrow.energyExpected === level ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReflectionData(prev => ({ 
                      ...prev, 
                      tomorrow: { ...prev.tomorrow, energyExpected: level }
                    }))}
                    className={reflectionData.tomorrow.energyExpected === level 
                      ? "bg-accent text-accent-foreground border-accent" 
                      : "border-border text-muted-foreground hover:bg-muted"
                    }
                  >
                    {level}
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                Work Environment
              </label>
              <div className="flex gap-2 flex-wrap">
                {workEnvironments.map((env) => (
                  <Button
                    key={env}
                    variant={reflectionData.tomorrow.workEnvironment === env ? "default" : "outline"}
                    size="sm"
                    onClick={() => setReflectionData(prev => ({ 
                      ...prev, 
                      tomorrow: { ...prev.tomorrow, workEnvironment: env }
                    }))}
                    className={reflectionData.tomorrow.workEnvironment === env 
                      ? "bg-accent text-accent-foreground border-accent" 
                      : "border-border text-muted-foreground hover:bg-muted"
                    }
                  >
                    {env}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Constraints */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                Fixed appointments & non-negotiables
              </label>
              <Textarea
                value={reflectionData.tomorrow.nonNegotiables}
                onChange={(e) => setReflectionData(prev => ({ 
                  ...prev, 
                  tomorrow: { ...prev.tomorrow, nonNegotiables: e.target.value }
                }))}
                className="bg-muted border-border text-foreground min-h-[80px] resize-none"
              />
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 block">
                What to avoid or minimize tomorrow
              </label>
              <Textarea
                value={reflectionData.tomorrow.toAvoid}
                onChange={(e) => setReflectionData(prev => ({ 
                  ...prev, 
                  tomorrow: { ...prev.tomorrow, toAvoid: e.target.value }
                }))}
                className="bg-muted border-border text-foreground min-h-[80px] resize-none"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WeeklySyncSection() {
  const [weeklyData, setWeeklyData] = useState({
    objectives: ["", "", ""],
    projectBudgets: [
      { name: "Echo Development", hours: 15 },
      { name: "Grant Proposal", hours: 5 },
      { name: "Admin & Email", hours: 3 }
    ]
  });

  return (
    <div className="space-y-8">
      {/* Weekly Objectives */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-3">
            <Target className="w-5 h-5 text-accent" />
            This Week's Key Objectives
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyData.objectives.map((objective, index) => (
            <div key={index}>
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2 block">
                Objective #{index + 1}
              </label>
              <Input
                value={objective}
                onChange={(e) => {
                  const newObjectives = [...weeklyData.objectives];
                  newObjectives[index] = e.target.value;
                  setWeeklyData(prev => ({ ...prev, objectives: newObjectives }));
                }}
                className="bg-muted border-border text-foreground"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Project Time Budget */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-accent" />
            Project Time Budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyData.projectBudgets.map((project, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="text-foreground font-medium">{project.name}</div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  value={project.hours}
                  onChange={(e) => {
                    const newBudgets = [...weeklyData.projectBudgets];
                    newBudgets[index].hours = Number(e.target.value);
                    setWeeklyData(prev => ({ ...prev, projectBudgets: newBudgets }));
                  }}
                  className="w-20 bg-card border-border text-foreground text-center"
                />
                <span className="text-xs text-muted-foreground">hours</span>
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Planned:</span>
              <span className="text-foreground font-semibold">
                {weeklyData.projectBudgets.reduce((sum, p) => sum + p.hours, 0)} hours
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Scaffold Generation */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-muted-foreground text-sm">
              Weekly planning is not fully developed in the backend yet.
            </div>
            <Button 
              disabled
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Weekly Blueprint
              <span className="text-xs ml-2">(Coming Soon)</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlanGenerationSection({ reflectionData, onPlanGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const generatePlan = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Prepare the planning request
      const planningRequest = {
        most_important: reflectionData.tomorrow.topPriority || "Complete high-priority tasks",
        todos: reflectionData.tomorrow.possibleTasks ? 
          reflectionData.tomorrow.possibleTasks.split(',').map(task => task.trim()).filter(task => task) : 
          [reflectionData.tomorrow.topPriority || "Complete outstanding work"],
        energy_level: reflectionData.tomorrow.energyExpected || "Medium",
        non_negotiables: reflectionData.tomorrow.nonNegotiables || "Morning routine, lunch break",
        avoid_today: reflectionData.tomorrow.toAvoid || "Unnecessary distractions",
        fixed_events: []
      };

      // First, save the reflection data
      const reflectionRequest = {
        day_rating: parseInt(reflectionData.dayRating) || 7,
        energy_level: reflectionData.energyLevel || "Medium",
        what_happened: reflectionData.whatHappened || "",
        what_worked: reflectionData.whatWorked || "",
        what_drained: reflectionData.whatDrained || "",
        key_insights: reflectionData.keyInsights || "",
        tomorrow_priority: reflectionData.tomorrow.topPriority || "",
        tomorrow_possible_tasks: reflectionData.tomorrow.possibleTasks || "",
        tomorrow_energy: reflectionData.tomorrow.energyExpected || "Medium",
        tomorrow_environment: reflectionData.tomorrow.workEnvironment || "Home",
        tomorrow_non_negotiables: reflectionData.tomorrow.nonNegotiables || "",
        tomorrow_avoid: reflectionData.tomorrow.toAvoid || ""
      };

      // Save reflection first
      await fetch('http://localhost:8000/reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reflectionRequest)
      });

      // Then generate the plan
      const response = await fetch('http://localhost:8000/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planningRequest)
      });

      if (!response.ok) {
        throw new Error(`Planning failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Transform the blocks for display using enricher data
      const transformedBlocks = result.blocks?.map((block, index) => ({
        id: (index + 1).toString(),
        time: `${block.start.substring(0, 5)} - ${block.end.substring(0, 5)}`,
        emoji: block.emoji || getEmojiForLabel(block.label), // Use enricher emoji or fallback
        title: block.label,
        note: block.note || '', // Include enricher note
        category: getCategoryFromLabel(block.label)
      })) || [];

      setGeneratedPlan({
        blocks: transformedBlocks,
        metadata: result
      });
      
      // Trigger the reflection submitted state
      if (onPlanGenerated) {
        onPlanGenerated();
      }
      
    } catch (err) {
      console.error('Plan generation failed:', err);
      setError(err.message);
      
      // Fallback to sample plan
      setGeneratedPlan({
        blocks: [
          { id: "1", time: "06:00 - 06:30", emoji: "☀️", title: "Personal | Morning Reading", category: "PERSONAL" },
          { id: "2", time: "06:30 - 07:00", emoji: "💪", title: "Personal | Exercise", category: "HEALTH" },
          { id: "3", time: "09:00 - 11:00", emoji: "🚀", title: "Echo Development | Planning Integration", category: "DEEP_WORK" },
          { id: "4", time: "12:00 - 12:30", emoji: "🤝", title: "Team Standup", category: "MEETINGS" },
          { id: "5", time: "14:00 - 15:00", emoji: "📞", title: "Client Call", category: "MEETINGS" },
          { id: "6", time: "15:30 - 17:30", emoji: "🔧", title: "Echo Development | Backend Wiring", category: "DEEP_WORK" }
        ]
      });
      
      // Still trigger the reflection submitted state even with fallback data
      if (onPlanGenerated) {
        onPlanGenerated();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const savePlan = async () => {
    if (!generatedPlan) return;

    setIsSaving(true);
    try {
      // In a real implementation, this would save the plan to the backend
      // For now, we'll simulate the save and navigate to the homepage
      
      // Simulate a brief save operation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to homepage (you can replace this with proper navigation)
      window.location.href = '/today';
      
    } catch (err) {
      console.error('Failed to save plan:', err);
      setError('Failed to save plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to extract emoji from labels
  const getEmojiForLabel = (label) => {
    if (label.toLowerCase().includes('morning')) return '☀️';
    if (label.toLowerCase().includes('exercise')) return '💪';
    if (label.toLowerCase().includes('development')) return '🚀';
    if (label.toLowerCase().includes('meeting')) return '🤝';
    if (label.toLowerCase().includes('call')) return '📞';
    if (label.toLowerCase().includes('lunch')) return '🍽️';
    if (label.toLowerCase().includes('personal')) return '🏠';
    return '📝';
  };

  // Helper function to determine category from label
  const getCategoryFromLabel = (label) => {
    const lower = label.toLowerCase();
    if (lower.includes('development') || lower.includes('coding') || lower.includes('programming')) return 'DEEP_WORK';
    if (lower.includes('meeting') || lower.includes('call') || lower.includes('standup')) return 'MEETINGS';
    if (lower.includes('personal') || lower.includes('morning') || lower.includes('evening')) return 'PERSONAL';
    if (lower.includes('exercise') || lower.includes('workout') || lower.includes('health')) return 'HEALTH';
    if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('meal')) return 'MEALS';
    return 'DEEP_WORK';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "DEEP_WORK": return "text-deep-work border-deep-work/30 bg-deep-work/10";
      case "MEETINGS": return "text-meetings border-meetings/30 bg-meetings/10";
      case "PERSONAL": return "text-personal border-personal/30 bg-personal/10";
      case "HEALTH": return "text-health border-health/30 bg-health/10";
      default: return "text-muted-foreground border-border bg-muted/20";
    }
  };

  return (
    <div className="space-y-6">
      {!generatedPlan ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-card-foreground">Ready to plan tomorrow?</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your reflection and preparation will be combined with email context, recent patterns, 
                  and energy trends to create an intelligent schedule.
                </p>
              </div>
              
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <p className="text-sm text-destructive">
                    Planning error: {error}. Will use fallback plan.
                  </p>
                </div>
              )}
              
              <Button
                onClick={generatePlan}
                disabled={isGenerating}
                size="lg"
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold px-8 py-3"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                    Generating Your Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-3" />
                    Generate Tomorrow's Plan
                  </>
                )}
              </Button>
              
              {isGenerating && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="animate-pulse">Saving your reflection...</div>
                  <div className="animate-pulse" style={{ animationDelay: '1s' }}>Processing email context...</div>
                  <div className="animate-pulse" style={{ animationDelay: '2s' }}>Calling AI planning engine...</div>
                  <div className="animate-pulse" style={{ animationDelay: '3s' }}>Optimizing time blocks...</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-3">
              <Calendar className="w-5 h-5 text-accent" />
              Tomorrow's Generated Plan
              <Badge className="bg-accent/20 text-accent border-accent/30">
                Preview
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {generatedPlan.blocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-xl">{block.emoji}</span>
                    <div className="flex-1">
                      <div className="text-foreground font-medium">{block.title}</div>
                      <div className="text-xs text-muted-foreground">{block.time}</div>
                      {block.note && (
                        <div className="text-xs text-accent/80 italic mt-1 bg-accent/10 px-2 py-1 rounded">
                          💡 {block.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-xs px-2 py-1 ${getCategoryColor(block.category)}`}>
                    {block.category.replace('_', ' ').toLowerCase()}
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:bg-muted"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Plan
              </Button>
              <Button
                onClick={savePlan}
                disabled={isSaving}
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold flex-1"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save & Commit Plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function PlanningPage() {
  const [activeMode, setActiveMode] = useState<PlanningMode>("daily");
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false);
  const [reflectionData, setReflectionData] = useState({
    dayRating: "",
    energyLevel: "",
    whatHappened: "",
    whatWorked: "",
    whatDrained: "",
    keyInsights: "",
    tomorrow: {
      topPriority: "",
      possibleTasks: "",
      energyExpected: "",
      workEnvironment: "",
      nonNegotiables: "",
      toAvoid: ""
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 17) {
      return "Good afternoon, Dr. Leuthold";
    } else {
      return "Good evening, Dr. Leuthold";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Warm Greeting */}
      <div className="bg-gradient-to-b from-background to-card/30 p-8 border-b border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Sunset className="w-8 h-8 text-accent" />
                <h1 className="text-3xl font-bold text-foreground">
                  {getGreeting()}
                </h1>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Time to reflect on today and prepare for tomorrow. This is your quiet strategy room.
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", { 
                  weekday: "long", 
                  year: "numeric", 
                  month: "long", 
                  day: "numeric" 
                })}
              </div>
              <div className="text-xs text-muted-foreground/70">
                {new Date().toLocaleTimeString("en-US", { 
                  hour12: true, 
                  hour: "numeric", 
                  minute: "2-digit" 
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="p-6 border-b border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg w-fit">
            <Button
              variant={activeMode === "daily" ? "default" : "ghost"}
              onClick={() => setActiveMode("daily")}
              className={activeMode === "daily" 
                ? "bg-accent text-accent-foreground font-semibold" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            >
              Daily Reflection
            </Button>
            <Button
              variant={activeMode === "weekly" ? "default" : "ghost"}
              onClick={() => setActiveMode("weekly")}
              className={activeMode === "weekly" 
                ? "bg-accent text-accent-foreground font-semibold" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            >
              Weekly Sync
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeMode === "daily" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Day Review */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-accent" />
                    Today's Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CondensedTimeline summary={mockTodaySummary} />
                </CardContent>
              </Card>
              
              <EmailSummaryPanel />
            </div>

            {/* Right Column: Reflection & Planning */}
            <div className="lg:col-span-2 space-y-8">
              <DailyReflectionSection 
                reflectionData={reflectionData}
                setReflectionData={setReflectionData}
                isReflectionSubmitted={reflectionSubmitted}
                setIsReflectionSubmitted={setReflectionSubmitted}
              />
              <PlanGenerationSection 
                reflectionData={reflectionData}
                onPlanGenerated={() => setReflectionSubmitted(true)}
              />
            </div>
          </div>
        )}

        {activeMode === "weekly" && (
          <div className="max-w-4xl mx-auto">
            <WeeklySyncSection />
          </div>
        )}
      </div>
    </div>
  );
}