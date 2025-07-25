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

interface UserConfig {
  wake_time: string;
  sleep_time: string;
  timestamp: string;
}

interface TimelineConfig {
  SCALE_FACTOR: number;
  DAY_START_MINUTES: number;
  DAY_END_MINUTES: number;
  TOTAL_DAY_DURATION: number;
  TIMELINE_HEIGHT: number;
}

// Convert time string (HH:MM) to minutes since midnight
const timeStringToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Convert 24-hour time to 12-hour format
const formatTime12Hour = (timeStr: string): string => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Calculate config-based time range with 15-minute buffers
const calculateConfigBasedTimeRange = (userConfig: UserConfig) => {
  const wakeMinutes = timeStringToMinutes(userConfig.wake_time);
  const sleepMinutes = timeStringToMinutes(userConfig.sleep_time);
  
  // Add 15-minute buffers
  const bufferedStart = wakeMinutes - 15;
  const bufferedEnd = sleepMinutes + 15;
  
  return {
    start: Math.max(0, bufferedStart),      // Don't go before midnight
    end: Math.min(24 * 60, bufferedEnd)    // Don't go past midnight next day
  };
};

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
  
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  // Fetch user config for 'today' context
  useEffect(() => {
    if (context === 'today') {
      const fetchUserConfig = async () => {
        try {
          const response = await fetch('http://localhost:8000/config');
          if (response.ok) {
            const configData = await response.json();
            setUserConfig(configData);
          } else {
            // Silently handle missing config endpoint - timeline will use defaults
            console.debug('User config endpoint not available, using timeline defaults');
          }
        } catch (error) {
          // Silently handle network errors - timeline will use defaults
          console.debug('Could not fetch user config, using timeline defaults');
        }
      };
      
      fetchUserConfig();
    }
  }, [context]);

  // Dynamic timeline calculations based on actual schedule
  useEffect(() => {
    if (context === 'today') {
      // Use config-based time range if available, otherwise fall back to dynamic calculation
      let timeRange;
      if (userConfig) {
        timeRange = calculateConfigBasedTimeRange(userConfig);
      } else {
        // Fallback to dynamic calculation for backward compatibility
        timeRange = calculateOptimalTimeRange(schedule);
      }
      
      const DAY_START_MINUTES = timeRange.start;
      const DAY_END_MINUTES = timeRange.end;
      const TOTAL_DAY_DURATION = DAY_END_MINUTES - DAY_START_MINUTES;
      
      // Account for all space consumption: title + container borders
      const titleSpace = 24; // "Today's Schedule" title (mb-6 = 24px)
      const containerBorders = 2; // border-border top + bottom (1px each)
      const totalReservedSpace = titleSpace + containerBorders;
      
      // Use availableHeight if provided and reasonable, otherwise calculate from viewport
      const finalAvailableHeight = (availableHeight && availableHeight > 200) 
        ? availableHeight 
        : window.innerHeight - 128; // Fallback: viewport minus header space
        
      const usableHeight = Math.max(finalAvailableHeight - totalReservedSpace, 700);
      
      
      
      // Calculate perfect-fit scale factor based on actual schedule needs
      const rawScaleFactor = usableHeight / TOTAL_DAY_DURATION;
      
      // Ensure we can show 5:00 AM to 10:30 PM (17.5 hours = 1050 minutes)
      // Calculate scale to fit this range in available height
      const targetRange = 17.5 * 60; // 1050 minutes from 5:00 AM to 10:30 PM
      const targetScaleFactor = usableHeight / targetRange;
      
      // Use calculated scale factor, minimum 0.6px/min for tight fit
      const SCALE_FACTOR = Math.max(0.6, Math.min(targetScaleFactor, 2.5));
      const TIMELINE_HEIGHT = TOTAL_DAY_DURATION * SCALE_FACTOR;
      
      console.log('Timeline sizing:', {
        usableHeight,
        dayDuration: TOTAL_DAY_DURATION,
        targetRange,
        scaleFactor: SCALE_FACTOR,
        finalHeight: TIMELINE_HEIGHT
      });
      
      
      // Dynamic timeline configuration completed
      
      setConfig({
        SCALE_FACTOR,
        DAY_START_MINUTES,
        DAY_END_MINUTES,
        TOTAL_DAY_DURATION,
        TIMELINE_HEIGHT
      });
    } else if (context === 'planning') {
      // For planning context, use simpler default configuration
      setConfig({
        SCALE_FACTOR: 2,
        DAY_START_MINUTES: 6 * 60, // 6:00 AM
        DAY_END_MINUTES: 22 * 60,  // 10:00 PM
        TOTAL_DAY_DURATION: 16 * 60, // 16 hours
        TIMELINE_HEIGHT: 1920 // 16 hours * 2px/min * 60min/hr
      });
    }
  }, [context, availableHeight, userConfig, schedule]); // Re-added schedule for proper recalculation

  if (!schedule || schedule.length === 0) return null;

  // Calculate vertical position for perfect alignment with time grid
  const getBlockTop = (startMinutes: number) => {
    return (startMinutes - config.DAY_START_MINUTES) * config.SCALE_FACTOR;
  };

  // Calculate block height from duration - more accommodating for shorter blocks
  const getBlockHeight = (durationMinutes: number) => {
    const calculatedHeight = durationMinutes * config.SCALE_FACTOR;
    // More generous minimum heights for better readability
    if (durationMinutes <= 15) return Math.max(calculatedHeight, 20); // Very short blocks
    if (durationMinutes <= 30) return Math.max(calculatedHeight, 28); // Short blocks  
    return Math.max(calculatedHeight, 32); // Medium and tall blocks
  };

  // Current time position for today context
  const getCurrentTimePosition = () => {
    if (context !== 'today') return null;
    
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    if (currentMinutes < config.DAY_START_MINUTES || currentMinutes > config.DAY_END_MINUTES) {
      return null;
    }
    
    return getBlockTop(currentMinutes);
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

  // Tier system for different block heights - optimized for consistent timeline range
  const getTier = (duration: number) => {
    if (duration >= 60) return 'tall'; // >= 60 minutes - full info with times
    if (duration > 30) return 'medium'; // 31-59 minutes - title only, no times
    if (duration > 15) return 'short'; // 16-30 minutes - title only, no times
    return 'tiny'; // <= 15 minutes - very compact title only
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
            {(() => {
              // Generate hour marks from 5 AM to 11 PM to ensure full visibility
              const startHour = 5;  // Always start at 5 AM
              const endHour = 23;   // Always end at 11 PM (to show 10:30 PM)
              const hourMarkers = [];
              
              
              for (let hour = startHour; hour <= endHour; hour++) {
                const totalMinutes = hour * 60;
                // Show all hours from 5 AM to 11 PM for full visibility
                if (hour >= 5 && hour <= 23) {
                  const top = getBlockTop(totalMinutes);
                  
                  let timeLabel = '';
                  if (hour === 0) {
                    timeLabel = '12 AM';
                  } else if (hour < 12) {
                    timeLabel = `${hour} AM`;
                  } else if (hour === 12) {
                    timeLabel = '12 PM';
                  } else {
                    timeLabel = `${hour - 12} PM`;
                  }
                  
                      
                  hourMarkers.push(
                    <div key={`hour-${hour}`} className="absolute left-0 right-0 flex items-center" style={{ top: `${top}px` }}>
                      <div className="text-xs w-16 text-right pr-2 text-muted-foreground font-medium">
                        {timeLabel}
                      </div>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>
                  );
                  
                  // Add subtle 30-minute marks
                  const halfHourMinutes = totalMinutes + 30;
                  if (halfHourMinutes <= config.DAY_END_MINUTES) {
                    const halfHourTop = getBlockTop(halfHourMinutes);
                    hourMarkers.push(
                      <div key={`half-${hour}`} className="absolute left-0 right-0 flex items-center" style={{ top: `${halfHourTop}px` }}>
                        <div className="w-16" />
                        <div className="flex-1 h-px bg-border/10" />
                      </div>
                    );
                  }
                }
              }
              
              return hourMarkers;
            })()}
            
            
            {/* Schedule blocks */}
            {schedule.map((block, index) => {
              const duration = block.endMinutes - block.startMinutes;
              const tier = getTier(duration);
              const configCategory = mapToConfigCategory(block.timeCategory, block.label);
              const borderColor = getCategoryBorderColor(configCategory);
              const accentColor = getCategoryAccentColor(configCategory);
              
              // Mathematical positioning - perfect alignment with time grid
              const blockTop = getBlockTop(block.startMinutes);
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
                      className={`absolute left-20 right-2 rounded-md cursor-pointer transition-all hover:shadow-md ${blockStyle}`}
                      style={{ 
                        top: `${blockTop}px`,
                        height: `${blockHeight}px`,
                        padding: duration > 60 ? '8px 12px' : duration > 30 ? '6px 10px' : '4px 8px',
                        zIndex: 10 + index // Prevent overlaps with stacking instead of offset
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
                              {formatTime12Hour(block.startTime)} - {formatTime12Hour(block.endTime)}
                            </div>
                          </div>
                        )}
                        
                        {tier === 'medium' && (
                          <div className="flex items-center gap-1 justify-start w-full text-foreground">
                            <IconComponent size={12} className={`flex-shrink-0 ${accentColor}`} />
                            <span className="font-medium text-xs truncate text-left">{block.label}</span>
                          </div>
                        )}
                        
                        {tier === 'short' && (
                          <div className="flex items-center gap-1 justify-start w-full text-foreground">
                            <IconComponent size={10} className={`flex-shrink-0 ${accentColor}`} />
                            <span className="font-medium text-xs truncate text-left">{block.label}</span>
                          </div>
                        )}
                        
                        {tier === 'tiny' && (
                          <div className="flex items-center justify-start w-full text-foreground">
                            <span className="font-medium text-xs truncate text-left">{block.label}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-black">{block.label}</p>
                        <p className="text-xs text-black">
                          {formatTime12Hour(block.startTime)} - {formatTime12Hour(block.endTime)} ({block.duration})
                        </p>
                        {block.isConfigBlock && (
                          <p className="text-xs text-black">📌 Config Block</p>
                        )}
                        {context === 'today' && block.state === 'active' && (
                          <p className="text-xs text-black font-medium">⚡ Currently Active</p>
                        )}
                      </div>
                      
                      {/* Show reasoning or description */}
                      {block.note && (
                        <div>
                          <p className="text-xs font-medium text-black mb-1">
                            {block.isConfigBlock ? "Description:" : "AI Reasoning:"}
                          </p>
                          <p className="text-xs text-black leading-relaxed">
                            {block.note}
                          </p>
                        </div>
                      )}
                      
                      {/* Show rationale if different from note */}
                      {block.rationale && block.rationale !== block.note && (
                        <div>
                          <p className="text-xs font-medium text-black mb-1">Context:</p>
                          <p className="text-xs text-black italic">
                            {block.rationale}
                          </p>
                        </div>
                      )}
                      
                      {/* Fallback description */}
                      {!block.note && !block.rationale && (
                        <p className="text-xs text-black italic">
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