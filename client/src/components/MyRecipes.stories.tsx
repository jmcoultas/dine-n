import type { Meta, StoryObj } from '@storybook/react';
import { fn } from 'storybook/test';
import { MyRecipes, type Recipe } from './MyRecipes';

// Mock recipe data with realistic images and varied content
const mockRecipes: Recipe[] = [
  {
    id: 1,
    name: "Classic Margherita Pizza",
    description: "A timeless Italian classic with fresh mozzarella, basil, and tomato sauce on a crispy thin crust.",
    image_url: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop&crop=center",
    prep_time: 20,
    cook_time: 15,
    servings: 4,
    meal_type: "Dinner",
    cuisine_type: "Italian",
    dietary_restrictions: ["Vegetarian"],
    difficulty: "Easy",
    complexity: 1,
    nutrition: {
      calories: 285,
      protein: 12,
      carbs: 36,
      fat: 10
    },
    favorites_count: 24,
    favorited: true,
    created_at: "2024-01-15T10:30:00Z",
    tags: ["pizza", "italian", "vegetarian", "cheese"]
  },
  {
    id: 2,
    name: "Grilled Salmon with Lemon Herb Butter",
    description: "Perfectly grilled salmon fillet topped with a rich lemon herb butter sauce. Light, healthy, and delicious.",
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop&crop=center",
    prep_time: 10,
    cook_time: 12,
    servings: 2,
    meal_type: "Dinner",
    cuisine_type: "American",
    dietary_restrictions: ["Gluten-Free", "Keto"],
    difficulty: "Moderate",
    complexity: 2,
    nutrition: {
      calories: 340,
      protein: 28,
      carbs: 2,
      fat: 24
    },
    favorites_count: 18,
    favorited: false,
    created_at: "2024-01-12T14:45:00Z",
    tags: ["salmon", "grilled", "healthy", "seafood"]
  },
  {
    id: 3,
    name: "Fluffy Blueberry Pancakes",
    description: "Light and airy pancakes bursting with fresh blueberries. Perfect for a weekend breakfast or brunch.",
    image_url: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop&crop=center",
    prep_time: 15,
    cook_time: 20,
    servings: 4,
    meal_type: "Breakfast",
    cuisine_type: "American",
    dietary_restrictions: ["Vegetarian"],
    difficulty: "Easy",
    complexity: 1,
    nutrition: {
      calories: 220,
      protein: 6,
      carbs: 42,
      fat: 4
    },
    favorites_count: 31,
    favorited: true,
    created_at: "2024-01-10T08:15:00Z",
    tags: ["pancakes", "breakfast", "blueberries", "sweet"]
  },
  {
    id: 4,
    name: "Spicy Thai Green Curry",
    description: "Aromatic and spicy green curry with coconut milk, fresh vegetables, and your choice of protein.",
    image_url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop&crop=center",
    prep_time: 25,
    cook_time: 30,
    servings: 6,
    meal_type: "Dinner",
    cuisine_type: "Thai",
    dietary_restrictions: ["Gluten-Free", "Dairy-Free"],
    difficulty: "Advanced",
    complexity: 3,
    nutrition: {
      calories: 285,
      protein: 18,
      carbs: 12,
      fat: 20
    },
    favorites_count: 42,
    favorited: false,
    created_at: "2024-01-08T16:20:00Z",
    tags: ["curry", "thai", "spicy", "coconut"]
  },
  {
    id: 5,
    name: "Mediterranean Quinoa Salad",
    description: "Fresh and vibrant salad with quinoa, cucumber, tomatoes, olives, and feta cheese in a lemon vinaigrette.",
    image_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&crop=center",
    prep_time: 20,
    cook_time: 0,
    servings: 4,
    meal_type: "Lunch",
    cuisine_type: "Mediterranean",
    dietary_restrictions: ["Vegetarian", "Gluten-Free"],
    difficulty: "Easy",
    complexity: 1,
    nutrition: {
      calories: 185,
      protein: 8,
      carbs: 28,
      fat: 6
    },
    favorites_count: 15,
    favorited: true,
    created_at: "2024-01-05T12:00:00Z",
    tags: ["salad", "quinoa", "mediterranean", "healthy"]
  },
  {
    id: 6,
    name: "Decadent Chocolate Lava Cake",
    description: "Rich, molten chocolate cake with a gooey center. Served warm with vanilla ice cream.",
    image_url: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop&crop=center",
    prep_time: 15,
    cook_time: 12,
    servings: 2,
    meal_type: "Dessert",
    cuisine_type: "French",
    dietary_restrictions: ["Vegetarian"],
    difficulty: "Moderate",
    complexity: 2,
    nutrition: {
      calories: 420,
      protein: 6,
      carbs: 48,
      fat: 24
    },
    favorites_count: 67,
    favorited: true,
    created_at: "2024-01-03T19:30:00Z",
    tags: ["chocolate", "dessert", "cake", "indulgent"]
  },
  {
    id: 7,
    name: "Avocado Toast with Poached Egg",
    description: "Creamy avocado on sourdough toast topped with a perfectly poached egg and everything bagel seasoning.",
    image_url: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop&crop=center",
    prep_time: 10,
    cook_time: 5,
    servings: 1,
    meal_type: "Breakfast",
    cuisine_type: "American",
    dietary_restrictions: ["Vegetarian"],
    difficulty: "Easy",
    complexity: 1,
    nutrition: {
      calories: 280,
      protein: 12,
      carbs: 24,
      fat: 18
    },
    favorites_count: 8,
    favorited: false,
    created_at: "2024-01-01T09:00:00Z",
    tags: ["avocado", "toast", "egg", "breakfast"]
  },
  {
    id: 8,
    name: "Homemade Chicken Ramen",
    description: "Rich, savory ramen with tender chicken, soft-boiled eggs, and fresh vegetables in a flavorful broth.",
    image_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop&crop=center",
    permanent_url: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop&crop=center",
    prep_time: 45,
    cook_time: 120,
    servings: 4,
    meal_type: "Dinner",
    cuisine_type: "Japanese",
    dietary_restrictions: [],
    difficulty: "Advanced",
    complexity: 3,
    nutrition: {
      calories: 385,
      protein: 24,
      carbs: 42,
      fat: 14
    },
    favorites_count: 29,
    favorited: false,
    created_at: "2023-12-28T17:45:00Z",
    tags: ["ramen", "japanese", "noodles", "comfort"]
  }
];

