import { pgTable, text, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  password_hash: text("password_hash").notNull(),
  username: text("username").unique().notNull(),
  preferences: jsonb("preferences").$type<{
    dietary: string[];
    allergies: string[];
    cuisine: string[];
    meatTypes: string[];
  }>().notNull().default({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: []
  }),
});

export const recipes = pgTable("recipes", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  servings: integer("servings"),
  ingredients: jsonb("ingredients").$type<{
    name: string;
    amount: number;
    unit: string;
  }[]>(),
  instructions: text("instructions").array(),
  tags: text("tags").array(),
  nutrition: jsonb("nutrition").$type<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>().notNull().default({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }),
  complexity: integer("complexity").notNull().default(1), // 1: Easy, 2: Medium, 3: Hard
});

export const mealPlans = pgTable("meal_plans", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  recipes: jsonb("recipes").$type<{
    recipeId: number;
    day: string;
    meal: "breakfast" | "lunch" | "dinner";
  }[]>(),
});

export const groceryLists = pgTable("grocery_lists", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => users.id),
  mealPlanId: integer("meal_plan_id").references(() => mealPlans.id),
  items: jsonb("items").$type<{
    name: string;
    amount: number;
    unit: string;
    checked: boolean;
  }[]>(),
  created: timestamp("created").defaultNow(),
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertRecipeSchema = createInsertSchema(recipes);
export const selectRecipeSchema = createSelectSchema(recipes);
export const insertMealPlanSchema = createInsertSchema(mealPlans);
export const selectMealPlanSchema = createSelectSchema(mealPlans);
export const insertGroceryListSchema = createInsertSchema(groceryLists);
export const selectGroceryListSchema = createSelectSchema(groceryLists);

// Types
export type User = z.infer<typeof selectUserSchema>;
export type Recipe = z.infer<typeof selectRecipeSchema>;
export type MealPlan = z.infer<typeof selectMealPlanSchema>;
export type GroceryList = z.infer<typeof selectGroceryListSchema>;
