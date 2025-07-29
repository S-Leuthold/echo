/**
 * ActivitySparkline Component
 * 
 * Simple sparkline chart showing project activity over recent weeks.
 * Replaces the misleading progress bar with honest activity data.
 * <100 lines for maintainability.
 */

import React from 'react';

interface ActivitySparklineProps {
  // Array of weekly hours for the last 6-8 weeks (most recent last)
  weeklyHours: number[];
  // Optional styling
  className?: string;
  width?: number;
  height?: number;
  color?: string;
}

export const ActivitySparkline: React.FC<ActivitySparklineProps> = ({
  weeklyHours,
  className = '',
  width = 80,
  height = 20,
  color = '#f59e0b' // Gold accent color
}) => {
  if (!weeklyHours || weeklyHours.length === 0) {
    return (
      <div 
        className={`${className} flex items-center justify-center`}
        style={{ width, height }}
      >
        <div className="text-xs text-muted-foreground">No activity</div>
      </div>
    );
  }

  // Calculate dimensions and scales
  const maxHours = Math.max(...weeklyHours, 1); // Ensure we don't divide by 0
  const minHours = Math.min(...weeklyHours, 0);
  const range = maxHours - minHours || 1;
  
  // Calculate points for the sparkline
  const points = weeklyHours.map((hours, index) => {
    const x = (index / Math.max(weeklyHours.length - 1, 1)) * width;
    const normalizedValue = (hours - minHours) / range;
    const y = height - (normalizedValue * height);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`${className} relative`} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Activity area (filled under the line) */}
        {weeklyHours.length > 1 && (
          <polygon
            points={`0,${height} ${points} ${width},${height}`}
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
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          // Single point - show as small circle
          <circle
            cx={width / 2}
            cy={height - (weeklyHours[0] / Math.max(maxHours, 1)) * height}
            r="2"
            fill={color}
          />
        )}
        
        {/* Activity points (small dots at each data point) */}
        {weeklyHours.map((hours, index) => {
          const x = weeklyHours.length > 1 ? (index / (weeklyHours.length - 1)) * width : width / 2;
          const normalizedValue = (hours - minHours) / range;
          const y = height - (normalizedValue * height);
          
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill={color}
              opacity="0.8"
            />
          );
        })}
      </svg>
      
    </div>
  );
};