const meta: Meta<typeof MyRecipes> = {
  title: 'Components/MyRecipes',
  component: MyRecipes,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# My Recipes Component

A comprehensive recipe display component that showcases user recipes with rich imagery, filtering, and sorting capabilities.

## Features

- **Rich Recipe Cards**: Beautiful cards with high-quality images, titles, descriptions, and metadata
- **Smart Filtering**: Filter by meal type, difficulty level, and search terms
- **Flexible Sorting**: Sort by newest, oldest, name, popularity, or cooking time
- **Responsive Layout**: Adapts to different screen sizes with configurable column counts
- **Interactive Elements**: Favorite toggling, click handlers, and hover effects
- **Loading States**: Elegant skeleton loading animations
- **Empty States**: Helpful messaging when no recipes are found

## Design Variations

This component supports multiple layout options and can be customized for different use cases:

- **Grid Layout**: Classic card grid (2, 3, or 4 columns)
- **List Layout**: Single column list view
- **Masonry Layout**: Pinterest-style staggered grid

## Recipe Data Structure

Recipes include comprehensive metadata including images, cooking times, nutrition info, dietary restrictions, and more.
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    recipes: {
      control: false,
      description: 'Array of recipe objects to display',
    },
    onRecipeClick: {
      description: 'Callback fired when a recipe card is clicked',
    },
    onFavoriteToggle: {
      description: 'Callback fired when the favorite button is clicked',
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether to show loading skeleton',
    },
    showSearch: {
      control: 'boolean',
      description: 'Whether to show the search input',
    },
    showFilters: {
      control: 'boolean',
      description: 'Whether to show filtering controls',
    },
    layout: {
      control: 'select',
      options: ['grid', 'list', 'masonry'],
      description: 'Layout style for recipe cards',
    },
    columns: {
      control: 'select',
      options: [2, 3, 4],
      description: 'Number of columns in grid layout',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MyRecipes>;

// Default story with full functionality
export const Default: Story = {
  args: {
    recipes: mockRecipes,
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
};

// Loading state
export const Loading: Story = {
  args: {
    recipes: [],
    isLoading: true,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
};

// Empty state
export const EmptyState: Story = {
  args: {
    recipes: [],
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
};

// Compact view with 2 columns
export const CompactGrid: Story = {
  args: {
    recipes: mockRecipes.slice(0, 4),
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 2,
  },
};

// Wide view with 4 columns
export const WideGrid: Story = {
  args: {
    recipes: mockRecipes,
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 4,
  },
};

// List layout
export const ListView: Story = {
  args: {
    recipes: mockRecipes.slice(0, 5),
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'list',
    columns: 3,
  },
};

// Masonry layout
export const MasonryLayout: Story = {
  args: {
    recipes: mockRecipes,
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'masonry',
    columns: 3,
  },
};

// Minimal view without search and filters
export const MinimalView: Story = {
  args: {
    recipes: mockRecipes.slice(0, 6),
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: false,
    showFilters: false,
    layout: 'grid',
    columns: 3,
  },
};

// Search only (no filters)
export const SearchOnly: Story = {
  args: {
    recipes: mockRecipes,
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: false,
    layout: 'grid',
    columns: 3,
  },
};

// Filters only (no search)
export const FiltersOnly: Story = {
  args: {
    recipes: mockRecipes,
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: false,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
};

// Breakfast recipes only
export const BreakfastRecipes: Story = {
  args: {
    recipes: mockRecipes.filter(recipe => recipe.meal_type === 'Breakfast'),
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Showing only breakfast recipes to demonstrate filtering capabilities.',
      },
    },
  },
};

// Favorited recipes
export const FavoritedRecipes: Story = {
  args: {
    recipes: mockRecipes.filter(recipe => recipe.favorited),
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Displaying only favorited recipes with heart icons filled.',
      },
    },
  },
};

// High-protein recipes
export const HighProteinRecipes: Story = {
  args: {
    recipes: mockRecipes.filter(recipe => recipe.nutrition && recipe.nutrition.protein >= 18),
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Recipes filtered to show only high-protein options (18g+ protein).',
      },
    },
  },
};

