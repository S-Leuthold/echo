"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Clock, 
  Target, 
  TrendingUp,
  Calendar,
  BookOpen,
  Dumbbell,
  ChefHat,
  Coffee,
  Users,
  Briefcase,
  Home,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from "lucide-react";
import { SimpleBarChart, SimpleLineChart, DonutChart } from "@/components/analytics/SimpleChart";

// Mock data generation
const generateMockAnalytics = () => {
  const categories = [
    { name: 'Deep Work', icon: Target, color: '#2F7439', hours: 247 },
    { name: 'Meetings', icon: Users, color: '#D65555', hours: 156 },
    { name: 'Reading', icon: BookOpen, color: '#7C7FF5', hours: 152 },
    { name: 'Cooking', icon: ChefHat, color: '#F49F56', hours: 89 },
    { name: 'Exercise', icon: Dumbbell, color: '#EDCF5A', hours: 78 },
    { name: 'Admin', icon: Briefcase, color: '#B8C5A1', hours: 67 },
    { name: 'Personal', icon: Home, color: '#CBC4FF', hours: 45 },
    { name: 'Planning', icon: Calendar, color: '#7C7FF5', hours: 34 },
  ];

  const projects = [
    { name: 'Academic Research Project', hours: 89, color: '#F060A9' },
    { name: 'Personal Website Redesign', hours: 67, color: '#2F7439' },
    { name: 'Home Office Setup', hours: 23, color: '#EDCF5A' },
    { name: 'Learning TypeScript', hours: 45, color: '#7C7FF5' },
    { name: 'Garden Planning', hours: 12, color: '#B8C5A1' },
  ];

  // Generate weekly data for the last 12 weeks
  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (11 - i) * 7);
    return {
      week: `Week ${i + 1}`,
      date: weekStart.toLocaleDateString(),
      deepWork: Math.floor(Math.random() * 25) + 15,
      meetings: Math.floor(Math.random() * 20) + 5,
      reading: Math.floor(Math.random() * 15) + 5,
      exercise: Math.floor(Math.random() * 8) + 2,
      total: 0
    };
  }).map(week => ({ ...week, total: week.deepWork + week.meetings + week.reading + week.exercise }));

  // Generate daily productivity heatmap data
  const heatmapData = Array.from({ length: 7 }, (_, day) => 
    Array.from({ length: 24 }, (_, hour) => ({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
      hour,
      intensity: Math.max(0, Math.random() * (day > 0 && day < 6 && hour > 8 && hour < 18 ? 1 : 0.3))
    }))
  ).flat();

  const insights = [
    {
      title: "Your most productive time",
      value: "Tuesday 10:00 AM",
      description: "You consistently do your best deep work during this window",
      trend: "+12%"
    },
    {
      title: "Reading streak",
      value: "23 days",
      description: "You've read every day this month - that's 152 hours total!",
      trend: "🔥"
    },
    {
      title: "Meeting efficiency",
      value: "1.2 hours avg",
      description: "Your meetings are getting shorter and more focused",
      trend: "-8 min"
    },
    {
      title: "Work-life balance",
      value: "62% work / 38% life",
      description: "A healthy balance between professional and personal time",
      trend: "balanced"
    }
  ];

  return {
    categories,
    projects,
    weeklyData,
    heatmapData,
    insights,
    totalHours: categories.reduce((sum, cat) => sum + cat.hours, 0),
    totalSessions: 189,
    avgSessionLength: 1.4,
    completionRate: 87
  };
};

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'all-time';

