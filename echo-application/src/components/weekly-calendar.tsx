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

const getCategoryColor = (category: string) => {
  const colorMap: { [key: string]: string } = {
    'deep_work': 'bg-deep-work-active',
    'shallow_work': 'bg-shallow-work-active', 
    'meetings': 'bg-meetings-active',
    'personal': 'bg-personal-active',
    'health': 'bg-health-active',
    'rest': 'bg-rest-active',
    'admin': 'bg-admin-active',
    'work': 'bg-work-active',
    'exercise': 'bg-exercise-active',
    'learning': 'bg-learning-active',
    'research': 'bg-research-active',
    'writing': 'bg-writing-active',
    'planning': 'bg-planning-active',
    'social': 'bg-social-active',
    'meals': 'bg-meals-active'
  };
  return colorMap[category.toLowerCase()] || 'bg-muted';
};

// Function to determine if a color is light or dark
const isLightColor = (color: string) => {
  // Extract RGB values from category colors for brightness calculation
  const colorMap: { [key: string]: [number, number, number] } = {
    'deep_work': [47, 116, 57], // #2F7439
    'shallow_work': [184, 197, 161], // #B8C5A1
    'meetings': [213, 85, 85], // #D65555
    'personal': [203, 196, 255], // #CBC4FF
    'health': [237, 207, 90], // #EDCF5A
    'rest': [133, 144, 160], // #8590A0
    'admin': [184, 197, 161], // #B8C5A1
    'work': [184, 197, 161], // #B8C5A1
    'exercise': [237, 207, 90], // #EDCF5A
    'learning': [47, 116, 57], // #2F7439
    'research': [240, 96, 169], // #F060A9
    'writing': [47, 116, 57], // #2F7439
    'planning': [124, 127, 245], // #7C7FF5
    'social': [203, 196, 255], // #CBC4FF
    'meals': [244, 159, 86] // #F49F56
  };
  
  const rgb = colorMap[color.toLowerCase()];
  if (!rgb) return false; // Default to dark text for unknown colors
  
  // Calculate relative luminance
  const [r, g, b] = rgb.map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5; // Light if luminance > 0.5
};

const getTextColor = (category: string) => {
  return isLightColor(category) ? 'text-black' : 'text-white';
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
    const startMinutes = timeToMinutes(block.start_time);
    const endMinutes = startMinutes + block.duration;
    const endTime = minutesToTime(endMinutes);
    
    // Calculate position and height (starting from 5 AM)
    const startPosition = ((startMinutes - (5 * 60)) / 30) * 2.5; // 2.5rem per 30-min slot for smaller view
    const heightRem = (block.duration / 30) * 2.5; // 2.5rem per 30 minutes
    
    // Get the appropriate icon
    const { icon: IconComponent } = IconResolutionService.resolveIcon(block.name, block.category);
    
    // Determine display tier based on duration
    const getTier = (duration: number) => {
      if (duration > 60) return 'tall'; // Tier 1: > 60 minutes
      if (duration > 30) return 'medium'; // Tier 2: 31-60 minutes
      return 'short'; // Tier 3: <= 30 minutes
    };
    
    const tier = getTier(block.duration);
    const displayTimeRange = `${block.start_time} - ${endTime.replace(/^0/, '')}`;
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    
    const formattedTimeRange = `${formatTime(block.start_time)} - ${formatTime(endTime)}`;
    
    return (
      <Tooltip key={`${block.id}-${dayIndex}`}>
        <TooltipTrigger asChild>
          <div
            className={`group absolute left-1 right-1 rounded-md cursor-pointer transition-all hover:shadow-lg hover:shadow-accent/25 hover:scale-[1.02] hover:brightness-110 z-10 ${getCategoryColor(block.category)} border border-border/30`}
            style={{
              top: `${startPosition}rem`,
              height: `${heightRem}rem`,
              minHeight: '2rem',
              padding: tier === 'short' ? '0.25rem' : '0.5rem'
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
              <div className={`flex items-center gap-1 mb-1 ${getTextColor(block.category)}`}>
                <IconComponent size={12} className="flex-shrink-0" />
                <span className="font-medium text-xs truncate text-left">{block.name}</span>
              </div>
              {/* Bottom line: Time range */}
              <div className={`text-xs opacity-80 text-left ${getTextColor(block.category)}`}>
                {displayTimeRange}
              </div>
            </div>
          )}
          
          {tier === 'medium' && (
            <div className={`flex items-center gap-1.5 justify-start w-full ${getTextColor(block.category)}`}>
              <IconComponent size={14} className="flex-shrink-0" />
              <span className="font-medium text-xs truncate text-left">{block.name}</span>
            </div>
          )}
          
          {tier === 'short' && (
            <div className={`flex items-center gap-1 justify-start w-full ${getTextColor(block.category)}`}>
              <IconComponent size={12} className="flex-shrink-0" />
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
                className={`h-10 flex items-center justify-end pr-2 text-xs text-muted-foreground border-r border-border/30`}
              >
                {index % 2 === 0 && slot.displayTime}
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