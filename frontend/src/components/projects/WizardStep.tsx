/**
 * WizardStep Component
 * 
 * Reusable wrapper component for wizard steps.
 * Updated to match activity-focused design system.
 * <100 lines for maintainability.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';

interface WizardStepProps {
  // Step info
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  
  // Validation
  isValid: boolean;
  isOptional: boolean;
  
  // Content
  children: React.ReactNode;
  
  // Optional customization
  className?: string;
}

export const WizardStep: React.FC<WizardStepProps> = ({
  title,
  description,
  currentStep,
  totalSteps,
  isValid,
  isOptional,
  children,
  className = ''
}) => {
  // Step indicator
  const getStepIcon = () => {
    if (isValid) {
      return <CheckCircle className="w-5 h-5 text-accent" />;
    }
    if (!isOptional && !isValid) {
      return <AlertCircle className="w-5 h-5 text-amber-500" />;
    }
    return <Circle className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Step Progress Header */}
      <div className="space-y-4">
        {/* Progress info and status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Step {currentStep + 1} of {totalSteps}</span>
          </div>
          <div className="flex items-center gap-2">
            {getStepIcon()}
            {isOptional && (
              <Badge variant="outline" className="text-xs">
                Optional
              </Badge>
            )}
          </div>
        </div>
        
        {/* Progress Visual */}
        <div className="w-full bg-muted/50 rounded-full h-2">
          <div 
            className="bg-accent h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content - Clean design without Card wrapper */}
      <div className="space-y-6">
        {/* Step Header */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        
        {/* Step Content */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
};