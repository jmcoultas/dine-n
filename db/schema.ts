import { pgTable, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define subscription-related types
export const SubscriptionTierEnum = z.enum(["free", "premium"]);
export const SubscriptionStatusEnum = z.enum(["active", "inactive", "cancelled"]);

// Define preference types
export const ChefPreferencesSchema = z.object({
  difficulty: z.enum(["Easy", "Moderate", "Advanced"]),
  cookTime: z.enum(["15 minutes or less", "15-30 minutes", "30-60 minutes", "60+ minutes"]),
  servingSize: z.enum(["1", "2", "3", "4", "5", "6", "7", "8"]),
  mealPlanDuration: z.enum(["1", "2", "3", "4", "5", "6", "7"])
}).optional();

export const PreferenceSchema = z.object({
  dietary: z.array(z.enum(["No Preference", "Vegetarian", "Vegan", "Gluten-Free", "Keto", "Paleo", "Mediterranean Diet", "Protein Heavy", "Organic"])),
  allergies: z.array(z.enum(["Dairy", "Eggs", "Tree Nuts", "Peanuts", "Shellfish", "Wheat", "Soy"])),
  cuisine: z.array(z.enum(["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"])),
  meatTypes: z.array(z.enum(["Chicken", "Beef", "Pork", "Fish", "Lamb", "Turkey", "None"])),
  chefPreferences: ChefPreferencesSchema
});

// Define recipe-related schemas
export const RecipeIngredientSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string()
});

export const RecipeNutritionSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number()
});

// Define tag-related schemas
export const MealTypeEnum = z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"]);
export const CuisineTypeEnum = z.enum(["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French", "Other"]);
export const DietaryTypeEnum = z.enum(["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb", "Other"]);
export const DifficultyEnum = z.enum(["Easy", "Moderate", "Advanced"]);

// Define all tables
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  name: text("name"),
  password_hash: text("password_hash").notNull(),
  firebase_uid: text("firebase_uid").unique(),
  preferences: jsonb("preferences").$type<z.infer<typeof PreferenceSchema>>(),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_subscription_id: text("stripe_subscription_id"),
  subscription_status: text("subscription_status").$type<z.infer<typeof SubscriptionStatusEnum>>().default('inactive'),
  subscription_tier: text("subscription_tier").$type<z.infer<typeof SubscriptionTierEnum>>().default('free'),
  subscription_end_date: timestamp("subscription_end_date", { mode: 'date' }),
  meal_plans_generated: integer("meal_plans_generated").default(0).notNull(),
  ingredient_recipes_generated: integer("ingredient_recipes_generated").notNull().default(0),
  created_at: timestamp("created_at", { mode: 'date' }).defaultNow().notNull(),
});

export const recipes = pgTable("recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity({ increment: 1 }),
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  permanent_url: text("permanent_url"),
  prep_time: integer("prep_time"),
  cook_time: integer("cook_time"),
  servings: integer("servings"),
  ingredients: jsonb("ingredients").$type<z.infer<typeof RecipeIngredientSchema>[]>(),
  instructions: jsonb("instructions").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  nutrition: jsonb("nutrition").$type<z.infer<typeof RecipeNutritionSchema>>(),
  complexity: integer("complexity").notNull(),
  favorites_count: integer("favorites_count").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull()
});

export const mealPlans = pgTable("meal_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expiration_date: timestamp("expiration_date"),
  days_generated: integer("days_generated").notNull().default(2),
  is_expired: boolean("is_expired").notNull().default(false),
});

export const mealPlanRecipes = pgTable("meal_plan_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  meal_plan_id: integer("meal_plan_id").notNull().references(() => mealPlans.id),
  recipe_id: integer("recipe_id").notNull().references(() => temporaryRecipes.id),
  day: timestamp("day").notNull(),
  meal: text("meal").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const userRecipes = pgTable("user_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  recipe_id: integer("recipe_id").notNull().references(() => recipes.id),
  created_at: timestamp("created_at").defaultNow().notNull()
});

export const temporaryRecipes = pgTable("temporary_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  favorited: boolean("favorited").default(false),
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  permanent_url: text("permanent_url"),
  prep_time: integer("prep_time"),
  cook_time: integer("cook_time"),
  servings: integer("servings"),
  ingredients: jsonb("ingredients"),
  instructions: jsonb("instructions"),
  // Separate tag columns
  meal_type: text("meal_type").$type<z.infer<typeof MealTypeEnum>>(),
  cuisine_type: text("cuisine_type").$type<z.infer<typeof CuisineTypeEnum>>(),
  dietary_restrictions: jsonb("dietary_restrictions").$type<z.infer<typeof DietaryTypeEnum>[]>(),
  difficulty: text("difficulty").$type<z.infer<typeof DifficultyEnum>>(),
  // Keep original tags for backward compatibility and miscellaneous tags
  tags: jsonb("tags"),
  nutrition: jsonb("nutrition"),
  complexity: integer("complexity").notNull(),
  favorites_count: integer("favorites_count").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

export const groceryLists = pgTable("grocery_lists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  meal_plan_id: integer("meal_plan_id").references(() => mealPlans.id),
  items: jsonb("items").notNull(),
  created: timestamp("created").notNull(),
});

// Create validation schemas for inserting/selecting data
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertRecipeSchema = createInsertSchema(recipes);
export const selectRecipeSchema = createSelectSchema(recipes);
export const insertMealPlanSchema = createInsertSchema(mealPlans);
export const selectMealPlanSchema = createSelectSchema(mealPlans);
export const insertUserRecipeSchema = createInsertSchema(userRecipes);
export const selectUserRecipeSchema = createSelectSchema(userRecipes);
export const insertGroceryListSchema = createInsertSchema(groceryLists);
export const selectGroceryListSchema = createSelectSchema(groceryLists);

export const insertTemporaryRecipeSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  permanent_url: z.string().nullable(),
  prep_time: z.number(),
  cook_time: z.number(),
  servings: z.number(),
  ingredients: z.array(RecipeIngredientSchema),
  instructions: z.array(z.string()),
  meal_type: MealTypeEnum.nullable(),
  cuisine_type: CuisineTypeEnum.nullable(),
  dietary_restrictions: z.array(DietaryTypeEnum).nullable(),
  difficulty: DifficultyEnum.nullable(),
  tags: z.array(z.string()),
  nutrition: RecipeNutritionSchema,
  complexity: z.number(),
  created_at: z.date(),
  expires_at: z.date(),
  favorited: z.boolean(),
  favorites_count: z.number().default(0)
});

export const selectTemporaryRecipeSchema = createSelectSchema(temporaryRecipes);

// Export types
export type User = z.infer<typeof selectUserSchema>;
export type Recipe = z.infer<typeof selectRecipeSchema>;
export type UserRecipe = z.infer<typeof selectUserRecipeSchema>;
export type MealPlan = z.infer<typeof selectMealPlanSchema>;
export type GroceryList = z.infer<typeof selectGroceryListSchema>;
export type Preferences = z.infer<typeof PreferenceSchema>;
export type TemporaryRecipe = z.infer<typeof selectTemporaryRecipeSchema>;
export type SubscriptionTier = z.infer<typeof SubscriptionTierEnum>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusEnum>;