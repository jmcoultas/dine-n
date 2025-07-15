import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { X } from "lucide-react";

export interface TextTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: { title: string; content: string }) => void;
  title?: string;
  content?: string;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  saveButtonText?: string;
  cancelButtonText?: string;
  modalTitle?: string;
  disabled?: boolean;
  titleError?: string;
  contentError?: string;
  className?: string;
}

const TextTypeModal = React.forwardRef<HTMLDivElement, TextTypeModalProps>(
  (
    {
      isOpen,
      onClose,
      onSave,
      title = "",
      content = "",
      titlePlaceholder = "Enter title...",
      contentPlaceholder = "Enter content...",
      saveButtonText = "Save",
      cancelButtonText = "Cancel",
      modalTitle = "Text Editor",
      disabled = false,
      titleError,
      contentError,
      className,
      ...props
    },
    ref
  ) => {
    const [localTitle, setLocalTitle] = useState(title);
    const [localContent, setLocalContent] = useState(content);

    // Reset local state when modal opens/closes or props change
    React.useEffect(() => {
      if (isOpen) {
        setLocalTitle(title);
        setLocalContent(content);
      }
    }, [isOpen, title, content]);

    const handleSave = () => {
      if (onSave) {
        onSave({
          title: localTitle,
          content: localContent,
        });
      }
    };

    const handleCancel = () => {
      // Reset to original values
      setLocalTitle(title);
      setLocalContent(content);
      onClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          ref={ref}
          className={cn(
            "bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col",
            className
          )}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold">{modalTitle}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 space-y-4 overflow-hidden">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Title
              </label>
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                placeholder={titlePlaceholder}
                disabled={disabled}
                className={cn(
                  "w-full",
                  titleError && "border-destructive focus:ring-destructive"
                )}
              />
              {titleError && (
                <div className="text-sm text-destructive">{titleError}</div>
              )}
            </div>

            {/* Content Rich Text Editor */}
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-sm font-medium">
                Content
              </label>
              <div className="flex-1 min-h-0">
                <RichTextEditor
                  value={localContent}
                  onChange={setLocalContent}
                  placeholder={contentPlaceholder}
                  disabled={disabled}
                  error={contentError}
                  minHeight={200}
                  maxHeight={400}
                  className="h-full"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={disabled}
            >
              {cancelButtonText}
            </Button>
            <Button
              onClick={handleSave}
              disabled={disabled}
            >
              {saveButtonText}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

TextTypeModal.displayName = "TextTypeModal";

export { TextTypeModal }; 