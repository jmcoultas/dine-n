import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Underline, 
  List, 
  ListOrdered, 
  Minus, 
  Link,
  AlertCircle
} from "lucide-react";

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
  id?: string;
  name?: string;
}

// Helper functions to convert between HTML and Markdown
const htmlToMarkdown = (html: string): string => {
  let markdown = html;
  
  // Convert bold
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
  markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**');
  
  // Convert underline (using HTML since markdown doesn't have native underline)
  markdown = markdown.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
  
  // Convert unordered lists
  markdown = markdown.replace(/<ul>[\s\S]*?<\/ul>/g, (match) => {
    const items = match.match(/<li>(.*?)<\/li>/g) || [];
    return items.map((item: string) => {
      const text = item.replace(/<li>(.*?)<\/li>/, '$1');
      return `- ${text}`;
    }).join('\n') + '\n';
  });
  
  // Convert ordered lists
  markdown = markdown.replace(/<ol>[\s\S]*?<\/ol>/g, (match) => {
    const items = match.match(/<li>(.*?)<\/li>/g) || [];
    return items.map((item: string, index: number) => {
      const text = item.replace(/<li>(.*?)<\/li>/, '$1');
      return `${index + 1}. ${text}`;
    }).join('\n') + '\n';
  });
  
  // Convert horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/g, '\n---\n');
  
  // Convert links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');
  
  // Convert paragraphs
  markdown = markdown.replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n');
  
  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.trim();
  
  return markdown;
};

const markdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  // Convert bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert underline (preserve HTML tags)
  // html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>'); // Already HTML
  
  // Convert unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');
  
  // Convert ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // This is a simplified approach - in a real app you'd want more robust list handling
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Convert links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>');
  
  // Convert paragraphs (simple approach)
  html = html.replace(/\n\n/g, '</p><p>');
  if (html && !html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
};

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  (
    {
      value = "",
      onChange,
      placeholder = "Start typing...",
      disabled = false,
      error,
      className,
      minHeight = 120,
      maxHeight = 400,
      id,
      name,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [htmlContent, setHtmlContent] = useState(markdownToHtml(value));
    const editorRef = useRef<HTMLDivElement>(null);
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");

    // Convert markdown to HTML when value changes
    useEffect(() => {
      const newHtml = markdownToHtml(value);
      setHtmlContent(newHtml);
      if (editorRef.current && newHtml !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = newHtml;
      }
    }, [value]);

    const handleInput = () => {
      if (editorRef.current && onChange) {
        const html = editorRef.current.innerHTML;
        const markdown = htmlToMarkdown(html);
        setHtmlContent(html);
        onChange(markdown);
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    const executeCommand = (command: string, value?: string) => {
      if (disabled) return;
      
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleInput();
    };

    const handleBold = () => executeCommand('bold');
    const handleUnderline = () => executeCommand('underline');
    
    const handleBulletList = () => {
      if (disabled) return;
      
      try {
        // Save current selection
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        
        const success = document.execCommand('insertUnorderedList', false);
        
        if (!success) {
          // Fallback: manually insert list
          const listHtml = '<ul><li>New item</li></ul>';
          document.execCommand('insertHTML', false, listHtml);
        }
        
        // Restore focus and selection
        editorRef.current?.focus();
        if (range && selection) {
          try {
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e) {
            // Fallback if range is invalid
            editorRef.current?.focus();
          }
        }
      } catch (error) {
        console.warn('Error creating bullet list:', error);
      }
      
      handleInput();
    };
    
    const handleNumberedList = () => {
      if (disabled) return;
      
      try {
        // Save current selection
        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);
        
        const success = document.execCommand('insertOrderedList', false);
        
        if (!success) {
          // Fallback: manually insert list
          const listHtml = '<ol><li>New item</li></ol>';
          document.execCommand('insertHTML', false, listHtml);
        }
        
        // Restore focus and selection
        editorRef.current?.focus();
        if (range && selection) {
          try {
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (e) {
            // Fallback if range is invalid
            editorRef.current?.focus();
          }
        }
      } catch (error) {
        console.warn('Error creating numbered list:', error);
      }
      
      handleInput();
    };
    
    const handleSectionBreak = () => {
      executeCommand('insertHTML', '<hr>');
    };

    const handleLinkClick = () => {
      const selectedText = window.getSelection()?.toString() || "";
      setLinkText(selectedText);
      setLinkUrl("");
      setShowLinkDialog(true);
    };

    const insertLink = () => {
      if (linkUrl) {
        const linkHtml = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">${linkText || linkUrl}</a>`;
        executeCommand('insertHTML', linkHtml);
      }
      setShowLinkDialog(false);
      setLinkUrl("");
      setLinkText("");
    };

    const isCommandActive = (command: string): boolean => {
      try {
        if (command === 'insertUnorderedList') {
          return document.queryCommandState('insertUnorderedList');
        }
        if (command === 'insertOrderedList') {
          return document.queryCommandState('insertOrderedList');
        }
        return document.queryCommandState(command);
      } catch {
        return false;
      }
    };

    const toolbarButtons = [
      {
        icon: Bold,
        command: 'bold',
        handler: handleBold,
        tooltip: 'Bold (Ctrl+B)',
        active: isCommandActive('bold')
      },
      {
        icon: Underline,
        command: 'underline',
        handler: handleUnderline,
        tooltip: 'Underline (Ctrl+U)',
        active: isCommandActive('underline')
      },
      {
        icon: List,
        command: 'insertUnorderedList',
        handler: handleBulletList,
        tooltip: 'Bullet List (Ctrl+L)',
        active: isCommandActive('insertUnorderedList')
      },
      {
        icon: ListOrdered,
        command: 'insertOrderedList',
        handler: handleNumberedList,
        tooltip: 'Numbered List (Ctrl+Shift+L)',
        active: isCommandActive('insertOrderedList')
      },
      {
        icon: Minus,
        command: 'insertHorizontalRule',
        handler: handleSectionBreak,
        tooltip: 'Section Break',
        active: false
      },
      {
        icon: Link,
        command: 'createLink',
        handler: handleLinkClick,
        tooltip: 'Insert Link',
        active: false
      }
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Handle keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            handleBold();
            break;
          case 'u':
            e.preventDefault();
            handleUnderline();
            break;
          case 'l':
            e.preventDefault();
            if (e.shiftKey) {
              handleNumberedList();
            } else {
              handleBulletList();
            }
            break;
        }
      }
      
      // Handle Enter key in lists to maintain list formatting
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const listItem = container.nodeType === Node.TEXT_NODE 
            ? container.parentElement?.closest('li')
            : (container as Element).closest('li');
          
          if (listItem) {
            // Let the browser handle list item creation
            setTimeout(() => handleInput(), 0);
          }
        }
      }
    };

    return (
      <div className={cn("relative", className)} {...props}>
        {/* Toolbar */}
        <div className={cn(
          "flex items-center gap-1 p-2 border-b border-border bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}>
          {toolbarButtons.map((button, index) => {
            const Icon = button.icon;
            return (
              <Button
                key={index}
                variant={button.active ? "default" : "ghost"}
                size="sm"
                onClick={button.handler}
                disabled={disabled}
                title={button.tooltip}
                className="h-8 w-8 p-0"
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full p-3 text-sm bg-background border-l border-r border-b rounded-b-md",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "prose prose-sm max-w-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus:ring-destructive",
            isFocused && !error && "ring-2 ring-ring ring-offset-2",
            disabled && "bg-muted cursor-not-allowed",
            // Ensure lists are properly styled
            "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
            "[&_li]:my-1",
            className
          )}
          style={{ 
            minHeight: `${minHeight}px`, 
            maxHeight: `${maxHeight}px`,
            overflowY: 'auto'
          }}
          data-placeholder={placeholder}
        />

        {/* Placeholder */}
        {!htmlContent && (
          <div className={cn(
            "absolute top-[52px] left-3 text-muted-foreground text-sm pointer-events-none",
            disabled && "opacity-50"
          )}>
            {placeholder}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-1 mt-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Link Dialog */}
        {showLinkDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg shadow-lg w-96 max-w-[90vw]">
              <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Link Text
                  </label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    className="w-full p-2 border border-input rounded-md text-sm"
                    placeholder="Enter link text"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full p-2 border border-input rounded-md text-sm"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowLinkDialog(false)}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={insertLink}
                  disabled={!linkUrl}
                  size="sm"
                >
                  Insert Link
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor }; 