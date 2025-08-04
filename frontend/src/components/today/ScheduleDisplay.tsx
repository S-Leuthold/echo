/**
 * ScheduleDisplay - Timeline and schedule rendering component
 * 
 * Extracted from Today page as part of Phase 2 refactoring.
 * Handles schedule transformation, timeline display, and calendar layout.
 * 
 * Addresses CODEBASE_REVIEW_REPORT.md Issue #1: Component Size Violation
 */

"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { PlanTimeline } from "@/components/shared/PlanTimeline";
import { mockSchedule } from "@/mocks/scheduleData";

// Data transformation functions
const parseTime = (timeStr: string) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

const mapBlockTypeToCategory = (blockType: string, label: string = '') => {
  // Enhanced category detection based on content, not just type
  const lowerLabel = label.toLowerCase();
  
  // First check label content for accurate categorization
  if (lowerLabel.includes('meeting') || lowerLabel.includes('standup') || lowerLabel.includes('call') || lowerLabel.includes('sync')) {
    return 'MEETINGS';
  }
  if (lowerLabel.includes('development') || lowerLabel.includes('code') || lowerLabel.includes('frontend') || lowerLabel.includes('backend')) {
    return 'DEEP_WORK';
  }
  if (lowerLabel.includes('research') || lowerLabel.includes('study') || lowerLabel.includes('learn')) {
    return 'RESEARCH';
  }
  if (lowerLabel.includes('exercise') || lowerLabel.includes('workout') || lowerLabel.includes('gym')) {
    return 'HEALTH';
  }
  if (lowerLabel.includes('lunch') || lowerLabel.includes('breakfast') || lowerLabel.includes('dinner')) {
    return 'MEALS';
  }
  if (lowerLabel.includes('personal') || lowerLabel.includes('break')) {
    return 'PERSONAL';
  }
  
  // Fallback to block type mapping
  switch (blockType.toLowerCase()) {
    case 'anchor':
    case 'fixed':
      return 'PERSONAL';
    case 'flex':
      return 'DEEP_WORK';
    default:
      return 'PERSONAL';
  }
};

const transformTodayDataToSchedule = (todayData: any, currentTime: Date = new Date()) => {
  if (!todayData || !todayData.blocks) {
    return mockSchedule; // Fallback to mock if no blocks
  }
  
  return todayData.blocks.map((block: any, index: number) => {
    const startTime = parseTime(block.start_time);
    const endTime = parseTime(block.end_time);
    const startMinutes = startTime.hours * 60 + startTime.minutes;
    const endMinutes = endTime.hours * 60 + endTime.minutes;
    const duration = endMinutes - startMinutes;
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    
    // Determine block state
    let state = 'upcoming';
    let progress = 0;
    let isCurrent = false;
    
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
      state = 'active';
      isCurrent = true;
      progress = Math.round(((currentMinutes - startMinutes) / duration) * 100);
    } else if (currentMinutes >= endMinutes) {
      state = 'completed';
      progress = 100;
    }
    
    return {
      id: block.id || `block-${index}`,
      startTime: block.start_time,
      endTime: block.end_time,
      label: block.label || 'Untitled Block',
      timeCategory: mapBlockTypeToCategory(block.type, block.label),
      startMinutes: startMinutes,
      endMinutes: endMinutes,
      isCurrent: isCurrent,
      progress: progress,
      emoji: block.icon || '📅',
      strategicNote: `Block: ${block.label}`,
      state: state
    };
  });
};

interface ScheduleDisplayProps {
  todayData: any;
  currentTime: Date;
}

export const ScheduleDisplay: React.FC<ScheduleDisplayProps> = ({
  todayData,
  currentTime,
}) => {
  const [calendarHeight, setCalendarHeight] = useState(800);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Simplified height calculation for full viewport usage
  useEffect(() => {
    const calculateHeight = () => {
      const windowHeight = window.innerHeight;
      
      // Calendar now uses full viewport height from top
      // Account for header (80px) and some padding
      const availableHeight = windowHeight - 80; // Header height
      setCalendarHeight(Math.max(600, availableHeight)); // Minimum 600px
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);

    return () => {
      window.removeEventListener('resize', calculateHeight);
    };
  }, []);

  // Memoize schedule transformations to prevent unnecessary re-renders
  const transformedSchedule = useMemo(() => {
    return todayData ? transformTodayDataToSchedule(todayData, currentTime) : undefined;
  }, [todayData, currentTime]);
  
  const timelineSchedule = useMemo(() => {
    return todayData ? transformTodayDataToSchedule(todayData, currentTime) : mockSchedule;
  }, [todayData, currentTime]);

  return (
    <div className="bg-background border-l border-border/50 flex flex-col h-screen fixed right-0 w-[30vw] top-0 z-10">
      <div className="px-6 pt-6 pb-2 flex-shrink-0" style={{ height: '80px' }}>
        {/* Header space - matches main header height */}
      </div>
      
      <div 
        ref={calendarRef} 
        className="flex-1 px-6 pb-6 overflow-hidden"
        style={{ height: `${calendarHeight}px` }}
      >
        <PlanTimeline 
          schedule={timelineSchedule}
          context="today"
          className="h-full"
        />
      </div>
    </div>
  );
};