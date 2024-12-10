import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { recipes, mealPlans, groceryLists, type Recipe } from "@db/schema";
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
    const userMealPlans = await db.query.mealPlans.findMany({
      where: eq(mealPlans.userId, req.user!.id),
    });
    res.json(userMealPlans);
  });

  app.post("/api/meal-plans", isAuthenticated, async (req, res) => {
    const newMealPlan = await db.insert(mealPlans).values({
      ...req.body,
      userId: req.user!.id,
    }).returning();
    res.json(newMealPlan[0]);
  });

  // Grocery Lists - Protected Routes
  app.get("/api/grocery-lists/:mealPlanId", isAuthenticated, async (req, res) => {
    const { mealPlanId } = req.params;
    const groceryList = await db.query.groceryLists.findFirst({
      where: eq(groceryLists.mealPlanId, parseInt(mealPlanId)),
    });

    // Verify ownership
    if (groceryList && groceryList.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to access this grocery list" });
    }

    res.json(groceryList);
  });

  app.post("/api/grocery-lists", isAuthenticated, async (req, res) => {
    const newGroceryList = await db.insert(groceryLists)
      .values({
        ...req.body,
        userId: req.user!.id,
      })
      .returning();
    res.json(newGroceryList[0]);
  });

  // AI Meal Plan Generation - Protected Route
  app.post("/api/generate-meal-plan", isAuthenticated, async (req, res) => {
    try {
      const { preferences, days } = req.body;
      const mealsPerDay = 3;
      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes: Recipe[] = [];
      const usedRecipeNames = new Set<string>();

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
                const [newRecipe] = await db.insert(recipes).values({
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
                  complexity: recipeData.complexity || 1
                }).returning();

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
              const [newRecipe] = await db.insert(recipes).values({
                ...fallbackRecipe,
                name: fallbackName,
              }).returning();
              usedRecipeNames.add(fallbackName);
              suggestedRecipes.push(newRecipe);
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
