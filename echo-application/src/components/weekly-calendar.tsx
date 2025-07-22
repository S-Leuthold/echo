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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Generate time slots from 6 AM to 11 PM in 30-minute increments
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 6; hour <= 23; hour++) {
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

const getBlockTypeIcon = (type: string) => {
  switch (type) {
    case 'anchor': return '⚓';
    case 'fixed': return '📌';
    case 'flex': return '🔄';
    default: return '📋';
  }
};

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
  const startMinutes = 6 * 60; // 6 AM
  const slotHeightMinutes = 30;

  // Organize blocks by day
  const blocksByDay: { [day: string]: CalendarBlock[] } = {};
  DAY_KEYS.forEach(day => {
    blocksByDay[day] = blocks.filter(block => block.days.includes(day));
  });

  const renderBlock = (block: CalendarBlock, dayIndex: number) => {
    const startMinutes = timeToMinutes(block.start_time);
    const endMinutes = startMinutes + block.duration;
    
    // Calculate position and height
    const startPosition = ((startMinutes - (6 * 60)) / 30) * 3; // 3rem per 30-min slot
    const heightRem = (block.duration / 30) * 3; // 3rem per 30 minutes
    
    return (
      <div
        key={`${block.id}-${dayIndex}`}
        className={`absolute left-1 right-1 rounded-md p-2 text-xs cursor-pointer transition-all hover:shadow-md hover:scale-105 z-10 ${getCategoryColor(block.category)} text-white`}
        style={{
          top: `${startPosition}rem`,
          height: `${heightRem}rem`,
          minHeight: '2.5rem'
        }}
        onClick={() => onBlockClick?.(block)}
        title={`${block.name} (${block.start_time} - ${minutesToTime(endMinutes)})`}
      >
        <div className="flex items-start justify-between">
          <span className="font-medium leading-tight">{getBlockTypeIcon(block.type)} {block.name}</span>
        </div>
        <div className="mt-1 text-xs opacity-90">
          {block.start_time} - {minutesToTime(endMinutes)}
        </div>
        {block.description && (
          <div className="mt-1 text-xs opacity-75 truncate">
            {block.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4">
      <div className="grid grid-cols-8 gap-2 h-[600px] overflow-y-auto">
        {/* Time column */}
        <div className="col-span-1">
          <div className="h-12 flex items-center justify-center font-medium text-sm">
            Time
          </div>
          <div className="space-y-0">
            {timeSlots.map((slot, index) => (
              <div
                key={slot.time}
                className={`h-12 flex items-center justify-end pr-2 text-xs text-muted-foreground border-r ${
                  index % 2 === 0 ? 'border-border' : 'border-transparent'
                }`}
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
                  className={`h-12 border-b cursor-pointer hover:bg-accent/20 transition-colors ${
                    slotIndex % 2 === 0 ? 'border-border/50' : 'border-border/20'
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