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
  description: string | null;
  imageUrl: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number | null;
  ingredients: RecipeIngredient[] | null;
  instructions: string[] | null;
  tags: string[] | null;
  nutrition: RecipeNutrition | null;
  complexity: 1 | 2 | 3;
  created_at: Date;
}

export interface TemporaryRecipe extends Omit<Recipe, 'id'> {
  id: number;
  user_id: number;
  expires_at: Date;
}

export interface UserRecipe {
  id: number;
  user_id: number;
  recipe_id: number;
  recipe: Recipe;
  created_at: Date;
}

export interface SaveRecipeRequest {
  temporaryRecipeId: number;
}

export interface SaveRecipeResponse {
  id: number;
  message: string;
}