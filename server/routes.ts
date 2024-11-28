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
      const suggestedRecipes = [];
      const usedRecipeNames = new Set<string>();

      // Generate recipes for each day and meal
      for (let day = 0; day < days; day++) {
        for (let meal = 0; meal < mealsPerDay; meal++) {
          let attempts = 0;
          const maxAttempts = 3;
          let recipeGenerated = false;

          while (attempts < maxAttempts && !recipeGenerated) {
            try {
              const recipeData = await generateRecipeRecommendation({
                dietary: preferences?.dietary || [],
                allergies: preferences?.allergies || [],
                cuisine: preferences?.cuisine || [],
                meatTypes: preferences?.meatTypes || [],
                mealType: mealTypes[meal],
                excludeNames: Array.from(usedRecipeNames),
              });

              if (recipeData.name && !usedRecipeNames.has(recipeData.name)) {
                const recipeToInsert = {
                  name: recipeData.name || '',
                  description: recipeData.description || '',
                  imageUrl: recipeData.imageUrl || '',
                  prepTime: recipeData.prepTime || 0,
                  cookTime: recipeData.cookTime || 0,
                  servings: recipeData.servings || 2,
                  ingredients: JSON.stringify((recipeData.ingredients || []).map((ing: { name: string; amount: number; unit: string }) => ({
                    name: String(ing.name),
                    amount: Number(ing.amount),
                    unit: String(ing.unit)
                  }))),
                  instructions: JSON.stringify(Array.isArray(recipeData.instructions) ? recipeData.instructions : []),
                  tags: JSON.stringify(Array.isArray(recipeData.tags) ? recipeData.tags : []),
                  nutrition: JSON.stringify(typeof recipeData.nutrition === 'object' ? recipeData.nutrition : {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                  }),
                  complexity: typeof recipeData.complexity === 'number' ? recipeData.complexity : 1,
                };
                
                const [newRecipe] = await db.insert(recipes).values(recipeToInsert).returning();

                usedRecipeNames.add(recipeData.name);
                suggestedRecipes.push(newRecipe);
                recipeGenerated = true;
              }
              attempts++;
            } catch (recipeError: any) {
              if (recipeError.message === 'API_FALLBACK') {
                const fallbackName = `${recipeError.fallbackRecipe.name} (${day + 1}-${mealTypes[meal]})`;
                if (!usedRecipeNames.has(fallbackName)) {
                  const [newRecipe] = await db.insert(recipes).values({
                    ...recipeError.fallbackRecipe,
                    name: fallbackName,
                  }).returning();
                  usedRecipeNames.add(fallbackName);
                  suggestedRecipes.push(newRecipe);
                  recipeGenerated = true;
                }
              }
              attempts++;
            }
          }

          if (!recipeGenerated) {
            throw new Error('Failed to generate unique recipe after maximum attempts');
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
