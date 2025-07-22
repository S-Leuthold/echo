"use client";

import { Card } from "@/components/ui/card";

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
    'work': 'bg-shallow-work-active',
    'exercise': 'bg-health-active',
    'learning': 'bg-deep-work-active',
    'research': 'bg-deep-work-active',
    'writing': 'bg-deep-work-active',
    'planning': 'bg-admin-active',
    'social': 'bg-personal-active',
    'meals': 'bg-health-active'
  };
  return colorMap[category.toLowerCase()] || 'bg-muted';
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

export function WeeklyCalendar({ blocks, onBlockClick, onTimeSlotClick }: WeeklyCalendarProps) {
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
    
    // Calculate position and height (starting from 5 AM)
    const startPosition = ((startMinutes - (5 * 60)) / 30) * 2.5; // 2.5rem per 30-min slot for smaller view
    const heightRem = (block.duration / 30) * 2.5; // 2.5rem per 30 minutes
    
    return (
      <div
        key={`${block.id}-${dayIndex}`}
        className={`absolute left-1 right-1 rounded-md p-2 text-xs cursor-pointer transition-all hover:shadow-md hover:scale-105 z-10 ${getCategoryColor(block.category)} border border-white/20`}
        style={{
          top: `${startPosition}rem`,
          height: `${heightRem}rem`,
          minHeight: '2rem'
        }}
        onClick={() => onBlockClick?.(block)}
        title={`${block.name} (${block.start_time} - ${minutesToTime(endMinutes)})`}
      >
        <div className="h-full flex flex-col justify-between overflow-hidden">
          <div className="font-medium leading-tight text-white text-shadow truncate">
            {block.name}
          </div>
          <div className="text-xs text-white/90 text-shadow">
            {block.start_time} - {minutesToTime(endMinutes)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-8 gap-2 h-[500px] overflow-y-auto">
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
                  className={`h-10 cursor-pointer hover:bg-accent/20 transition-colors ${
                    slotIndex % 2 === 0 ? 'border-b border-border/30' : 'border-b border-dotted border-border/15'
                  }`}
                  onClick={() => onTimeSlotClick?.(DAY_KEYS[dayIndex], slot.time)}
                  title={`${day} ${slot.displayTime}`}
                />
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