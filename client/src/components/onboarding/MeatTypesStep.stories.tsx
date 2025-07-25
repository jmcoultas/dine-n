import type { Meta, StoryObj } from '@storybook/react';
import { MeatTypesStep } from './MeatTypesStep';
import { useState } from 'react';

const meta: Meta<typeof MeatTypesStep> = {
  title: 'Onboarding/MeatTypesStep',
  component: MeatTypesStep,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'The meat types selection step in the onboarding flow, allowing users to choose their protein preferences.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [selectedMeatTypes, setSelectedMeatTypes] = useState<string[]>([]);
    
    return (
      <MeatTypesStep
        selectedMeatTypes={selectedMeatTypes}
        onMeatTypesChange={setSelectedMeatTypes}
        onNext={() => console.log('Next clicked')}
        onBack={() => console.log('Back clicked')}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Default meat types selection step with no initial selections.',
      },
    },
  },
};

export const WithVegetarianSelection: Story = {
  render: () => {
    const [selectedMeatTypes, setSelectedMeatTypes] = useState<string[]>(['None']);
    
    return (
      <MeatTypesStep
        selectedMeatTypes={selectedMeatTypes}
        onMeatTypesChange={setSelectedMeatTypes}
        onNext={() => console.log('Next clicked')}
        onBack={() => console.log('Back clicked')}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the vegetarian confirmation message when "None" is selected.',
      },
    },
  },
}; 