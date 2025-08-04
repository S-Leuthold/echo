"use client";

import { useCallback, useMemo, useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Block } from '@/hooks/useSessionState';
import { Dumbbell, User, Utensils, Bike } from 'lucide-react';
import { quoteService } from '@/services/quoteService';

/**
 * TranquilState Component - Tranquil Rest Experience
 * 
 * Creates an immersive, full-page tranquil experience with:
 * - Header: Essential block information with Lucide icons
 * - Centerpiece: Contextual inspirational quotes
 * - Countdown: Subtle next session preview
 * 
 * Design Philosophy:
 * - Elegant 3-section layout for peaceful moments
 * - Category-based contextual quotes
 * - Bike-positive transport approach
 * - Respectful of personal time with beautiful typography
 */

interface TranquilStateProps {
  currentBlock: Block | null;
  nextWorkBlock: Block | null;
  timeUntilTransition: number;
  currentTime: Date;
}

export function TranquilState({
  currentBlock,
  nextWorkBlock,
  timeUntilTransition,
  currentTime
}: TranquilStateProps) {
  
  // Stable quote management - only changes when block identity changes
  const [stableQuote, setStableQuote] = useState<{ text: string; author: string; blockId?: string }>({
    text: '',
    author: ''
  });

  // Update quote only when the actual block changes (not on every render)
  useEffect(() => {
    const blockId = nextWorkBlock?.id || 'default';
    
    // Only fetch new quote if block identity has changed
    if (!stableQuote.blockId || stableQuote.blockId !== blockId) {
      const quote = quoteService.getContextualQuote(nextWorkBlock);
      setStableQuote({
        text: quote.quote,
        author: quote.author,
        blockId: blockId
      });
    }
  }, [nextWorkBlock?.id]); // Only depend on ID to prevent object reference changes

  // Use stable quote for display
  const contextualQuote = stableQuote;
  
  // Format time display for header
  const formatTime = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  // Format category for consistent capitalization
  const formatCategory = (category: string): string => {
    return category.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };
  
  // Map categories to Lucide icons
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'HEALTH':
        return Dumbbell;
      case 'PERSONAL':
        return User;
      case 'MEALS':
        return Utensils;
      case 'TRANSIT':
        return Bike; // 🚴‍♂️ Bike-positive approach!
      default:
        return User;
    }
  };
  
  // Get icon component for current block
  const IconComponent = currentBlock ? getCategoryIcon(currentBlock.timeCategory) : User;
  
  
  return (
    <div className="h-full flex flex-col p-12">
      {/* THE HEADER - Following Session Scaffold Pattern */}
      <div className="flex-shrink-0 mb-12">
        <div className="mb-3">
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Off Hours
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
            <IconComponent 
              className="w-6 h-6 text-accent" 
              strokeWidth={1.5}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {currentBlock ? currentBlock.label : 'Peaceful Moment'}
            </h1>
            {currentBlock && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="text-lg">
                  {formatTime(currentBlock.startTime)} - {formatTime(currentBlock.endTime)}
                </span>
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  {formatCategory(currentBlock.timeCategory)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* SECONDARY: Why is this important? (The Vibe) - Centerpiece */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-2xl">
          <blockquote className="font-serif text-2xl lg:text-3xl leading-relaxed text-foreground/90 mb-6 text-left">
            {contextualQuote.text}
          </blockquote>
          <cite className="text-muted-foreground text-lg font-light not-italic text-right block">
            — {contextualQuote.author}
          </cite>
        </div>
      </div>
      
      {/* TERTIARY: What's next? (The Pacing) - De-emphasized */}
      <div className="flex-shrink-0 mt-16">
        {nextWorkBlock && timeUntilTransition !== Infinity ? (
          <div className="text-center text-accent/60">
            <div className="text-xs">
              Next: {nextWorkBlock.label} • Starts soon
            </div>
          </div>
        ) : (
          <div className="text-center text-accent/40">
            <div className="text-xs">
              Enjoy this time of rest
            </div>
          </div>
        )}
      </div>
    </div>
  );
}