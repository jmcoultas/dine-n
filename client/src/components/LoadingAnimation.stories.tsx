import type { Meta, StoryObj } from '@storybook/react';
import { LoadingAnimation } from './LoadingAnimation';

const meta = {
  title: 'Components/LoadingAnimation',
  component: LoadingAnimation,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    baseMessage: {
      control: 'text',
      description: 'The base message to show when no messages array is provided',
    },
    messages: {
      control: 'object',
      description: 'Array of messages to cycle through',
    },
  },
} satisfies Meta<typeof LoadingAnimation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithCustomMessage: Story = {
  args: {
    baseMessage: 'Preparing your delicious recipes...',
  },
};

export const WithRotatingMessages: Story = {
  args: {
    messages: [
      'Analyzing your preferences...',
      'Finding the perfect recipes...',
      'Calculating nutritional values...',
      'Generating your meal plan...',
      'Almost ready!'
    ],
  },
};

export const MealPlanGeneration: Story = {
  args: {
    messages: [
      'Cooking up your meal plan...',
      'Selecting recipes based on your preferences...',
      'Checking ingredient availability...',
      'Balancing nutritional content...',
      'Finalizing your personalized plan...'
    ],
  },
};

export const RecipeSearch: Story = {
  args: {
    messages: [
      'Searching for recipes...',
      'Filtering by dietary restrictions...',
      'Matching cuisine preferences...',
      'Calculating cook times...',
      'Found the perfect matches!'
    ],
  },
}; 