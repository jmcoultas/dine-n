import { type Recipe } from '@db/schema';

// Helper function to ensure arrays are properly serialized
export function serializeArray<T>(arr: T[] | null | undefined): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map(item => {
    if (typeof item === 'object' && item !== null) {
      return JSON.parse(JSON.stringify(item));
    }
    return item;
  });
}

// Helper function to ensure objects are properly serialized
export function serializeObject<T extends object>(obj: T | null | undefined): T {
  if (!obj || typeof obj !== 'object') {
    return {} as T;
  }
  return JSON.parse(JSON.stringify(obj));
}

interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Helper function to serialize recipe data
export function serializeRecipe(recipe: Partial<Recipe>): Partial<Recipe> {
  if (!recipe || typeof recipe !== 'object') {
    return {};
  }

  // Type guard for ingredient object
  const isIngredient = (ing: any): ing is RecipeIngredient => {
    return ing && typeof ing === 'object' && 
           typeof ing.name === 'string' &&
           typeof ing.amount === 'number' &&
           typeof ing.unit === 'string';
  };

  // Type guard for nutrition object
  const isNutrition = (nut: any): nut is RecipeNutrition => {
    return nut && typeof nut === 'object' &&
           typeof nut.calories === 'number' &&
           typeof nut.protein === 'number' &&
           typeof nut.carbs === 'number' &&
           typeof nut.fat === 'number';
  };

  // Clean and validate the recipe data
  const cleanedRecipe = {
    ...recipe,
    ingredients: Array.isArray(recipe.ingredients) 
      ? recipe.ingredients
          .filter(ing => ing && typeof ing === 'object')
          .map(ing => ({
            name: String(ing.name || '').trim(),
            amount: Number(ing.amount) || 0,
            unit: String(ing.unit || '').trim()
          }))
      : [],
    instructions: Array.isArray(recipe.instructions)
      ? recipe.instructions
          .filter((instruction): instruction is string => typeof instruction === 'string')
          .map(instruction => instruction.trim())
      : [],
    tags: Array.isArray(recipe.tags)
      ? recipe.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map(tag => tag.trim())
      : [],
    nutrition: recipe.nutrition && isNutrition(recipe.nutrition)
      ? recipe.nutrition
      : {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
  };

  // Ensure the data is properly serialized
  return JSON.parse(JSON.stringify(cleanedRecipe));
}