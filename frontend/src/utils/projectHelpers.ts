/**
 * Project Utility Functions
 * 
 * Helper functions for project data formatting and calculations.
 * Used across project components for consistent behavior.
 */

import { ActivityIntensity, DailyActivity, DateRange } from '@/types/projects';

/**
 * Formats project age from creation date to human-readable string
 * @param createdDate ISO date string
 * @returns Formatted string like "Started 2 months, 5 days ago"
 */
export const formatProjectAge = (createdDate: string): string => {
  const created = new Date(createdDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Started today';
  if (diffDays === 1) return 'Started yesterday';
  
  // Calculate months and remaining days
  const months = Math.floor(diffDays / 30);
  const remainingDays = diffDays % 30;
  
  if (months === 0) {
    return `Started ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  
  if (remainingDays === 0) {
    return `Started ${months} month${months === 1 ? '' : 's'} ago`;
  }
  
  return `Started ${months} month${months === 1 ? '' : 's'}, ${remainingDays} day${remainingDays === 1 ? '' : 's'} ago`;
};

/**
 * Generates realistic mock weekly activity data
 * @param weeks Number of weeks to generate (default 8)
 * @param pattern Activity pattern type
 * @returns Array of weekly hours
 */
export const generateMockWeeklyActivity = (
  weeks: number = 8,
  pattern: 'consistent' | 'sporadic' | 'ramping_up' | 'ramping_down' | 'peaked' = 'consistent'
): number[] => {
  const baseHours = Math.random() * 8 + 3; // 3-11 hours baseline (more realistic)
  
  switch (pattern) {
    case 'consistent':
      return Array.from({ length: weeks }, () => 
        Math.max(0, baseHours + (Math.random() - 0.5) * 3)
      );
    
    case 'sporadic':
      return Array.from({ length: weeks }, () => 
        Math.random() > 0.6 ? baseHours + Math.random() * 5 : Math.random() * 2
      );
    
    case 'ramping_up':
      return Array.from({ length: weeks }, (_, i) => 
        Math.max(0, (baseHours * i / weeks) + (Math.random() - 0.5) * 2)
      );
    
    case 'ramping_down':
      return Array.from({ length: weeks }, (_, i) => 
        Math.max(0, baseHours * (1 - i / weeks) + (Math.random() - 0.5) * 2)
      );
    
    case 'peaked':
      const peak = Math.floor(weeks / 2);
      return Array.from({ length: weeks }, (_, i) => {
        const distance = Math.abs(i - peak);
        const multiplier = 1 - (distance / peak);
        return Math.max(0, baseHours * multiplier + (Math.random() - 0.5) * 3);
      });
    
    default:
      return Array.from({ length: weeks }, () => baseHours);
  }
};

/**
 * Calculate trend between current and previous week
 * @param weeklyHours Array of weekly activity hours
 * @returns Trend direction and percentage change
 */
export const calculateWeeklyTrend = (weeklyHours: number[]): { 
  direction: 'up' | 'down' | 'stable', 
  percentage: number 
} => {
  if (weeklyHours.length < 2) return { direction: 'stable', percentage: 0 };
  
  const current = weeklyHours[weeklyHours.length - 1];
  const previous = weeklyHours[weeklyHours.length - 2];
  
  if (previous === 0) return { direction: current > 0 ? 'up' : 'stable', percentage: 0 };
  
  const percentage = Math.round(((current - previous) / previous) * 100);
  const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';
  
  return { direction, percentage: Math.abs(percentage) };
};

/**
 * Generate human-readable summary statistics for sparkline
 * @param weeklyHours Array of weekly activity hours
 * @returns Summary statistics object
 */
export const generateSparklineSummary = (weeklyHours: number[]): {
  totalWeeks: number;
  peakHours: number;
  currentHours: number;
  averageHours: number;
  trend: { direction: 'up' | 'down' | 'stable', percentage: number };
} => {
  if (!weeklyHours || weeklyHours.length === 0) {
    return {
      totalWeeks: 0,
      peakHours: 0,
      currentHours: 0,
      averageHours: 0,
      trend: { direction: 'stable', percentage: 0 }
    };
  }

  const totalWeeks = weeklyHours.length;
  const peakHours = Math.max(...weeklyHours);
  const currentHours = weeklyHours[weeklyHours.length - 1];
  const averageHours = weeklyHours.reduce((sum, hours) => sum + hours, 0) / totalWeeks;
  const trend = calculateWeeklyTrend(weeklyHours);

  return {
    totalWeeks,
    peakHours: Math.round(peakHours * 10) / 10,
    currentHours: Math.round(currentHours * 10) / 10,
    averageHours: Math.round(averageHours * 10) / 10,
    trend
  };
};

/**
 * Format enhanced tooltip text for sparkline
 * @param weeklyHours Array of weekly activity hours
 * @returns Formatted tooltip string
 */
export const formatSparklineTooltip = (weeklyHours: number[]): string => {
  const summary = generateSparklineSummary(weeklyHours);
  
  if (summary.totalWeeks === 0) return 'No activity data available';
  if (summary.totalWeeks === 1) return `1 week of activity • Current: ${summary.currentHours}h • Trend: Stable`;
  
  const trendSymbol = summary.trend.direction === 'up' ? '↑' : 
                     summary.trend.direction === 'down' ? '↓' : '→';
  
  const trendText = summary.trend.direction === 'stable' ? 
    'Stable' : 
    `${trendSymbol} ${summary.trend.percentage}%`;

  return `${summary.totalWeeks} weeks of activity • Peak: ${summary.peakHours}h • Current: ${summary.currentHours}h • Trend: ${trendText}`;
};

/**
 * Generate relative week labels for sparkline
 * @param weeksCount Number of weeks to generate labels for
 * @returns Array of week labels like ["8w ago", "7w ago", ..., "This week"]
 */
export const generateWeekLabels = (weeksCount: number): string[] => {
  return Array.from({ length: weeksCount }, (_, i) => {
    const weeksAgo = weeksCount - 1 - i;
    if (weeksAgo === 0) return 'This week';
    if (weeksAgo === 1) return 'Last week';
    return `${weeksAgo}w ago`;
  });
};

/**
 * Extract recent insights from weekly summaries
 * @param weeklySummaries Array of weekly summary objects
 * @returns Formatted insights string
 */
export const getRecentInsights = (weeklySummaries: any[]): string => {
  if (!weeklySummaries || weeklySummaries.length === 0) {
    return 'No recent insights available.';
  }
  
  const latest = weeklySummaries[0];
  const insights = [];
  
  if (latest.key_accomplishments && latest.key_accomplishments.length > 0) {
    insights.push(`Recent work: ${latest.key_accomplishments[0]}`);
  }
  
  if (latest.decisions_made && latest.decisions_made.length > 0) {
    insights.push(`Key decision: ${latest.decisions_made[0]}`);
  }
  
  return insights.join(' ') || latest.summary || 'Project is actively being developed.';
};

/**
 * Generate a 6-month date range from today backwards
 * @returns DateRange object with start and end dates
 */
export const getSixMonthDateRange = (): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  
  return { start, end };
};

/**
 * Format date for heatmap display and calculations
 * @param date Date to format
 * @returns ISO date string (YYYY-MM-DD)
 */
export const formatDateForHeatmap = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Calculate activity intensity level based on hours
 * @param hours Hours of activity for the day
 * @param maxHours Maximum hours across all days (for scaling)
 * @returns ActivityIntensity level (0-4)
 */
export const calculateActivityIntensity = (hours: number, maxHours: number): ActivityIntensity => {
  if (hours === 0) return 0;
  if (maxHours === 0) return 0;
  
  const ratio = hours / maxHours;
  
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.7) return 3;
  return 4;
};

/**
 * Generate all dates in a given range
 * @param start Start date
 * @param end End date
 * @returns Array of Date objects for each day in range
 */
export const generateDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

/**
 * Generate realistic mock daily activity data for 6 months
 * @param pattern Activity pattern type 
 * @returns Array of DailyActivity objects for the last 6 months
 */
export const generateMockDailyActivity = (
  pattern: 'consistent' | 'sporadic' | 'ramping_up' | 'ramping_down' | 'peaked' = 'consistent'
): DailyActivity[] => {
  const { start, end } = getSixMonthDateRange();
  const dates = generateDateRange(start, end);
  const baseHoursPerDay = (Math.random() * 3 + 1); // 1-4 hours per day baseline
  
  const dailyHours: number[] = [];
  
  // Generate hours based on pattern
  switch (pattern) {
    case 'consistent':
      dates.forEach((date, index) => {
        // Lower activity on weekends
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1;
        const hours = Math.max(0, (baseHoursPerDay + (Math.random() - 0.5) * 2) * weekendMultiplier);
        dailyHours.push(hours);
      });
      break;
      
    case 'sporadic':
      dates.forEach((date, index) => {
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.2 : 1;
        // 70% chance of no activity, 30% chance of burst activity
        const hours = Math.random() > 0.7 
          ? Math.max(0, (baseHoursPerDay * 2 + Math.random() * 3) * weekendMultiplier)
          : Math.random() * 0.5 * weekendMultiplier;
        dailyHours.push(hours);
      });
      break;
      
    case 'ramping_up':
      dates.forEach((date, index) => {
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1;
        const progress = index / dates.length; // 0 to 1
        const hours = Math.max(0, (baseHoursPerDay * progress * 2 + Math.random() - 0.5) * weekendMultiplier);
        dailyHours.push(hours);
      });
      break;
      
    case 'ramping_down':
      dates.forEach((date, index) => {
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1;
        const progress = 1 - (index / dates.length); // 1 to 0
        const hours = Math.max(0, (baseHoursPerDay * progress * 2 + Math.random() - 0.5) * weekendMultiplier);
        dailyHours.push(hours);
      });
      break;
      
    case 'peaked':
      const peakDay = Math.floor(dates.length * 0.6); // Peak at 60% through the period
      dates.forEach((date, index) => {
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1;
        const distance = Math.abs(index - peakDay);
        const maxDistance = Math.max(peakDay, dates.length - peakDay);
        const multiplier = 1 - (distance / maxDistance);
        const hours = Math.max(0, (baseHoursPerDay * multiplier * 2 + Math.random() - 0.5) * weekendMultiplier);
        dailyHours.push(hours);
      });
      break;
  }
  
  // Calculate max hours for intensity scaling
  const maxHours = Math.max(...dailyHours, 1);
  
  // Create DailyActivity objects
  return dates.map((date, index) => {
    const hours = Math.round(dailyHours[index] * 10) / 10; // Round to 1 decimal
    const sessions = hours > 0 ? Math.max(1, Math.round(hours / 2)) : 0; // Rough estimate: 2 hours per session
    const intensity = calculateActivityIntensity(hours, maxHours);
    
    return {
      date: formatDateForHeatmap(date),
      hours,
      sessions,
      intensity
    };
  });
};