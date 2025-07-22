"use client";

import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X } from "lucide-react";
import { IconResolutionService } from "@/lib/icon-resolution";

export interface CalendarBlock {
  id: string;
  name: string;
  type: 'anchor' | 'fixed' | 'flex';
  start_time: string;
  duration: number; // minutes
  category: string;
  days: string[];
  description?: string;
  preferred_time?: string; // For flex blocks
}

interface WeeklyCalendarProps {
  blocks: CalendarBlock[];
  onBlockClick?: (block: CalendarBlock) => void;
  onBlockDelete?: (blockId: string) => void;
  onTimeSlotClick?: (day: string, time: string) => void;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Generate time slots from 5 AM to 10 PM in 30-minute increments
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 5; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push({
        time: timeStr,
        displayTime: hour >= 12 ? 
          `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} PM` : 
          `${hour}:${minute.toString().padStart(2, '0')} AM`
      });
    }
  }
  return slots;
};

// Updated to use outline-based styling instead of solid fills
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

// Get category accent color for icons and text
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

// For outline-based blocks, we use consistent foreground text with category accent colors
const getTextColor = () => {
  return 'text-foreground'; // Use theme foreground color for consistency
};

// Removed block type icons for cleaner calendar view

const timeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export function WeeklyCalendar({ blocks, onBlockClick, onBlockDelete, onTimeSlotClick }: WeeklyCalendarProps) {
  const timeSlots = generateTimeSlots();
  // const startMinutes = 6 * 60; // 6 AM
  // const slotHeightMinutes = 30;

  // Organize blocks by day
  const blocksByDay: { [day: string]: CalendarBlock[] } = {};
  DAY_KEYS.forEach(day => {
    blocksByDay[day] = blocks.filter(block => block.days.includes(day));
  });

  const renderBlock = (block: CalendarBlock, dayIndex: number) => {
    // Use preferred_time for flex blocks, start_time for others
    const displayTime = block.type === 'flex' && block.preferred_time ? block.preferred_time : block.start_time;
    const startMinutes = timeToMinutes(displayTime);
    const endMinutes = startMinutes + block.duration;
    const endTime = minutesToTime(endMinutes);
    
    // Calculate position and height (starting from 5 AM) - precise to avoid collisions
    const minutesFromStart = startMinutes - (5 * 60); // Minutes since 5 AM
    const startPosition = (minutesFromStart / 30) * 2.5; // 2.5rem per 30-min slot
    const heightRem = (block.duration / 30) * 2.5 - 0.125; // Subtract small gap between blocks
    
    // Get the appropriate icon
    const { icon: IconComponent } = IconResolutionService.resolveIcon(block.name, block.category);
    
    // Determine display tier based on duration
    const getTier = (duration: number) => {
      if (duration > 60) return 'tall'; // Tier 1: > 60 minutes
      if (duration > 30) return 'medium'; // Tier 2: 31-60 minutes
      return 'short'; // Tier 3: <= 30 minutes
    };
    
    const tier = getTier(block.duration);
    const displayTimeRange = `${displayTime} - ${endTime.replace(/^0/, '')}`;
    
    const formatTime = (time: string) => {
      if (!time || typeof time !== 'string') return '12:00 PM'; // Fallback for invalid time
      
      const timeParts = time.split(':');
      if (timeParts.length !== 2) return '12:00 PM'; // Fallback for malformed time
      
      const [hours, minutes] = timeParts.map(Number);
      if (isNaN(hours) || isNaN(minutes)) return '12:00 PM'; // Fallback for non-numeric values
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    
    const formattedTimeRange = `${formatTime(displayTime)} - ${formatTime(endTime)}`;
    
    return (
      <Tooltip key={`${block.id}-${dayIndex}`}>
        <TooltipTrigger asChild>
          <div
            className={`group absolute left-0 right-0 rounded-sm cursor-pointer transition-all hover:shadow-sm z-10 bg-card/80 border-2 ${getCategoryBorderColor(block.category)} hover:bg-card/90 ${block.type === 'flex' ? 'border-dashed' : 'border-solid'}`}
            style={{
              top: `${startPosition}rem`,
              height: `${heightRem}rem`,
              minHeight: '2rem',
              padding: '0.375rem' // Consistent padding for all blocks
            }}
            onClick={() => onBlockClick?.(block)}
          >
        {/* Delete button - appears on hover */}
        {onBlockDelete && (
          <button
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white hover:text-red-300 z-20 w-4 h-4 flex items-center justify-center rounded-full bg-black/50 hover:bg-red-500/70"
            onClick={(e) => {
              e.stopPropagation();
              onBlockDelete(block.id);
            }}
            title="Delete block"
          >
            <X size={10} />
          </button>
        )}
        
        {/* Responsive content based on tier */}
        <div className="h-full flex items-center overflow-hidden" style={{ paddingRight: onBlockDelete ? '1.5rem' : '0' }}>
          {tier === 'tall' && (
            <div className="flex flex-col justify-center w-full">
              {/* Top line: Icon + Title */}
              <div className={`flex items-center gap-1 mb-1 ${getTextColor()}`}>
                <IconComponent size={12} className={`flex-shrink-0 ${getCategoryAccentColor(block.category)}`} />
                <span className="font-medium text-xs truncate text-left">{block.name}</span>
              </div>
              {/* Bottom line: Time range */}
              <div className={`text-xs opacity-70 text-left ${getTextColor()}`}>
                {displayTimeRange}
              </div>
            </div>
          )}
          
          {tier === 'medium' && (
            <div className={`flex items-center gap-1.5 justify-start w-full ${getTextColor()}`}>
              <IconComponent size={14} className={`flex-shrink-0 ${getCategoryAccentColor(block.category)}`} />
              <span className="font-medium text-xs truncate text-left">{block.name}</span>
            </div>
          )}
          
          {tier === 'short' && (
            <div className={`flex items-center gap-1 justify-start w-full ${getTextColor()}`}>
              <IconComponent size={12} className={`flex-shrink-0 ${getCategoryAccentColor(block.category)}`} />
              <span 
                className="font-medium text-xs truncate text-left"
                style={{ 
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' 
                }}
              >
                {block.name}
              </span>
            </div>
          )}
        </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-card border-border text-foreground">
          <div className="space-y-1">
            <div className="font-semibold">{block.name}</div>
            <div className="text-xs text-muted-foreground">{formattedTimeRange}</div>
            <div className="text-xs text-muted-foreground capitalize">{block.category} • {block.duration} minutes</div>
            {block.description && (
              <div className="text-xs text-muted-foreground mt-1">{block.description}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Card className="p-4 h-full">
      <div className="grid grid-cols-8 gap-2 h-full overflow-y-auto">
        {/* Time column */}
        <div className="col-span-1">
          <div className="h-12 flex items-center justify-center font-medium text-sm">
            Time
          </div>
          <div className="space-y-0">
            {timeSlots.map((slot, index) => (
              <div
                key={slot.time}
                className={`h-10 flex items-center justify-end pr-2 text-xs border-r border-border/30 ${
                  index % 2 === 0 ? 'text-muted-foreground font-medium' : 'text-muted-foreground/70'
                }`}
              >
                {slot.displayTime}
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="col-span-1 border-r border-border last:border-r-0">
            {/* Day header */}
            <div className="h-12 flex items-center justify-center font-medium text-sm bg-muted/50 rounded-t-md">
              {day}
            </div>
            
            {/* Time slots for this day */}
            <div className="relative">
              {timeSlots.map((slot, slotIndex) => (
                <div
                  key={`${day}-${slot.time}`}
                  className={`h-10 cursor-pointer hover:bg-accent/20 transition-all duration-200 relative group ${
                    slotIndex % 2 === 0 ? 'border-b border-border/30' : 'border-b border-dotted border-border/15'
                  }`}
                  onClick={() => onTimeSlotClick?.(DAY_KEYS[dayIndex], slot.time)}
                  title={`Add block at ${day} ${slot.displayTime}`}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-4 h-4 rounded-full bg-accent/80 flex items-center justify-center">
                      <span className="text-xs text-white font-bold">+</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Render blocks for this day */}
              {blocksByDay[DAY_KEYS[dayIndex]]?.map(block => 
                renderBlock(block, dayIndex)
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}