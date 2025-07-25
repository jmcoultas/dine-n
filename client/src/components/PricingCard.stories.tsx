import type { Meta, StoryObj } from '@storybook/react';
import { PricingCard } from './PricingCard';

const meta: Meta<typeof PricingCard> = {
  title: 'Components/PricingCard',
  component: PricingCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Reusable pricing card component for displaying free and premium plans. Extracted from the Welcome page for use in onboarding and other areas.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    plan: {
      control: { type: 'select' },
      options: ['free', 'premium'],
      description: 'The pricing plan to display',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
    showGetStarted: {
      control: 'boolean',
      description: 'Whether to show the Get Started/Upgrade button',
    },
    onUpgrade: {
      action: 'upgrade-clicked',
      description: 'Callback function when upgrade button is clicked (premium plan only)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FreePlan: Story = {
  args: {
    plan: 'free',
    showGetStarted: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'The free plan pricing card with all included features listed.',
      },
    },
  },
};

export const PremiumPlan: Story = {
  args: {
    plan: 'premium',
    showGetStarted: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'The premium plan pricing card with enhanced features and popular badge.',
      },
    },
  },
};

export const PremiumWithCustomAction: Story = {
  args: {
    plan: 'premium',
    showGetStarted: false,
    onUpgrade: () => console.log('Custom upgrade action triggered'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Premium plan with custom upgrade action instead of navigation link.',
      },
    },
  },
};

export const SideBySide: Story = {
  render: () => {
    return (
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
        <PricingCard plan="free" />
        <PricingCard plan="premium" />
      </div>
    );
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Both pricing cards displayed side by side as they would appear on the welcome page.',
      },
    },
  },
}; 