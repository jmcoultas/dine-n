import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution } from "./utils/ai";
import { recipes, mealPlans, groceryLists, users, userRecipes, temporaryRecipes } from "@db/schema";
import type { Recipe, TemporaryRecipe } from "@db/schema";
import { PreferenceSchema } from "@db/schema";
import { db } from "../db";
import { nanoid } from 'nanoid';

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

      res.json(activeRecipes);
    } catch (error: any) {
      console.error("Error fetching temporary recipes:", error);
      res.status(500).json({ error: "Failed to fetch temporary recipes" });
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

      // If it's a temporary recipe (negative ID), we need to save it first
      if (recipeId < 0) {
        const recipeData = req.body.recipe;
        if (!recipeData) {
          return res.status(400).json({ error: "Recipe data is required for temporary recipes" });
        }

        // Transform and insert the recipe into the database
        const transformedRecipe = {
          name: recipeData.name,
          description: recipeData.description,
          image_url: recipeData.imageUrl,
          prep_time: recipeData.prepTime,
          cook_time: recipeData.cookTime,
          servings: recipeData.servings,
          ingredients: recipeData.ingredients,
          instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
          tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
          nutrition: recipeData.nutrition,
          complexity: recipeData.complexity,
          created_at: new Date()
        };

        const [savedRecipe] = await db
          .insert(recipes)
          .values(transformedRecipe)
          .returning();

        // Add to user's favorites using the new permanent ID
        await db.insert(userRecipes).values({
          user_id: req.user!.id,
          recipe_id: savedRecipe.id,
        });

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
        recipe_id: recipeId,
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

  // Generate meal plan
  app.post("/api/generate-meal-plan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check for existing active temporary recipes
      const now = new Date();
      const existingRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, req.user!.id),
            gt(temporaryRecipes.expires_at, now)
          )
        );

      if (existingRecipes.length > 0) {
        return res.status(400).json({
          error: "Active meal plan exists",
          message: "You already have an active meal plan. Save or wait for it to expire before generating a new one."
        });
      }

      const { preferences, days } = req.body;

      if (!preferences || !days) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: preferences and days"
        });
      }

      console.log('Generating meal plan with preferences:', JSON.stringify({
        dietary: preferences.dietary,
        allergies: preferences.allergies,
        cuisine: preferences.cuisine,
        meatTypes: preferences.meatTypes,
        days
      }, null, 2));

      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes: Partial<Recipe>[] = [];
      const usedRecipeNames = new Set<string>();

      // Generate recipes
      for (let day = 0; day < days; day++) {
        for (const mealType of mealTypes) {
          try {
            const existingNames = Array.from(usedRecipeNames);
            const recipeData = await generateRecipeRecommendation({
              dietary: preferences.dietary.filter(Boolean),
              allergies: preferences.allergies.filter(Boolean),
              cuisine: preferences.cuisine.filter(Boolean),
              meatTypes: preferences.meatTypes.filter(Boolean),
              mealType: mealType,
              excludeNames: existingNames,
            });

            if (!recipeData || !recipeData.name) {
              console.error('Invalid recipe data received:', recipeData);
              throw new Error('Invalid recipe data received from API');
            }

            if (!usedRecipeNames.has(recipeData.name)) {
              const generatedRecipe: Partial<Recipe> = {
                ...recipeData,
                id: -(suggestedRecipes.length + 1),
              };

              usedRecipeNames.add(recipeData.name);
              suggestedRecipes.push(generatedRecipe);
            }
          } catch (error) {
            console.error(`Failed to generate recipe for day ${day + 1}, meal ${mealType}:`, error);
            continue;
          }
        }
      }

      // Save to temporary_recipes table
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2); // Set expiration to 2 days from now

      const savedRecipes: TemporaryRecipe[] = [];
      for (const recipe of suggestedRecipes) {
        if (!recipe) continue;

        try {
          const [savedRecipe] = await db
            .insert(temporaryRecipes)
            .values({
              user_id: req.user!.id,
              name: recipe.name || '',
              description: recipe.description || null,
              image_url: recipe.imageUrl || null,
              prep_time: recipe.prepTime || 0,
              cook_time: recipe.cookTime || 0,
              servings: recipe.servings || 2,
              ingredients: recipe.ingredients || [],
              instructions: recipe.instructions || [],
              tags: recipe.tags || [],
              nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
              complexity: recipe.complexity || 1,
              created_at: new Date(),
              expires_at: expirationDate,
            })
            .returning();

          savedRecipes.push(savedRecipe);
        } catch (error) {
          console.error("Error saving temporary recipe:", error);
          continue;
        }
      }

      res.json({
        recipes: savedRecipes,
        status: savedRecipes.length === days * 3 ? 'success' : 'partial'
      });
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({
        error: "Failed to generate meal plan",
        details: error.message
      });
    }
  });

  // Protected Routes
  // Meal Plans - Protected Routes
  app.get("/api/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userMealPlans = await db.query.mealPlans.findMany({
        where: eq(mealPlans.userId, req.user!.id),
      });
      res.json(userMealPlans);
    } catch (error: any) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ error: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { name, startDate, endDate } = req.body;

      const [newMealPlan] = await db
        .insert(mealPlans)
        .values({
          name,
          userId: req.user!.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        })
        .returning();

      res.json(newMealPlan);
    } catch (error: any) {
      console.error("Error creating meal plan:", error);
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  });

  // Grocery Lists - Protected Routes
  app.get("/api/grocery-lists/:mealPlanId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { mealPlanId } = req.params;
      const parsedMealPlanId = parseInt(mealPlanId);

      if (isNaN(parsedMealPlanId)) {
        return res.status(400).json({ error: "Invalid meal plan ID" });
      }

      // First verify meal plan ownership
      const mealPlan = await db.query.mealPlans.findFirst({
        where: eq(mealPlans.id, parsedMealPlanId),
      });

      if (!mealPlan) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      if (mealPlan.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to access this meal plan" });
      }

      const groceryList = await db.query.groceryLists.findFirst({
        where: eq(groceryLists.mealPlanId, parsedMealPlanId),
      });

      res.json(groceryList);
    } catch (error: any) {
      console.error("Error fetching grocery list:", error);
      res.status(500).json({ error: "Failed to fetch grocery list" });
    }
  });

  app.post("/api/grocery-lists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { mealPlanId, items } = req.body;

      // Verify meal plan ownership
      const mealPlan = await db.query.mealPlans.findFirst({
        where: eq(mealPlans.id, mealPlanId),
      });

      if (!mealPlan) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      if (mealPlan.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to create grocery list for this meal plan" });
      }

      const [newGroceryList] = await db
        .insert(groceryLists)
        .values({
          userId: req.user!.id,
          mealPlanId,
          items,
          created: new Date(),
        })
        .returning();

      res.json(newGroceryList);
    } catch (error: any) {
      console.error("Error creating grocery list:", error);
      res.status(500).json({ error: "Failed to create grocery list" });
    }
  });


  // Share meal plan routes
  app.post("/api/meal-plans/:id/share", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const mealPlanId = parseInt(id);

      if (isNaN(mealPlanId)) {
        return res.status(400).json({ error: "Invalid meal plan ID" });
      }

      // Check ownership
      const mealPlan = await db.query.mealPlans.findFirst({
        where: and(
          eq(mealPlans.id, mealPlanId),
          eq(mealPlans.user_id, req.user!.id)
        ),
      });

      if (!mealPlan) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      // Toggle sharing status and generate/remove share_id
      const is_public = !mealPlan.is_public;
      const share_id = is_public ? (mealPlan.share_id || nanoid(10)) : null;

      const [updatedMealPlan] = await db
        .update(mealPlans)
        .set({
          is_public,
          share_id
        })
        .where(eq(mealPlans.id, mealPlanId))
        .returning();

      res.json({
        isPublic: updatedMealPlan.is_public,
        shareId: updatedMealPlan.share_id,
        shareUrl: updatedMealPlan.share_id
          ? `${process.env.PUBLIC_URL || ''}/shared-meal-plan/${updatedMealPlan.share_id}`
          : null
      });
    } catch (error: any) {
      console.error("Error toggling meal plan sharing:", error);
      res.status(500).json({ error: "Failed to toggle meal plan sharing" });
    }
  });

  app.get("/api/meal-plans/shared/:shareId", async (req: Request, res: Response) => {
    try {
      const { shareId } = req.params;

      const sharedMealPlan = await db.query.mealPlans.findFirst({
        where: and(
          eq(mealPlans.share_id, shareId),
          eq(mealPlans.is_public, true)
        ),
      });

      if (!sharedMealPlan) {
        return res.status(404).json({ error: "Shared meal plan not found" });
      }

      res.json(sharedMealPlan);
    } catch (error: any) {
      console.error("Error fetching shared meal plan:", error);
      res.status(500).json({ error: "Failed to fetch shared meal plan" });
    }
  });

  // AI Meal Plan Generation - Protected Route
  //This route is already updated in the edited code snippet.

  // Ingredient Substitution endpoint
  app.post("/api/substitute-ingredient", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { ingredient, dietary, allergies } = req.body;

      if (!ingredient) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameter: ingredient"
        });
      }

      console.log('Generating substitutions for:', {
        ingredient,
        dietary: dietary || [],
        allergies: allergies || []
      });

      const substitutions = await generateIngredientSubstitution({
        ingredient,
        dietary: Array.isArray(dietary) ? dietary : [],
        allergies: Array.isArray(allergies) ? allergies : []
      });

      res.json(substitutions);
    } catch (error: any) {
      console.error("Error generating substitutions:", error);
      res.status(500).json({
        error: "Failed to generate substitutions",
        message: error.message
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