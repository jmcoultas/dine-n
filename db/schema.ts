
import { pgTable, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define preference types
export const PreferenceSchema = z.object({
  dietary: z.array(z.enum(["No Preference", "Vegetarian", "Vegan", "Gluten-Free", "Keto", "Paleo", "Mediterranean"])),
  allergies: z.array(z.enum(["Dairy", "Eggs", "Tree Nuts", "Peanuts", "Shellfish", "Wheat", "Soy"])),
  cuisine: z.array(z.enum(["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"])),
  meatTypes: z.array(z.enum(["Chicken", "Beef", "Pork", "Fish", "Lamb", "Turkey", "None"]))
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

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  name: text("name"),
  password_hash: text("password_hash").notNull(),
  preferences: jsonb("preferences").$type<z.infer<typeof PreferenceSchema>>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const recipes = pgTable("recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  prep_time: integer("prep_time"),
  cook_time: integer("cook_time"),
  servings: integer("servings"),
  ingredients: jsonb("ingredients").$type<z.infer<typeof RecipeIngredientSchema>[]>(),
  instructions: jsonb("instructions").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  nutrition: jsonb("nutrition").$type<z.infer<typeof RecipeNutritionSchema>>(),
  complexity: integer("complexity").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull()
});

export const temporaryRecipes = pgTable("temporary_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  prep_time: integer("prep_time"),
  cook_time: integer("cook_time"),
  servings: integer("servings"),
  ingredients: jsonb("ingredients").$type<z.infer<typeof RecipeIngredientSchema>[]>(),
  instructions: jsonb("instructions").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  nutrition: jsonb("nutrition").$type<z.infer<typeof RecipeNutritionSchema>>(),
  complexity: integer("complexity").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

export const userRecipes = pgTable("user_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  recipe_id: integer("recipe_id").notNull().references(() => recipes.id),
  created_at: timestamp("created_at").defaultNow().notNull()
});

export const mealPlans = pgTable("meal_plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const mealPlanRecipes = pgTable("meal_plan_recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  meal_plan_id: integer("meal_plan_id").notNull().references(() => mealPlans.id),
  recipe_id: integer("recipe_id").notNull().references(() => recipes.id),
  day: timestamp("day").notNull(),
  meal: text("meal").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const groceryLists = pgTable("grocery_lists", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  meal_plan_id: integer("meal_plan_id").references(() => mealPlans.id),
  items: jsonb("items").notNull(),
  created: timestamp("created").notNull(),
});

// Create Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertRecipeSchema = createInsertSchema(recipes);
export const selectRecipeSchema = createSelectSchema(recipes);
export const selectUserRecipeSchema = createSelectSchema(userRecipes);
export const insertUserRecipeSchema = createInsertSchema(userRecipes);
export const insertMealPlanSchema = createInsertSchema(mealPlans);
export const selectMealPlanSchema = createSelectSchema(mealPlans);
export const insertGroceryListSchema = createInsertSchema(groceryLists);
export const selectGroceryListSchema = createSelectSchema(groceryLists);
export const insertTemporaryRecipeSchema = createInsertSchema(temporaryRecipes);
export const selectTemporaryRecipeSchema = createSelectSchema(temporaryRecipes);

// Export types
export type User = z.infer<typeof selectUserSchema>;
export type Recipe = z.infer<typeof selectRecipeSchema>;
export type UserRecipe = z.infer<typeof selectUserRecipeSchema>;
export type MealPlan = z.infer<typeof selectMealPlanSchema>;
export type GroceryList = z.infer<typeof selectGroceryListSchema>;
export type Preferences = z.infer<typeof PreferenceSchema>;
export type TemporaryRecipe = z.infer<typeof selectTemporaryRecipeSchema>;
