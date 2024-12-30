import { pgTable, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define preference types
export const PreferenceSchema = z.object({
  dietary: z.array(z.enum(["No Preference", "Vegetarian", "Vegan", "Gluten-Free", "Keto", "Paleo", "Mediterranean"])),
  allergies: z.array(z.enum(["Dairy", "Eggs", "Tree Nuts", "Peanuts", "Shellfish", "Wheat", "Soy"])),
  cuisine: z.array(z.enum(["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"])),
  meatTypes: z.array(z.enum(["Chicken", "Beef", "Pork", "Fish", "Lamb", "Turkey", "None"]))
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
  ingredients: jsonb("ingredients").$type<Array<{ name: string; amount: number; unit: string }>>(),
  instructions: jsonb("instructions").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  nutrition: jsonb("nutrition").$type<{ calories: number; protein: number; carbs: number; fat: number }>(),
  complexity: integer("complexity").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull()
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
  name: text("name").notNull(),
  description: text("description"),
  image_url: text("image_url"),
  prep_time: integer("prep_time"),
  cook_time: integer("cook_time"),
  servings: integer("servings"),
  ingredients: jsonb("ingredients").$type<Array<{ name: string; amount: number; unit: string }>>(),
  instructions: jsonb("instructions").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  nutrition: jsonb("nutrition").$type<{ calories: number; protein: number; carbs: number; fat: number }>(),
  complexity: integer("complexity").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

// Create schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertRecipeSchema = createInsertSchema(recipes);
export const selectRecipeSchema = createSelectSchema(recipes);
export const selectUserRecipeSchema = createSelectSchema(userRecipes);
export const insertUserRecipeSchema = createInsertSchema(userRecipes);
export const insertTemporaryRecipeSchema = createInsertSchema(temporaryRecipes);
export const selectTemporaryRecipeSchema = createSelectSchema(temporaryRecipes);

// Export types
export type User = z.infer<typeof selectUserSchema>;
export type Recipe = z.infer<typeof selectRecipeSchema>;
export type UserRecipe = z.infer<typeof selectUserRecipeSchema>;
export type TemporaryRecipe = z.infer<typeof selectTemporaryRecipeSchema>;
export type Preferences = z.infer<typeof PreferenceSchema>;