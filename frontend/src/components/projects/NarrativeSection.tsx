/**
 * NarrativeSection Component
 * 
 * Displays editable narrative content with consistent styling.
 * Used for "What We're Building", "Where We Are", and "Recent Insights" sections.
 * Integrates with the modal's edit mode functionality.
 */

import React from 'react';
import { EditableField } from './EditableField';

interface NarrativeSectionProps {
  title: string;
  content: string;
  isEditMode?: boolean;
  isReadOnly?: boolean;
  onSave?: (value: string) => Promise<boolean>;
  minLength?: number;
  maxLength?: number;
  className?: string;
}

export const NarrativeSection: React.FC<NarrativeSectionProps> = ({
  title,
  content,
  isEditMode = false,
  isReadOnly = false,
  onSave,
  minLength = 10,
  maxLength = 500,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Section Title */}
      <h3 className="text-lg font-medium text-foreground">
        {title}
      </h3>
      
      {/* Content */}
      <div className="text-sm text-muted-foreground leading-relaxed">
        {isEditMode && !isReadOnly && onSave ? (
          <EditableField
            value={content}
            type="textarea"
            onSave={onSave}
            required
            minLength={minLength}
            maxLength={maxLength}
            className="w-full"
          />
        ) : (
          <p className="whitespace-pre-wrap">
            {content || 'No information available.'}
          </p>
        )}
      </div>
    </div>
  );
};