export default function AnalyticsPage() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('monthly');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('insights');

  const analytics = useMemo(() => generateMockAnalytics(), []);

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'daily', label: 'Today' },
    { value: 'weekly', label: 'This Week' },
    { value: 'monthly', label: 'This Month' },
    { value: 'quarterly', label: 'This Quarter' },
    { value: 'all-time', label: 'All Time' }
  ];

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity < 0.2) return 'bg-muted';
    if (intensity < 0.4) return 'bg-accent/20';
    if (intensity < 0.6) return 'bg-accent/40';
    if (intensity < 0.8) return 'bg-accent/60';
    return 'bg-accent/80';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Your time, reflected back
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {timeRangeOptions.map(option => (
            <Button
              key={option.value}
              variant={selectedTimeRange === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeRange(option.value)}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Reflective Summary */}
      <Card className="bg-gradient-to-r from-muted/50 to-muted/20 border-muted">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <h2 className="text-xl font-semibold text-accent">
              This month, you invested {analytics.totalHours} hours in what matters
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Time is the ultimate currency. You spent <strong>{analytics.categories[0].hours} hours</strong> in deep work, 
              <strong> {analytics.categories[2].hours} hours</strong> reading, and took care of yourself with <strong>{analytics.categories[4].hours} hours</strong> of exercise. 
              That's a life well-lived. 📚
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">Total Hours</span>
            </div>
            <div className="text-2xl font-bold mt-2">{analytics.totalHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">Sessions</span>
            </div>
            <div className="text-2xl font-bold mt-2">{analytics.totalSessions}</div>
            <p className="text-xs text-muted-foreground mt-1">87% completion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">Avg Session</span>
            </div>
            <div className="text-2xl font-bold mt-2">{analytics.avgSessionLength}h</div>
            <p className="text-xs text-muted-foreground mt-1">Sweet spot length</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">This Quarter</span>
            </div>
            <div className="text-2xl font-bold mt-2">+23%</div>
            <p className="text-xs text-muted-foreground mt-1">vs last quarter</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('insights')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold tracking-wider text-accent uppercase flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Insights
            </CardTitle>
            {expandedSection === 'insights' ? 
              <ChevronUp className="w-4 h-4" /> : 
              <ChevronDown className="w-4 h-4" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'insights' && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.insights.map((insight, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{insight.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {insight.trend}
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-accent mb-1">
                    {insight.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Categories Section */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('categories')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold tracking-wider text-accent uppercase flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Time by Category
            </CardTitle>
            {expandedSection === 'categories' ? 
              <ChevronUp className="w-4 h-4" /> : 
              <ChevronDown className="w-4 h-4" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'categories' && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Donut Chart */}
              <div className="flex justify-center">
                <DonutChart
                  data={analytics.categories.slice(0, 6).map(cat => ({
                    label: cat.name,
                    value: cat.hours,
                    color: cat.color
                  }))}
                  size={200}
                  innerRadius={0.65}
                  showLegend={false}
                />
              </div>
              
              {/* Category List */}
              <div className="space-y-3">
                {analytics.categories.map((category, idx) => {
                  const percentage = Math.round((category.hours / analytics.totalHours) * 100);
                  const Icon = category.icon;
                  
                  return (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Icon 
                          className="w-4 h-4 flex-shrink-0" 
                          style={{ color: category.color }}
                        />
                        <span className="text-sm font-medium truncate">
                          {category.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: category.color 
                            }}
                          />
                        </div>
                        
                        <div className="text-right min-w-[50px]">
                          <div className="text-sm font-semibold">
                            {category.hours}h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Projects Section */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('projects')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold tracking-wider text-accent uppercase flex items-center gap-2">
              <Target className="w-5 h-5" />
              Project Time
            </CardTitle>
            {expandedSection === 'projects' ? 
              <ChevronUp className="w-4 h-4" /> : 
              <ChevronDown className="w-4 h-4" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'projects' && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              {analytics.projects.map((project, idx) => {
                const totalProjectHours = analytics.projects.reduce((sum, p) => sum + p.hours, 0);
                const percentage = Math.round((project.hours / totalProjectHours) * 100);
                
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-sm font-medium">
                        {project.name}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {project.hours}h
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {percentage}% of project time
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Weekly Trends */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => toggleSection('trends')}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold tracking-wider text-accent uppercase flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Weekly Trends
            </CardTitle>
            {expandedSection === 'trends' ? 
              <ChevronUp className="w-4 h-4" /> : 
              <ChevronDown className="w-4 h-4" />
            }
          </div>
        </CardHeader>
        {expandedSection === 'trends' && (
          <CardContent className="pt-0">
            <div className="space-y-6">
              <SimpleLineChart
                data={analytics.weeklyData.slice(-8).map(week => ({
                  label: week.week.split(' ')[1], // Just the week number
                  value: week.total
                }))}
                height={120}
                color="#E6A86C"
                className="mb-4"
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Deep Work', key: 'deepWork', color: '#2F7439' },
                  { label: 'Meetings', key: 'meetings', color: '#D65555' },
                  { label: 'Reading', key: 'reading', color: '#7C7FF5' },
                  { label: 'Exercise', key: 'exercise', color: '#EDCF5A' }
                ].map(category => (
                  <div key={category.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {category.label}
                      </span>
                      <span className="text-xs font-bold" style={{ color: category.color }}>
                        {analytics.weeklyData[analytics.weeklyData.length - 1][category.key as keyof typeof analytics.weeklyData[0]]}h
                      </span>
                    </div>
                    <SimpleLineChart
                      data={analytics.weeklyData.slice(-6).map((week, idx) => ({
                        label: `${idx + 1}`,
                        value: week[category.key as keyof typeof week] as number
                      }))}
                      height={40}
                      color={category.color}
                      showDots={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Productivity Heatmap */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold tracking-wider text-accent uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Productivity Heatmap
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="gap-2"
            >
              {showHeatmap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showHeatmap ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        {showHeatmap && (
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Hours of the day →</span>
                <div className="flex items-center gap-2">
                  <span>Less productive</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded bg-muted" />
                    <div className="w-3 h-3 rounded bg-accent/20" />
                    <div className="w-3 h-3 rounded bg-accent/40" />
                    <div className="w-3 h-3 rounded bg-accent/60" />
                    <div className="w-3 h-3 rounded bg-accent/80" />
                  </div>
                  <span>More productive</span>
                </div>
              </div>
              
              <div className="grid gap-1 text-xs" style={{ gridTemplateColumns: 'auto repeat(24, 1fr)' }}>
                {/* Hour labels */}
                <div></div>
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="text-center text-muted-foreground text-[10px]">
                    {i % 6 === 0 ? i : ''}
                  </div>
                ))}
                
                {/* Heatmap grid */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={`row-${day}`} className="contents">
                    <div className="text-muted-foreground text-[10px] flex items-center">
                      {day}
                    </div>
                    {Array.from({ length: 24 }, (_, hour) => {
                      const dataPoint = analytics.heatmapData.find(
                        d => d.day === day && d.hour === hour
                      );
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`aspect-square rounded-sm ${getIntensityColor(dataPoint?.intensity || 0)}`}
                          title={`${day} ${hour}:00 - ${Math.round((dataPoint?.intensity || 0) * 100)}% productivity`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-4">
                Your most productive time is Tuesday mornings around 10 AM
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Quarterly Review Teaser */}
      <Card className="bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-accent mb-2">
                Your Q4 Review is almost ready! 🎉
              </h3>
              <p className="text-sm text-muted-foreground">
                We're preparing a beautiful summary of your year - all your reading, projects, and growth.
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}