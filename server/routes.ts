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
          const recipe = await generateRecipeRecommendation({
            dietary: preferences?.dietary || [],
            allergies: preferences?.allergies || [],
            mealType: mealTypes[meal],
          });

          // Insert the generated recipe into the database
          const [newRecipe] = await db.insert(recipes).values(recipe).returning();
          suggestedRecipes.push(newRecipe);
        }
      }

      res.json(suggestedRecipes);
    } catch (error: any) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ 
        error: "Failed to generate meal plan",
        type: error.error?.type || error.type || 'unknown'
      });
    }
  });
}
