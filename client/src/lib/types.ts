import { z } from "zod";

export const RecipeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  prepTime: z.number().nullable(),
  cookTime: z.number().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    unit: z.string()
  })),
  instructions: z.array(z.string()),
  tags: z.array(z.string()),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number()
  }),
  complexity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  created_at: z.date(),
  expiresAt: z.date().optional()
});

export type Recipe = z.infer<typeof RecipeSchema>;

export type TemporaryRecipe = Recipe & {
  expiresAt: Date;
};

export const RecipeResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
  status: z.union([z.literal('success'), z.literal('partial')])
});

export type RecipeResponse = z.infer<typeof RecipeResponseSchema>;