"use client";

import { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { Edit3, Eye } from 'lucide-react';

/**
 * ToggleableMarkdownEditor Component
 * 
 * Displays markdown content as beautifully formatted content by default,
 * with an optional toggle to switch to edit mode when needed.
 * 
 * Design Philosophy: View first, edit when needed
 */

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function NovelMarkdownEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className = "",
  autoFocus = false
}: MarkdownEditorProps) {
  
  const [wordCount, setWordCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  
  // Handle content changes
  const handleChange = (newValue?: string) => {
    const content = newValue || '';
    
    // Update word count
    const text = content.replace(/[#*`>-]/g, '').trim();
    const words = text.split(/\s+/).filter((word: string) => word.length > 0).length;
    setWordCount(text.trim() ? words : 0);
    
    // Call parent onChange
    onChange(content);
  };
  
  return (
    <div className={`relative w-full ${className}`}>
      <MDEditor
        value={value || ''}
        onChange={handleChange}
        preview={isEditing ? "edit" : "preview"}
        hideToolbar={isEditing ? false : true}
        visibleDragBar={false}
        data-color-mode="auto"
        height={500}
        style={{
          backgroundColor: 'transparent',
        }}
        textareaProps={{
          placeholder: placeholder,
          autoFocus: autoFocus && isEditing,
          style: {
            fontSize: '14px',
            lineHeight: '1.6',
          }
        }}
      />
      
      {/* Edit/Preview Toggle Button */}
      <div className="flex justify-center mt-3">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-md hover:bg-muted/20"
        >
          {isEditing ? (
            <>
              <Eye className="w-3 h-3" />
              View formatted
            </>
          ) : (
            <>
              <Edit3 className="w-3 h-3" />
              Edit content
            </>
          )}
        </button>
      </div>
      
      {/* Word count indicator */}
      {wordCount > 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/40 pointer-events-none bg-background/80 px-2 py-1 rounded">
          <span>{wordCount} words</span>
        </div>
      )}
    </div>
  );
}