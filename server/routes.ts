import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { recipes, mealPlans, groceryLists, users, type Recipe } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateRecipeRecommendation, DEFAULT_RECIPES } from "./utils/ai";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
};

export function registerRoutes(app: Express) {
  // Public Routes
  // Recipes - Read only for public access
  app.get("/api/recipes", async (req, res) => {
    const allRecipes = await db.query.recipes.findMany();
    res.json(allRecipes);
  });

  // Protected Routes
  // Meal Plans - Protected Routes
  app.get("/api/meal-plans", isAuthenticated, async (req, res) => {
    try {
      const userMealPlans = await db.query.mealPlans.findMany({
        where: eq(mealPlans.userId, req.user!.id),
      });
      res.json(userMealPlans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ error: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/meal-plans", isAuthenticated, async (req, res) => {
    try {
      const { name, startDate, endDate, recipes: mealPlanRecipes } = req.body;
      
      const newMealPlan = await db.insert(mealPlans).values({
        name,
        userId: req.user!.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        recipes: mealPlanRecipes,
      }).returning();

      res.json(newMealPlan[0]);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  });

  // Grocery Lists - Protected Routes
  app.get("/api/grocery-lists/:mealPlanId", isAuthenticated, async (req, res) => {
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
    } catch (error) {
      console.error("Error fetching grocery list:", error);
      res.status(500).json({ error: "Failed to fetch grocery list" });
    }
  });

  app.post("/api/grocery-lists", isAuthenticated, async (req, res) => {
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

      const newGroceryList = await db.insert(groceryLists)
        .values({
          userId: req.user!.id,
          mealPlanId,
          items,
          created: new Date(),
        })
        .returning();

      res.json(newGroceryList[0]);
    } catch (error) {
      console.error("Error creating grocery list:", error);
      res.status(500).json({ error: "Failed to create grocery list" });
    }
  });

  // AI Meal Plan Generation - Protected Route
  app.post("/api/generate-meal-plan", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: "Unauthorized",
          message: "You must be logged in to generate meal plans"
        });
      }

      const { preferences, days } = req.body;
      if (!preferences || !days) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: preferences and days"
        });
      }

      const mealsPerDay = 3;
      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes: Array<{
        id: number;
        name: string;
        description: string | null;
        imageUrl: string | null;
        prepTime: number | null;
        cookTime: number | null;
        servings: number | null;
        ingredients: { name: string; amount: number; unit: string; }[] | null;
        instructions: string[] | null;
        tags: string[] | null;
        nutrition: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        } | null;
        complexity: number;
      }> = [];
      const usedRecipeNames = new Set<string>();

      // Store user preferences if provided
      if (req.user && preferences) {
        await db
          .update(users)
          .set({ preferences })
          .where(eq(users.id, req.user.id));
      }

      // Generate recipes for each day and meal
      for (let day = 0; day < days; day++) {
        for (let meal = 0; meal < mealsPerDay; meal++) {
          let attempts = 0;
          const maxAttempts = 5;
          let recipeGenerated = false;
          const usedNames = Array.from(usedRecipeNames);

          while (attempts < maxAttempts && !recipeGenerated) {
            try {
              const recipeData = await generateRecipeRecommendation({
                dietary: Array.isArray(preferences?.dietary) ? preferences.dietary : [],
                allergies: Array.isArray(preferences?.allergies) ? preferences.allergies : [],
                cuisine: Array.isArray(preferences?.cuisine) ? preferences.cuisine : [],
                meatTypes: Array.isArray(preferences?.meatTypes) ? preferences.meatTypes : [],
                mealType: mealTypes[meal],
                excludeNames: usedNames,
              });

              if (recipeData.name && !usedRecipeNames.has(recipeData.name)) {
                const recipeToInsert = {
                  name: recipeData.name,
                  description: recipeData.description || null,
                  imageUrl: recipeData.imageUrl || null,
                  prepTime: recipeData.prepTime || null,
                  cookTime: recipeData.cookTime || null,
                  servings: recipeData.servings || null,
                  ingredients: recipeData.ingredients || null,
                  instructions: recipeData.instructions || null,
                  tags: recipeData.tags || null,
                  nutrition: recipeData.nutrition || null,
                  complexity: typeof recipeData.complexity === 'number' ? recipeData.complexity : 1
                };

                const [newRecipe] = await db.insert(recipes)
                  .values([recipeToInsert])
                  .returning();

                usedRecipeNames.add(recipeData.name);
                suggestedRecipes.push(newRecipe);
                recipeGenerated = true;
              }
            } catch (error) {
              attempts++;
              continue;
            }
          }

          if (!recipeGenerated) {
            // Use a fallback recipe
            const mealTypeStr = mealTypes[meal];
            const fallbackRecipe = DEFAULT_RECIPES[mealTypeStr];
            const fallbackName = `${fallbackRecipe.name} (${day + 1}-${mealTypeStr})`;
            
            if (!usedRecipeNames.has(fallbackName)) {
              const fallbackToInsert = {
                name: fallbackName,
                description: fallbackRecipe.description || null,
                imageUrl: fallbackRecipe.imageUrl || null,
                prepTime: fallbackRecipe.prepTime || null,
                cookTime: fallbackRecipe.cookTime || null,
                servings: fallbackRecipe.servings || null,
                ingredients: fallbackRecipe.ingredients ? JSON.stringify(fallbackRecipe.ingredients) : null,
                instructions: fallbackRecipe.instructions ? JSON.stringify(fallbackRecipe.instructions) : null,
                tags: fallbackRecipe.tags ? JSON.stringify(fallbackRecipe.tags) : null,
                nutrition: fallbackRecipe.nutrition ? JSON.stringify(fallbackRecipe.nutrition) : null,
                complexity: typeof fallbackRecipe.complexity === 'number' ? fallbackRecipe.complexity : 1
              };
              
              const [newRecipe] = await db.insert(recipes)
                .values(fallbackToInsert)
                .returning();

              usedRecipeNames.add(fallbackName);
              suggestedRecipes.push({
                ...newRecipe,
                ingredients: newRecipe.ingredients ? JSON.parse(newRecipe.ingredients) : null,
                instructions: newRecipe.instructions ? JSON.parse(newRecipe.instructions) : null,
                tags: newRecipe.tags ? JSON.parse(newRecipe.tags) : null,
                nutrition: newRecipe.nutrition ? JSON.parse(newRecipe.nutrition) : null,
              });
            }
          }
        }
      }

      res.json({
        recipes: suggestedRecipes,
        status: suggestedRecipes.some(r => r.name.includes('(Fallback)')) ? 'partial' : 'success'
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
