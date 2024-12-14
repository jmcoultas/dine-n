import express, { type Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { generateRecipeRecommendation } from "./utils/ai";
import { recipes, mealPlans, groceryLists, users, userRecipes } from "@db/schema";
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
        .innerJoin(recipes, eq(recipes.id, userRecipes.recipeId))
        .where(eq(userRecipes.userId, req.user.id));

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

      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId));

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      await db.insert(userRecipes).values({
        userId: req.user!.id,
        recipeId: recipeId,
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
            eq(userRecipes.userId, req.user!.id),
            eq(userRecipes.recipeId, recipeId)
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

  // AI Meal Plan Generation - Protected Route
  app.post("/api/generate-meal-plan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { preferences, days } = req.body;
      
      // Validate input parameters
      if (!preferences || !days) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: preferences and days"
        });
      }

      // Log received parameters
      console.log('Received parameters:', JSON.stringify({
        preferences,
        days,
        user: req.user?.id
      }, null, 2));

      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes = [];
      const usedRecipeNames = new Set<string>();

      console.log('Starting meal plan generation with preferences:', JSON.stringify({
        dietary: preferences.dietary,
        allergies: preferences.allergies,
        cuisine: preferences.cuisine,
        meatTypes: preferences.meatTypes,
        days
      }, null, 2));

      // Generate one recipe per meal type per day
      for (let day = 0; day < days; day++) {
        for (const mealType of mealTypes) {
          console.log(`Generating recipe for day ${day + 1}, meal ${mealType}`);
          const usedNames = Array.from(usedRecipeNames);
          try {
            console.log(`Generating recipe for ${mealType}`);
              
            const recipeData = await generateRecipeRecommendation({
              dietary: preferences?.dietary?.filter(Boolean) || [],
              allergies: preferences?.allergies?.filter(Boolean) || [],
              cuisine: preferences?.cuisine?.filter(Boolean) || [],
              meatTypes: preferences?.meatTypes?.filter(Boolean) || [],
              mealType: mealType,
              excludeNames: usedNames,
            });

            if (!recipeData || !recipeData.name) {
              console.error('Invalid recipe data received:', recipeData);
              throw new Error('Invalid recipe data received from API');
            }

            if (!usedRecipeNames.has(recipeData.name)) {
              const recipeToInsert = {
                name: recipeData.name,
                description: recipeData.description || 'No description available',
                image_url: recipeData.imageUrl,
                prep_time: recipeData.prepTime || 0,
                cook_time: recipeData.cookTime || 0,
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
                created_at: new Date()
              };

              console.log('Inserting recipe:', JSON.stringify(recipeToInsert, null, 2));

              const [newRecipe] = await db
                .insert(recipes)
                .values(recipeToInsert)
                .returning();

              usedRecipeNames.add(recipeData.name);
              suggestedRecipes.push(newRecipe);
            }
          } catch (error) {
            console.error(`Failed to generate recipe for day ${day + 1}, meal ${mealType}:`, error);
            continue;
          }
        }
      }

      res.json({
        recipes: suggestedRecipes,
        status: suggestedRecipes.length === days * mealTypes.length ? 'success' : 'partial'
      });
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({
        error: "Failed to generate meal plan",
        details: error.message
      });
    }
  });
}