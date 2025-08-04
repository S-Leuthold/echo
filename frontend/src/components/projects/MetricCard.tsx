/**
 * MetricCard Component
 * 
 * Displays a single metric with value, unit, and label.
 * Used in the unified modal layout's key metrics bar.
 * Clean, minimal design focusing on the numbers that matter.
 */

import React from 'react';

interface MetricCardProps {
  value: number | string;
  unit?: string;
  label: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  unit = '',
  label,
  className = ''
}) => {
  // Format the value for display
  const displayValue = typeof value === 'number' 
    ? value % 1 === 0 
      ? value.toString() 
      : value.toFixed(1)
    : value;

  return (
    <div className={`text-center ${className}`}>
      <div className="text-2xl font-bold text-foreground">
        {displayValue}{unit}
      </div>
      <div className="text-sm text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
};