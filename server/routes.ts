import type { Express } from "express";
import { db } from "../db";
import { recipes, mealPlans, groceryLists } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateRecipeRecommendation } from "./utils/ai";

export function registerRoutes(app: Express) {
  // Recipes
  app.get("/api/recipes", async (req, res) => {
    const allRecipes = await db.query.recipes.findMany();
    res.json(allRecipes);
  });

  app.post("/api/recipes", async (req, res) => {
    const newRecipe = await db.insert(recipes).values(req.body).returning();
    res.json(newRecipe[0]);
  });

  // Meal Plans
  app.get("/api/meal-plans", async (req, res) => {
    const allMealPlans = await db.query.mealPlans.findMany();
    res.json(allMealPlans);
  });

  app.post("/api/meal-plans", async (req, res) => {
    const newMealPlan = await db.insert(mealPlans).values(req.body).returning();
    res.json(newMealPlan[0]);
  });

  // Grocery Lists
  app.get("/api/grocery-lists/:mealPlanId", async (req, res) => {
    const { mealPlanId } = req.params;
    const groceryList = await db.query.groceryLists.findFirst({
      where: eq(groceryLists.mealPlanId, parseInt(mealPlanId)),
    });
    res.json(groceryList);
  });

  app.post("/api/grocery-lists", async (req, res) => {
    const newGroceryList = await db.insert(groceryLists)
      .values(req.body)
      .returning();
    res.json(newGroceryList[0]);
  });

  // AI Meal Plan Generation
  app.post("/api/generate-meal-plan", async (req, res) => {
    try {
      const { preferences, days } = req.body;
      const mealsPerDay = 3;
      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes: Recipe[] = [];

      // Generate recipes for each day and meal
      for (let day = 0; day < days; day++) {
        for (let meal = 0; meal < mealsPerDay; meal++) {
          try {
            const recipeData = await generateRecipeRecommendation({
              dietary: preferences?.dietary || [],
              allergies: preferences?.allergies || [],
              cuisine: preferences?.cuisine || [],
              meatTypes: preferences?.meatTypes || [],
              mealType: mealTypes[meal],
            });

            // Insert the generated recipe into the database
            const [newRecipe] = await db.insert(recipes).values({
              name: recipeData.name || 'Generated Recipe',
              description: recipeData.description,
              imageUrl: recipeData.imageUrl,
              prepTime: recipeData.prepTime || 0,
              cookTime: recipeData.cookTime || 0,
              servings: recipeData.servings || 2,
              ingredients: recipeData.ingredients || [],
              instructions: recipeData.instructions || [],
              tags: recipeData.tags || [],
              nutrition: recipeData.nutrition || {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0
              }
            }).returning();
            suggestedRecipes.push(newRecipe);
          } catch (recipeError: any) {
            if (recipeError.message === 'API_FALLBACK') {
              // Use fallback recipe
              const [newRecipe] = await db.insert(recipes).values({
                ...recipeError.fallbackRecipe,
                name: `${recipeError.fallbackRecipe.name} (Fallback)`,
              }).returning();
              suggestedRecipes.push(newRecipe);
            } else {
              throw recipeError;
            }
          }
        }
      }

      // If we have any recipes (either AI-generated or fallback), return them
      if (suggestedRecipes.length > 0) {
        res.json({
          recipes: suggestedRecipes,
          status: suggestedRecipes.some(r => r.name.includes('(Fallback)')) ? 'partial' : 'success'
        });
      } else {
        throw new Error('Failed to generate any recipes');
      }
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      
      // Determine error type and message
      let errorType = 'unknown';
      let errorMessage = 'Failed to generate meal plan';
      
      if (error.error?.type === 'insufficient_quota' || error.type === 'insufficient_quota') {
        errorType = 'service_unavailable';
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorType = 'connection_error';
        errorMessage = 'Unable to connect to recipe service. Please check your connection.';
      }
      
      res.status(500).json({ 
        error: errorMessage,
        type: errorType
      });
    }
  });
}
