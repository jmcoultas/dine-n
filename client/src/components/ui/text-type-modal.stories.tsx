import type { Meta, StoryObj } from '@storybook/react';
import { TextTypeModal } from './text-type-modal';
import { useState } from 'react';
import { Button } from './button';

const meta: Meta<typeof TextTypeModal> = {
  title: 'UI/TextTypeModal',
  component: TextTypeModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A modal component that combines a basic input field with a rich text editor.

## Features
- **Title input field** - Basic text input that expands to modal edges
- **Rich text editor** - Full-featured content editor with formatting options
- **Modal controls** - Save/Cancel buttons with proper state management
- **Validation support** - Error states for both title and content
- **Keyboard navigation** - ESC key to close, proper focus management
- **Flexible sizing** - Responsive design that works on all screen sizes
- **State management** - Local state with reset on cancel

## Use Cases
Perfect for creating/editing articles, notes, comments, or any content that needs both a title and formatted body text.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    onClose: {
      description: 'Callback fired when modal is closed',
    },
    onSave: {
      description: 'Callback fired when save button is clicked',
    },
    title: {
      control: 'text',
      description: 'Initial title value',
    },
    content: {
      control: 'text',
      description: 'Initial content value (HTML)',
    },
    titlePlaceholder: {
      control: 'text',
      description: 'Placeholder text for title input',
    },
    contentPlaceholder: {
      control: 'text',
      description: 'Placeholder text for content editor',
    },
    saveButtonText: {
      control: 'text',
      description: 'Text for save button',
    },
    cancelButtonText: {
      control: 'text',
      description: 'Text for cancel button',
    },
    modalTitle: {
      control: 'text',
      description: 'Title shown in modal header',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the modal is disabled',
    },
    titleError: {
      control: 'text',
      description: 'Error message for title field',
    },
    contentError: {
      control: 'text',
      description: 'Error message for content field',
    },
  },
};

export default meta;
type Story = StoryObj<typeof TextTypeModal>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>
          Open Text Editor Modal
        </Button>
        
        <TextTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={(data) => {
            console.log('Saved:', data);
            alert(`Saved!\nTitle: ${data.title}\nContent: ${data.content}`);
            setIsOpen(false);
          }}
        />
      </div>
    );
  },
};

export const WithInitialContent: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>
          Edit Existing Content
        </Button>
        
        <TextTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={(data) => {
            console.log('Updated:', data);
            alert(`Updated!\nTitle: ${data.title}\nContent: ${data.content}`);
            setIsOpen(false);
          }}
          title="My Article Title"
          content="This is some **existing content** with <u>formatting</u>.\n\n- Bullet point 1\n- Bullet point 2"
          modalTitle="Edit Article"
          saveButtonText="Update"
        />
      </div>
    );
  },
};

export const WithValidation: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [titleError, setTitleError] = useState('');
    const [contentError, setContentError] = useState('');

    const handleSave = (data: { title: string; content: string }) => {
      // Reset errors
      setTitleError('');
      setContentError('');

      // Validate title
      if (!data.title.trim()) {
        setTitleError('Title is required');
        return;
      }

      if (data.title.length < 3) {
        setTitleError('Title must be at least 3 characters long');
        return;
      }

      // Validate content - remove markdown syntax for length check
      const textContent = data.content.replace(/[*_\[\]()]/g, '').trim();
      if (!textContent) {
        setContentError('Content is required');
        return;
      }

      if (textContent.length < 10) {
        setContentError('Content must be at least 10 characters long');
        return;
      }

      // If validation passes
      console.log('Validated and saved:', data);
      alert('Successfully saved!');
      setIsOpen(false);
    };

    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>
          Open with Validation
        </Button>
        
        <TextTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
          modalTitle="Create New Post"
          titlePlaceholder="Enter a compelling title..."
          contentPlaceholder="Write your post content here..."
          titleError={titleError}
          contentError={contentError}
        />
      </div>
    );
  },
};

