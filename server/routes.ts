import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution } from "./utils/ai";
import { recipes, users, userRecipes, temporaryRecipes, type Recipe, type TemporaryRecipe, PreferenceSchema } from "../db/schema";
import { db } from "../db";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

export function registerRoutes(app: express.Express) {
  // Public Routes
  // Recipes - Read only for public access
  app.get("/api/recipes", async (_req: Request, res: Response) => {
    try {
      const allRecipes = await db.query.recipes.findMany();
      res.json(allRecipes);
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
        .select({
          id: recipes.id,
          name: recipes.name,
          description: recipes.description,
          imageUrl: recipes.imageUrl,
          prepTime: recipes.prepTime,
          cookTime: recipes.cookTime,
          servings: recipes.servings,
          ingredients: recipes.ingredients,
          instructions: recipes.instructions,
          tags: recipes.tags,
          nutrition: recipes.nutrition,
          complexity: recipes.complexity,
        })
        .from(userRecipes)
        .innerJoin(recipes, eq(recipes.id, userRecipes.recipe_id))
        .where(eq(userRecipes.user_id, req.user.id));

      res.setHeader('Content-Type', 'application/json');
      return res.json(userFavorites);
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

      // If it's a temporary recipe (negative ID), fetch it from temporary_recipes
      if (recipeId < 0) {
        const tempRecipe = await db.query.temporaryRecipes.findFirst({
          where: eq(temporaryRecipes.id, Math.abs(recipeId))
        });

        if (!tempRecipe) {
          return res.status(404).json({ error: "Temporary recipe not found" });
        }

        // Transform and insert the recipe into permanent storage
        const [savedRecipe] = await db
          .insert(recipes)
          .values({
            name: tempRecipe.name,
            description: tempRecipe.description,
            imageUrl: tempRecipe.imageUrl,
            prepTime: tempRecipe.prepTime,
            cookTime: tempRecipe.cookTime,
            servings: tempRecipe.servings,
            ingredients: tempRecipe.ingredients,
            instructions: tempRecipe.instructions,
            tags: tempRecipe.tags,
            nutrition: tempRecipe.nutrition,
            complexity: tempRecipe.complexity
          })
          .returning();

        // Add to user's favorites
        await db.insert(userRecipes).values({
          user_id: req.user!.id,
          recipe_id: savedRecipe.id
        });

        // Delete the temporary recipe
        await db
          .delete(temporaryRecipes)
          .where(eq(temporaryRecipes.id, Math.abs(recipeId)));

        return res.json({
          message: "Recipe saved and added to favorites",
          permanentId: savedRecipe.id
        });
      }

      // For existing recipes, just add to favorites
      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId));

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      await db.insert(userRecipes).values({
        user_id: req.user!.id,
        recipe_id: recipeId
      });

      res.json({ message: "Recipe added to favorites" });
    } catch (error: any) {
      console.error("Error adding recipe to favorites:", error);
      res.status(500).json({ error: "Failed to add recipe to favorites" });
    }
  });

  app.delete("/api/recipes/:id/favorite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: "Invalid recipe ID" });
      }

      await db
        .delete(userRecipes)
        .where(
          and(
            eq(userRecipes.user_id, req.user!.id),
            eq(userRecipes.recipe_id, recipeId)
          )
        );

      res.json({ message: "Recipe removed from favorites" });
    } catch (error: any) {
      console.error("Error removing recipe from favorites:", error);
      res.status(500).json({ error: "Failed to remove recipe from favorites" });
    }
  });

  // Add new endpoint for saving temporary recipes
  app.post("/api/recipes/save-temporary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { temporaryRecipeId } = req.body;

      if (!temporaryRecipeId) {
        return res.status(400).json({ error: "Missing temporary recipe ID" });
      }

      // Get the temporary recipe
      const tempRecipe = await db.query.temporaryRecipes.findFirst({
        where: eq(temporaryRecipes.id, temporaryRecipeId)
      });

      if (!tempRecipe) {
        return res.status(404).json({ error: "Temporary recipe not found" });
      }

      // Verify ownership
      if (tempRecipe.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to save this recipe" });
      }

      // Insert into permanent recipes
      const [savedRecipe] = await db
        .insert(recipes)
        .values({
          name: tempRecipe.name,
          description: tempRecipe.description,
          imageUrl: tempRecipe.imageUrl,
          prepTime: tempRecipe.prepTime,
          cookTime: tempRecipe.cookTime,
          servings: tempRecipe.servings,
          ingredients: tempRecipe.ingredients,
          instructions: tempRecipe.instructions,
          tags: tempRecipe.tags,
          nutrition: tempRecipe.nutrition,
          complexity: tempRecipe.complexity,
        })
        .returning();

      // Add to user's recipes
      await db.insert(userRecipes).values({
        user_id: req.user!.id,
        recipe_id: savedRecipe.id,
      });

      // Delete the temporary recipe
      await db
        .delete(temporaryRecipes)
        .where(eq(temporaryRecipes.id, temporaryRecipeId));

      return res.json({
        id: savedRecipe.id,
        message: "Recipe saved successfully"
      });
    } catch (error: any) {
      console.error("Error saving temporary recipe:", error);
      return res.status(500).json({
        error: "Failed to save recipe",
        message: error.message
      });
    }
  });

  // Get temporary recipes for the current user
  app.get("/api/temporary-recipes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const activeRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, req.user!.id),
            gt(temporaryRecipes.expires_at, now)
          )
        );

      res.json(activeRecipes);
    } catch (error: any) {
      console.error("Error fetching temporary recipes:", error);
      res.status(500).json({ error: "Failed to fetch temporary recipes" });
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