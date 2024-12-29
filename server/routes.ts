import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution } from "./utils/ai";
import { recipes, mealPlans, groceryLists, users, userRecipes, temporaryRecipes, type Recipe, type TemporaryRecipe, PreferenceSchema } from "@db/schema";
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
          image_url: recipes.image_url,
          prep_time: recipes.prep_time,
          cook_time: recipes.cook_time,
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

      // If it's a temporary recipe, we need to save it first
      if (recipeId < 0) {
        // Fetch the temporary recipe
        const [tempRecipe] = await db
          .select()
          .from(temporaryRecipes)
          .where(eq(temporaryRecipes.user_id, req.user!.id));

        if (!tempRecipe) {
          return res.status(404).json({ error: "Temporary recipe not found" });
        }

        // Transform and insert the recipe into the permanent recipes table
        const [savedRecipe] = await db
          .insert(recipes)
          .values({
            name: tempRecipe.name,
            description: tempRecipe.description,
            image_url: tempRecipe.image_url,
            prep_time: tempRecipe.prep_time,
            cook_time: tempRecipe.cook_time,
            servings: tempRecipe.servings,
            ingredients: tempRecipe.ingredients,
            instructions: tempRecipe.instructions,
            tags: tempRecipe.tags,
            nutrition: tempRecipe.nutrition,
            complexity: tempRecipe.complexity,
            created_at: new Date()
          })
          .returning();

        // Add to user's favorites using the new permanent ID
        await db.insert(userRecipes).values({
          user_id: req.user!.id,
          recipe_id: savedRecipe.id,
          created_at: new Date()
        });

        return res.json({
          message: "Recipe saved and added to favorites",
          permanentId: savedRecipe.id
        });
      }

      // For existing recipes, just add to favorites if not already favorited
      const existingFavorite = await db
        .select()
        .from(userRecipes)
        .where(
          and(
            eq(userRecipes.user_id, req.user!.id),
            eq(userRecipes.recipe_id, recipeId)
          )
        );

      if (existingFavorite.length > 0) {
        return res.status(400).json({ error: "Recipe already in favorites" });
      }

      await db.insert(userRecipes).values({
        user_id: req.user!.id,
        recipe_id: recipeId,
        created_at: new Date()
      });

      res.json({ message: "Recipe added to favorites" });
    } catch (error: any) {
      console.error("Error adding recipe to favorites:", error);
      res.status(500).json({
        error: "Failed to add recipe to favorites",
        details: error.message
      });
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

  // Protected Routes
  // Meal Plans - Protected Routes
  app.get("/api/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userMealPlans = await db.query.mealPlans.findMany({
        where: eq(mealPlans.user_id, req.user!.id),
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
          user_id: req.user!.id,
          start_date: new Date(startDate),
          end_date: new Date(endDate),
          created_at: new Date()
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

      const mealPlan = await db.query.mealPlans.findFirst({
        where: eq(mealPlans.id, parsedMealPlanId),
      });

      if (!mealPlan) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      if (mealPlan.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to access this meal plan" });
      }

      const groceryList = await db.query.groceryLists.findFirst({
        where: eq(groceryLists.meal_plan_id, parsedMealPlanId),
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

      const mealPlan = await db.query.mealPlans.findFirst({
        where: eq(mealPlans.id, mealPlanId),
      });

      if (!mealPlan) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      if (mealPlan.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to create grocery list for this meal plan" });
      }

      const [newGroceryList] = await db
        .insert(groceryLists)
        .values({
          user_id: req.user!.id,
          meal_plan_id: mealPlanId,
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

  // AI Meal Plan Generation - Protected Route
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

      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes: Partial<Recipe>[] = [];
      const usedRecipeNames = new Set<string>();

      const normalizedPreferences = {
        dietary: Array.isArray(preferences.dietary) ? preferences.dietary : [],
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies : [],
        cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine : [],
        meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes : []
      };


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

            if (!recipeData || typeof recipeData !== 'object') {
              throw new Error('Invalid recipe data received from API');
            }

            if (!recipeData.name) {
              throw new Error('Invalid recipe data: missing name');
            }

            if (!usedRecipeNames.has(recipeData.name)) {
              const validatedIngredients = Array.isArray(recipeData.ingredients)
                ? recipeData.ingredients
                    .filter((ing): ing is { name: string; amount: number; unit: string } => {
                      if (!ing || typeof ing !== 'object') return false;
                      return (
                        typeof (ing as any).name === 'string' &&
                        typeof (ing as any).amount === 'number' &&
                        typeof (ing as any).unit === 'string'
                      );
                    })
                    .map(ing => ({
                      name: ing.name.trim(),
                      amount: ing.amount,
                      unit: ing.unit.trim()
                    }))
                : [];

              const validatedInstructions = Array.isArray(recipeData.instructions)
                ? recipeData.instructions
                    .filter((instruction): instruction is string => typeof instruction === 'string')
                    .map(instruction => instruction.trim())
                : [];

              const validatedTags = Array.isArray(recipeData.tags)
                ? recipeData.tags
                    .filter((tag): tag is string => typeof tag === 'string')
                    .map(tag => tag.trim())
                : [];

              const validatedNutrition = {
                calories: Math.max(0, Number(recipeData.nutrition?.calories) || 0),
                protein: Math.max(0, Number(recipeData.nutrition?.protein) || 0),
                carbs: Math.max(0, Number(recipeData.nutrition?.carbs) || 0),
                fat: Math.max(0, Number(recipeData.nutrition?.fat) || 0)
              };

              const generatedRecipe: Partial<Recipe> = {
                name: recipeData.name.trim(),
                description: (recipeData.description || 'No description available').trim(),
                image_url: (recipeData.imageUrl || '').trim() || null,
                prep_time: Math.max(0, Number(recipeData.prepTime) || 0),
                cook_time: Math.max(0, Number(recipeData.cookTime) || 0),
                servings: Math.max(1, Number(recipeData.servings) || 2),
                ingredients: validatedIngredients,
                instructions: validatedInstructions,
                tags: validatedTags,
                nutrition: validatedNutrition,
                complexity: Math.max(1, Math.min(3, Number(recipeData.complexity) || 1)),
                created_at: new Date()
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
        if (!recipe || !recipe.name) continue;

        const [savedRecipe] = await db
          .insert(temporaryRecipes)
          .values({
            user_id: req.user!.id,
            name: recipe.name,
            description: recipe.description || null,
            image_url: recipe.image_url,
            prep_time: recipe.prep_time || 0,
            cook_time: recipe.cook_time || 0,
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
      }

      res.json({
        recipes: savedRecipes,
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