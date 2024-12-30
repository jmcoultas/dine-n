export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: RecipeIngredient[];
  instructions?: string[];
  tags?: string[];
  nutrition?: RecipeNutrition;
  complexity: 1 | 2 | 3;
}

export interface TemporaryRecipe extends Recipe {
  userId: number;
  expiresAt: Date;
}
