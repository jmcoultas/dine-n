import { pgTable, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define preference types
export const PreferenceSchema = z.object({
  dietary: z.array(z.enum(["No Preference", "Vegetarian", "Vegan", "Gluten-Free", "Keto", "Paleo", "Mediterranean", "Protein Heavy"])),
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

// Single consolidated recipes table for both temporary and favorited recipes
export const recipes = pgTable("recipes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer("user_id").notNull().references(() => users.id),
  is_favorited: boolean("is_favorited").notNull().default(false),
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  prep_time: integer("prep_time"),
  cook_time: integer("cook_time"),
  servings: integer("servings"),
  ingredients: jsonb("ingredients").$type<z.infer<typeof RecipeIngredientSchema>[]>(),
  instructions: text("instructions").array(),
  tags: text("tags").array(),
  nutrition: jsonb("nutrition").$type<z.infer<typeof RecipeNutritionSchema>>(),
  complexity: integer("complexity").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at"), // null for favorited recipes
});

// Create Zod schemas for validation
export const insertRecipeSchema = createInsertSchema(recipes);
export const selectRecipeSchema = createSelectSchema(recipes);
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);


// Export types
export type User = z.infer<typeof selectUserSchema>;
export type Recipe = z.infer<typeof selectRecipeSchema>;
export type Preferences = z.infer<typeof PreferenceSchema>;