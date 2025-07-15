import type { Meta, StoryObj } from '@storybook/react';
import PreferenceSheet from './PreferenceSheet';
import { Toaster } from '@/components/ui/toaster';
import { type Preferences } from '@db/schema';
import { type ChefPreferences } from '@/lib/types';

const emptyPreferences: Preferences = {
  dietary: [],
  allergies: [],
  cuisine: [],
  meatTypes: [],
  chefPreferences: {
    difficulty: 'Moderate',
    cookTime: '30-60 minutes',
    servingSize: '4'
  }
};

const samplePreferences: Preferences = {
  dietary: ['Vegetarian', 'Gluten-Free'],
  allergies: ['Dairy', 'Tree Nuts'],
  cuisine: ['Italian', 'Mediterranean', 'Thai'],
  meatTypes: ['None'],
  chefPreferences: {
    difficulty: 'Easy',
    cookTime: '15-30 minutes',
    servingSize: '2'
  }
};

const complexPreferences: Preferences = {
  dietary: ['Keto', 'Protein Heavy'],
  allergies: ['Shellfish', 'Soy'],
  cuisine: ['American', 'Mexican', 'Japanese'],
  meatTypes: ['Chicken', 'Beef', 'Fish'],
  chefPreferences: {
    difficulty: 'Advanced',
    cookTime: '60+ minutes',
    servingSize: '6'
  }
};

const meta = {
  title: 'Components/PreferenceSheet',
  component: PreferenceSheet,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive preference sheet component for meal planning that guides users through dietary preferences, allergies, cuisines, and cooking preferences.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the sheet is open'
    },
    isOnboarding: {
      control: 'boolean',
      description: 'Whether this is part of the onboarding flow'
    },
    isGenerating: {
      control: 'boolean',
      description: 'Whether meal plan is currently being generated'
    },
    skipToChefPreferences: {
      control: 'boolean',
      description: 'Skip directly to chef preferences step'
    },
    hideGenerateOption: {
      control: 'boolean',
      description: 'Hide the generate meal plan option'
    },
  },
  decorators: [
    (Story) => (
      <div>
        <Story />
        <Toaster />
      </div>
    ),
  ],
} satisfies Meta<typeof PreferenceSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: (open: boolean) => console.log('Sheet open changed:', open),
    preferences: emptyPreferences,
    onUpdatePreferences: (preferences: Preferences) => console.log('Preferences updated:', preferences),
    isGenerating: false,
    onGenerate: (chefPreferences: ChefPreferences, preferences: Preferences) => {
      console.log('Generate meal plan:', { chefPreferences, preferences });
    },
  },
};

export const WithExistingPreferences: Story = {
  args: {
    open: true,
    onOpenChange: (open: boolean) => console.log('Sheet open changed:', open),
    preferences: samplePreferences,
    onUpdatePreferences: (preferences: Preferences) => console.log('Preferences updated:', preferences),
    isGenerating: false,
    onGenerate: (chefPreferences: ChefPreferences, preferences: Preferences) => {
      console.log('Generate meal plan:', { chefPreferences, preferences });
    },
  },
};

export const OnboardingFlow: Story = {
  args: {
    open: true,
    onOpenChange: (open: boolean) => console.log('Sheet open changed:', open),
    preferences: emptyPreferences,
    onUpdatePreferences: (preferences: Preferences) => console.log('Preferences updated:', preferences),
    isOnboarding: true,
    isGenerating: false,
    onGenerate: (chefPreferences: ChefPreferences, preferences: Preferences) => {
      console.log('Generate meal plan:', { chefPreferences, preferences });
    },
  },
};

export const VegetarianUser: Story = {
  args: {
    open: true,
    onOpenChange: (open: boolean) => console.log('Sheet open changed:', open),
    preferences: {
      dietary: ['Vegetarian'],
      allergies: [],
      cuisine: ['Italian', 'Mediterranean'],
      meatTypes: ['None'],
      chefPreferences: {
        difficulty: 'Easy',
        cookTime: '15-30 minutes',
        servingSize: '2'
      }
    },
    onUpdatePreferences: (preferences: Preferences) => console.log('Preferences updated:', preferences),
    isGenerating: false,
    onGenerate: (chefPreferences: ChefPreferences, preferences: Preferences) => {
      console.log('Generate meal plan:', { chefPreferences, preferences });
    },
  },
};

export const KetoUser: Story = {
  args: {
    open: true,
    onOpenChange: (open: boolean) => console.log('Sheet open changed:', open),
    preferences: {
      dietary: ['Keto', 'Protein Heavy'],
      allergies: ['Dairy'],
      cuisine: ['American', 'Mexican'],
      meatTypes: ['Chicken', 'Beef', 'Fish'],
      chefPreferences: {
        difficulty: 'Moderate',
        cookTime: '30-60 minutes',
        servingSize: '4'
      }
    },
    onUpdatePreferences: (preferences: Preferences) => console.log('Preferences updated:', preferences),
    isGenerating: false,
    onGenerate: (chefPreferences: ChefPreferences, preferences: Preferences) => {
      console.log('Generate meal plan:', { chefPreferences, preferences });
    },
  },
}; 