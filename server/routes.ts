import type { Express } from "express";
import { db } from "../db";
import { recipes, favorites } from "@db/schema";
import { generateRecipeRecommendation } from "./utils/ai";
import { eq, and } from "drizzle-orm";

export default function setupRoutes(app: Express) {
  // Recipes
  app.get("/api/recipes", async (req, res) => {
    try {
      const allRecipes = await db.query.recipes.findMany();
      res.json(allRecipes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  // Recipe Generation
  app.post("/api/generate-recipes", async (req, res) => {
    try {
      const { preferences, days } = req.body;
      const recipesPerDay = 3; // breakfast, lunch, dinner
      const totalRecipes = days * recipesPerDay;
      const generatedRecipes = [];
      const usedNames = new Set();

      for (let i = 0; i < totalRecipes; i++) {
        const mealType = i % 3 === 0 ? "breakfast" : i % 3 === 1 ? "lunch" : "dinner";
        let retries = 0;
        let recipe;

        while (retries < 3) {
          try {
            recipe = await generateRecipeRecommendation({
              ...preferences,
              mealType,
              excludeNames: Array.from(usedNames),
            });
            
            if (recipe.name && !usedNames.has(recipe.name)) {
              usedNames.add(recipe.name);
              break;
            }
          } catch (error: any) {
            if (error.message === "API_FALLBACK" && error.fallbackRecipe) {
              recipe = error.fallbackRecipe;
              if (recipe.name && !usedNames.has(recipe.name)) {
                usedNames.add(recipe.name);
                break;
              }
            }
          }
          retries++;
        }

        if (recipe) {
          try {
            const [savedRecipe] = await db.insert(recipes)
              .values({
                name: recipe.name!,
                description: recipe.description,
                imageUrl: recipe.imageUrl,
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime,
                servings: recipe.servings,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
                tags: recipe.tags,
                nutrition: recipe.nutrition,
                complexity: recipe.complexity || 1,
              })
              .returning();
            
            generatedRecipes.push(savedRecipe);
          } catch (dbError) {
            console.error("Database error:", dbError);
            generatedRecipes.push(recipe);
          }
        }
      }

      res.json({
        recipes: generatedRecipes,
        status: generatedRecipes.some(r => !r.id) ? 'partial' : 'success'
      });
    } catch (error) {
      console.error("Recipe generation error:", error);
      res.status(500).json({
        error: "Failed to generate recipes",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Meal Plans
  app.post("/api/meal-plans", async (req, res) => {
    try {
      const { userId, name, startDate, endDate, recipes } = req.body;
      const [mealPlan] = await db
        .insert(recipes)
        .values({ userId, name, startDate, endDate, recipes })
        .returning();
      res.json(mealPlan);
    } catch (error) {
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  });

  // Favorites
  app.get("/api/favorites", async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const userFavorites = await db.query.favorites.findMany({
        where: eq(favorites.userId, userId),
        with: {
          recipe: true,
        },
      });
      res.json(userFavorites);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch favorites" });
    }
  });

  app.post("/api/favorites", async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const { recipeId } = req.body;
      
      const existingFavorite = await db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, userId),
          eq(favorites.recipeId, recipeId)
        ),
      });

      if (existingFavorite) {
        res.status(400).json({ error: "Recipe already in favorites" });
        return;
      }

      const [newFavorite] = await db.insert(favorites)
        .values({ userId, recipeId })
        .returning();
      
      res.json(newFavorite);
    } catch (error) {
      res.status(500).json({ error: "Failed to add to favorites" });
    }
  });

  app.delete("/api/favorites/:recipeId", async (req, res) => {
    try {
      const userId = 1; // Mock user ID
      const recipeId = parseInt(req.params.recipeId);
      
      await db.delete(favorites)
        .where(and(
          eq(favorites.userId, userId),
          eq(favorites.recipeId, recipeId)
        ));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from favorites" });
    }
  });
}