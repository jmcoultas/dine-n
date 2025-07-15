import type { Meta, StoryObj } from '@storybook/react';
import { RichTextEditor } from './rich-text-editor';
import { useState } from 'react';

const meta: Meta<typeof RichTextEditor> = {
  title: 'UI/RichTextEditor',
  component: RichTextEditor,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A rich text editor component that outputs Markdown format.

## Features
- **Bold** and **Underline** text formatting
- **Bullet lists** and **numbered lists**
- **Section breaks** (horizontal rules)
- **Hyperlinks** with custom text
- **Keyboard shortcuts** (Ctrl+B for bold, Ctrl+U for underline)
- **Markdown output** - Content is saved as Markdown instead of HTML
- **Disabled state** for read-only scenarios
- **Error state** with validation messages
- **Focus state** with visual feedback
- **Customizable height** with min/max constraints

## Output Format
The editor outputs clean Markdown text that can be easily stored, processed, and rendered in various contexts.

## Usage
Perfect for content creation, comments, descriptions, and any scenario requiring formatted text input with Markdown output.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The HTML content of the editor',
    },
    onChange: {
      description: 'Callback fired when content changes',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when editor is empty',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the editor is disabled',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    minHeight: {
      control: 'number',
      description: 'Minimum height in pixels',
    },
    maxHeight: {
      control: 'number',
      description: 'Maximum height in pixels',
    },
  },
};

export default meta;
type Story = StoryObj<typeof RichTextEditor>;

export const Default: Story = {
  args: {
    placeholder: 'Start typing your content...',
    minHeight: 120,
    maxHeight: 400,
  },
};

export const WithInitialContent: Story = {
  args: {
    value: 'This is some **bold text** and <u>underlined text</u>.\n\n- First bullet point\n- Second bullet point\n\nAnd here\'s a [link to example.com](https://example.com).',
    placeholder: 'Start typing...',
  },
};

export const Disabled: Story = {
  args: {
    value: '<p>This editor is <strong>disabled</strong>. You cannot edit this content.</p><ul><li>Toolbar is disabled</li><li>Content is read-only</li></ul>',
    disabled: true,
    placeholder: 'This editor is disabled',
  },
};

export const WithError: Story = {
  args: {
    value: '<p>This content has validation errors.</p>',
    error: 'Content must be at least 50 characters long',
    placeholder: 'Enter your content...',
  },
};

export const CustomHeight: Story = {
  args: {
    placeholder: 'This editor has custom height constraints...',
    minHeight: 200,
    maxHeight: 300,
  },
};

export const Interactive: Story = {
  render: () => {
    const [content, setContent] = useState('Try out all the formatting options!');
    const [error, setError] = useState('');

    const handleChange = (newContent: string) => {
      setContent(newContent);
      
      // Simple validation example - remove markdown syntax for length check
      const textLength = newContent.replace(/[*_\[\]()]/g, '').trim().length;
      if (textLength > 0 && textLength < 10) {
        setError('Content must be at least 10 characters long');
      } else {
        setError('');
      }
    };

    // Convert markdown to HTML for preview
    const markdownToHtml = (markdown: string): string => {
      let html = markdown;
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
      html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
      html = html.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');
      html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
      html = html.replace(/^---$/gm, '<hr>');
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>');
      html = html.replace(/\n\n/g, '</p><p>');
      if (html && !html.startsWith('<')) {
        html = '<p>' + html + '</p>';
      }
      return html;
    };

    return (
      <div className="w-full max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Rich Text Content
          </label>
          <RichTextEditor
            value={content}
            onChange={handleChange}
            error={error}
            placeholder="Try formatting your text with the toolbar..."
            minHeight={150}
            maxHeight={400}
          />
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium">Markdown Output:</div>
          <div className="p-3 bg-muted rounded-md text-xs font-mono break-all">
            {content || '<empty>'}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="text-sm font-medium">Rendered Preview:</div>
          <div 
            className="p-3 border rounded-md prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
          />
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example showing real-time HTML output and rendered preview with validation.',
      },
    },
  },
};

export const FormExample: Story = {
  render: () => {
    const [formData, setFormData] = useState({
      title: '',
      content: '<p>Enter your article content here...</p>',
      tags: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const newErrors: Record<string, string> = {};
      
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      }
      
      const contentText = formData.content.replace(/<[^>]*>/g, '').trim();
      if (contentText.length < 20) {
        newErrors.content = 'Content must be at least 20 characters long';
      }
      
      setErrors(newErrors);
      
      if (Object.keys(newErrors).length === 0) {
        alert('Form submitted successfully!');
        console.log('Form data:', formData);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Article Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full p-2 border border-input rounded-md text-sm"
            placeholder="Enter article title"
          />
          {errors.title && (
            <div className="text-sm text-destructive mt-1">{errors.title}</div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Article Content
          </label>
          <RichTextEditor
            value={formData.content}
            onChange={(content) => setFormData(prev => ({ ...prev, content }))}
            error={errors.content}
            placeholder="Write your article content here..."
            minHeight={200}
            maxHeight={500}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">
            Tags (optional)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            className="w-full p-2 border border-input rounded-md text-sm"
            placeholder="Enter tags separated by commas"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Publish Article
        </button>
      </form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of using the RichTextEditor in a form with validation.',
      },
    },
  },
};

export const FeatureShowcase: Story = {
  render: () => {
    const [content, setContent] = useState(`Rich Text Editor Features

This editor supports the following formatting options:

**Bold text** - Use Ctrl+B or click the bold button
<u>Underlined text</u> - Use Ctrl+U or click the underline button

Bullet lists:
- First item
- Second item
- Third item

Numbered lists:
1. Step one
2. Step two
3. Step three

---

Section breaks (above) help organize content.

Links: [Visit Example.com](https://example.com)

Try editing this content to see all features in action!`);

    return (
      <div className="w-full max-w-2xl">
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder="Showcase all formatting features..."
          minHeight={300}
          maxHeight={600}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Comprehensive showcase of all available formatting features.',
      },
    },
  },
};

export const States: Story = {
  render: () => {
    const [content1, setContent1] = useState('<p>Normal state - try editing me!</p>');
    const [content2, setContent2] = useState('<p>Focused state - click to see focus styling</p>');
    const [content3] = useState('<p>Disabled state - cannot be edited</p>');
    const [content4, setContent4] = useState('<p>Error state - validation failed</p>');

    return (
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Normal State</h3>
          <RichTextEditor
            value={content1}
            onChange={setContent1}
            placeholder="Normal editor state..."
            minHeight={100}
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Focused State</h3>
          <RichTextEditor
            value={content2}
            onChange={setContent2}
            placeholder="Click to see focus styling..."
            minHeight={100}
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Disabled State</h3>
          <RichTextEditor
            value={content3}
            disabled
            placeholder="This editor is disabled..."
            minHeight={100}
          />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Error State</h3>
          <RichTextEditor
            value={content4}
            onChange={setContent4}
            error="This content contains validation errors"
            placeholder="Editor with error state..."
            minHeight={100}
          />
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstration of all component states: normal, focused, disabled, and error.',
      },
    },
  },
}; 