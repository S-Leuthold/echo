"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';

/**
 * HybridSummaryInput Component
 * 
 * A reusable component that combines a primary multi-line text area with 
 * clickable "suggestion pills" derived from system data. Designed for the
 * SpinDownState debrief experience where users control their narrative
 * while having easy access to system-suggested content.
 * 
 * Design Philosophy: User agency first, smart assistance second
 */

interface SuggestionPill {
  id: string;
  text: string;
}

interface HybridSummaryInputProps {
  // Main prompt configuration
  prompt: string;
  placeholder?: string;
  
  // Suggestion pills configuration
  suggestionsLabel?: string;
  suggestions: SuggestionPill[];
  
  // Text area configuration
  value: string;
  onChange: (value: string) => void;
  minHeight?: string;
  
  // Optional styling
  className?: string;
}

export function HybridSummaryInput({
  prompt,
  placeholder = "",
  suggestionsLabel = "Suggestions:",
  suggestions,
  value,
  onChange,
  minHeight = "120px",
  className = ""
}: HybridSummaryInputProps) {
  
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  
  // Handle suggestion pill click - append as new line
  const handleSuggestionClick = (suggestionText: string) => {
    const newValue = value.trim() 
      ? `${value}\n• ${suggestionText}`
      : `• ${suggestionText}`;
    
    onChange(newValue);
    
    // Focus textarea and move cursor to end
    if (textareaRef) {
      textareaRef.focus();
      setTimeout(() => {
        textareaRef.selectionStart = textareaRef.selectionEnd = newValue.length;
      }, 0);
    }
  };
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main Text Area */}
      <div className="space-y-2">
        <label className="text-lg font-semibold text-foreground block">
          {prompt}
        </label>
        
        <Card className="bg-muted/20 border-border/50">
          <CardContent className="px-3 py-0">
            <textarea
              ref={setTextareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder-muted-foreground leading-relaxed pt-0 pb-3"
              style={{ minHeight }}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Suggestion Pills */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground/70 uppercase tracking-widest font-normal">
            {suggestionsLabel}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion.id}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/10 border-border/50 hover:border-accent/30 transition-all duration-200"
              >
                <Plus className="w-3 h-3 mr-1.5" strokeWidth={1.5} />
                {suggestion.text}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}