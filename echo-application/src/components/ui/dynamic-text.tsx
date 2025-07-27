"use client";

import React from 'react';
import { useDynamicCopy, usePlanning } from '@/contexts/PlanningContext';

// Dynamic Text Component - automatically adjusts copy based on planning mode
interface DynamicTextProps {
  children: string;
  todayText?: string;  // Alternative text when planning for today
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function DynamicText({ 
  children, 
  todayText, 
  className, 
  as: Component = 'span' 
}: DynamicTextProps) {
  const { getDynamicCopy } = useDynamicCopy();
  
  const text = getDynamicCopy(children, todayText);
  
  return (
    <Component className={className}>
      {text}
    </Component>
  );
}

// Time Aware Text Component - shows different text based on time of day
interface TimeAwareTextProps {
  morning?: string;
  afternoon?: string;
  evening?: string;
  night?: string;
  default: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function TimeAwareText({
  morning,
  afternoon,
  evening,
  night,
  default: defaultText,
  className,
  as: Component = 'span'
}: TimeAwareTextProps) {
  const { getTimeAwareCopy } = useDynamicCopy();
  
  const text = getTimeAwareCopy({
    morning,
    afternoon,
    evening,
    night,
    default: defaultText
  });
  
  return (
    <Component className={className}>
      {text}
    </Component>
  );
}

// Planning Mode Badge - shows current planning mode
interface PlanningModeBadgeProps {
  className?: string;
  showIcon?: boolean;
}

export function PlanningModeBadge({ className = '', showIcon = true }: PlanningModeBadgeProps) {
  const { planningMode, timeContext } = usePlanning();
  
  const icon = showIcon ? 
    (planningMode === 'today' ? '⚡' : '📅') : 
    '';
  
  const text = planningMode === 'today' ? 'Same-day Planning' : 'Tomorrow Planning';
  const bgColor = planningMode === 'today' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${className}`}>
      {icon && <span className="mr-1">{icon}</span>}
      {text}
    </span>
  );
}

// Time Context Display - shows current time and remaining day info
interface TimeContextDisplayProps {
  className?: string;
  showGreeting?: boolean;
  showRemainingTime?: boolean;
}

export function TimeContextDisplay({ 
  className = '', 
  showGreeting = true,
  showRemainingTime = true 
}: TimeContextDisplayProps) {
  const { getCurrentTime, getRemainingDayText, getTimePeriodGreeting, timeContext, planningMode } = usePlanning();
  
  if (!timeContext) {
    return null;
  }
  
  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      {showGreeting && (
        <div className="font-medium">
          {getTimePeriodGreeting()}! It's {getCurrentTime()}
        </div>
      )}
      {showRemainingTime && planningMode === 'today' && (
        <div className="mt-1">
          {getRemainingDayText()}
        </div>
      )}
    </div>
  );
}

// Conditional Planning Content - only shows content for specific planning modes
interface ConditionalPlanningContentProps {
  children: React.ReactNode;
  mode: 'today' | 'tomorrow' | 'both';
  fallback?: React.ReactNode;
}

export function ConditionalPlanningContent({ 
  children, 
  mode, 
  fallback = null 
}: ConditionalPlanningContentProps) {
  const { planningMode } = usePlanning();
  
  const shouldShow = mode === 'both' || mode === planningMode;
  
  return shouldShow ? <>{children}</> : <>{fallback}</>;
}

// Planning Mode Toggle - button to switch between modes
interface PlanningModeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function PlanningModeToggle({ 
  className = '', 
  size = 'md',
  disabled = false 
}: PlanningModeToggleProps) {
  const { planningMode, setPlanningMode, canPlanToday } = usePlanning();
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm', 
    lg: 'px-4 py-2 text-base'
  };
  
  const handleToggle = () => {
    const newMode = planningMode === 'today' ? 'tomorrow' : 'today';
    setPlanningMode(newMode, 'user_choice');
  };
  
  // Disable today mode if not enough time left
  const isTodayDisabled = planningMode === 'tomorrow' && !canPlanToday;
  
  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isTodayDisabled}
      className={`
        inline-flex items-center rounded-md border border-gray-300 bg-white
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${sizeClasses[size]} ${className}
      `}
      title={isTodayDisabled ? "Not enough time left today for planning" : `Switch to ${planningMode === 'today' ? 'tomorrow' : 'same-day'} planning`}
    >
      {planningMode === 'today' ? (
        <>📅 Plan Tomorrow Instead</>
      ) : (
        <>⚡ Plan Today Instead</>
      )}
    </button>
  );
}