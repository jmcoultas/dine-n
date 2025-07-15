import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
};

export const FoodPreferences: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">Vegetarian</Badge>
      <Badge variant="secondary">Gluten-Free</Badge>
      <Badge variant="secondary">Italian</Badge>
      <Badge variant="secondary">Chicken</Badge>
      <Badge variant="outline">Dairy-Free</Badge>
      <Badge variant="destructive">Nuts</Badge>
    </div>
  ),
};

export const WithRemoveButton: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary" className="flex items-center gap-1">
        Vegetarian
        <button className="ml-1 hover:bg-muted rounded-full">×</button>
      </Badge>
      <Badge variant="secondary" className="flex items-center gap-1">
        Italian Cuisine
        <button className="ml-1 hover:bg-muted rounded-full">×</button>
      </Badge>
      <Badge variant="outline" className="flex items-center gap-1">
        Gluten-Free
        <button className="ml-1 hover:bg-muted rounded-full">×</button>
      </Badge>
    </div>
  ),
}; 