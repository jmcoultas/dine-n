import { type Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, mealPlans, groceryLists, recipes } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateRecipeRecommendation, DEFAULT_RECIPES } from "./utils/ai";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    error: "Unauthorized", 
    message: "You must be logged in to access this resource" 
  });
}

export function registerRoutes(app: Express) {
  // User Profile Routes
  // User Profile Routes
  app.put("/api/user/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { name, email } = req.body;
      
      // Validate input
      if (!name?.trim() || !email?.trim()) {
        return res.status(400).json({ 
          error: "Bad Request",
          message: "Name and email are required" 
        });
      }

      if (!email.includes('@') || !email.includes('.')) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Invalid email format"
        });
      }

      // Check if email is already taken by another user
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser && existingUser.id !== req.user!.id) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Email is already taken"
        });
      }

      // Update user profile
      const [updatedUser] = await db
        .update(users)
        .set({ 
          name: name.trim(), 
          email: email.toLowerCase().trim() 
        })
        .where(eq(users.id, req.user!.id))
        .returning();

      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update profile",
        details: error.message
      });
    }
  });

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
      const { name, startDate, endDate, recipes: mealPlanRecipes } = req.body;
      
      const newMealPlan = await db.insert(mealPlans).values({
        name,
        userId: req.user!.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        recipes: mealPlanRecipes,
      }).returning();

      res.json(newMealPlan[0]);
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

      const newGroceryList = await db.insert(groceryLists)
        .values({
          userId: req.user!.id,
          mealPlanId,
          items,
          created: new Date(),
        })
        .returning();

      res.json(newGroceryList[0]);
    } catch (error: any) {
      console.error("Error creating grocery list:", error);
      res.status(500).json({ error: "Failed to create grocery list" });
    }
  });

  // AI Meal Plan Generation - Protected Route
  app.post("/api/generate-meal-plan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { preferences, days } = req.body;
      if (!preferences || !days) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: preferences and days"
        });
      }

      // Store user preferences if provided
      if (req.user && preferences) {
        await db
          .update(users)
          .set({ preferences })
          .where(eq(users.id, req.user.id));
      }

      const mealsPerDay = 3;
      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes = [];
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
                const recipeToInsert = {
                  name: recipeData.name,
                  description: recipeData.description || undefined,
                  imageUrl: recipeData.imageUrl || undefined,
                  prepTime: recipeData.prepTime || undefined,
                  cookTime: recipeData.cookTime || undefined,
                  servings: recipeData.servings || undefined,
                  ingredients: Array.isArray(recipeData.ingredients) 
                    ? recipeData.ingredients.map(ing => {
                        const ingredient = ing as { name?: string; amount?: number; unit?: string };
                        return {
                          name: String(ingredient?.name || ''),
                          amount: Number(ingredient?.amount || 0),
                          unit: String(ingredient?.unit || '')
                        };
                      })
                    : undefined,
                  instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : undefined,
                  tags: Array.isArray(recipeData.tags) ? recipeData.tags : undefined,
                  nutrition: {
                    calories: Number((recipeData.nutrition as any)?.calories || 0),
                    protein: Number((recipeData.nutrition as any)?.protein || 0),
                    carbs: Number((recipeData.nutrition as any)?.carbs || 0),
                    fat: Number((recipeData.nutrition as any)?.fat || 0)
                  },
                  complexity: typeof recipeData.complexity === 'number' && [1, 2, 3].includes(recipeData.complexity)
                    ? recipeData.complexity as 1 | 2 | 3
                    : 1
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
                description: fallbackRecipe.description || undefined,
                imageUrl: fallbackRecipe.imageUrl || undefined,
                prepTime: fallbackRecipe.prepTime || undefined,
                cookTime: fallbackRecipe.cookTime || undefined,
                servings: fallbackRecipe.servings || undefined,
                ingredients: Array.isArray(fallbackRecipe.ingredients) ? fallbackRecipe.ingredients : undefined,
                instructions: Array.isArray(fallbackRecipe.instructions) ? fallbackRecipe.instructions : undefined,
                tags: Array.isArray(fallbackRecipe.tags) ? fallbackRecipe.tags : undefined,
                nutrition: {
                  calories: Number((fallbackRecipe.nutrition as any)?.calories || 0),
                  protein: Number((fallbackRecipe.nutrition as any)?.protein || 0),
                  carbs: Number((fallbackRecipe.nutrition as any)?.carbs || 0),
                  fat: Number((fallbackRecipe.nutrition as any)?.fat || 0)
                },
                complexity: typeof fallbackRecipe.complexity === 'number' && [1, 2, 3].includes(fallbackRecipe.complexity)
                  ? fallbackRecipe.complexity as 1 | 2 | 3
                  : 1
              };
              
              const [newRecipe] = await db.insert(recipes)
                .values(fallbackToInsert)
                .returning();

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
