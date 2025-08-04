/**
 * MetadataField Component
 * 
 * Simple key-value display for project metadata.
 * Used in the unified modal layout's metadata grid.
 * Clean, minimal styling for administrative details.
 */

import React from 'react';

interface MetadataFieldProps {
  label: string;
  value: string;
  className?: string;
}

export const MetadataField: React.FC<MetadataFieldProps> = ({
  label,
  value,
  className = ''
}) => {
  // Format the value for display (handle underscores, capitalization)
  const displayValue = value
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm text-foreground">
        {displayValue}
      </div>
    </div>
  );
};