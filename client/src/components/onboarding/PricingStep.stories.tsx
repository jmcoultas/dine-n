import type { Meta, StoryObj } from '@storybook/react';
import { PricingStep } from './PricingStep';

const meta: Meta<typeof PricingStep> = {
  title: 'Onboarding/PricingStep',
  component: PricingStep,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The pricing selection step in the onboarding flow, showing only the premium card with a free plan option below.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    onSelectFree: {
      action: 'free-selected',
      description: 'Callback when user chooses to continue with free plan',
    },
    onBack: {
      action: 'back-clicked',
      description: 'Callback when user clicks back button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSelectFree: () => console.log('User selected free plan'),
    onBack: () => console.log('User clicked back'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Default pricing step showing the premium card with a continue free option below.',
      },
    },
  },
}; 