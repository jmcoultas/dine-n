import { z } from 'zod';

// Define the recipe schema using Zod for runtime validation
export const recipeIngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  amount: z.number().min(0, "Amount must be positive"),
  unit: z.string().min(1, "Unit is required"),
});

export const recipeNutritionSchema = z.object({
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
});

export const recipeSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Recipe name is required"),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  prepTime: z.number().min(0).nullable(),
  cookTime: z.number().min(0).nullable(),
  servings: z.number().min(1).nullable(),
  ingredients: z.array(recipeIngredientSchema),
  instructions: z.array(z.string()),
  tags: z.array(z.string()),
  nutrition: recipeNutritionSchema,
  complexity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

// Export TypeScript types from the Zod schemas
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;
export type RecipeNutrition = z.infer<typeof recipeNutritionSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
