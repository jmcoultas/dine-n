import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution } from "./utils/ai";
import { recipes, users, userRecipes, temporaryRecipes, type Recipe, type TemporaryRecipe, PreferenceSchema } from "@db/schema";
import { db } from "../db";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

// Transform database recipe to client format
function transformRecipeToClient(recipe: Recipe | TemporaryRecipe) {
  return {
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    imageUrl: recipe.image_url,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tags: recipe.tags,
    nutrition: recipe.nutrition,
    complexity: recipe.complexity,
    createdAt: recipe.created_at,
    expiresAt: 'expires_at' in recipe ? recipe.expires_at : undefined
  };
}

// Transform client recipe to database format
function transformRecipeToDb(recipe: any) {
  return {
    name: recipe.name,
    description: recipe.description,
    image_url: recipe.imageUrl,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    tags: recipe.tags,
    nutrition: recipe.nutrition,
    complexity: recipe.complexity,
    created_at: new Date()
  };
}

export function registerRoutes(app: express.Express) {
  // Get temporary recipes
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

      // Transform to client format
      const transformedRecipes = activeRecipes.map(transformRecipeToClient);
      res.json(transformedRecipes);
    } catch (error: any) {
      console.error("Error fetching temporary recipes:", error);
      res.status(500).json({ error: "Failed to fetch temporary recipes" });
    }
  });

  // Save recipe (temporary or permanent)
  app.post("/api/recipes/:id/favorite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        return res.status(400).json({ error: "Invalid recipe ID" });
      }

      // If it's a temporary recipe (negative ID), create a new permanent recipe
      if (recipeId < 0) {
        const { recipe } = req.body;
        if (!recipe) {
          return res.status(400).json({ error: "Recipe data is required for saving temporary recipes" });
        }

        console.log('Saving temporary recipe:', recipe);

        // Insert into permanent recipes table with correct field names
        const [savedRecipe] = await db
          .insert(recipes)
          .values(transformRecipeToDb(recipe))
          .returning();

        console.log('Saved permanent recipe:', savedRecipe);

        // Add to user's favorites
        await db.insert(userRecipes).values({
          user_id: req.user!.id,
          recipe_id: savedRecipe.id,
        });

        // Clean up the temporary recipe if it exists
        try {
          await db
            .delete(temporaryRecipes)
            .where(eq(temporaryRecipes.id, Math.abs(recipeId)));
        } catch (error) {
          console.error("Error cleaning up temporary recipe:", error);
          // Don't fail the request if cleanup fails
        }

        return res.json({
          message: "Recipe saved and added to favorites",
          permanentId: savedRecipe.id,
          recipe: transformRecipeToClient(savedRecipe)
        });
      }

      // For existing permanent recipes, just add to favorites
      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId));

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      await db.insert(userRecipes).values({
        user_id: req.user!.id,
        recipe_id: recipeId,
      });

      res.json({ message: "Recipe added to favorites" });
    } catch (error: any) {
      console.error("Error adding recipe to favorites:", error);
      res.status(500).json({ error: "Failed to add recipe to favorites" });
    }
  });

  // Get user's favorite recipes
  app.get("/api/recipes/favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userFavorites = await db
        .select({
          id: recipes.id,
          name: recipes.name,
          description: recipes.description,
          image_url: recipes.image_url,
          prep_time: recipes.prep_time,
          cook_time: recipes.cook_time,
          servings: recipes.servings,
          ingredients: recipes.ingredients,
          instructions: recipes.instructions,
          tags: recipes.tags,
          nutrition: recipes.nutrition,
          complexity: recipes.complexity,
          created_at: recipes.created_at
        })
        .from(userRecipes)
        .innerJoin(recipes, eq(recipes.id, userRecipes.recipe_id))
        .where(eq(userRecipes.user_id, req.user!.id));

      // Transform to client format
      const transformedRecipes = userFavorites.map(transformRecipeToClient);
      res.json(transformedRecipes);
    } catch (error: any) {
      console.error("Error fetching favorite recipes:", error);
      return res.status(500).json({
        error: "Failed to fetch favorite recipes",
        message: error.message
      });
    }
  });

  // Remove recipe from favorites
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

  // Update user preferences
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