// Quick recipes (under 30 minutes)
export const QuickRecipes: Story = {
  args: {
    recipes: mockRecipes.filter(recipe => (recipe.prep_time || 0) + (recipe.cook_time || 0) <= 30),
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Quick recipes that can be prepared and cooked in 30 minutes or less.',
      },
    },
  },
};

// Interactive demo with all features
export const InteractiveDemo: Story = {
  args: {
    recipes: mockRecipes,
    onRecipeClick: fn(),
    onFavoriteToggle: fn(),
    isLoading: false,
    showSearch: true,
    showFilters: true,
    layout: 'grid',
    columns: 3,
  },
  parameters: {
    docs: {
      description: {
        story: `
## Interactive Demo

This story showcases all the interactive features:

1. **Search**: Try searching for "pizza", "salmon", or "chocolate"
2. **Meal Type Filter**: Filter by Breakfast, Lunch, Dinner, Snack, or Dessert
3. **Difficulty Filter**: Filter by Easy, Moderate, or Advanced
4. **Sorting**: Sort by newest, oldest, name, popularity, or cooking time
5. **Favorites**: Click the heart icons to toggle favorites
6. **Recipe Cards**: Click any card to view recipe details

The component handles all state management internally and provides callbacks for integration with your app.
        `,
      },
    },
  },
}; 