/**
 * ActivityHeatmap Component
 * 
 * GitHub-style contribution heatmap displaying daily project activity.
 * Shows 6 months of daily activity with color-coded intensity levels.
 * <200 lines for component size compliance.
 */

"use client";

import React, { useState, useMemo } from 'react';
import { DailyActivity } from '@/types/projects';
import { formatDateForHeatmap } from '@/utils/projectHelpers';

interface ActivityHeatmapProps {
  dailyActivity: DailyActivity[];
  width?: number;
  className?: string;
}

// Color scale based on amber theme (#f59e0b as maximum intensity)
const INTENSITY_COLORS = {
  0: 'transparent', // empty cells - no background
  1: '#fef3c7', // amber-100 (~20% saturation)
  2: '#fde68a', // amber-200 (~40% saturation) 
  3: '#fbbf24', // amber-300 (~70% saturation)
  4: '#f59e0b'  // amber-400 (full intensity)
} as const;

// Month names for labels
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Day labels for left side (weekdays only)
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  dailyActivity,
  width = 600,
  className = ''
}) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Memoized calculations for performance
  const heatmapData = useMemo(() => {
    if (!dailyActivity || dailyActivity.length === 0) {
      return { weeks: [], monthLabels: [], startDate: null, endDate: null };
    }

    // Sort by date to ensure proper order
    const sortedActivity = [...dailyActivity].sort((a, b) => a.date.localeCompare(b.date));
    
    // Create a map for quick lookup
    const activityMap = new Map(sortedActivity.map(activity => [activity.date, activity]));
    
    // Get date range
    const startDate = new Date(sortedActivity[0].date);
    const endDate = new Date(sortedActivity[sortedActivity.length - 1].date);
    
    // Find the Monday before or on the start date to align grid properly
    const firstMonday = new Date(startDate);
    const daysToMonday = (startDate.getDay() + 6) % 7; // Calculate days back to Monday
    firstMonday.setDate(startDate.getDate() - daysToMonday);
    
    // Find the Friday after the end date
    const lastFriday = new Date(endDate);
    const daysToFriday = (5 - endDate.getDay() + 7) % 7; // Calculate days forward to Friday
    lastFriday.setDate(endDate.getDate() + daysToFriday);
    
    // Generate weeks array
    const weeks: DailyActivity[][] = [];
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let currentDate = new Date(firstMonday);
    let weekIndex = 0;
    const seenMonths = new Set<number>();
    
    while (currentDate <= lastFriday) {
      const week: DailyActivity[] = [];
      
      // Generate 5 weekdays for this week (Monday-Friday)
      for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
        const dateStr = formatDateForHeatmap(currentDate);
        const activity = activityMap.get(dateStr);
        
        // Track month changes for labels (only add each month once)
        const currentMonth = currentDate.getMonth();
        if (!seenMonths.has(currentMonth)) {
          seenMonths.add(currentMonth);
          monthLabels.push({
            label: MONTH_NAMES[currentMonth],
            weekIndex
          });
        }
        
        week.push(activity || {
          date: dateStr,
          hours: 0,
          sessions: 0,
          intensity: 0
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push(week);
      weekIndex++;
    }
    
    // Filter month labels to prevent overcrowding (prioritize recent months)
    const filteredMonthLabels: typeof monthLabels = [];
    const minWeekSpacing = 3;
    
    // Work backwards from most recent to prioritize current months
    for (let i = monthLabels.length - 1; i >= 0; i--) {
      const currentLabel = monthLabels[i];
      
      // Always include the most recent month
      if (i === monthLabels.length - 1) {
        filteredMonthLabels.unshift(currentLabel);
        continue;
      }
      
      // Check if there's enough spacing from the next included label
      const nextIncludedLabel = filteredMonthLabels[0];
      if (!nextIncludedLabel || (nextIncludedLabel.weekIndex - currentLabel.weekIndex) >= minWeekSpacing) {
        filteredMonthLabels.unshift(currentLabel);
      }
      // If too crowded, skip this month (hide the older one)
    }
    
    return { weeks, monthLabels: filteredMonthLabels, startDate, endDate };
  }, [dailyActivity]);

  if (!dailyActivity || dailyActivity.length === 0) {
    return (
      <div 
        className={`${className} flex items-center justify-center border border-dashed border-border rounded-lg`}
        style={{ width, height: 200 }}
      >
        <div className="text-center text-muted-foreground">
          <div className="text-sm mb-1">No activity data</div>
          <div className="text-xs">Start logging sessions to see patterns</div>
        </div>
      </div>
    );
  }

  const { weeks, monthLabels } = heatmapData;
  const cellSize = 16;
  const cellGap = 3;
  const labelHeight = 24;
  const leftLabelWidth = 36;
  
  const gridWidth = weeks.length * (cellSize + cellGap) - cellGap;
  const gridHeight = 5 * (cellSize + cellGap) - cellGap;
  const totalHeight = labelHeight + gridHeight + 50;
  
  // Calculate natural width without forced padding
  const contentWidth = leftLabelWidth + gridWidth;
  const totalWidth = contentWidth;

  const formatTooltip = (activity: DailyActivity): string => {
    const date = new Date(activity.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (activity.hours === 0) {
      return `No activity on ${formattedDate}`;
    }
    
    return `${activity.hours.toFixed(1)} hours on ${formattedDate}`;
  };

  return (
    <div className={`relative ${className}`} style={{ width: totalWidth, height: totalHeight }}>
      {/* Month labels */}
      <div className="absolute top-0 left-0 flex" style={{ marginLeft: leftLabelWidth }}>
        {monthLabels.map(({ label, weekIndex }) => (
          <div
            key={`${label}-${weekIndex}`}
            className="text-xs text-muted-foreground"
            style={{
              position: 'absolute',
              left: weekIndex * (cellSize + cellGap),
              top: 0,
              height: labelHeight,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day labels */}
      <div className="absolute left-0 flex flex-col" style={{ top: labelHeight, width: leftLabelWidth }}>
        {DAY_LABELS.map((day, index) => (
          <div
            key={day}
            className="text-xs text-muted-foreground flex items-center justify-end pr-2"
            style={{
              height: cellSize,
              marginBottom: index === 4 ? 0 : cellGap
            }}
          >
            {index % 2 === 0 ? day : ''} {/* Show Mon, Wed, Fri */}
          </div>
        ))}
      </div>

      {/* Activity grid */}
      <div 
        className="absolute"
        style={{ 
          top: labelHeight, 
          left: leftLabelWidth,
          width: gridWidth,
          height: gridHeight
        }}
      >
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className="absolute flex flex-col"
            style={{
              left: weekIndex * (cellSize + cellGap),
              top: 0,
              gap: cellGap
            }}
          >
            {week.map((activity, dayIndex) => (
              <div
                key={activity.date}
                className="rounded-sm border border-border/50 cursor-pointer transition-all duration-200 hover:border-border"
                style={{
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: INTENSITY_COLORS[activity.intensity]
                }}
                onMouseEnter={() => setHoveredCell(activity.date)}
                onMouseLeave={() => setHoveredCell(null)}
                title={formatTooltip(activity)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div 
        className="absolute bottom-0 flex items-center gap-2 text-xs text-muted-foreground"
        style={{ left: leftLabelWidth }}
      >
        <span>Less</span>
        <div className="flex gap-1">
          {([0, 1, 2, 3, 4] as const).map(intensity => (
            <div
              key={intensity}
              className="rounded-sm border border-border/50"
              style={{
                width: 12,
                height: 12,
                backgroundColor: INTENSITY_COLORS[intensity]
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
};