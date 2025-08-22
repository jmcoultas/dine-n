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
  expiresAt: z.coerce.date().optional(),
  meal: z.string().nullable(),
  day: z.coerce.date().nullable(),
  recipe_id: z.number().optional()
}).transform((data) => ({
  ...data,
  imageUrl: data.permanent_url || data.image_url || data.imageUrl,
  permanentUrl: data.permanent_url || data.permanentUrl,
  prepTime: data.prepTime ?? data.prep_time,
  cookTime: data.cookTime ?? data.cook_time,
  isFavorited: data.favorited
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
  servingSize: z.enum(['1', '2', '3', '4', '5', '6', '7', '8'])
});

export type ChefPreferences = z.infer<typeof ChefPreferencesSchema>;

export const MealPlanRecipeSchema = z.object({
  id: z.number(),
  meal_plan_id: z.number(),
  recipe_id: z.number(),
  day: z.coerce.date(),
  meal: z.string(),
  created_at: z.coerce.date()
});

export const CreateMealPlanInputSchema = z.object({
  name: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  expiration_date: z.coerce.date(),
  days_generated: z.number(),
  is_expired: z.boolean(),
  recipes: z.array(z.object({
    id: z.number()
  }))
});

export type CreateMealPlanInput = z.infer<typeof CreateMealPlanInputSchema>;
export type MealPlanRecipe = z.infer<typeof MealPlanRecipeSchema>;

// ============================================================================
// MYPANTRY TYPES
// ============================================================================

export const PantryCategoryEnum = z.enum([
  "produce", "dairy", "meat", "pantry", "frozen", "condiments", "spices", "beverages", "other"
]);

export const QuantityStatusEnum = z.enum([
  "full", "half", "running_low", "empty"
]);

export const PantryItemSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  name: z.string(),
  category: PantryCategoryEnum.nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  quantity_status: QuantityStatusEnum.default("full"),
  added_date: z.coerce.date(),
  last_used_date: z.coerce.date().nullable(),
  estimated_shelf_life_days: z.number().nullable(),
  user_notes: z.string().nullable(),
  barcode: z.string().nullable(),
  image_url: z.string().nullable(),
  is_staple: z.boolean().default(false),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export const IngredientDefaultSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: PantryCategoryEnum,
  typical_shelf_life_days: z.number().nullable(),
  common_units: z.array(z.string()).nullable(),
  aliases: z.array(z.string()).nullable(),
  created_at: z.coerce.date(),
});

export const PantryUsageLogSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  pantry_item_id: z.number(),
  action: z.enum(["added", "used", "updated", "removed"]),
  quantity_used: z.number().nullable(),
  recipe_id: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
});

// API request/response schemas
export const AddPantryItemRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: PantryCategoryEnum.optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  estimatedShelfLifeDays: z.number().positive().optional(),
  notes: z.string().optional(),
  isStaple: z.boolean().default(false),
});

export const UpdatePantryItemRequestSchema = z.object({
  quantity: z.number().positive().optional(),
  quantityStatus: QuantityStatusEnum.optional(),
  notes: z.string().optional(),
  lastUsedDate: z.string().optional(), // ISO date string
});

export const PantryResponseSchema = z.object({
  items: z.array(PantryItemSchema),
  categories: z.array(z.string()),
  totalItems: z.number(),
});

export const PantrySuggestionsResponseSchema = z.object({
  recipes: z.array(RecipeSchema),
  usableIngredients: z.array(z.string()),
  missingIngredients: z.array(z.string()),
  priorityItems: z.array(PantryItemSchema),
  aiSuggestion: z.string().optional(),
});

export const AutocompleteResponseSchema = z.object({
  suggestions: z.array(z.object({
    name: z.string(),
    category: z.string(),
    commonUnits: z.array(z.string()),
    typicalShelfLife: z.number().nullable(),
  })),
});

export const PantryAnalyticsResponseSchema = z.object({
  totalItems: z.number(),
  categoriesBreakdown: z.array(z.object({
    category: z.string(),
    count: z.number(),
  })),
  useSoonItems: z.array(PantryItemSchema),
  wasteReduction: z.object({
    itemsUsedThisMonth: z.number(),
    estimatedWastePrevented: z.string(),
  }),
});

// Export types
export type PantryCategory = z.infer<typeof PantryCategoryEnum>;
export type QuantityStatus = z.infer<typeof QuantityStatusEnum>;
export type PantryItem = z.infer<typeof PantryItemSchema>;
export type IngredientDefault = z.infer<typeof IngredientDefaultSchema>;
export type PantryUsageLog = z.infer<typeof PantryUsageLogSchema>;
export type AddPantryItemRequest = z.infer<typeof AddPantryItemRequestSchema>;
export type UpdatePantryItemRequest = z.infer<typeof UpdatePantryItemRequestSchema>;
export type PantryResponse = z.infer<typeof PantryResponseSchema>;
export type PantrySuggestionsResponse = z.infer<typeof PantrySuggestionsResponseSchema>;
export type AutocompleteResponse = z.infer<typeof AutocompleteResponseSchema>;
export type PantryAnalyticsResponse = z.infer<typeof PantryAnalyticsResponseSchema>;