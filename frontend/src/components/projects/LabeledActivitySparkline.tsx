/**
 * LabeledActivitySparkline Component
 * 
 * Enhanced sparkline chart with axis labels for modal displays.
 * Shows weekly activity patterns with context and scale.
 * Used in unified modal design for larger, more detailed visualizations.
 */

import React from 'react';
import { generateWeekLabels } from '@/utils/projectHelpers';

interface LabeledActivitySparklineProps {
  // Array of weekly hours for the last 6-8 weeks (most recent last)
  weeklyHours: number[];
  // Optional styling
  width?: number;
  height?: number;
  color?: string;
  showAxes?: boolean;
  className?: string;
}

export const LabeledActivitySparkline: React.FC<LabeledActivitySparklineProps> = ({
  weeklyHours,
  width = 400,
  height = 120,
  color = '#f59e0b', // Gold accent color
  showAxes = true,
  className = ''
}) => {
  if (!weeklyHours || weeklyHours.length === 0) {
    return (
      <div 
        className={`${className} flex items-center justify-center border border-dashed border-border rounded-lg`}
        style={{ width, height }}
      >
        <div className="text-center text-muted-foreground">
          <div className="text-sm mb-1">No activity data</div>
          <div className="text-xs">Start logging sessions to see patterns</div>
        </div>
      </div>
    );
  }

  // Calculate dimensions and scales
  const chartHeight = showAxes ? height - 40 : height; // Leave space for labels
  const chartWidth = width - 60; // Leave more space for Y-axis label to avoid overlap
  const maxHours = Math.max(...weeklyHours, 1);
  const minHours = 0; // Always start Y-axis from 0 for better data representation
  const range = maxHours - minHours || 1;
  
  // Calculate points for the sparkline
  const points = weeklyHours.map((hours, index) => {
    const x = 40 + (index / Math.max(weeklyHours.length - 1, 1)) * chartWidth;
    const normalizedValue = (hours - minHours) / range;
    const y = chartHeight - 20 - (normalizedValue * (chartHeight - 40));
    return `${x},${y}`;
  }).join(' ');

  // Generate week labels
  const weekLabels = generateWeekLabels(weeklyHours.length);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg
        width={width}
        height={chartHeight}
        className="overflow-visible"
        viewBox={`0 0 ${width} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines for better readability */}
        {showAxes && (
          <g className="opacity-20">
            {/* Horizontal grid lines at 0h, middle, and max */}
            {/* Bottom line (0h) */}
            <line
              x1={40}
              y1={chartHeight - 20}
              x2={width - 20}
              y2={chartHeight - 20}
              stroke={color}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            {/* Middle line (50% of max) */}
            <line
              x1={40}
              y1={chartHeight - 20 - (chartHeight - 40) * 0.5}
              x2={width - 20}
              y2={chartHeight - 20 - (chartHeight - 40) * 0.5}
              stroke={color}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            {/* Top line (max) */}
            <line
              x1={40}
              y1={chartHeight - 20 - (chartHeight - 40)}
              x2={width - 20}
              y2={chartHeight - 20 - (chartHeight - 40)}
              stroke={color}
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          </g>
        )}

        {/* Activity area (filled under the line) */}
        {weeklyHours.length > 1 && (
          <polygon
            points={`40,${chartHeight - 20} ${points} ${40 + chartWidth},${chartHeight - 20}`}
            fill={color}
            fillOpacity="0.1"
          />
        )}
        
        {/* Activity line */}
        {weeklyHours.length > 1 ? (
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Single point - show as larger circle
          <circle
            cx={width / 2}
            cy={chartHeight - 20 - (weeklyHours[0] / Math.max(maxHours, 1)) * (chartHeight - 40)}
            r="4"
            fill={color}
          />
        )}
        
        {/* Activity points (dots at each data point) */}
        {weeklyHours.map((hours, index) => {
          const x = 40 + (weeklyHours.length > 1 ? (index / (weeklyHours.length - 1)) * chartWidth : chartWidth / 2);
          const normalizedValue = (hours - minHours) / range;
          const y = chartHeight - 20 - (normalizedValue * (chartHeight - 40));
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
              stroke="white"
              strokeWidth="1"
              opacity="0.9"
            />
          );
        })}

        {/* Y-axis values */}
        {showAxes && (
          <g className="text-xs" fill="currentColor">
            {/* 0h label - at bottom of chart area */}
            <text x="35" y={chartHeight - 16} className="text-muted-foreground" fontSize="10" textAnchor="end">
              0h
            </text>
            {/* Middle value label */}
            <text x="35" y={chartHeight - 20 - (chartHeight - 40) * 0.5 + 3} className="text-muted-foreground" fontSize="10" textAnchor="end">
              {Math.round(maxHours / 2)}h
            </text>
            {/* Max value label - at top of chart area */}
            <text x="35" y={chartHeight - 20 - (chartHeight - 40) + 3} className="text-muted-foreground" fontSize="10" textAnchor="end">
              {Math.round(maxHours)}h
            </text>
          </g>
        )}
      </svg>
      
      {/* X-axis labels */}
      {showAxes && weekLabels.length > 2 && (
        <div className="relative mt-2" style={{ height: '20px' }}>
          {/* Show labels at specific intervals: 8w, 6w, 4w, 2w, This week */}
          {weekLabels.length >= 8 && (
            <>
              {/* 8 weeks ago (first point) */}
              <span 
                className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                style={{ left: '40px' }}
              >
                8w ago
              </span>
              
              {/* 6 weeks ago */}
              <span 
                className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                style={{ left: `${40 + (2 / Math.max(weekLabels.length - 1, 1)) * chartWidth}px` }}
              >
                6w ago
              </span>
              
              {/* 4 weeks ago */}
              <span 
                className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                style={{ left: `${40 + (4 / Math.max(weekLabels.length - 1, 1)) * chartWidth}px` }}
              >
                4w ago
              </span>
              
              {/* 2 weeks ago */}
              <span 
                className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                style={{ left: `${40 + (6 / Math.max(weekLabels.length - 1, 1)) * chartWidth}px` }}
              >
                2w ago
              </span>
              
              {/* This week (last point) */}
              <span 
                className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                style={{ left: `${40 + chartWidth}px` }}
              >
                This week
              </span>
            </>
          )}
        </div>
      )}
      
      {/* Y-axis label */}
      {showAxes && (
        <div 
          className="absolute left-0 top-1/2 text-xs text-muted-foreground transform -rotate-90 origin-center -translate-y-1/2"
          style={{ transformOrigin: '0 50%' }}
        >
          Hours per Week
        </div>
      )}
    </div>
  );
};