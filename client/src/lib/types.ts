import { z } from "zod";

export const RecipeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  image_url: z.string().nullable(),
  permanentUrl: z.string().nullable(),
  permanent_url: z.string().nullable(),
  prepTime: z.number().nullable(),
  prep_time: z.number().nullable(),
  cookTime: z.number().nullable(),
  cook_time: z.number().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    unit: z.string()
  })).nullable().default([]),
  instructions: z.array(z.string()).nullable().default([]),
  tags: z.array(z.string()).nullable().default([]),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number()
  }).nullable().default({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
  complexity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  userId: z.number().optional(),
  favorited: z.boolean().default(false),
  favorites_count: z.number().default(0),
  created_at: z.coerce.date(),
  expiresAt: z.coerce.date().optional()
}).transform((data) => ({
  ...data,
  imageUrl: data.imageUrl || data.image_url,
  permanentUrl: data.permanentUrl || data.permanent_url,
  prepTime: data.prepTime ?? data.prep_time,
  cookTime: data.cookTime ?? data.cook_time
}));

export type Recipe = z.infer<typeof RecipeSchema>;

export const RecipeResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
  status: z.union([z.literal('success'), z.literal('partial')])
});

export type RecipeResponse = z.infer<typeof RecipeResponseSchema>;

export const ChefPreferencesSchema = z.object({
  difficulty: z.enum(['Easy', 'Moderate', 'Advanced']),
  cookTime: z.enum(['15 minutes or less', '15-30 minutes', '30-60 minutes', '60+ minutes']),
  servingSize: z.enum(['1', '2', '3', '4', '5', '6', '7', '8']),
  mealPlanDuration: z.enum(['1', '2', '3', '4', '5', '6', '7'])
});

export type ChefPreferences = z.infer<typeof ChefPreferencesSchema>;