"use client";

import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

// Enhanced PlanTimeline with perfect-fit calculations and today context support
interface PlanTimelineProps {
  schedule: any[];
  context?: 'planning' | 'today';
  availableHeight?: number; // For perfect-fit calculations in today context
  currentTime?: Date; // For real-time features in today context
}

interface TimelineConfig {
  SCALE_FACTOR: number;
  DAY_START_MINUTES: number;
  DAY_END_MINUTES: number;
  TOTAL_DAY_DURATION: number;
  TIMELINE_HEIGHT: number;
}

// Dynamic schedule analysis function - calculates optimal time range from actual schedule
const calculateOptimalTimeRange = (schedule: any[]) => {
  // Fallback for empty or invalid schedule
  if (!schedule?.length) {
    return { 
      start: 6 * 60,   // 6:00 AM fallback
      end: 22 * 60     // 10:00 PM fallback
    };
  }
  
  // Extract actual time bounds from schedule
  const startTimes = schedule.map(block => block.startMinutes).filter(time => typeof time === 'number');
  const endTimes = schedule.map(block => block.endMinutes).filter(time => typeof time === 'number');
  
  if (startTimes.length === 0 || endTimes.length === 0) {
    return { start: 6 * 60, end: 22 * 60 }; // Fallback
  }
  
  const earliestEvent = Math.min(...startTimes);
  const latestEvent = Math.max(...endTimes);
  
  // Apply 15-minute buffers
  const bufferedStart = earliestEvent - 15;
  const bufferedEnd = latestEvent + 15;
  
  // Round to half-hour boundaries for clean display
  const roundedStart = Math.floor(bufferedStart / 30) * 30;
  const roundedEnd = Math.ceil(bufferedEnd / 30) * 30;
  
  // Ensure minimum 2-hour window
  const minDuration = 2 * 60; // 2 hours
  if (roundedEnd - roundedStart < minDuration) {
    const midpoint = (roundedStart + roundedEnd) / 2;
    return {
      start: midpoint - minDuration / 2,
      end: midpoint + minDuration / 2
    };
  }
  
  return { 
    start: Math.max(0, roundedStart),      // Don't go before midnight
    end: Math.min(24 * 60, roundedEnd)    // Don't go past midnight next day
  };
};

