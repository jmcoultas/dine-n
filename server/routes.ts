import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt, or, isNull } from "drizzle-orm";
import { generateRecipeRecommendation } from "./utils/ai";
import { recipes, type Recipe, RecipeIngredientSchema, RecipeNutritionSchema, PreferenceSchema } from "@db/schema";
import { db } from "../db";
import { z } from "zod";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

// Define type-safe schema for recipe data validation
const RecipeDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  prep_time: z.number().optional(),
  cook_time: z.number().optional(),
  servings: z.number().optional(),
  ingredients: z.array(RecipeIngredientSchema).optional(),
  instructions: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  nutrition: RecipeNutritionSchema.optional(),
  complexity: z.number().min(1).max(3).optional(),
});

type RecipeData = z.infer<typeof RecipeDataSchema>;

export function registerRoutes(app: express.Express) {
  // Public Routes
  app.get("/api/recipes", async (_req: Request, res: Response) => {
    try {
      const publicRecipes = await db
        .select()
        .from(recipes)
        .where(eq(recipes.is_favorited, true));
      res.json(publicRecipes);
    } catch (error: any) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  // Favorite Recipes Routes - Protected Routes
  app.get("/api/recipes/favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userFavorites = await db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.user_id, req.user.id),
            eq(recipes.is_favorited, true)
          )
        );

      res.json(userFavorites);
    } catch (error: any) {
      console.error("Error fetching favorite recipes:", error);
      return res.status(500).json({
        error: "Failed to fetch favorite recipes",
        message: error.message
      });
    }
  });

  app.post("/api/recipes/:id/favorite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: "Invalid recipe ID" });
      }

      const [updatedRecipe] = await db
        .update(recipes)
        .set({
          is_favorited: true,
          expires_at: null // Remove expiration when favorited
        })
        .where(
          and(
            eq(recipes.id, recipeId),
            eq(recipes.user_id, req.user!.id)
          )
        )
        .returning();

      if (!updatedRecipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      return res.json({
        message: "Recipe marked as favorite",
        recipe: updatedRecipe
      });
    } catch (error: any) {
      console.error("Error marking recipe as favorite:", error);
      res.status(500).json({ error: "Failed to mark recipe as favorite" });
    }
  });

  app.delete("/api/recipes/:id/favorite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: "Invalid recipe ID" });
      }

      // Set expiration date for unfavorited recipes
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2);

      const [updatedRecipe] = await db
        .update(recipes)
        .set({
          is_favorited: false,
          expires_at: expirationDate
        })
        .where(
          and(
            eq(recipes.id, recipeId),
            eq(recipes.user_id, req.user!.id)
          )
        )
        .returning();

      if (!updatedRecipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      res.json({
        message: "Recipe unfavorited",
        recipe: updatedRecipe
      });
    } catch (error: any) {
      console.error("Error unfavoriting recipe:", error);
      res.status(500).json({ error: "Failed to unfavorite recipe" });
    }
  });

  // Get user's recipes (both favorited and temporary)
  app.get("/api/user/recipes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const userRecipes = await db
        .select()
        .from(recipes)
        .where(
          and(
            eq(recipes.user_id, req.user!.id),
            or(
              eq(recipes.is_favorited, true),
              gt(recipes.expires_at!, now),
              isNull(recipes.expires_at)
            )
          )
        );

      res.json(userRecipes);
    } catch (error: any) {
      console.error("Error fetching user recipes:", error);
      res.status(500).json({
        error: "Failed to fetch user recipes",
        details: error.message
      });
    }
  });

  // AI Recipe Generation
  app.post("/api/generate-meal-plan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { preferences, days } = req.body;

      if (!preferences || !days) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: preferences and days"
        });
      }

      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes: Partial<Recipe>[] = [];
      const usedRecipeNames = new Set<string>();

      // Generate recipes for each meal
      for (let day = 0; day < days; day++) {
        for (const mealType of mealTypes) {
          try {
            const rawRecipeData = await generateRecipeRecommendation({
              dietary: preferences.dietary?.filter(Boolean) || [],
              allergies: preferences.allergies?.filter(Boolean) || [],
              cuisine: preferences.cuisine?.filter(Boolean) || [],
              meatTypes: preferences.meatTypes?.filter(Boolean) || [],
              mealType,
              excludeNames: Array.from(usedRecipeNames)
            });

            // Validate recipe data
            const recipeDataResult = RecipeDataSchema.safeParse(rawRecipeData);
            if (!recipeDataResult.success) {
              console.error('Invalid recipe data:', recipeDataResult.error);
              continue;
            }

            const recipeData = recipeDataResult.data;

            if (usedRecipeNames.has(recipeData.name)) {
              continue;
            }

            const recipeToInsert = {
              user_id: req.user!.id,
              is_favorited: false,
              name: recipeData.name,
              description: recipeData.description || null,
              image_url: recipeData.image_url || null,
              prep_time: recipeData.prep_time || 0,
              cook_time: recipeData.cook_time || 0,
              servings: recipeData.servings || 2,
              ingredients: recipeData.ingredients || [],
              instructions: recipeData.instructions || [],
              tags: recipeData.tags || [],
              nutrition: recipeData.nutrition || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
              },
              complexity: recipeData.complexity || 1,
              created_at: new Date(),
              expires_at: null
            };

            const generatedRecipe: Partial<Recipe> = {
              ...recipeToInsert,
              id: -(suggestedRecipes.length + 1),
            };

            usedRecipeNames.add(recipeData.name);
            suggestedRecipes.push(generatedRecipe);
          } catch (error) {
            console.error(`Failed to generate recipe for day ${day + 1}, meal ${mealType}:`, error);
            continue;
          }
        }
      }

      // Save generated recipes to database
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2);

      const savedRecipes = await Promise.all(
        suggestedRecipes.map(recipe =>
          db.insert(recipes)
            .values({
              user_id: req.user!.id,
              is_favorited: false,
              name: recipe.name!,
              description: recipe.description,
              image_url: recipe.image_url,
              prep_time: recipe.prep_time || 0,
              cook_time: recipe.cook_time || 0,
              servings: recipe.servings || 2,
              ingredients: recipe.ingredients || [],
              instructions: recipe.instructions || [],
              tags: recipe.tags || [],
              nutrition: recipe.nutrition || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
              },
              complexity: recipe.complexity || 1,
              created_at: new Date(),
              expires_at: expirationDate
            })
            .returning()
        )
      );

      res.json({
        recipes: savedRecipes.map(([recipe]) => recipe),
        status: savedRecipes.length === days * mealTypes.length ? 'success' : 'partial'
      });
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({
        error: "Failed to generate meal plan",
        details: error.message
      });
    }
  });

  // User Profile Routes
  app.put("/api/user/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { preferences } = req.body;

      // Validate preferences using our schema
      const parsedPrefs = PreferenceSchema.safeParse(preferences);
      if (!parsedPrefs.success) {
        return res.status(400).json({
          error: "Invalid preferences format",
          details: parsedPrefs.error
        });
      }

      // Update user preferences in database
      await db
        .update(users)
        .set({ preferences: parsedPrefs.data })
        .where(eq(users.id, req.user!.id));

      res.json({ message: "Preferences updated successfully" });
    } catch (error: any) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });
}