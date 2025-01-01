import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt, or } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution } from "./utils/ai";
import { recipes, mealPlans, groceryLists, users, userRecipes, temporaryRecipes, type Recipe, PreferenceSchema, insertTemporaryRecipeSchema } from "@db/schema";
import { db } from "../db";
import { requireActiveSubscription } from "./middleware/subscription";
import { stripeService } from "./services/stripe";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

export function registerRoutes(app: express.Express) {
  // Subscription Routes
  app.post("/api/subscription/create-checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (!user.stripe_customer_id) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        user.stripe_customer_id = customer.id;
      }

      const session = await stripeService.createCheckoutSession(user.stripe_customer_id);
      res.json({ sessionId: session.id });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      return res.status(400).send('Missing stripe signature');
    }

    try {
      await stripeService.handleWebhook(req.body, signature);
      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      return res.status(400).send(`Webhook Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Get subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      const subscriptionData = {
        isActive: user.subscription_status === 'active',
        tier: user.subscription_tier,
        endDate: user.subscription_end_date,
      };

      res.json(subscriptionData);
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: "Failed to fetch subscription status" });
    }
  });

  // Cancel subscription
  app.post("/api/subscription/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (!user.stripe_subscription_id) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      await stripeService.cancelSubscription(user.stripe_subscription_id);
      res.json({ message: "Subscription cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  // Temporary recipes endpoints
  app.get("/api/temporary-recipes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log('Fetching temporary recipes for user:', req.user?.id);
      const now = new Date();
      const { source } = req.query;
      const isFromMealPlan = source === 'mealplan';

      const activeRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, req.user!.id),
            isFromMealPlan
              ? gt(temporaryRecipes.expires_at, now)
              : or(
                  eq(temporaryRecipes.favorited, true),
                  gt(temporaryRecipes.expires_at, now)
                )
          )
        );

      console.log('Found recipes:', activeRecipes.length);
      res.json(activeRecipes);
    } catch (error: any) {
      console.error("Error fetching temporary recipes:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({
        error: "Failed to fetch temporary recipes",
        details: error.message
      });
    }
  });

  // Save temporary recipe with type-safe insert
  app.post("/api/temporary-recipes", isAuthenticated, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2); // Set expiration to 2 days from now

      const recipe = req.body;
      const insertData = {
        user_id: req.user!.id,
        name: String(recipe.name || ''),
        description: recipe.description?.toString() || null,
        image_url: recipe.image_url?.toString() || null,
        prep_time: Number(recipe.prep_time) || 0,
        cook_time: Number(recipe.cook_time) || 0,
        servings: Number(recipe.servings) || 2,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        tags: recipe.tags || [],
        nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        complexity: Number(recipe.complexity) || 1,
        created_at: new Date(),
        expires_at: expirationDate,
        favorited: false
      };

      const parseResult = insertTemporaryRecipeSchema.safeParse(insertData);

      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid recipe data",
          details: parseResult.error.errors
        });
      }

      const [savedRecipe] = await db
        .insert(temporaryRecipes)
        .values(parseResult.data)
        .returning();

      res.json(savedRecipe);
    } catch (error: any) {
      console.error("Error saving temporary recipe:", error);
      res.status(500).json({
        error: "Failed to save temporary recipe",
        details: error.message
      });
    }
  });

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

      const favoriteRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, req.user.id),
            eq(temporaryRecipes.favorited, true)
          )
        );

      res.setHeader('Content-Type', 'application/json');
      return res.json(favoriteRecipes);
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

      const [updatedRecipe] = await db
        .update(temporaryRecipes)
        .set({ favorited: true })
        .where(
          and(
            eq(temporaryRecipes.id, recipeId),
            eq(temporaryRecipes.user_id, req.user!.id)
          )
        )
        .returning();

      if (!updatedRecipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      return res.json({
        message: "Recipe marked as favorite",
        recipe: updatedRecipe
      });
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

      const [updatedRecipe] = await db
        .update(temporaryRecipes)
        .set({ favorited: false })
        .where(
          and(
            eq(temporaryRecipes.id, recipeId),
            eq(temporaryRecipes.user_id, req.user!.id)
          )
        )
        .returning();

      if (!updatedRecipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      return res.json({
        message: "Recipe removed from favorites",
        recipe: updatedRecipe
      });
    } catch (error: any) {
      console.error("Error removing recipe from favorites:", error);
      res.status(500).json({ error: "Failed to remove recipe from favorites" });
    }
  });

  // Protected Routes requiring subscription
  app.post("/api/generate-meal-plan", isAuthenticated, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
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

      // Ensure all preference arrays exist and are properly formatted
      const normalizedPreferences = {
        dietary: Array.isArray(preferences.dietary) ? preferences.dietary : [],
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies : [],
        cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine : [],
        meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes : []
      };

      // Generate recipes
      for (let day = 0; day < days; day++) {
        for (const mealType of mealTypes) {
          console.log(`Generating recipe for day ${day + 1}, meal ${mealType}`);
          try {
            const existingNames = Array.from(usedRecipeNames);
            const recipeData = await generateRecipeRecommendation({
              dietary: normalizedPreferences.dietary,
              allergies: normalizedPreferences.allergies,
              cuisine: normalizedPreferences.cuisine,
              meatTypes: normalizedPreferences.meatTypes,
              mealType,
              excludeNames: existingNames,
            });

            if (!recipeData?.name || typeof recipeData !== 'object') {
              console.error('Invalid recipe data received:', recipeData);
              throw new Error('Invalid recipe data received from API');
            }

            if (!usedRecipeNames.has(recipeData.name)) {
              const generatedRecipe: Partial<Recipe> = {
                ...recipeData,
                id: -(suggestedRecipes.length + 1), // Using negative IDs for temporary recipes
              };

              console.log('Generated recipe:', JSON.stringify(generatedRecipe, null, 2));
              usedRecipeNames.add(recipeData.name);
              suggestedRecipes.push(generatedRecipe);
            }
          } catch (error) {
            console.error(`Failed to generate recipe for day ${day + 1}, meal ${mealType}:`, error);
            continue;
          }
        }
      }

      // Save generated recipes to temporary_recipes table
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2); // Set expiration to 2 days from now

      const savedRecipes = [];
      for (const recipe of suggestedRecipes) {
        if (!recipe) continue;

        const insertResult = insertTemporaryRecipeSchema.safeParse({
          user_id: req.user!.id,
          name: String(recipe.name || ''),
          description: recipe.description?.toString() || null,
          image_url: recipe.image_url?.toString() || null,
          prep_time: Number(recipe.prep_time) || 0,
          cook_time: Number(recipe.cook_time) || 0,
          servings: Number(recipe.servings) || 2,
          ingredients: Array.isArray(recipe.ingredients) ? JSON.stringify(recipe.ingredients) : "[]",
          instructions: Array.isArray(recipe.instructions) ? JSON.stringify(recipe.instructions) : "[]",
          tags: Array.isArray(recipe.tags) ? JSON.stringify(recipe.tags) : "[]",
          nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
          complexity: Number(recipe.complexity) || 1,
          created_at: new Date(),
          expires_at: expirationDate,
          favorited: false
        });

        if (!insertResult.success) {
          console.error('Invalid recipe data:', insertResult.error.issues);
          continue;
        }

        const [savedRecipe] = await db
          .insert(temporaryRecipes)
          .values([insertResult.data])
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

  app.post("/api/meal-plans", isAuthenticated, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const { name, startDate, endDate } = req.body;

      const [newMealPlan] = await db
        .insert(mealPlans)
        .values({
          name,
          user_id: req.user!.id,
          start_date: new Date(startDate),
          end_date: new Date(endDate),
        })
        .returning();

      res.json(newMealPlan);
    } catch (error: any) {
      console.error("Error creating meal plan:", error);
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  });

  // Grocery Lists - Protected Routes
  app.get("/api/grocery-lists/:meal_plan_id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { meal_plan_id } = req.params;
      const parsedMealPlanId = parseInt(meal_plan_id);

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

  app.post("/api/grocery-lists", isAuthenticated, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const { meal_plan_id, items } = req.body;

      const mealPlan = await db.query.mealPlans.findFirst({
        where: eq(mealPlans.id, meal_plan_id),
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
          meal_plan_id,
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

  // Ingredient Substitution endpoint
  app.post("/api/substitute-ingredient", isAuthenticated, requireActiveSubscription, async (req: Request, res: Response) => {
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