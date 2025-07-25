"use client";

import { useState, useEffect } from 'react';
import { 
  EditorContent, 
  EditorRoot, 
  EditorCommand, 
  EditorCommandItem, 
  EditorCommandEmpty,
  StarterKit,
  TiptapLink,
  TiptapImage,
  TaskList,
  TaskItem,
  TiptapUnderline,
  TextStyle,
  Color
} from 'novel';

/**
 * NovelMarkdownEditor Component
 * 
 * A true WYSIWYG editor powered by Novel.sh that renders Markdown 
 * immediately as formatted content. Users see beautiful, styled 
 * documents while editing, not raw Markdown code.
 * 
 * Design Philosophy: Professional document editing with immediate visual feedback
 */

interface NovelMarkdownEditorProps {
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
}: NovelMarkdownEditorProps) {
  
  const [content, setContent] = useState<any>(null);
  const [wordCount, setWordCount] = useState(0);
  
  // Define extensions for the editor
  const extensions = [
    StarterKit.configure({
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'my-4 list-disc pl-6',
        },
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'my-4 list-decimal pl-6',
        },
      },
      listItem: {
        HTMLAttributes: {
          class: 'my-1',
        },
      },
      heading: {
        HTMLAttributes: {
          class: 'font-bold leading-tight',
        },
      },
    }),
    TiptapLink.configure({
      HTMLAttributes: {
        class: 'text-accent underline underline-offset-2 hover:text-accent/80',
      },
    }),
    TiptapUnderline,
    TextStyle,
    Color,
    TaskList.configure({
      HTMLAttributes: {
        class: 'not-prose pl-2',
      },
    }),
    TaskItem.configure({
      HTMLAttributes: {
        class: 'flex items-start my-4',
      },
      nested: true,
    }),
  ];
  
  // Convert initial Markdown to HTML content on mount
  useEffect(() => {
    if (value && !content) {
      // For now, we'll pass the markdown as HTML and let TipTap handle it
      // In a production app, you might want to use a markdown parser here
      setContent(value);
    }
  }, [value, content]);
  
  // Handle content updates from the editor
  const handleUpdate = ({ editor }: { editor: any }) => {
    // Get HTML content and convert to Markdown for output
    const html = editor.getHTML();
    const text = editor.getText();
    
    // For now, we'll return the HTML as the value
    // In a full implementation, you might want to convert HTML back to Markdown
    onChange(html);
    
    // Update word count
    const words = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
    setWordCount(text.trim() ? words : 0);
  };
  
  return (
    <div className={`relative w-full ${className}`}>
      <EditorRoot>
        <EditorContent
          className="
            min-h-[400px] 
            w-full
            rounded-lg
            border-none
            outline-none
            text-foreground
            leading-relaxed
            text-[15px]
            
            /* Custom Novel styling for our theme */
            prose 
            prose-neutral 
            dark:prose-invert
            prose-headings:font-bold
            prose-h1:text-2xl
            prose-h2:text-xl
            prose-h3:text-lg
            prose-p:leading-relaxed
            prose-ul:my-4
            prose-ol:my-4
            prose-li:my-1
            prose-strong:font-bold
            prose-em:italic
            prose-blockquote:border-l-4
            prose-blockquote:border-accent
            prose-blockquote:pl-4
            prose-blockquote:italic
            
            /* Ensure lists are visible */
            [&_ul]:list-disc
            [&_ol]:list-decimal
            [&_ul]:ml-6
            [&_ol]:ml-6
            [&_li]:ml-0
            
            /* Remove default prose max-width to fill container */
            max-w-none
            
            /* Focus styles */
            focus:ring-0
            focus:border-none
            focus:outline-none
            
            /* Selection styles */
            selection:bg-accent/20
            selection:text-accent-foreground
          "
          extensions={extensions}
          editorProps={{
            attributes: {
              class: 'prose prose-neutral dark:prose-invert focus:outline-none max-w-none min-h-[400px] p-4',
            },
          }}
          onUpdate={handleUpdate}
          initialContent={content}
          placeholder={placeholder}
          autofocus={autoFocus}
        />
        
        <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
          <EditorCommandEmpty className="px-2 text-muted-foreground">
            No results
          </EditorCommandEmpty>
          
          {/* Add any custom slash commands here if needed */}
          <EditorCommandItem
            value="heading1"
            onCommand={(val) => {
              // Handle heading1 command
            }}
          >
            Heading 1
          </EditorCommandItem>
          
          <EditorCommandItem
            value="heading2"
            onCommand={(val) => {
              // Handle heading2 command  
            }}
          >
            Heading 2
          </EditorCommandItem>
        </EditorCommand>
      </EditorRoot>
      
      {/* Word count indicator */}
      {wordCount > 0 && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/40 pointer-events-none">
          <span>{wordCount} words</span>
        </div>
      )}
    </div>
  );
}