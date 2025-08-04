"use client";

import { useState } from 'react';

/**
 * PanelDimmer Component
 * 
 * Creates targeted overlay effects for specific panels during theater mode.
 * Provides smooth transitions and smart user interaction guidance.
 * 
 * Features:
 * - Dark overlay with configurable opacity
 * - Smooth fade transitions
 * - Non-interactive overlay (pointer-events disabled)
 * - Click detection for user guidance tooltips
 * - Absolute positioning to cover target panels
 */

interface PanelDimmerProps {
  /** Whether the dimmer overlay is active */
  isActive: boolean;
  /** Callback for first click on dimmed area (tooltip trigger) */
  onFirstClick?: () => void;
  /** Custom className for positioning and styling */
  className?: string;
  /** Target panel identifier for debugging */
  target?: string;
  /** Custom overlay opacity (default: 0.7) */
  opacity?: number;
}

export function PanelDimmer({ 
  isActive, 
  onFirstClick,
  className = "",
  target,
  opacity = 0.7
}: PanelDimmerProps) {
  
  const [hasClicked, setHasClicked] = useState(false);
  
  // Handle click on dimmed area for tooltip guidance
  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only trigger tooltip on first click
    if (!hasClicked && onFirstClick) {
      setHasClicked(true);
      onFirstClick();
    }
  };
  
  if (!isActive) return null;
  
  return (
    <div
      className={`
        absolute inset-0 z-30 cursor-pointer select-none
        transition-opacity duration-300 ease-in-out
        ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        ${className}
      `}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${opacity})`,
        pointerEvents: isActive ? 'auto' : 'none'
      }}
      onClick={handleClick}
      aria-label={`Panel dimmed in theater mode. Press T to toggle.`}
      role="button"
      tabIndex={-1} // Not keyboard focusable since ESC is the primary interaction
    >
      {/* Invisible overlay content - click area for tooltip trigger */}
      <div className="h-full w-full" />
      
    </div>
  );
}