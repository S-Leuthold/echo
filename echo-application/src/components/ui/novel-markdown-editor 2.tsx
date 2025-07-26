"use client";

import { useState, useEffect, useRef } from 'react';
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
  
  const [wordCount, setWordCount] = useState(0);
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  // DIAGNOSTIC: Track prop changes
  useEffect(() => {
    console.log('📝 NOVEL EDITOR: Props changed:', {
      valueLength: value?.length || 0,
      valueType: typeof value,
      hasValue: !!value,
      valuePreview: value?.slice(0, 100) + '...',
      editorRefExists: !!editorRef.current,
      isEditorReady,
      timestamp: new Date().toISOString()
    });
  }, [value, isEditorReady]);
  
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
  
  // Update editor content whenever value prop changes
  useEffect(() => {
    console.log('🔄 NOVEL EDITOR: Value update effect triggered:', {
      newValue: value,
      newValueLength: value?.length || 0,
      newValueType: typeof value,
      editorExists: !!editorRef.current,
      editorCanUpdate: !!(editorRef.current && editorRef.current.commands),
      isEditorReady,
      timestamp: new Date().toISOString()
    });
    
    // Only update if editor is ready and we have content
    if (isEditorReady && editorRef.current && editorRef.current.commands) {
      console.log('✅ NOVEL EDITOR: Editor ready, attempting content update');
      
      try {
        // Get current editor content to compare
        const currentContent = editorRef.current.getHTML();
        console.log('🔍 NOVEL EDITOR: Current editor content:', currentContent);
        console.log('🔍 NOVEL EDITOR: New value to set:', value);
        
        // Only update if content actually differs
        if (currentContent !== value) {
          console.log('🚀 NOVEL EDITOR: Content differs, updating editor');
          editorRef.current.commands.setContent(value || '');
          console.log('✅ NOVEL EDITOR: Content update successful');
        } else {
          console.log('ℹ️ NOVEL EDITOR: Content is the same, skipping update');
        }
      } catch (error) {
        console.error('❌ NOVEL EDITOR: Error setting content:', error);
        console.error('❌ NOVEL EDITOR: Editor state:', {
          editorExists: !!editorRef.current,
          editorCanUpdate: !!(editorRef.current && editorRef.current.commands),
          errorMessage: error.message,
          errorStack: error.stack
        });
      }
    } else {
      console.warn('⚠️ NOVEL EDITOR: Cannot update content:', {
        isEditorReady,
        hasEditor: !!editorRef.current,
        hasCommands: !!(editorRef.current && editorRef.current.commands),
        hasValue: !!value,
        valueLength: value?.length || 0
      });
    }
  }, [value, isEditorReady]);
  
  // Handle content updates from the editor
  const handleUpdate = ({ editor }: { editor: any }) => {
    console.log('📝 NOVEL EDITOR: handleUpdate called');
    
    // Store editor reference for force updates and mark as ready
    if (!editorRef.current) {
      editorRef.current = editor;
      setIsEditorReady(true);
      console.log('📝 NOVEL EDITOR: Editor reference stored and marked as ready');
    }
    
    // Get HTML content and convert to Markdown for output
    const html = editor.getHTML();
    const text = editor.getText();
    
    console.log('📝 NOVEL EDITOR: Content from editor:', {
      htmlLength: html?.length || 0,
      textLength: text?.length || 0,
      htmlPreview: html?.slice(0, 100) + '...',
      textPreview: text?.slice(0, 100) + '...'
    });
    
    // For now, we'll return the HTML as the value
    // In a full implementation, you might want to convert HTML back to Markdown
    console.log('📝 NOVEL EDITOR: Calling onChange with:', html);
    onChange(html);
    
    // Update word count
    const words = text.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
    setWordCount(text.trim() ? words : 0);
    console.log('📝 NOVEL EDITOR: Word count updated:', words);
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
          initialContent={value || ''}
          placeholder={placeholder}
          autofocus={autoFocus}
          immediatelyRender={false}
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