export function PlanTimeline({ 
  schedule, 
  context = 'planning',
  availableHeight,
  currentTime = new Date()
}: PlanTimelineProps) {
  const [config, setConfig] = useState<TimelineConfig>({
    SCALE_FACTOR: 2,
    DAY_START_MINUTES: 5 * 60, // 5:00 AM
    DAY_END_MINUTES: 22 * 60,  // 10:00 PM
    TOTAL_DAY_DURATION: 17 * 60, // 17 hours = 1020 minutes
    TIMELINE_HEIGHT: 2040 // Default height
  });

  // Dynamic timeline calculations based on actual schedule
  useEffect(() => {
    if (context === 'today' && availableHeight && availableHeight > 0) {
      // Calculate optimal time range from actual schedule data
      const timeRange = calculateOptimalTimeRange(schedule);
      const DAY_START_MINUTES = timeRange.start;
      const DAY_END_MINUTES = timeRange.end;
      const TOTAL_DAY_DURATION = DAY_END_MINUTES - DAY_START_MINUTES;
      
      // Reserve space for title and padding
      const headerSpace = 40; // For "Today's Schedule" title + margins
      const usableHeight = Math.max(availableHeight - headerSpace, 700);
      
      // Calculate perfect-fit scale factor based on actual schedule needs
      const rawScaleFactor = usableHeight / TOTAL_DAY_DURATION;
      // Ensure scale factor is reasonable: minimum 0.5px/min, maximum 4px/min
      const SCALE_FACTOR = Math.max(0.5, Math.min(rawScaleFactor, 4));
      const TIMELINE_HEIGHT = TOTAL_DAY_DURATION * SCALE_FACTOR;
      
      // Dynamic timeline configuration completed
      
      setConfig({
        SCALE_FACTOR,
        DAY_START_MINUTES,
        DAY_END_MINUTES,
        TOTAL_DAY_DURATION,
        TIMELINE_HEIGHT
      });
    }
  }, [context, availableHeight, schedule]); // Added schedule dependency for dynamic updates

  if (!schedule || schedule.length === 0) return null;

  // Calculate vertical position with collision buffer
  const getBlockTop = (startMinutes: number, blockIndex: number) => {
    const baseTop = (startMinutes - config.DAY_START_MINUTES) * config.SCALE_FACTOR;
    // Add small buffer for blocks to prevent overlaps
    const bufferOffset = blockIndex * 2;
    return baseTop + bufferOffset;
  };

  // Calculate block height from duration
  const getBlockHeight = (durationMinutes: number) => {
    return Math.max(durationMinutes * config.SCALE_FACTOR, 24); // Minimum 24px height
  };

  // Current time position for today context
  const getCurrentTimePosition = () => {
    if (context !== 'today') return null;
    
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    if (currentMinutes < config.DAY_START_MINUTES || currentMinutes > config.DAY_END_MINUTES) {
      return null;
    }
    
    return getBlockTop(currentMinutes, 0);
  };

  // Map time categories to config categories
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

  // Tier system for different block heights
  const getTier = (duration: number) => {
    if (duration > 60) return 'tall'; // > 60 minutes
    if (duration >= 30) return 'medium'; // 30+ minutes
    return 'short'; // < 30 minutes
  };

  // Category border colors - using existing -active classes for consistency
  const getCategoryBorderColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'deep_work': 'border-deep-work-active',
      'shallow_work': 'border-shallow-work-active', 
      'meetings': 'border-meetings-active',
      'personal': 'border-personal-active',
      'health': 'border-health-active',
      'meals': 'border-meals-active',
      'planning': 'border-planning-active',
      'research': 'border-research-active',
      'admin': 'border-admin-active',
      'work': 'border-work-active',
      'exercise': 'border-exercise-active',
      'learning': 'border-learning-active',
      'writing': 'border-writing-active',
      'social': 'border-social-active',
      'rest': 'border-rest-active'
    };
    return colorMap[category.toLowerCase()] || 'border-muted';
  };

  // Category accent colors - using existing -active classes for consistency
  const getCategoryAccentColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'deep_work': 'text-deep-work-active',
      'shallow_work': 'text-shallow-work-active', 
      'meetings': 'text-meetings-active',
      'personal': 'text-personal-active',
      'health': 'text-health-active',
      'meals': 'text-meals-active',
      'planning': 'text-planning-active',
      'research': 'text-research-active',
      'admin': 'text-admin-active',
      'work': 'text-work-active',
      'exercise': 'text-exercise-active',
      'learning': 'text-learning-active',
      'writing': 'text-writing-active',
      'social': 'text-social-active',
      'rest': 'text-rest-active'
    };
    return colorMap[category.toLowerCase()] || 'text-muted-foreground';
  };

  const currentTimeTop = getCurrentTimePosition();

  return (
    <TooltipProvider>
      <div className="relative">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          {context === 'today' ? "Today's Schedule" : "Your Intelligent Schedule"}
        </h2>
        
        {/* Timeline container - scrollable for planning, perfect-fit for today */}
        <div className={`relative ${
          context === 'planning' 
            ? 'h-[65vh] overflow-y-auto' 
            : 'overflow-hidden'
        } border border-border rounded-lg bg-muted/20`}>
          <div className="relative" style={{ height: config.TIMELINE_HEIGHT }}>
            {/* Timeline line */}
            <div className="absolute left-4 top-2 w-0.5 bg-border" style={{ height: `${config.TIMELINE_HEIGHT - 4}px` }} />
            
            {/* Current time indicator for today context */}
            {context === 'today' && currentTimeTop !== null && (
              <div 
                className="absolute left-0 right-0 flex items-center z-20"
                style={{ top: `${currentTimeTop}px` }}
              >
                <div className="w-2 h-2 bg-accent rounded-full" />
                <div className="flex-1 h-0.5 bg-accent ml-2" />
                <div className="text-xs text-accent font-mono ml-2">
                  {currentTime.toLocaleTimeString("en-US", { 
                    hour12: false, 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </div>
              </div>
            )}
            
            {/* Time markers - hourly labels only, subtle 30-min marks */}
            {Array.from({ length: Math.ceil((config.DAY_END_MINUTES - config.DAY_START_MINUTES) / 30) + 1 }, (_, i) => {
              const totalMinutes = config.DAY_START_MINUTES + (i * 30);
              const hour = Math.floor(totalMinutes / 60);
              const minute = totalMinutes % 60;
              
              if (totalMinutes > config.DAY_END_MINUTES) return null; // Stop at configured end time
              
              const top = getBlockTop(totalMinutes, 0);
              const isHourMark = minute === 0;
              
              // Only show time labels for hour marks
              const timeLabel = isHourMark ? (
                hour >= 12 ? 
                  `${hour > 12 ? hour - 12 : hour} PM` : 
                  `${hour} AM`
              ) : '';
              
              return (
                <div key={`${hour}-${minute}`} className="absolute left-0 right-0 flex items-center" style={{ top: `${top}px` }}>
                  <div className={`text-xs w-16 text-right pr-2 ${
                    isHourMark ? 'text-muted-foreground font-medium' : ''
                  }`}>
                    {timeLabel}
                  </div>
                  <div className={`flex-1 h-px ml-2 ${
                    isHourMark ? 'bg-border/30' : 'bg-border/10'
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
              
              // Mathematical positioning
              const blockTop = getBlockTop(block.startMinutes, index);
              const blockHeight = getBlockHeight(duration);
              
              // Outline-based styling matching WeeklyCalendar
              let blockStyle = `bg-card/80 border-2 ${borderColor} border-solid hover:bg-card/90`;
              
              if (context === 'today' && block.state) {
                switch (block.state) {
                  case 'active':
                    blockStyle = `bg-accent/10 border-2 border-accent border-solid shadow-lg shadow-accent/20`;
                    break;
                  case 'completed':
                    blockStyle = `bg-card/50 border-2 ${borderColor} border-solid opacity-75`;
                    break;
                  case 'upcoming':
                    blockStyle = `bg-card/80 border-2 ${borderColor} border-solid hover:bg-card/90`;
                    break;
                }
              }
              
              const IconComponent = block.icon;
              
              return (
                <Tooltip key={block.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute left-20 right-4 rounded-md cursor-pointer transition-all hover:shadow-md z-10 ${blockStyle}`}
                      style={{ 
                        top: `${blockTop}px`,
                        height: `${blockHeight}px`,
                        padding: duration >= 30 ? '8px 12px' : '4px 8px'
                      }}
                    >
                      {/* Tiered content based on duration */}
                      <div className="h-full flex items-center overflow-hidden">
                        {tier === 'tall' && (
                          <div className="flex flex-col justify-center w-full">
                            <div className="flex items-center gap-1 mb-1 text-foreground">
                              <IconComponent size={12} className={`flex-shrink-0 ${accentColor}`} />
                              <span className="font-medium text-xs truncate text-left">{block.label}</span>
                            </div>
                            <div className="text-xs opacity-70 text-left text-foreground">
                              {block.startTime} - {block.endTime}
                            </div>
                          </div>
                        )}
                        
                        {tier === 'medium' && (
                          <div className="flex flex-col justify-center w-full">
                            <div className="flex items-center gap-1 mb-0.5 text-foreground">
                              <IconComponent size={12} className={`flex-shrink-0 ${accentColor}`} />
                              <span className="font-medium text-xs truncate text-left">{block.label}</span>
                            </div>
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
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium">{block.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {block.startTime} - {block.endTime} ({block.duration})
                        </p>
                        {block.isConfigBlock && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">📌 Config Block</p>
                        )}
                        {context === 'today' && block.state === 'active' && (
                          <p className="text-xs text-accent font-medium">⚡ Currently Active</p>
                        )}
                      </div>
                      
                      {/* Show reasoning or description */}
                      {block.note && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            {block.isConfigBlock ? "Description:" : "AI Reasoning:"}
                          </p>
                          <p className="text-xs text-foreground leading-relaxed">
                            {block.note}
                          </p>
                        </div>
                      )}
                      
                      {/* Show rationale if different from note */}
                      {block.rationale && block.rationale !== block.note && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Context:</p>
                          <p className="text-xs text-muted-foreground italic">
                            {block.rationale}
                          </p>
                        </div>
                      )}
                      
                      {/* Fallback description */}
                      {!block.note && !block.rationale && (
                        <p className="text-xs text-muted-foreground italic">
                          {block.isConfigBlock 
                            ? "Part of your daily routine" 
                            : context === 'today' 
                              ? "Scheduled time block"
                              : "AI-generated time block"}
                        </p>
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