import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt, or, sql, inArray, desc } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution, generateRecipeSuggestionsFromIngredients, generateRecipeFromTitleAI } from "./utils/ai";
import { recipes, mealPlans, groceryLists, users, userRecipes, temporaryRecipes, type Recipe, PreferenceSchema, insertTemporaryRecipeSchema } from "@db/schema";
import { db } from "../db";
import { requireActiveSubscription } from "./middleware/subscription";
import { stripeService } from "./services/stripe";
import { downloadAndStoreImage } from "./services/imageStorage";
import auth from './services/firebase';
import { createFirebaseToken } from './services/firebase';
import { type PublicUser } from "./types";
import { z } from "zod";
import { MealTypeEnum, CuisineTypeEnum, DietaryTypeEnum, DifficultyEnum } from "@db/schema";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

export function registerRoutes(app: express.Express) {
  // Configure body parsing middleware
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });

  // Subscription Routes
  app.post("/api/subscription/create-checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      if (!user.stripe_customer_id) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        user.stripe_customer_id = customer.id;
      }

      const session = await stripeService.createCheckoutSession(user.stripe_customer_id);
      res.json({
        sessionId: session.id,
        url: session.url
      });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Use raw bodyParser for Stripe webhooks
  app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    console.log('Webhook received:', {
      headers: req.headers,
      body: req.body.toString(),
      timestamp: new Date().toISOString()
    });
    const signature = req.headers['stripe-signature'];
    console.log('Webhook signature verification:', {
      hasSignature: !!signature,
      signatureType: typeof signature,
      webhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      timestamp: new Date().toISOString()
    });

    if (!signature || typeof signature !== 'string') {
      console.error('Missing stripe signature in webhook request');
      return res.status(400).json({
        error: 'Missing stripe signature',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // The raw body is available as a Buffer in req.body
      const rawBody = req.body;
      if (!Buffer.isBuffer(rawBody)) {
        throw new Error('Expected raw body to be a Buffer');
      }

      console.log('🎯 Webhook received:', {
        signature,
        timestamp: new Date().toISOString(),
        bodyLength: rawBody.length,
        headers: req.headers
      });

      // Process the webhook event
      const result = await stripeService.handleWebhook(rawBody, signature);
      console.log('Webhook processed:', {result, timestamp: new Date().toISOString()}); //Added logging here

      // Send a 200 response to acknowledge receipt of the event
      res.json({
        received: true,
        timestamp: new Date().toISOString(),
        result
      });
    } catch (error) {
      // Log the full error details for debugging
      console.error('Webhook processing failed:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: error.constructor.name
        } : error,
        timestamp: new Date().toISOString(),
        headers: req.headers
      });

      // Send a 400 status code so Stripe will retry the webhook
      return res.status(400).json({
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        type: error instanceof Error ? error.constructor.name : 'Unknown'
      });
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
      expirationDate.setDate(expirationDate.getDate() + 2);

      const recipe = req.body;
      const insertData = {
        user_id: req.user!.id,
        name: String(recipe.name || ''),
        description: recipe.description?.toString() || null,
        image_url: recipe.image_url?.toString() || null,
        permanent_url: null, // Start with null permanent_url
        prep_time: Math.max(0, Number(recipe.prep_time) || 0),
        cook_time: Math.max(0, Number(recipe.cook_time) || 0),
        servings: Math.max(1, Number(recipe.servings) || 2),
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
        tags: Array.isArray(recipe.tags) ? recipe.tags : [],
        nutrition: recipe.nutrition && typeof recipe.nutrition === 'object'
          ? recipe.nutrition
          : { calories: 0, protein: 0, carbs: 0, fat: 0 },
        complexity: Math.min(3, Math.max(1, Number(recipe.complexity) || 1)),
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

      // Now that we have a valid recipe ID, store the image if one exists
      if (savedRecipe.image_url) {
        try {
          const permanentUrl = await downloadAndStoreImage(savedRecipe.image_url, String(savedRecipe.id));
          if (permanentUrl) {
            // Update the recipe with the permanent URL
            const [updatedRecipe] = await db
              .update(temporaryRecipes)
              .set({ permanent_url: permanentUrl })
              .where(eq(temporaryRecipes.id, savedRecipe.id))
              .returning();
            
            return res.json(updatedRecipe);
          }
        } catch (error) {
          console.error('Failed to store image:', error);
          // Continue with the original recipe if image storage fails
        }
      }

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

  // Recipe Routes
  app.get("/api/recipes/community", async (req: Request, res: Response) => {
    try {
      // First get the top 5 recipe names by favorites count
      const topRecipeNames = await db
        .select({
          name: temporaryRecipes.name,
          total_favorites: sql<number>`MAX(${temporaryRecipes.favorites_count})`
        })
        .from(temporaryRecipes)
        .where(gt(temporaryRecipes.favorites_count, 0))
        .groupBy(temporaryRecipes.name)
        .orderBy(sql`MAX(${temporaryRecipes.favorites_count}) DESC`)
        .limit(5);

      if (topRecipeNames.length === 0) {
        return res.json([]);
      }

      // Then get the full recipe details for these names
      const communityRecipes = await db
        .select({
          id: temporaryRecipes.id,
          name: temporaryRecipes.name,
          description: temporaryRecipes.description,
          image_url: temporaryRecipes.image_url,
          permanent_url: temporaryRecipes.permanent_url,
          prep_time: temporaryRecipes.prep_time,
          cook_time: temporaryRecipes.cook_time,
          servings: temporaryRecipes.servings,
          ingredients: temporaryRecipes.ingredients,
          instructions: temporaryRecipes.instructions,
          tags: temporaryRecipes.tags,
          nutrition: temporaryRecipes.nutrition,
          complexity: temporaryRecipes.complexity,
          favorites_count: temporaryRecipes.favorites_count,
          created_at: temporaryRecipes.created_at
        })
        .from(temporaryRecipes)
        .where(
          and(
            gt(temporaryRecipes.favorites_count, 0),
            inArray(temporaryRecipes.name, topRecipeNames.map(r => r.name))
          )
        )
        .orderBy(desc(temporaryRecipes.favorites_count))
        .limit(5);

      res.json(communityRecipes);
    } catch (error) {
      console.error("Error fetching community recipes:", error);
      res.status(500).json({ error: "Failed to fetch community recipes" });
    }
  });

  app.get("/api/recipes/favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const favoriteRecipes = await db
        .select({
          id: temporaryRecipes.id,
          name: temporaryRecipes.name,
          description: temporaryRecipes.description,
          image_url: temporaryRecipes.image_url,
          permanent_url: temporaryRecipes.permanent_url,
          prep_time: temporaryRecipes.prep_time,
          cook_time: temporaryRecipes.cook_time,
          servings: temporaryRecipes.servings,
          ingredients: temporaryRecipes.ingredients,
          instructions: temporaryRecipes.instructions,
          tags: temporaryRecipes.tags,
          nutrition: temporaryRecipes.nutrition,
          complexity: temporaryRecipes.complexity,
          favorites_count: temporaryRecipes.favorites_count,
          created_at: temporaryRecipes.created_at
        })
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, req.user!.id),
            eq(temporaryRecipes.favorited, true)
          )
        );

      res.json(favoriteRecipes);
    } catch (error) {
      console.error("Error fetching favorite recipes:", error);
      res.status(500).json({ error: "Failed to fetch favorite recipes" });
    }
  });

  app.post("/api/recipes/:recipeId/favorite", isAuthenticated, async (req: Request, res: Response) => {
    const recipeId = parseInt(req.params.recipeId);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: "Invalid recipe ID" });
    }

    try {
      // Start a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // Get the recipe to favorite
        const recipe = await tx
          .select()
          .from(temporaryRecipes)
          .where(eq(temporaryRecipes.id, recipeId))
          .limit(1);

        if (recipe.length === 0) {
          throw new Error("Recipe not found");
        }

        // Create a new temporary recipe for this user if it doesn't exist
        const existingFavorite = await tx
          .select()
          .from(temporaryRecipes)
          .where(
            and(
              eq(temporaryRecipes.user_id, req.user!.id),
              eq(temporaryRecipes.name, recipe[0].name)
            )
          )
          .limit(1);

        if (existingFavorite.length === 0) {
          // Create a new entry for this user
          await tx.insert(temporaryRecipes).values({
            name: recipe[0].name,
            description: recipe[0].description,
            image_url: recipe[0].image_url,
            permanent_url: recipe[0].permanent_url,
            prep_time: recipe[0].prep_time,
            cook_time: recipe[0].cook_time,
            servings: recipe[0].servings,
            ingredients: recipe[0].ingredients,
            instructions: recipe[0].instructions,
            tags: recipe[0].tags,
            nutrition: recipe[0].nutrition,
            complexity: recipe[0].complexity,
            favorites_count: recipe[0].favorites_count || 0,
            user_id: req.user!.id,
            favorited: true,
            created_at: new Date(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Set expiry to 1 year
          });

          // Update favorites count for all recipes with this name
          await tx
            .update(temporaryRecipes)
            .set({ 
              favorites_count: sql`COALESCE(${temporaryRecipes.favorites_count} + 1, 1)` 
            })
            .where(eq(temporaryRecipes.name, recipe[0].name));
        } else if (!existingFavorite[0].favorited) {
          // Update existing entry to be favorited
          await tx
            .update(temporaryRecipes)
            .set({ 
              favorited: true,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Extend expiry to 1 year
            })
            .where(eq(temporaryRecipes.id, existingFavorite[0].id));

          // Update favorites count for all recipes with this name
          await tx
            .update(temporaryRecipes)
            .set({ 
              favorites_count: sql`COALESCE(${temporaryRecipes.favorites_count} + 1, 1)` 
            })
            .where(eq(temporaryRecipes.name, recipe[0].name));
        }
      });

      res.json({ message: "Recipe favorited successfully" });
    } catch (error: any) {
      console.error("Error favoriting recipe:", error);
      res.status(500).json({ error: "Failed to favorite recipe" });
    }
  });

  app.delete("/api/recipes/:recipeId/favorite", isAuthenticated, async (req: Request, res: Response) => {
    const recipeId = parseInt(req.params.recipeId);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: "Invalid recipe ID" });
    }

    try {
      // Start a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // Get the recipe to unfavorite
        const recipe = await tx
          .select()
          .from(temporaryRecipes)
          .where(
            and(
              eq(temporaryRecipes.id, recipeId),
              eq(temporaryRecipes.user_id, req.user!.id)
            )
          )
          .limit(1);

        if (recipe.length === 0) {
          throw new Error("Recipe not found or not favorited");
        }

        if (!recipe[0].favorited) {
          throw new Error("Recipe not favorited");
        }

        // Update the recipe to be unfavorited
        await tx
          .update(temporaryRecipes)
          .set({ 
            favorited: false,
            expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Reset expiry to 2 days
          })
          .where(eq(temporaryRecipes.id, recipeId));

        // Update favorites count for all recipes with this name
        await tx
          .update(temporaryRecipes)
          .set({ 
            favorites_count: sql`GREATEST(COALESCE(${temporaryRecipes.favorites_count} - 1, 0), 0)` 
          })
          .where(eq(temporaryRecipes.name, recipe[0].name));
      });

      res.json({ message: "Recipe unfavorited successfully" });
    } catch (error: any) {
      console.error("Error unfavoriting recipe:", error);
      res.status(500).json({ error: "Failed to unfavorite recipe" });
    }
  });

  // Protected Routes requiring subscription
  app.post("/api/generate-meal-plan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Check if user has remaining free generations or is premium
      const isFreeTier = user.subscription_tier === 'free';
      const hasUsedFreePlan = user.meal_plans_generated > 0;

      if (isFreeTier && hasUsedFreePlan) {
        return res.status(403).json({
          error: "Free plan limit reached",
          message: "You've reached your free meal plan limit. Please upgrade to premium for unlimited meal plans.",
          code: "UPGRADE_REQUIRED"
        });
      }

      const { preferences, days } = req.body;

      // Add detailed logging of received preferences
      console.log('Received meal plan generation request:', {
        preferences: JSON.stringify(preferences, null, 2),
        days,
        userId: user.id
      });

      // Validate input parameters
      if (!preferences || !days) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: preferences and days"
        });
      }

      // Ensure all preference arrays exist and are properly formatted
      const normalizedPreferences = {
        dietary: Array.isArray(preferences.dietary) ? preferences.dietary : [],
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies : [],
        cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine : [],
        meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes : [],
        chefPreferences: preferences.chefPreferences || {}
      };

      // Log normalized preferences
      console.log('Normalized preferences:', JSON.stringify(normalizedPreferences, null, 2));

      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestedRecipes = [];
      const usedRecipeNames = new Set<string>();

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

        const insertData = {
          user_id: req.user!.id,
          name: String(recipe.name || ''),
          description: recipe.description?.toString() || null,
          image_url: recipe.image_url?.toString() || null,
          permanent_url: null,
          prep_time: Math.max(0, Number(recipe.prep_time) || 0),
          cook_time: Math.max(0, Number(recipe.cook_time) || 0),
          servings: Math.max(1, Number(recipe.servings) || 2),
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
          meal_type: (Array.isArray(recipe.tags) 
            ? (recipe.tags.find((tag): tag is z.infer<typeof MealTypeEnum> => 
                ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"].includes(tag as string)
              ) || "Dinner")
            : "Dinner"),
          cuisine_type: (Array.isArray(recipe.tags)
            ? (recipe.tags.find((tag): tag is z.infer<typeof CuisineTypeEnum> => 
                ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"].includes(tag as string)
              ) || "Other")
            : "Other"),
          dietary_restrictions: (Array.isArray(recipe.tags)
            ? recipe.tags.filter((tag): tag is z.infer<typeof DietaryTypeEnum> => 
                ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag as string)
              )
            : []),
          difficulty: (() => {
            switch(recipe.complexity) {
              case 1: return "Easy" as const;
              case 2: return "Moderate" as const;
              case 3: return "Advanced" as const;
              default: return "Moderate" as const;
            }
          })(),
          tags: (Array.isArray(recipe.tags)
            ? recipe.tags.filter((tag): tag is string => 
                typeof tag === 'string' && ![
                  "Breakfast", "Lunch", "Dinner", "Snack", "Dessert",
                  "Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French",
                  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"
                ].includes(tag)
              )
            : []),
          nutrition: recipe.nutrition && typeof recipe.nutrition === 'object'
            ? recipe.nutrition
            : { calories: 0, protein: 0, carbs: 0, fat: 0 },
          complexity: Math.min(3, Math.max(1, Number(recipe.complexity) || 1)),
          created_at: new Date(),
          expires_at: expirationDate,
          favorited: false,
          favorites_count: 0
        };

        const parseResult = insertTemporaryRecipeSchema.safeParse(insertData);

        if (!parseResult.success) {
          console.error('Invalid recipe data:', parseResult.error.issues);
          continue;
        }

        const [savedRecipe] = await db
          .insert(temporaryRecipes)
          .values([parseResult.data])
          .returning();

        // Add image storage here
        if (savedRecipe.image_url) {
          try {
            const permanentUrl = await downloadAndStoreImage(savedRecipe.image_url, String(savedRecipe.id));
            if (permanentUrl) {
              // Update the recipe with the permanent URL
              const [updatedRecipe] = await db
                .update(temporaryRecipes)
                .set({ permanent_url: permanentUrl })
                .where(eq(temporaryRecipes.id, savedRecipe.id))
                .returning();
              
              savedRecipes.push(updatedRecipe);
              continue; // Skip the push at the end
            }
          } catch (error) {
            console.error('Failed to store image:', error);
            // Continue with the original recipe if image storage fails
          }
        }

        savedRecipes.push(savedRecipe);
      }

      // After successfully saving recipes, increment the meal_plans_generated counter
      if (savedRecipes.length > 0) {
        await db
          .update(users)
          .set({ meal_plans_generated: user.meal_plans_generated + 1 })
          .where(eq(users.id, user.id));
      }

      res.json({
        recipes: savedRecipes,
        status: savedRecipes.length === days * mealTypes.length ? 'success' : 'partial',
        remaining_free_plans: isFreeTier ? (hasUsedFreePlan ? 0 : 1) : null
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

  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken } = req.body;
      
      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      const email = decodedToken.email;
      
      if (!email) {
        return res.status(400).json({ message: 'No email found in Google account' });
      }
      
      // Check if user exists
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (!user) {
        // Create new user if they don't exist
        const [newUser] = await db
          .insert(users)
          .values({
            email: email.toLowerCase(),
            password_hash: '', // No password for Google auth users
            name: decodedToken.name || null,
            created_at: new Date(),
          })
          .returning();
        user = newUser;
      }
      
      // Create a custom token for Firebase
      const firebaseToken = await createFirebaseToken(user.id.toString());
      
      // Log the user in
      const publicUser: PublicUser = {
        ...user,
        subscription_status: user.subscription_status || 'inactive',
        subscription_tier: user.subscription_tier || 'free',
        meal_plans_generated: user.meal_plans_generated || 0,
        firebaseToken
      };
      
      req.login(publicUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error logging in' });
        }
        return res.json(publicUser);
      });
    } catch (error) {
      console.error('Error in Google auth:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });

  // Generate recipe suggestions from ingredients
  app.post("/api/generate-recipe-suggestions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { ingredients, dietary, allergies } = req.body;

      // Validate input
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Must provide at least one ingredient"
        });
      }

      // Check if user has active subscription for more than 3 ingredients
      const isFreeTier = user.subscription_tier === 'free';
      if (isFreeTier && ingredients.length > 3) {
        return res.status(403).json({
          error: "Free plan limit reached",
          message: "Free tier is limited to 3 ingredients. Please upgrade to premium for unlimited ingredients.",
          code: "UPGRADE_REQUIRED"
        });
      }

      const suggestions = await generateRecipeSuggestionsFromIngredients({
        ingredients,
        dietary: Array.isArray(dietary) ? dietary : undefined,
        allergies: Array.isArray(allergies) ? allergies : undefined
      });

      res.json({ suggestions });
    } catch (error: any) {
      console.error("Error generating recipe suggestions:", error);
      res.status(500).json({
        error: "Failed to generate recipe suggestions",
        details: error.message
      });
    }
  });

  // Generate a complete recipe from a title
  app.post("/api/generate-recipe", isAuthenticated, requireActiveSubscription, async (req: Request, res: Response) => {
    try {
      const { title } = req.body;

      if (!title) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Recipe title is required"
        });
      }

      // Generate the recipe using the title-specific function
      const recipeData = await generateRecipeFromTitleAI(title);

      // Save as a temporary recipe
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2);

      const insertData = {
        user_id: req.user!.id,
        name: String(recipeData.name || ''),
        description: recipeData.description?.toString() || null,
        image_url: recipeData.image_url?.toString() || null,
        permanent_url: null,
        prep_time: Math.max(0, Number(recipeData.prep_time) || 0),
        cook_time: Math.max(0, Number(recipeData.cook_time) || 0),
        servings: Math.max(1, Number(recipeData.servings) || 2),
        ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
        instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
        meal_type: (Array.isArray(recipeData.tags) 
          ? (recipeData.tags.find((tag): tag is z.infer<typeof MealTypeEnum> => 
              ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"].includes(tag as string)
            ) || "Dinner")
          : "Dinner"),
        cuisine_type: (Array.isArray(recipeData.tags)
          ? (recipeData.tags.find((tag): tag is z.infer<typeof CuisineTypeEnum> => 
              ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"].includes(tag as string)
            ) || "Other")
          : "Other"),
        dietary_restrictions: (Array.isArray(recipeData.tags)
          ? recipeData.tags.filter((tag): tag is z.infer<typeof DietaryTypeEnum> => 
              ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag as string)
            )
          : []),
        difficulty: (() => {
          switch(recipeData.complexity) {
            case 1: return "Easy" as const;
            case 2: return "Moderate" as const;
            case 3: return "Advanced" as const;
            default: return "Moderate" as const;
          }
        })(),
        tags: (Array.isArray(recipeData.tags)
          ? recipeData.tags.filter((tag): tag is string => 
              typeof tag === 'string' && ![
                "Breakfast", "Lunch", "Dinner", "Snack", "Dessert",
                "Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French",
                "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"
              ].includes(tag)
            )
          : []),
        nutrition: recipeData.nutrition && typeof recipeData.nutrition === 'object'
          ? recipeData.nutrition
          : { calories: 0, protein: 0, carbs: 0, fat: 0 },
        complexity: Math.min(3, Math.max(1, Number(recipeData.complexity) || 1)),
        created_at: new Date(),
        expires_at: expirationDate,
        favorited: false,
        favorites_count: 0
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

      // Add image storage
      if (savedRecipe.image_url) {
        try {
          const permanentUrl = await downloadAndStoreImage(savedRecipe.image_url, String(savedRecipe.id));
          if (permanentUrl) {
            const [updatedRecipe] = await db
              .update(temporaryRecipes)
              .set({ permanent_url: permanentUrl })
              .where(eq(temporaryRecipes.id, savedRecipe.id))
              .returning();
            
            return res.json({ recipe: updatedRecipe });
          }
        } catch (error) {
          console.error('Failed to store image:', error);
        }
      }

      res.json({ recipe: savedRecipe });
    } catch (error: any) {
      console.error("Error generating recipe:", error);
      res.status(500).json({
        error: "Failed to generate recipe",
        details: error.message
      });
    }
  });
}