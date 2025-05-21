import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt, or, sql, inArray, desc, isNotNull, isNull } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution, generateRecipeSuggestionsFromIngredients, generateRecipeFromTitleAI } from "./utils/ai";
import { recipes, mealPlans, groceryLists, users, userRecipes, temporaryRecipes, mealPlanRecipes, type Recipe, PreferenceSchema, insertTemporaryRecipeSchema } from "@db/schema";
import { db } from "../db";
import { requireActiveSubscription } from "./middleware/subscription";
import { stripeService } from "./services/stripe";
import { downloadAndStoreImage } from "./services/imageStorage";
import auth from './services/firebase';
import { createFirebaseToken } from './services/firebase';
import { type PublicUser } from "./types";
import { z } from "zod";
import { MealTypeEnum, CuisineTypeEnum, DietaryTypeEnum, DifficultyEnum } from "@db/schema";
import { MealPlanExpirationService } from "./services/mealPlanExpiration";
import crypto from 'crypto';
import { randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

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

      // Check if subscription is still valid even if cancelled
      const isStillValid = user.subscription_end_date && new Date() <= user.subscription_end_date;
      const hasPremiumAccess = user.subscription_tier === 'premium' && 
        (user.subscription_status === 'active' || 
         (user.subscription_status === 'cancelled' && isStillValid));

      const subscriptionData = {
        isActive: hasPremiumAccess,
        tier: user.subscription_tier,
        endDate: user.subscription_end_date,
        status: user.subscription_status,
        isCancelled: user.subscription_status === 'cancelled'
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

      const activeRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, req.user!.id),
            gt(temporaryRecipes.expires_at, now),
            // For meal plan recipes, only return recipes with meal_type set
            // For PantryPal recipes, only return recipes without meal_type
            source === 'mealplan' 
              ? isNotNull(temporaryRecipes.meal_type)
              : isNull(temporaryRecipes.meal_type)
          )
        )
        .orderBy(temporaryRecipes.created_at);

      console.log('Found recipes:', activeRecipes.length);
      console.log('Recipe meal types:', activeRecipes.map(r => r.meal_type));
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

      // Get one representative recipe for each unique recipe name
      const communityRecipes = [];
      
      for (const topRecipe of topRecipeNames) {
        // Get the recipe with the highest favorites_count for this name
        const recipes = await db
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
              eq(temporaryRecipes.name, topRecipe.name),
              gt(temporaryRecipes.favorites_count, 0)
            )
          )
          .orderBy(desc(temporaryRecipes.favorites_count))
          .limit(1);
          
        if (recipes.length > 0) {
          communityRecipes.push(recipes[0]);
        }
      }

      res.json(communityRecipes);
    } catch (error) {
      console.error("Error fetching community recipes:", error);
      res.status(500).json({ error: "Failed to fetch community recipes" });
    }
  });

  // Get top breakfast recipes
  app.get("/api/recipes/breakfast", async (req: Request, res: Response) => {
    try {
      // First get the top 5 breakfast recipe names by favorites count
      const topRecipeNames = await db
        .select({
          name: temporaryRecipes.name,
          total_favorites: sql<number>`MAX(${temporaryRecipes.favorites_count})`
        })
        .from(temporaryRecipes)
        .where(
          and(
            gt(temporaryRecipes.favorites_count, 0),
            eq(temporaryRecipes.meal_type, "Breakfast")
          )
        )
        .groupBy(temporaryRecipes.name)
        .orderBy(sql`MAX(${temporaryRecipes.favorites_count}) DESC`)
        .limit(5);

      if (topRecipeNames.length === 0) {
        return res.json([]);
      }

      // Get one representative recipe for each unique recipe name
      const breakfastRecipes = [];
      
      for (const topRecipe of topRecipeNames) {
        // Get the recipe with the highest favorites_count for this name
        const recipes = await db
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
            created_at: temporaryRecipes.created_at,
            meal_type: temporaryRecipes.meal_type
          })
          .from(temporaryRecipes)
          .where(
            and(
              eq(temporaryRecipes.name, topRecipe.name),
              gt(temporaryRecipes.favorites_count, 0),
              eq(temporaryRecipes.meal_type, "Breakfast")
            )
          )
          .orderBy(desc(temporaryRecipes.favorites_count))
          .limit(1);
          
        if (recipes.length > 0) {
          breakfastRecipes.push(recipes[0]);
        }
      }

      res.json(breakfastRecipes);
    } catch (error) {
      console.error("Error fetching breakfast recipes:", error);
      res.status(500).json({ error: "Failed to fetch breakfast recipes" });
    }
  });

  // Get top lunch recipes
  app.get("/api/recipes/lunch", async (req: Request, res: Response) => {
    try {
      // First get the top 5 lunch recipe names by favorites count
      const topRecipeNames = await db
        .select({
          name: temporaryRecipes.name,
          total_favorites: sql<number>`MAX(${temporaryRecipes.favorites_count})`
        })
        .from(temporaryRecipes)
        .where(
          and(
            gt(temporaryRecipes.favorites_count, 0),
            eq(temporaryRecipes.meal_type, "Lunch")
          )
        )
        .groupBy(temporaryRecipes.name)
        .orderBy(sql`MAX(${temporaryRecipes.favorites_count}) DESC`)
        .limit(5);

      if (topRecipeNames.length === 0) {
        return res.json([]);
      }

      // Get one representative recipe for each unique recipe name
      const lunchRecipes = [];
      
      for (const topRecipe of topRecipeNames) {
        // Get the recipe with the highest favorites_count for this name
        const recipes = await db
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
            created_at: temporaryRecipes.created_at,
            meal_type: temporaryRecipes.meal_type
          })
          .from(temporaryRecipes)
          .where(
            and(
              eq(temporaryRecipes.name, topRecipe.name),
              gt(temporaryRecipes.favorites_count, 0),
              eq(temporaryRecipes.meal_type, "Lunch")
            )
          )
          .orderBy(desc(temporaryRecipes.favorites_count))
          .limit(1);
          
        if (recipes.length > 0) {
          lunchRecipes.push(recipes[0]);
        }
      }

      res.json(lunchRecipes);
    } catch (error) {
      console.error("Error fetching lunch recipes:", error);
      res.status(500).json({ error: "Failed to fetch lunch recipes" });
    }
  });

  // Get top dinner recipes
  app.get("/api/recipes/dinner", async (req: Request, res: Response) => {
    try {
      // First get the top 5 dinner recipe names by favorites count
      const topRecipeNames = await db
        .select({
          name: temporaryRecipes.name,
          total_favorites: sql<number>`MAX(${temporaryRecipes.favorites_count})`
        })
        .from(temporaryRecipes)
        .where(
          and(
            gt(temporaryRecipes.favorites_count, 0),
            eq(temporaryRecipes.meal_type, "Dinner")
          )
        )
        .groupBy(temporaryRecipes.name)
        .orderBy(sql`MAX(${temporaryRecipes.favorites_count}) DESC`)
        .limit(5);

      if (topRecipeNames.length === 0) {
        return res.json([]);
      }

      // Get one representative recipe for each unique recipe name
      const dinnerRecipes = [];
      
      for (const topRecipe of topRecipeNames) {
        // Get the recipe with the highest favorites_count for this name
        const recipes = await db
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
            created_at: temporaryRecipes.created_at,
            meal_type: temporaryRecipes.meal_type
          })
          .from(temporaryRecipes)
          .where(
            and(
              eq(temporaryRecipes.name, topRecipe.name),
              gt(temporaryRecipes.favorites_count, 0),
              eq(temporaryRecipes.meal_type, "Dinner")
            )
          )
          .orderBy(desc(temporaryRecipes.favorites_count))
          .limit(1);
          
        if (recipes.length > 0) {
          dinnerRecipes.push(recipes[0]);
        }
      }

      res.json(dinnerRecipes);
    } catch (error) {
      console.error("Error fetching dinner recipes:", error);
      res.status(500).json({ error: "Failed to fetch dinner recipes" });
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

        // Check if the user already has this recipe (by name) in their favorites
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
          // If the user doesn't have this recipe at all, update the existing recipe
          // to be associated with this user and mark it as favorited
          await tx
            .update(temporaryRecipes)
            .set({ 
              favorited: true,
              user_id: req.user!.id,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Set expiry to 1 year
            })
            .where(eq(temporaryRecipes.id, recipeId));

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
      const usedRecipeNames = new Set<string>();
      const missingMeals: Array<{ day: number; meal: string }> = [];

      // Track cuisine usage to ensure variety
      const cuisineUsage: Record<string, number> = {};
      normalizedPreferences.cuisine.forEach((cuisine: string) => {
        cuisineUsage[cuisine] = 0;
      });

      // Count existing cuisines to prioritize less-used ones
      const allUserRecipes = await db.query.temporaryRecipes.findMany({
        where: eq(temporaryRecipes.user_id, user.id)
      });
      
      allUserRecipes.forEach(recipe => {
        if (recipe.cuisine_type && normalizedPreferences.cuisine.includes(recipe.cuisine_type)) {
          cuisineUsage[recipe.cuisine_type] = (cuisineUsage[recipe.cuisine_type] || 0) + 1;
        }
      });

      // Generate recipes in parallel for each day and meal
      const recipePromises = [];
      const expectedRecipeCount = days * 3; // 3 meals per day

      // Prepare cuisine preference for each meal to ensure variety
      const cuisinesByMeal: Array<string[]> = [];
      for (let i = 0; i < expectedRecipeCount; i++) {
        // Get cuisines sorted by least used
        const prioritizedCuisines = [...normalizedPreferences.cuisine].sort((a, b) => 
          (cuisineUsage[a] || 0) - (cuisineUsage[b] || 0)
        );
        
        // Always include all cuisines, but prioritize least used ones
        cuisinesByMeal.push(prioritizedCuisines);
      }

      let mealIndex = 0;
      for (let day = 0; day < days; day++) {
        for (const mealType of mealTypes) {
          console.log(`Queuing recipe generation for day ${day + 1}, meal ${mealType}`);
          const existingNames = Array.from(usedRecipeNames);
          
          // Use prioritized cuisines for this meal
          const cuisinesForThisMeal = cuisinesByMeal[mealIndex] || normalizedPreferences.cuisine;
          mealIndex++;
          
          const promise = generateRecipeRecommendation({
            dietary: normalizedPreferences.dietary,
            allergies: normalizedPreferences.allergies,
            cuisine: cuisinesForThisMeal,
            meatTypes: normalizedPreferences.meatTypes,
            mealType,
            excludeNames: existingNames,
            maxRetries: 3 // Allow 3 retries at each relaxation level
          }).catch(error => {
            console.error(`Failed to generate recipe for day ${day + 1}, meal ${mealType}:`, error);
            missingMeals.push({ day, meal: mealType });
            return null;
          });
          recipePromises.push(promise);
        }
      }

      // Wait for all recipes to be generated
      const generatedRecipes = await Promise.all(recipePromises);
      const suggestedRecipes = [];

      // Process the generated recipes
      for (const recipeData of generatedRecipes) {
        if (!recipeData?.name || typeof recipeData !== 'object') {
          console.error('Invalid recipe data received:', recipeData);
          continue;
        }

        if (!usedRecipeNames.has(recipeData.name)) {
          const generatedRecipe: Partial<Recipe> = {
            ...recipeData,
            id: -(suggestedRecipes.length + 1), // Using negative IDs for temporary recipes
          };

          // Update cuisine usage count
          if (Array.isArray(recipeData.tags)) {
            const cuisineTag = recipeData.tags.find(tag => 
              typeof tag === 'string' && normalizedPreferences.cuisine.includes(tag)
            ) as string | undefined;
            
            if (cuisineTag && typeof cuisineTag === 'string') {
              cuisineUsage[cuisineTag] = (cuisineUsage[cuisineTag] || 0) + 1;
              console.log(`Updated cuisine usage: ${cuisineTag} used ${cuisineUsage[cuisineTag]} times`);
            }
          }

          console.log('Generated recipe:', JSON.stringify(generatedRecipe, null, 2));
          usedRecipeNames.add(recipeData.name);
          suggestedRecipes.push(generatedRecipe);
        }
      }

      // Allow partial success if we have at least one recipe per day
      const minimumRequired = days; // At least one meal per day
      if (suggestedRecipes.length < minimumRequired) {
        console.error(`Failed to generate minimum required recipes. Expected at least ${minimumRequired}, got ${suggestedRecipes.length}`);
        return res.status(500).json({
          error: "Failed to generate meal plan",
          message: "Could not generate enough recipes for a viable meal plan"
        });
      }

      // Save generated recipes to temporary_recipes table
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2); // Set expiration to 2 days from now

      const savedRecipes = [];
      for (let i = 0; i < suggestedRecipes.length; i++) {
        const recipe = suggestedRecipes[i];
        if (!recipe) continue;

        // Calculate the current meal type based on the recipe's position
        const currentMealType = mealTypes[i % 3];
        const mealTypeCapitalized = currentMealType.charAt(0).toUpperCase() + currentMealType.slice(1);

        try {
          const insertData = {
            user_id: user.id,
            name: recipe.name || '',
            description: recipe.description || null,
            image_url: recipe.image_url || null,
            permanent_url: null,
            prep_time: recipe.prep_time || 0,
            cook_time: recipe.cook_time || 0,
            servings: recipe.servings || 4,
            ingredients: recipe.ingredients || [],
            instructions: recipe.instructions || [],
            meal_type: mealTypeCapitalized as z.infer<typeof MealTypeEnum>,
            cuisine_type: (Array.isArray(recipe.tags)
              ? (recipe.tags.find((tag): tag is z.infer<typeof CuisineTypeEnum> => 
                  ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"].includes(tag as string)
                ) || "Other")
              : "Other") as z.infer<typeof CuisineTypeEnum>,
            dietary_restrictions: (Array.isArray(recipe.tags)
              ? recipe.tags.filter((tag): tag is z.infer<typeof DietaryTypeEnum> => 
                  ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag as string)
                )
              : []) as z.infer<typeof DietaryTypeEnum>[],
            difficulty: (() => {
              switch(recipe.complexity) {
                case 1: return "Easy" as const;
                case 2: return "Moderate" as const;
                case 3: return "Advanced" as const;
                default: return "Moderate" as const;
              }
            })() as z.infer<typeof DifficultyEnum>,
            tags: recipe.tags || [],
            nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
            complexity: recipe.complexity || 2,
            created_at: new Date(),
            expires_at: expirationDate,
            favorited: false,
            favorites_count: 0
          };

          const parseResult = insertTemporaryRecipeSchema.safeParse(insertData);
          
          if (!parseResult.success) {
            console.error('Invalid recipe data:', parseResult.error.issues);
            missingMeals.push({ 
              day: Math.floor(i / 3), 
              meal: currentMealType 
            });
            continue;
          }

          const [savedRecipe] = await db
            .insert(temporaryRecipes)
            .values(parseResult.data)
            .returning();

          if (savedRecipe.image_url) {
            try {
              const permanentUrl = await downloadAndStoreImage(savedRecipe.image_url, String(savedRecipe.id));
              if (permanentUrl) {
                const [updatedRecipe] = await db
                  .update(temporaryRecipes)
                  .set({ permanent_url: permanentUrl })
                  .where(eq(temporaryRecipes.id, savedRecipe.id))
                  .returning();
                savedRecipes.push(updatedRecipe);
                continue;
              }
            } catch (error) {
              console.error('Failed to store image:', error);
            }
          }
          savedRecipes.push(savedRecipe);
        } catch (error) {
          console.error('Failed to save recipe:', error);
          missingMeals.push({ 
            day: Math.floor(i / 3), 
            meal: currentMealType 
          });
        }
      }

      // After successfully saving recipes, increment the meal_plans_generated counter
      if (savedRecipes.length > 0) {
        await db
          .update(users)
          .set({ meal_plans_generated: user.meal_plans_generated + 1 })
          .where(eq(users.id, user.id));
      }

      // Return partial success response if we have some recipes but not all
      res.json({
        recipes: savedRecipes,
        status: savedRecipes.length === days * 3 ? 'success' : 'partial',
        missingMeals: missingMeals.length > 0 ? missingMeals : undefined,
        message: savedRecipes.length === days * 3 
          ? 'Successfully generated all recipes'
          : `Generated ${savedRecipes.length} out of ${days * 3} recipes`,
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

  app.post("/api/meal-plans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { name, start_date, end_date, expiration_date, days_generated, recipes } = req.body;

      // Validate days based on subscription
      if (!MealPlanExpirationService.validateRequestedDays(days_generated, user.subscription_tier)) {
        return res.status(400).json({
          error: "Invalid number of days for your subscription tier"
        });
      }

      // Create meal plan with expiration
      const [mealPlan] = await db.insert(mealPlans).values({
        user_id: user.id,
        name,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        expiration_date: new Date(expiration_date),
        days_generated,
        is_expired: false,
        created_at: new Date()
      }).returning();

      // If recipes are provided, create meal plan recipe associations
      if (Array.isArray(recipes) && recipes.length > 0) {
        const startDateObj = new Date(start_date);
        const mealPlanRecipeValues = recipes.map((recipe, index) => ({
          meal_plan_id: mealPlan.id,
          recipe_id: recipe.id,
          day: new Date(startDateObj.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000),
          meal: index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner",
          created_at: new Date()
        }));

        console.log('Creating meal plan recipes:', JSON.stringify(mealPlanRecipeValues, null, 2));
        await db.insert(mealPlanRecipes).values(mealPlanRecipeValues);
      }

      // Fetch the created meal plan with its recipes
      const mealPlanRecipesList = await db
        .select({
          recipe_id: mealPlanRecipes.recipe_id,
          meal: mealPlanRecipes.meal,
          day: mealPlanRecipes.day
        })
        .from(mealPlanRecipes)
        .where(eq(mealPlanRecipes.meal_plan_id, mealPlan.id));

      // Fetch the associated temporary recipes
      const recipeIds = mealPlanRecipesList.map(mpr => mpr.recipe_id);
      const tempRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(inArray(temporaryRecipes.id, recipeIds));

      // Combine the meal plan recipes with their full recipe data
      const recipesWithDetails = mealPlanRecipesList.map(mpr => {
        const recipe = tempRecipes.find(r => r.id === mpr.recipe_id);
        return recipe ? {
          ...recipe,
          meal: mpr.meal,
          day: mpr.day
        } : null;
      }).filter((r): r is NonNullable<typeof r> => r !== null);

      // Return the meal plan with the full recipe details
      const response = {
        ...mealPlan,
        recipes: recipesWithDetails
      };

      console.log('Created meal plan:', JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(500).json({ error: "Failed to create meal plan" });
    }
  });

  // Add a route to check meal plan expiration
  app.get("/api/meal-plans/:id/check-expiration", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const mealPlanId = parseInt(req.params.id);
      const isExpired = await MealPlanExpirationService.isExpired(mealPlanId);
      res.json({ is_expired: isExpired });
    } catch (error) {
      console.error("Error checking meal plan expiration:", error);
      res.status(500).json({ error: "Failed to check meal plan expiration" });
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

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      console.log('Password reset request received');
      const { email, newPassword } = req.body;
      
      if (!email || !newPassword) {
        console.error('Missing email or password in reset request');
        return res.status(400).json({ message: 'Email and new password are required' });
      }
      
      console.log(`Looking up user with email: ${email}`);
      // Find the user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);
      
      if (!user) {
        console.error(`User not found for email: ${email}`);
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log(`User found, generating new password hash for user ID: ${user.id}`);
      // Generate a new salt and hash the password
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      console.log('Updating password in database');
      // Update the user's password in the database
      await db
        .update(users)
        .set({ password_hash: hashedPassword })
        .where(eq(users.id, user.id));
      
      console.log('Password updated successfully');
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Failed to update password' });
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
  app.post("/api/generate-recipe", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { title, allergies } = req.body;

      if (!title) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Recipe title is required"
        });
      }

      // Check if free user has reached their limit
      if (user.subscription_tier === 'free') {
        if (user.ingredient_recipes_generated >= 3) {
          return res.status(403).json({
            error: "Free plan limit reached",
            message: "You have used all your free recipe generations. Please upgrade to premium for unlimited recipes.",
            code: "UPGRADE_REQUIRED"
          });
        }

        // Increment the counter
        await db
          .update(users)
          .set({ 
            ingredient_recipes_generated: (user.ingredient_recipes_generated || 0) + 1 
          })
          .where(eq(users.id, user.id));
      }

      // Generate the recipe using the title-specific function
      const recipeData = await generateRecipeFromTitleAI(title, Array.isArray(allergies) ? allergies : []);

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
        meal_type: null, // PantryPal recipes don't have a meal type
        cuisine_type: (Array.isArray(recipeData.tags)
          ? (recipeData.tags.find((tag): tag is z.infer<typeof CuisineTypeEnum> => 
              ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"].includes(tag as string)
            ) || "Other")
          : "Other"),
        dietary_restrictions: (Array.isArray(recipeData.tags)
          ? recipeData.tags.filter((tag): tag is z.infer<typeof DietaryTypeEnum> => 
              ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag as string)
            )
          : []) as z.infer<typeof DietaryTypeEnum>[],
        difficulty: (() => {
          switch(recipeData.complexity) {
            case 1: return "Easy" as const;
            case 2: return "Moderate" as const;
            case 3: return "Advanced" as const;
            default: return "Moderate" as const;
          }
        })() as z.infer<typeof DifficultyEnum>,
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

  // Recipe view endpoint
  app.get("/api/recipes/:id", async (req: Request, res: Response) => {
    try {
      console.log('Recipe view request received:', {
        params: req.params,
        url: req.url,
        method: req.method,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });

      const recipeId = parseInt(req.params.id);
      if (isNaN(recipeId)) {
        console.log('Invalid recipe ID:', {
          id: req.params.id,
          parsed: recipeId,
          timestamp: new Date().toISOString()
        });
        return res.status(400).json({ error: "Invalid recipe ID" });
      }

      // Search in temporary recipes only
      console.log('Searching in temporary recipes:', { recipeId });
      const tempRecipeResults = await db
        .select()
        .from(temporaryRecipes)
        .where(eq(temporaryRecipes.id, recipeId));

      if (tempRecipeResults.length > 0) {
        console.log('Found in temporary recipes:', {
          recipe: tempRecipeResults[0].id,
          timestamp: new Date().toISOString()
        });
        const tempRecipe = tempRecipeResults[0];
        // Transform temporary recipe to match permanent recipe structure
        const transformedRecipe = {
          id: tempRecipe.id,
          name: tempRecipe.name,
          description: tempRecipe.description,
          image_url: tempRecipe.image_url,
          permanent_url: tempRecipe.permanent_url,
          prep_time: tempRecipe.prep_time,
          cook_time: tempRecipe.cook_time,
          servings: tempRecipe.servings,
          ingredients: tempRecipe.ingredients,
          instructions: tempRecipe.instructions,
          tags: [
            ...(Array.isArray(tempRecipe.tags) ? tempRecipe.tags : []),
            tempRecipe.meal_type,
            tempRecipe.cuisine_type,
            ...(Array.isArray(tempRecipe.dietary_restrictions) ? tempRecipe.dietary_restrictions : []),
          ].filter(Boolean),
          nutrition: tempRecipe.nutrition,
          complexity: tempRecipe.complexity,
          favorites_count: tempRecipe.favorites_count,
          created_at: tempRecipe.created_at
        };
        return res.json(transformedRecipe);
      }

      console.log('Recipe not found:', {
        recipeId,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: "Recipe not found" });
    } catch (error) {
      console.error("Error fetching recipe:", {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: {
          params: req.params,
          url: req.url
        },
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        error: "Failed to fetch recipe",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add endpoint to get current meal plan
  app.get("/api/meal-plans/current", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // Get the most recent non-expired meal plan
      const currentMealPlan = await db.query.mealPlans.findFirst({
        where: and(
          eq(mealPlans.user_id, user.id),
          eq(mealPlans.is_expired, false),
          gt(mealPlans.expiration_date, new Date())
        ),
        orderBy: desc(mealPlans.created_at)
      });

      if (!currentMealPlan) {
        return res.status(404).json({ message: "No active meal plan found" });
      }

      // Get associated recipes
      const mealPlanRecipesList = await db
        .select({
          recipe_id: mealPlanRecipes.recipe_id,
          meal: mealPlanRecipes.meal,
          day: mealPlanRecipes.day
        })
        .from(mealPlanRecipes)
        .where(eq(mealPlanRecipes.meal_plan_id, currentMealPlan.id));

      const recipeIds = mealPlanRecipesList.map(mpr => mpr.recipe_id);
      
      // Get recipe details from temporary_recipes
      const recipes = await db
        .select()
        .from(temporaryRecipes)
        .where(inArray(temporaryRecipes.id, recipeIds));

      res.json({
        ...currentMealPlan,
        recipes: recipes.map(recipe => ({
          ...recipe,
          meal: mealPlanRecipesList.find(mpr => mpr.recipe_id === recipe.id)?.meal,
          day: mealPlanRecipesList.find(mpr => mpr.recipe_id === recipe.id)?.day
        }))
      });
    } catch (error) {
      console.error("Error fetching current meal plan:", error);
      res.status(500).json({ error: "Failed to fetch current meal plan" });
    }
  });

  app.post("/api/regenerate-recipe", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { day, meal, preferences } = req.body;

      if (!meal || day === undefined || !preferences) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: day, meal, and preferences"
        });
      }

      // Normalize preferences
      const normalizedPreferences = {
        dietary: Array.isArray(preferences.dietary) ? preferences.dietary : [],
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies : [],
        cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine : [],
        meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes : [],
      };

      // Get all recipe names to exclude (simplified approach)
      const allUserRecipes = await db.query.temporaryRecipes.findMany({
        where: eq(temporaryRecipes.user_id, user.id)
      });
      
      const usedRecipeNames = new Set<string>();
      allUserRecipes.forEach(recipe => {
        if (recipe.name) {
          usedRecipeNames.add(recipe.name);
        }
      });

      // Track cuisine usage to ensure variety
      const cuisineUsage: Record<string, number> = {};
      normalizedPreferences.cuisine.forEach((cuisine: string) => {
        cuisineUsage[cuisine] = 0;
      });

      // Count existing cuisines to prioritize less-used ones
      allUserRecipes.forEach(recipe => {
        if (recipe.cuisine_type && normalizedPreferences.cuisine.includes(recipe.cuisine_type)) {
          cuisineUsage[recipe.cuisine_type] = (cuisineUsage[recipe.cuisine_type] || 0) + 1;
        }
      });

      // Prioritize least-used cuisines
      const prioritizedCuisines = [...normalizedPreferences.cuisine].sort((a, b) => 
        (cuisineUsage[a] || 0) - (cuisineUsage[b] || 0)
      );

      // Generate a new recipe
      const mealType = meal.toLowerCase() as "breakfast" | "lunch" | "dinner";
      
      const newRecipe = await generateRecipeRecommendation({
        dietary: normalizedPreferences.dietary,
        allergies: normalizedPreferences.allergies,
        cuisine: prioritizedCuisines, // Use prioritized cuisines
        meatTypes: normalizedPreferences.meatTypes,
        mealType,
        excludeNames: Array.from(usedRecipeNames),
        maxRetries: 5 // More retries for single recipe regeneration
      });

      if (!newRecipe?.name) {
        return res.status(500).json({
          error: "Generation Failed",
          message: "Failed to generate a new recipe"
        });
      }

      // Save the new recipe
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // Set expiration to 7 days from now

      const mealTypeCapitalized = mealType.charAt(0).toUpperCase() + mealType.slice(1);
      
      const insertData = {
        user_id: user.id,
        name: newRecipe.name || '',
        description: newRecipe.description || null,
        image_url: newRecipe.image_url || null,
        permanent_url: null,
        prep_time: newRecipe.prep_time || 0,
        cook_time: newRecipe.cook_time || 0,
        servings: newRecipe.servings || 4,
        ingredients: newRecipe.ingredients || [],
        instructions: newRecipe.instructions || [],
        meal_type: mealTypeCapitalized as z.infer<typeof MealTypeEnum>,
        cuisine_type: (Array.isArray(newRecipe.tags)
          ? (newRecipe.tags.find((tag): tag is z.infer<typeof CuisineTypeEnum> => 
              ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"].includes(tag as string)
            ) || "Other")
          : "Other") as z.infer<typeof CuisineTypeEnum>,
        dietary_restrictions: (Array.isArray(newRecipe.tags)
          ? newRecipe.tags.filter((tag): tag is z.infer<typeof DietaryTypeEnum> => 
              ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag as string)
            )
          : []) as z.infer<typeof DietaryTypeEnum>[],
        difficulty: (() => {
          switch(newRecipe.complexity) {
            case 1: return "Easy" as const;
            case 2: return "Moderate" as const;
            case 3: return "Advanced" as const;
            default: return "Moderate" as const;
          }
        })() as z.infer<typeof DifficultyEnum>,
        tags: newRecipe.tags || [],
        nutrition: newRecipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        complexity: Math.min(3, Math.max(1, Number(newRecipe.complexity) || 1)),
        created_at: new Date(),
        expires_at: expirationDate,
        favorited: false,
        favorites_count: 0
      };

      const parseResult = insertTemporaryRecipeSchema.safeParse(insertData);
      
      if (!parseResult.success) {
        console.error('Invalid recipe data:', parseResult.error.issues);
        return res.status(500).json({
          error: "Invalid Recipe",
          message: "Generated recipe data is invalid"
        });
      }

      const [savedRecipe] = await db
        .insert(temporaryRecipes)
        .values(parseResult.data)
        .returning();

      // Find the current meal plan
      const currentMealPlan = await db.query.mealPlans.findFirst({
        where: and(
          eq(mealPlans.user_id, user.id),
          eq(mealPlans.is_expired, false)
        )
      });

      if (!currentMealPlan) {
        return res.status(404).json({
          error: "Not Found",
          message: "No active meal plan found"
        });
      }

      // Store image if available
      let finalRecipe = savedRecipe;
      if (savedRecipe.image_url) {
        try {
          const permanentUrl = await downloadAndStoreImage(savedRecipe.image_url, String(savedRecipe.id));
          if (permanentUrl) {
            const [updatedRecipe] = await db
              .update(temporaryRecipes)
              .set({ permanent_url: permanentUrl })
              .where(eq(temporaryRecipes.id, savedRecipe.id))
              .returning();
            
            finalRecipe = updatedRecipe;
          }
        } catch (error) {
          console.error('Failed to store image:', error);
        }
      }

      // Add the recipe to the meal plan
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() + day);
      
      await db.execute(sql`
        INSERT INTO meal_plan_recipes (meal_plan_id, recipe_id, day, meal)
        VALUES (${currentMealPlan.id}, ${finalRecipe.id}, ${dayDate}, ${mealType})
      `);
      
      return res.json({
        recipe: finalRecipe,
        message: "Recipe regenerated successfully"
      });
    } catch (error: any) {
      console.error("Error regenerating recipe:", error);
      res.status(500).json({
        error: "Failed to regenerate recipe",
        details: error.message
      });
    }
  });
}