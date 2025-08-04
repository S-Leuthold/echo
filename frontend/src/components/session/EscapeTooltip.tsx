"use client";

import { useEffect, useState } from 'react';
import { Keyboard } from 'lucide-react';

/**
 * EscapeTooltip Component
 * 
 * Shows helpful guidance to users on how to exit theater mode.
 * Appears on first click of dimmed panels and auto-dismisses.
 * 
 * Features:
 * - Smart first-time user guidance
 * - Session storage to prevent repeated tooltips
 * - Auto-dismiss after 3 seconds
 * - Smooth fade transitions
 * - Accessible keyboard hint
 * - Positioned in top-right corner
 */

interface EscapeTooltipProps {
  /** Whether the tooltip should be visible */
  isVisible: boolean;
  /** Callback when tooltip is dismissed */
  onDismiss?: () => void;
  /** Custom positioning className */
  className?: string;
}

export function EscapeTooltip({ 
  isVisible, 
  onDismiss,
  className = ""
}: EscapeTooltipProps) {
  
  const [shouldRender, setShouldRender] = useState(isVisible);
  
  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      
      const timer = setTimeout(() => {
        setShouldRender(false);
        onDismiss?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]); // Removed onDismiss from dependencies to prevent infinite loops
  
  // Don't render if not visible and animation is complete
  if (!isVisible && !shouldRender) return null;
  
  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-xs
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${className}
      `}
      role="tooltip"
      aria-live="polite"
    >
      <div className="
        bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-lg
        text-white text-sm
      ">
        <div className="flex items-center gap-2 mb-2">
          <Keyboard className="w-4 h-4 text-white/80" />
          <span className="font-medium">Theater Mode Active</span>
        </div>
        
        <p className="text-white/90 leading-relaxed">
          Press <kbd className="
            px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono border border-white/30
          ">Q</kbd> + <kbd className="
            px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono border border-white/30
          ">T</kbd> to toggle tranquil mode
        </p>
        
        {/* Visual indicator that this will auto-dismiss */}
        <div className="mt-2 h-0.5 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/60 rounded-full transition-all duration-3000 ease-linear"
            style={{
              width: isVisible ? '0%' : '100%',
              transitionDuration: isVisible ? '3000ms' : '0ms'
            }}
          />
        </div>
      </div>
      
      {/* Subtle arrow pointing toward dimmed areas */}
      <div className="absolute -bottom-1 right-4 w-2 h-2 bg-black/90 rotate-45 border-r border-b border-white/20" />
    </div>
  );
}