export const CustomLabels: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>
          Open Recipe Editor
        </Button>
        
        <TextTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={(data) => {
            console.log('Recipe saved:', data);
            alert(`Recipe saved!\nName: ${data.title}\nInstructions: ${data.content}`);
            setIsOpen(false);
          }}
          modalTitle="Recipe Editor"
          titlePlaceholder="Enter recipe name..."
          contentPlaceholder="Enter cooking instructions..."
          saveButtonText="Save Recipe"
          cancelButtonText="Discard"
        />
      </div>
    );
  },
};

export const DisabledState: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div>
        <Button onClick={() => setIsOpen(true)}>
          Open Read-Only Modal
        </Button>
        
        <TextTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Read-Only Document"
          content="This content is **read-only**. You cannot edit it.\n\n- All inputs are disabled\n- Save button is disabled"
          modalTitle="Document Viewer"
          disabled={true}
          saveButtonText="Save (Disabled)"
        />
      </div>
    );
  },
};

export const InteractiveDemo: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [savedData, setSavedData] = useState<{ title: string; content: string } | null>(null);

    const handleSave = (data: { title: string; content: string }) => {
      setSavedData(data);
      setIsOpen(false);
    };

    return (
      <div className="space-y-4">
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Interactive Demo
          </Button>
        </div>
        
        {savedData && (
          <div className="p-4 border rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">Last Saved Data:</h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Title:</span> {savedData.title}
              </div>
              <div>
                <span className="font-medium">Content Markdown:</span>
                <div className="text-xs font-mono bg-background p-2 rounded mt-1 break-all">
                  {savedData.content}
                </div>
              </div>
              <div>
                <span className="font-medium">Rendered Content:</span>
                <div 
                  className="prose prose-sm max-w-none mt-1 p-2 border rounded"
                  dangerouslySetInnerHTML={{ __html: savedData.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/<u>(.*?)<\/u>/g, '<u>$1</u>').replace(/^- (.+)$/gm, '<li>$1</li>').replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>').replace(/\n\n/g, '</p><p>').replace(/^(?!<)/, '<p>').replace(/$(?!>)/, '</p>') }}
                />
              </div>
            </div>
          </div>
        )}
        
        <TextTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
          title={savedData?.title || ''}
          content={savedData?.content || ''}
          modalTitle="Interactive Text Editor"
          titlePlaceholder="Enter your title here..."
          contentPlaceholder="Write your content with rich formatting..."
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing the modal with persistent state and real-time preview of saved data.',
      },
    },
  },
};

export const FormIntegration: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({
      title: '',
      content: '',
      author: '',
      category: 'general',
    });

    const handleSave = (textData: { title: string; content: string }) => {
      setFormData(prev => ({
        ...prev,
        title: textData.title,
        content: textData.content,
      }));
      setIsOpen(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      console.log('Form submitted:', formData);
      alert('Form submitted successfully!');
    };

    return (
      <div className="w-full max-w-md space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Author
            </label>
            <input
              type="text"
              value={formData.author}
              onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
              className="w-full p-2 border border-input rounded-md text-sm"
              placeholder="Enter author name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-2 border border-input rounded-md text-sm"
            >
              <option value="general">General</option>
              <option value="news">News</option>
              <option value="tutorial">Tutorial</option>
              <option value="review">Review</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Title & Content
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(true)}
              className="w-full"
            >
              {formData.title ? `Edit: ${formData.title}` : 'Add Title & Content'}
            </Button>
          </div>
          
          <Button type="submit" className="w-full">
            Submit Article
          </Button>
        </form>
        
        <TextTypeModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={handleSave}
          title={formData.title}
          content={formData.content}
          modalTitle="Article Editor"
          titlePlaceholder="Enter article title..."
          contentPlaceholder="Write your article content..."
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example showing how to integrate the TextTypeModal with a larger form.',
      },
    },
  },
}; 