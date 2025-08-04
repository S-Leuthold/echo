/**
 * EditableField Component
 * 
 * Reusable component for inline editing of project properties.
 * Supports text, textarea, and select field types with validation.
 * <150 lines for maintainability.
 */

"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit, 
  Check, 
  X, 
  AlertCircle 
} from 'lucide-react';

interface EditableFieldProps {
  // Value and display
  value: string | number;
  displayValue?: string;
  placeholder?: string;
  
  // Field configuration
  type: 'text' | 'textarea' | 'select' | 'number';
  options?: Array<{ value: string; label: string }>;
  
  // Validation
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  
  // Styling
  className?: string;
  editClassName?: string;
  
  // Events
  onSave: (newValue: string | number) => Promise<boolean>;
  onCancel?: () => void;
  
  // Labels
  label?: string;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  displayValue,
  placeholder,
  type,
  options = [],
  required = false,
  minLength,
  maxLength,
  min,
  max,
  className = '',
  editClassName = '',
  onSave,
  onCancel,
  label
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number>(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset edit value when prop value changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Validation
  const validateValue = (val: string | number): string | null => {
    const stringVal = String(val).trim();
    
    if (required && !stringVal) {
      return 'This field is required';
    }
    
    if (type === 'text' || type === 'textarea') {
      if (minLength && stringVal.length < minLength) {
        return `Must be at least ${minLength} characters`;
      }
      if (maxLength && stringVal.length > maxLength) {
        return `Must be less than ${maxLength} characters`;
      }
    }
    
    if (type === 'number') {
      const numVal = Number(val);
      if (isNaN(numVal)) {
        return 'Must be a valid number';
      }
      if (min !== undefined && numVal < min) {
        return `Must be at least ${min}`;
      }
      if (max !== undefined && numVal > max) {
        return `Must be at most ${max}`;
      }
    }
    
    return null;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onCancel?.();
  };

  const handleSave = async () => {
    const validationError = validateValue(editValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const success = await onSave(editValue);
      if (success) {
        setIsEditing(false);
      } else {
        setError('Failed to save changes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditField = () => {
    const commonProps = {
      value: editValue,
      placeholder,
      className: `${editClassName}`,
      disabled: isSaving
    };

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
          />
        );
      
      case 'select':
        return (
          <Select
            value={String(editValue)}
            onValueChange={(val) => setEditValue(val)}
            disabled={isSaving}
          >
            <SelectTrigger className={editClassName}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            onChange={(e) => setEditValue(Number(e.target.value) || 0)}
            min={min}
            max={max}
          />
        );
      
      default:
        return (
          <Input
            {...commonProps}
            onChange={(e) => setEditValue(e.target.value)}
            maxLength={maxLength}
          />
        );
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {renderEditField()}
            {error && (
              <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                <AlertCircle className="w-3 h-3" />
                {error}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !!error}
              className="h-8 w-8 p-0"
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-8 w-8 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group cursor-pointer ${className}`} onClick={handleEdit}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          {label && (
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              {label}
            </label>
          )}
          <p className="text-foreground group-hover:text-accent-foreground transition-colors">
            {displayValue || value || placeholder}
          </p>
        </div>
        <Edit className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
      </div>
    </div>
  );
};