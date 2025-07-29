import type { Meta, StoryObj } from '@storybook/react';
import { InstacartCTA } from './InstacartCTA';

const meta: Meta<typeof InstacartCTA> = {
  title: 'Components/InstacartCTA',
  component: InstacartCTA,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
# Instacart CTA Component

A branded call-to-action button component that meets Instacart's official design requirements for partner integrations.

## Design Specifications

**Button Dimensions:**
- Height: 46px (fixed)
- Width: Dynamic based on text content
- Padding: 16px vertical, 18px horizontal
- Logo Size: 22px × 22px

**Color Schemes:**
- **Light Mode:** Background #FAF1E5, Text #003D29, Border #EFE9E1 (0.5px)
- **Dark Mode:** Background #003D29, Text #FAF1E5, No border

**Brand Colors:**
- Logo uses full color (#FF7009 & #0AAD0A) in both themes

**Copy Testing:**
- "Get Recipe Ingredients" is A/B tested and performs best for recipe content
- "Get Ingredients" is used for grocery list content without recipes
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    contentType: {
      control: { type: 'select' },
      options: ['recipe', 'grocery'],
      description: 'Type of content - affects button text',
      table: {
        type: { summary: 'recipe | grocery' },
        defaultValue: { summary: 'recipe' },
      },
    },
    theme: {
      control: { type: 'select' },
      options: ['light', 'dark'],
      description: 'Visual theme - light or dark mode',
      table: {
        type: { summary: 'light | dark' },
        defaultValue: { summary: 'light' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    onClick: {
      action: 'clicked',
      description: 'Callback function when button is clicked',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Primary Stories - Main Use Cases
export const RecipeLightMode: Story = {
  args: {
    contentType: 'recipe',
    theme: 'light',
  },
  parameters: {
    docs: {
      description: {
        story: 'Default recipe CTA in light mode. Uses A/B tested "Get Recipe Ingredients" copy that performs best.',
      },
    },
  },
};

export const RecipeDarkMode: Story = {
  args: {
    contentType: 'recipe',
    theme: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Recipe CTA in dark mode with high contrast colors for dark interfaces.',
      },
    },
  },
};

export const GroceryLightMode: Story = {
  args: {
    contentType: 'grocery',
    theme: 'light',
  },
  parameters: {
    docs: {
      description: {
        story: 'Grocery list CTA in light mode. Uses shorter "Get Ingredients" copy for non-recipe contexts.',
      },
    },
  },
};

export const GroceryDarkMode: Story = {
  args: {
    contentType: 'grocery',
    theme: 'dark',
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Grocery list CTA in dark mode for use in dark-themed grocery list interfaces.',
      },
    },
  },
};

// State Stories
export const Disabled: Story = {
  args: {
    contentType: 'recipe',
    theme: 'light',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state with reduced opacity and no pointer events.',
      },
    },
  },
};

export const DisabledDark: Story = {
  args: {
    contentType: 'recipe',
    theme: 'dark',
    disabled: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Disabled state in dark mode.',
      },
    },
  },
};

// Layout Stories
export const AllVariants: Story = {
  render: () => {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Light Mode</h3>
          <div className="flex flex-wrap gap-4">
            <InstacartCTA contentType="recipe" theme="light" />
            <InstacartCTA contentType="grocery" theme="light" />
            <InstacartCTA contentType="recipe" theme="light" disabled />
          </div>
        </div>
        
        <div className="space-y-4 p-6 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Dark Mode</h3>
          <div className="flex flex-wrap gap-4">
            <InstacartCTA contentType="recipe" theme="dark" />
            <InstacartCTA contentType="grocery" theme="dark" />
            <InstacartCTA contentType="recipe" theme="dark" disabled />
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'All CTA variants displayed together for comparison. Shows both themes and content types.',
      },
    },
  },
};

export const ResponsiveLayout: Story = {
  render: () => {
    return (
      <div className="max-w-4xl space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Recipe Card</h4>
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-500 mb-3">Delicious Pasta Recipe...</p>
              <InstacartCTA contentType="recipe" theme="light" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Grocery List</h4>
            <div className="p-4 bg-white rounded border">
              <p className="text-sm text-gray-500 mb-3">Shopping list items...</p>
              <InstacartCTA contentType="grocery" theme="light" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600">Dark Interface</h4>
            <div className="p-4 bg-gray-800 rounded border text-white">
              <p className="text-sm text-gray-300 mb-3">Dark mode content...</p>
              <InstacartCTA contentType="recipe" theme="dark" />
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Example usage in different interface contexts showing how the CTA integrates with various layouts.',
      },
    },
  },
};

// Interactive Story
export const Interactive: Story = {
  args: {
    contentType: 'recipe',
    theme: 'light',
    onClick: () => {
      alert('Redirecting to Instacart to get recipe ingredients...');
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive example with click handler. Click the button to see the action.',
      },
    },
  },
}; 