import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt, or, sql, inArray, desc, isNotNull, isNull, lt } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution, generateRecipeSuggestionsFromIngredients, generateRecipeFromTitleAI } from "./utils/ai";
import { instacartService } from "./lib/instacart";
import { recipes, mealPlans, groceryLists, users, userRecipes, temporaryRecipes, mealPlanRecipes, type Recipe, PreferenceSchema, insertTemporaryRecipeSchema } from "@db/schema";
import { db } from "../db";
import { requireActiveSubscription } from "./middleware/subscription";
import { requireAdmin, checkAdminStatus } from "./middleware/admin";
import { stripeService } from "./services/stripe";
import { downloadAndStoreImage } from "./services/imageStorage";
import auth from './services/firebase';
import { createFirebaseToken } from './services/firebase';
import { type PublicUser } from "./types";
import { z } from "zod";
import { MealTypeEnum, CuisineTypeEnum, DietaryTypeEnum, DifficultyEnum } from "@db/schema";
import { MealPlanExpirationService } from "./services/mealPlanExpiration";
import crypto from 'crypto';
import { randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import OpenAI from "openai";

const scryptAsync = promisify(crypto.scrypt);

// Crypto utility functions for password hashing
const cryptoUtils = {
  hash: async (password: string): Promise<string> => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string): Promise<boolean> => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

// Extract webhook handler as a separate function to avoid middleware conflicts
export async function registerWebhookHandler(req: Request, res: Response) {
  console.log('🎯 Webhook received at:', new Date().toISOString());
  
  const signature = req.headers['stripe-signature'];
  let rawBody = req.body;
  
  // Debug webhook signature verification
  console.log('Webhook signature debug:', {
    hasSignature: !!signature,
    signatureLength: signature ? signature.length : 0,
    signatureStart: signature ? (typeof signature === 'string' ? signature.substring(0, 50) + '...' : String(signature)) : 'none',
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhookSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
    webhookSecretStart: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 20) + '...' : 'none',
    bodyType: typeof rawBody,
    bodyLength: rawBody?.length || 0,
    isBuffer: Buffer.isBuffer(rawBody),
    contentType: req.headers['content-type'],
    userAgent: req.headers['user-agent'],
    originalUrl: req.originalUrl,
    method: req.method,
    rawHeaders: req.rawHeaders?.slice(0, 20), // First 10 header pairs for debugging
    // Log first 200 chars of body for debugging (if it's a string)
    bodyPreview: typeof rawBody === 'string' ? rawBody.substring(0, 200) + '...' : 'not a string'
  });

  if (!signature || typeof signature !== 'string') {
    console.error('❌ Missing stripe signature in webhook request');
    return res.status(400).json({
      error: 'Missing stripe signature',
      timestamp: new Date().toISOString()
    });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ STRIPE_WEBHOOK_SECRET environment variable not set');
    return res.status(500).json({
      error: 'Webhook secret not configured',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Handle different body formats that might be caused by hosting environment
    if (typeof rawBody === 'string') {
      console.log('⚠️ Body received as string, converting to Buffer');
      rawBody = Buffer.from(rawBody, 'utf8');
    } else if (!Buffer.isBuffer(rawBody)) {
      console.error('❌ Expected raw body to be a Buffer or string, got:', typeof rawBody);
      // Try to convert whatever we got to a buffer
      if (rawBody && typeof rawBody === 'object') {
        rawBody = Buffer.from(JSON.stringify(rawBody), 'utf8');
      } else {
        throw new Error(`Expected raw body to be a Buffer or string, got: ${typeof rawBody}`);
      }
    }

    console.log('🔍 Attempting webhook signature verification with processed body...');
    console.log('Final body info:', {
      isBuffer: Buffer.isBuffer(rawBody),
      length: rawBody?.length || 0,
      first100Chars: rawBody ? rawBody.toString('utf8').substring(0, 100) + '...' : 'empty'
    });

    // Process the webhook event
    const result = await stripeService.handleWebhook(rawBody, signature);
    console.log('✅ Webhook processed successfully:', {
      result, 
      timestamp: new Date().toISOString()
    });

    // Send a 200 response to acknowledge receipt of the event
    res.json({
      received: true,
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error) {
    // Log the full error details for debugging
    console.error('❌ Webhook processing failed:', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      } : error,
      timestamp: new Date().toISOString(),
      requestInfo: {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        headers: {
          'content-type': req.headers['content-type'],
          'stripe-signature': signature ? (typeof signature === 'string' ? signature.substring(0, 50) + '...' : String(signature)) : 'none',
          'user-agent': req.headers['user-agent'],
          'host': req.headers['host'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip']
        },
        bodyInfo: {
          type: typeof req.body,
          isBuffer: Buffer.isBuffer(req.body),
          length: req.body?.length || 0
        }
      }
    });

    // Send a 400 status code so Stripe will retry the webhook
    return res.status(400).json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    });
  }
}

export function registerRoutes(app: express.Express) {
  // Webhook handler is now registered in index.ts to avoid middleware conflicts
  
  // Test webhook endpoint accessibility
  app.get("/api/webhook", async (req: Request, res: Response) => {
    res.json({
      message: "Webhook endpoint is accessible",
      method: "This endpoint only accepts POST requests from Stripe",
      timestamp: new Date().toISOString()
    });
  });

  // TEMPORARY DEBUG: Add a test endpoint that bypasses signature verification
  app.post("/api/webhook-test", express.json(), async (req: Request, res: Response) => {
    console.log('🧪 TEST WEBHOOK (no signature verification):', new Date().toISOString());
    
    try {
      // Create a mock Stripe event for testing
      const mockEvent = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: req.body.session_id || 'cs_test_mock',
            customer: req.body.customer_id,
            payment_status: 'paid',
            subscription: req.body.subscription_id || 'sub_test_mock123',
            metadata: {
              user_id: req.body.user_id
            }
          }
        }
      };

      console.log('Mock event created:', mockEvent);

      // Simulate the webhook processing without signature verification
      const result = await db.transaction(async (tx) => {
        const session = mockEvent.data.object;
        const customerId = session.customer;

        console.log('TEST: Processing mock checkout session:', {
          sessionId: session.id,
          customerId,
          subscriptionId: session.subscription
        });

        // Find user by customer ID or user ID
        let customer;
        if (customerId) {
          [customer] = await tx.select().from(users).where(eq(users.stripe_customer_id, customerId)).limit(1);
        }
        
        if (!customer && session.metadata?.user_id) {
          [customer] = await tx.select().from(users).where(eq(users.id, parseInt(session.metadata.user_id))).limit(1);
        }

        if (!customer) {
          throw new Error('Customer not found for test');
        }

        // Update the user's subscription
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

        const [updatedUser] = await tx
          .update(users)
          .set({
            subscription_status: 'active' as const,
            subscription_tier: 'premium' as const,
            subscription_end_date: subscriptionEndDate,
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription
          })
          .where(eq(users.id, customer.id))
          .returning();

        console.log('TEST: Database update result:', {
          success: !!updatedUser,
          userId: updatedUser?.id,
          newStatus: updatedUser?.subscription_status,
          newTier: updatedUser?.subscription_tier,
          newSubscriptionId: updatedUser?.stripe_subscription_id
        });

        return { success: true, user: updatedUser };
      });

      res.json({
        success: true,
        message: 'Test webhook processed successfully',
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('TEST WEBHOOK ERROR:', error);
      res.status(500).json({
        error: 'Test webhook failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test Stripe connection
  app.get("/api/test-stripe", async (req: Request, res: Response) => {
    try {
      const { testStripeConnection } = await import('./services/stripe');
      const isConnected = await testStripeConnection();
      res.json({ 
        connected: isConnected,
        message: isConnected ? 'Stripe connection successful' : 'Stripe connection failed'
      });
    } catch (error) {
      console.error('Error testing Stripe connection:', error);
      res.status(500).json({ 
        connected: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Subscription Routes
  app.post("/api/subscription/create-checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      console.log('Creating checkout session for user:', {
        userId: user.id,
        email: user.email,
        hasStripeCustomerId: !!user.stripe_customer_id,
        timestamp: new Date().toISOString()
      });

      // Check if user has a stored customer ID and if it's valid
      if (user.stripe_customer_id) {
        try {
          // Verify the customer still exists in Stripe
          const { stripe } = await import('./services/stripe');
          await stripe.customers.retrieve(user.stripe_customer_id);
          console.log('Existing Stripe customer verified:', user.stripe_customer_id);
        } catch (error: any) {
          if (error.code === 'resource_missing') {
            console.log('Stored customer ID no longer exists in Stripe, creating new customer');
            // Clear the invalid customer ID
            user.stripe_customer_id = null;
            await db.update(users).set({ stripe_customer_id: null }).where(eq(users.id, user.id));
          } else {
            throw error; // Re-throw other errors
          }
        }
      }

      // Create new customer if needed
      if (!user.stripe_customer_id) {
        console.log('Creating new Stripe customer for user:', user.id);
        const customer = await stripeService.createCustomer(user.email, user.id);
        user.stripe_customer_id = customer.id;
        console.log('Stripe customer created:', customer.id);
      }

      const session = await stripeService.createCheckoutSession(user.stripe_customer_id);
      console.log('Checkout session created successfully:', session.id);
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
          type: (error as any).type,
          statusCode: (error as any).statusCode
        } : error,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ error: "Failed to create checkout session" });
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

  // New endpoint for archived PantryPal recipes
  app.get("/api/pantrypal-recipes/archived", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const now = new Date();

      // Get archived PantryPal recipes (expired recipes without meal_type)
      const archivedRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, user.id),
            isNull(temporaryRecipes.meal_type), // PantryPal recipes don't have meal_type
            lt(temporaryRecipes.expires_at, now) // Expired recipes
          )
        )
        .orderBy(desc(temporaryRecipes.created_at));

      res.json(archivedRecipes);
    } catch (error) {
      console.error("Error fetching archived PantryPal recipes:", error);
      res.status(500).json({ error: "Failed to fetch archived PantryPal recipes" });
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
          meal_type: temporaryRecipes.meal_type,
          cuisine_type: temporaryRecipes.cuisine_type,
          dietary_restrictions: temporaryRecipes.dietary_restrictions,
          difficulty: temporaryRecipes.difficulty,
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

      // Generate recipes in parallel for each day and meal - OPTIMIZED APPROACH
      const expectedRecipeCount = days * 3; // 3 meals per day
      console.log(`Starting parallel generation of ${expectedRecipeCount} recipes for ${days} days`);

      // Create all recipe generation tasks upfront for maximum parallelization
      const recipeGenerationTasks = [];
      
      for (let day = 0; day < days; day++) {
        for (const mealType of mealTypes) {
          // Get cuisines sorted by least used for variety
          const prioritizedCuisines = [...normalizedPreferences.cuisine].sort((a, b) => 
            (cuisineUsage[a] || 0) - (cuisineUsage[b] || 0)
          );
          
          const task = {
            day,
            mealType,
            cuisines: prioritizedCuisines.length > 0 ? prioritizedCuisines : normalizedPreferences.cuisine,
            taskId: `day-${day}-${mealType}`
          };
          
          recipeGenerationTasks.push(task);
        }
      }

      // Execute all recipe generations in parallel with improved error handling
      console.log(`Executing ${recipeGenerationTasks.length} recipe generation tasks in parallel`);
      const startTime = Date.now();
      
      const recipePromises = recipeGenerationTasks.map(async (task, index) => {
        try {
          console.log(`Starting generation for ${task.taskId} (${index + 1}/${recipeGenerationTasks.length})`);
          
          // Get current used names at the time of generation (thread-safe approach)
          const currentUsedNames = Array.from(usedRecipeNames);
          
          const recipe = await generateRecipeRecommendation({
            dietary: normalizedPreferences.dietary,
            allergies: normalizedPreferences.allergies,
            cuisine: task.cuisines,
            meatTypes: normalizedPreferences.meatTypes,
            mealType: task.mealType,
            excludeNames: currentUsedNames,
            maxRetries: 2 // Reduced retries for faster parallel execution
          });

          // Add to used names immediately to prevent duplicates in parallel execution
          if (recipe?.name) {
            usedRecipeNames.add(recipe.name);
          }

          console.log(`Completed generation for ${task.taskId}: ${recipe?.name || 'FAILED'}`);
          return {
            ...recipe,
            day: task.day,
            mealType: task.mealType,
            taskId: task.taskId
          };
        } catch (error) {
          console.error(`Failed to generate recipe for ${task.taskId}:`, error);
          missingMeals.push({ day: task.day, meal: task.mealType });
          return null;
        }
      });

      // Wait for all recipes to be generated with timeout protection
      console.log('Waiting for all recipe generations to complete...');
      const generatedRecipes = await Promise.all(recipePromises);
      const generationTime = Date.now() - startTime;
      console.log(`Parallel generation completed in ${generationTime}ms`);

      // Filter out failed generations and process successful ones
      const successfulRecipes = generatedRecipes.filter(recipe => recipe !== null && recipe?.name);
      console.log(`Successfully generated ${successfulRecipes.length} out of ${expectedRecipeCount} recipes`);

      // Allow partial success if we have at least one recipe per day
      const minimumRequired = days; // At least one meal per day
      if (successfulRecipes.length < minimumRequired) {
        console.error(`Failed to generate minimum required recipes. Expected at least ${minimumRequired}, got ${successfulRecipes.length}`);
        return res.status(500).json({
          error: "Failed to generate meal plan",
          message: "Could not generate enough recipes for a viable meal plan"
        });
      }

      // Save generated recipes to temporary_recipes table in parallel
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2);

      console.log('Starting parallel recipe saving...');
      const saveStartTime = Date.now();
      
      const savePromises = successfulRecipes.map(async (recipe, index) => {
        if (!recipe) return null;

        try {
          const mealTypeCapitalized = recipe.mealType.charAt(0).toUpperCase() + recipe.mealType.slice(1);

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
              day: recipe.day, 
              meal: recipe.mealType 
            });
            return null;
          }

          const [savedRecipe] = await db
            .insert(temporaryRecipes)
            .values(parseResult.data)
            .returning();

          // Handle image storage asynchronously (don't block the response)
          if (savedRecipe.image_url) {
            downloadAndStoreImage(savedRecipe.image_url, String(savedRecipe.id))
              .then(permanentUrl => {
                if (permanentUrl) {
                  db.update(temporaryRecipes)
                    .set({ permanent_url: permanentUrl })
                    .where(eq(temporaryRecipes.id, savedRecipe.id))
                    .catch(error => console.error('Failed to update permanent URL:', error));
                }
              })
              .catch(error => console.error('Failed to store image:', error));
          }

          return savedRecipe;
        } catch (error) {
          console.error('Failed to save recipe:', error);
          missingMeals.push({ 
            day: recipe.day, 
            meal: recipe.mealType 
          });
          return null;
        }
      });

      const savedRecipes = (await Promise.all(savePromises)).filter(recipe => recipe !== null);
      const saveTime = Date.now() - saveStartTime;
      console.log(`Parallel recipe saving completed in ${saveTime}ms`);

      // After successfully saving recipes, increment the meal_plans_generated counter
      if (savedRecipes.length > 0) {
        await db
          .update(users)
          .set({ meal_plans_generated: user.meal_plans_generated + 1 })
          .where(eq(users.id, user.id));
      }

      const totalTime = Date.now() - startTime;
      console.log(`Total meal plan generation completed in ${totalTime}ms`);

      // Return partial success response if we have some recipes but not all
      res.json({
        recipes: savedRecipes,
        status: savedRecipes.length === days * 3 ? 'success' : 'partial',
        missingMeals: missingMeals.length > 0 ? missingMeals : undefined,
        message: savedRecipes.length === days * 3 
          ? 'Successfully generated all recipes'
          : `Generated ${savedRecipes.length} out of ${days * 3} recipes`,
        remaining_free_plans: isFreeTier ? (hasUsedFreePlan ? 0 : 1) : null,
        performance: {
          generationTimeMs: generationTime,
          saveTimeMs: saveTime,
          totalTimeMs: totalTime
        }
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

  // Instacart Integration - Create Shopping List
  app.post("/api/instacart/shopping-list", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { meal_plan_id, title } = req.body;

      if (!meal_plan_id) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameter: meal_plan_id"
        });
      }

      // Get the meal plan and verify ownership
      const mealPlan = await db.query.mealPlans.findFirst({
        where: eq(mealPlans.id, meal_plan_id)
      });

      if (!mealPlan) {
        return res.status(404).json({ error: "Meal plan not found" });
      }

      if (mealPlan.user_id !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to access this meal plan" });
      }

      // Get associated recipes from meal_plan_recipes table
      const mealPlanRecipesList = await db
        .select({
          recipe_id: mealPlanRecipes.recipe_id,
          meal: mealPlanRecipes.meal,
          day: mealPlanRecipes.day
        })
        .from(mealPlanRecipes)
        .where(eq(mealPlanRecipes.meal_plan_id, meal_plan_id));

      const recipeIds = mealPlanRecipesList.map(mpr => mpr.recipe_id);
      
      // Get recipe details from temporary_recipes
      const recipes = await db
        .select()
        .from(temporaryRecipes)
        .where(inArray(temporaryRecipes.id, recipeIds));

      // Extract ingredients from all recipes in the meal plan
      const ingredients: Array<{ name: string; amount: number; unit: string }> = [];
      
      recipes.forEach(recipe => {
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach((ingredient: any) => {
            if (ingredient.name && ingredient.amount && ingredient.unit) {
              ingredients.push({
                name: String(ingredient.name),
                amount: Number(ingredient.amount),
                unit: String(ingredient.unit)
              });
            }
          });
        }
      });

      if (ingredients.length === 0) {
        return res.status(400).json({
          error: "No ingredients found",
          message: "This meal plan doesn't contain any ingredients to shop for"
        });
      }

      // Create Instacart shopping list
      const instacartResponse = await instacartService.createShoppingList(
        ingredients,
        title || `${mealPlan.name} - Shopping List`
      );

      res.json({
        success: true,
        instacart_url: instacartResponse.products_link_url,
        ingredient_count: ingredients.length
      });
    } catch (error: any) {
      console.error("Error creating Instacart shopping list:", error);
      res.status(500).json({
        error: "Failed to create Instacart shopping list",
        message: error.message
      });
    }
  });

  // Instacart Integration - Create Recipe Page
  app.post("/api/instacart/recipe", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { recipe_id } = req.body;

      if (!recipe_id) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameter: recipe_id"
        });
      }

      // Get the recipe from temporary recipes table
      const recipe = await db.query.temporaryRecipes.findFirst({
        where: and(
          eq(temporaryRecipes.id, recipe_id),
          eq(temporaryRecipes.user_id, req.user!.id)
        )
      });

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      // Prepare ingredients for Instacart
      const ingredients: Array<{ name: string; amount: number; unit: string }> = [];
      
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach((ingredient: any) => {
          if (ingredient.name && ingredient.amount && ingredient.unit) {
            ingredients.push({
              name: String(ingredient.name),
              amount: Number(ingredient.amount),
              unit: String(ingredient.unit)
            });
          }
        });
      }

      // Prepare instructions for Instacart
      const instructions: string[] = [];
      if (recipe.instructions && Array.isArray(recipe.instructions)) {
        recipe.instructions.forEach((instruction: any) => {
          if (typeof instruction === 'string') {
            instructions.push(instruction);
          }
        });
      }

      if (ingredients.length === 0) {
        return res.status(400).json({
          error: "No ingredients found",
          message: "This recipe doesn't contain any ingredients to shop for"
        });
      }

      // Create Instacart recipe page
      const instacartResponse = await instacartService.createRecipePage(
        recipe.name,
        ingredients,
        instructions,
        recipe.image_url || undefined
      );

      res.json({
        success: true,
        instacart_url: instacartResponse.products_link_url,
        recipe_name: recipe.name,
        ingredient_count: ingredients.length
      });
    } catch (error: any) {
      console.error("Error creating Instacart recipe page:", error);
      res.status(500).json({
        error: "Failed to create Instacart recipe page",
        message: error.message
      });
    }
  });

  // Instacart Integration - Get Nearby Retailers
  app.get("/api/instacart/retailers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { postal_code, country_code = 'US' } = req.query;

      if (!postal_code || typeof postal_code !== 'string') {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameter: postal_code"
        });
      }

      const retailers = await instacartService.getNearbyRetailers(
        postal_code,
        country_code as string
      );

      res.json(retailers);
    } catch (error: any) {
      console.error("Error fetching nearby retailers:", error);
      res.status(500).json({
        error: "Failed to fetch nearby retailers",
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
            firebase_uid: decodedToken.uid, // Set the Firebase UID from the decoded token
            subscription_status: 'inactive' as const,
            subscription_tier: 'free' as const,
            meal_plans_generated: 0,
            ingredient_recipes_generated: 0,
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
        is_admin: user.is_admin || false,
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
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Looking up user with email: ${normalizedEmail}`);
      
      // Find the user in native database
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      
      if (!user) {
        console.log(`User not found in native database for email: ${normalizedEmail}`);
        console.log('Checking if user exists in Firebase...');
        
        // Check if user exists in Firebase but not in native DB (limbo state)
        try {
          // Try to get user from Firebase by email
          const firebaseUser = await auth.getUserByEmail(normalizedEmail);
          
          if (firebaseUser) {
            console.log(`User found in Firebase but missing from native DB. Creating native user record for UID: ${firebaseUser.uid}`);
            
                         // Create user in native database to resolve limbo state
             const tempPasswordHash = await cryptoUtils.hash("TEMPORARY_PASSWORD");
            
            const [newUser] = await db
              .insert(users)
              .values({
                email: normalizedEmail,
                password_hash: tempPasswordHash,
                name: firebaseUser.displayName || normalizedEmail.split('@')[0],
                firebase_uid: firebaseUser.uid,
                subscription_status: 'inactive' as const,
                subscription_tier: 'free' as const,
                meal_plans_generated: 0,
                ingredient_recipes_generated: 0,
                created_at: new Date(),
                is_partial_registration: true // Mark as partial since we're creating from limbo
              })
              .returning();
              
            user = newUser;
            console.log(`Created native user record with ID ${user.id} for Firebase user ${firebaseUser.uid}`);
          }
        } catch (firebaseError: any) {
          console.log('User not found in Firebase either:', firebaseError.message);
          return res.status(404).json({ 
            message: 'User not found. Please ensure you have registered an account with this email address.' 
          });
        }
        
        if (!user) {
          console.error(`Failed to create or find user for email: ${normalizedEmail}`);
          return res.status(404).json({ message: 'User not found' });
        }
      }
      
      // Check if user is in partial registration state and allow password reset
      let canResetPassword = true;
      if (user.is_partial_registration === true) {
        console.log(`User ${user.id} is in partial registration state - allowing password reset`);
        canResetPassword = true;
      } else {
                 // Check if user has temporary password (another indicator of partial state)
         try {
           const hasTempPassword = await cryptoUtils.compare("TEMPORARY_PASSWORD", user.password_hash);
           if (hasTempPassword) {
             console.log(`User ${user.id} has temporary password - allowing password reset`);
             canResetPassword = true;
           }
         } catch (tempCheckError) {
           console.log(`Could not verify temporary password for user ${user.id}:`, tempCheckError);
           // Continue with normal password reset
         }
      }
      
             console.log(`User found, generating new password hash for user ID: ${user.id}`);
       // Generate a new salt and hash the password using the crypto utility
       const hashedPassword = await cryptoUtils.hash(newPassword);
      
      console.log('Updating password in database');
      // Update the user's password in the database and clear partial registration flag
      await db
        .update(users)
        .set({ 
          password_hash: hashedPassword,
          is_partial_registration: false // Clear partial registration flag
        })
        .where(eq(users.id, user.id));
      
      console.log('Password updated successfully');
      res.json({ 
        message: 'Password updated successfully',
        recovered_from_limbo: user.is_partial_registration === true || user.password_hash.includes('TEMPORARY_PASSWORD')
      });
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

  // Weekly Planner endpoints
  app.post("/api/weekly-planner/suggestions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { days, suggestionsPerMealType, preferences } = req.body;

      // Remove subscription limit check for suggestions - allow free users to generate suggestions
      // The limit will be enforced when they try to create the actual meal plan

      // Check cooldown period - user must wait until their last meal plan expires
      const lastMealPlan = await db
        .select()
        .from(mealPlans)
        .where(eq(mealPlans.user_id, user.id))
        .orderBy(desc(mealPlans.created_at))
        .limit(1);

      if (lastMealPlan.length > 0) {
        const lastPlan = lastMealPlan[0];
        const now = new Date();
        const planEndDate = new Date(lastPlan.end_date);
        
        if (now < planEndDate) {
          const timeRemaining = planEndDate.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
          const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
          
          return res.status(429).json({
            error: "Cooldown active",
            message: `You must wait until your current meal plan expires before creating a new one.`,
            code: "COOLDOWN_ACTIVE",
            cooldownInfo: {
              lastPlanEndDate: planEndDate.toISOString(),
              timeRemainingMs: timeRemaining,
              daysRemaining,
              hoursRemaining,
              lastPlanName: lastPlan.name,
              lastPlanDays: lastPlan.days_generated
            }
          });
        }
      }

      // Validate input
      if (!days || !suggestionsPerMealType || !preferences) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: days, suggestionsPerMealType, preferences"
        });
      }

      console.log('Generating weekly planner suggestions:', {
        days,
        suggestionsPerMealType,
        preferences: JSON.stringify(preferences, null, 2),
        userId: user.id
      });

      // Normalize preferences
      const normalizedPreferences = {
        dietary: Array.isArray(preferences.dietary) ? preferences.dietary : [],
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies : [],
        cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine : [],
        meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes : []
      };

      const mealTypes: Array<"breakfast" | "lunch" | "dinner"> = ["breakfast", "lunch", "dinner"];
      const suggestions: any = {
        breakfast: [],
        lunch: [],
        dinner: []
      };

      // Generate suggestions for each meal type
      for (const mealType of mealTypes) {
        console.log(`Generating ${suggestionsPerMealType} ${mealType} suggestions`);
        
        const mealSuggestions = [];
        const usedTitles = new Set<string>();

        for (let i = 0; i < suggestionsPerMealType; i++) {
          try {
            // Generate title-only suggestion using OpenAI
            const prompt = `Generate a single ${mealType} recipe title that is:
- Appropriate for ${mealType}
- ${normalizedPreferences.dietary.length > 0 ? `Following dietary restrictions: ${normalizedPreferences.dietary.join(", ")}` : "No specific dietary restrictions"}
- ${normalizedPreferences.allergies.length > 0 ? `Avoiding allergens: ${normalizedPreferences.allergies.join(", ")}` : "No allergies to consider"}
- ${normalizedPreferences.cuisine.length > 0 ? `From one of these cuisines: ${normalizedPreferences.cuisine.join(", ")}` : "Any cuisine"}
- ${normalizedPreferences.meatTypes.length > 0 ? `Using preferred proteins: ${normalizedPreferences.meatTypes.join(", ")}` : "Any protein"}

Respond with a JSON object containing:
{
  "title": "Recipe Name",
  "cuisineType": "Cuisine",
  "difficulty": "Easy|Moderate|Advanced",
  "estimatedTime": "X minutes",
  "tags": ["tag1", "tag2"]
}

Make sure the title is unique and not: ${Array.from(usedTitles).join(", ")}`;

            const completion = await openai.chat.completions.create({
              messages: [
                {
                  role: "system",
                  content: "You are a professional chef who creates recipe suggestions. Always respond with valid JSON containing the requested fields.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              model: "gpt-4o-2024-08-06",
              response_format: { type: "json_object" },
              temperature: 0.8,
              max_tokens: 200,
            });

            if (completion.choices?.[0]?.message?.content) {
              const suggestionData = JSON.parse(completion.choices[0].message.content);
              
              if (suggestionData.title && !usedTitles.has(suggestionData.title)) {
                usedTitles.add(suggestionData.title);
                mealSuggestions.push({
                  title: suggestionData.title,
                  cuisineType: suggestionData.cuisineType || "Other",
                  difficulty: suggestionData.difficulty || "Moderate",
                  estimatedTime: suggestionData.estimatedTime || "30 minutes",
                  tags: Array.isArray(suggestionData.tags) ? suggestionData.tags : []
                });
              }
            }
          } catch (error) {
            console.error(`Error generating ${mealType} suggestion ${i + 1}:`, error);
            // Continue with other suggestions even if one fails
          }
        }

        suggestions[mealType] = mealSuggestions;
        console.log(`Generated ${mealSuggestions.length} ${mealType} suggestions`);
      }

      console.log('Weekly planner suggestions generated:', JSON.stringify(suggestions, null, 2));
      res.json(suggestions);
    } catch (error: any) {
      console.error("Error generating weekly planner suggestions:", error);
      res.status(500).json({
        error: "Failed to generate suggestions",
        message: error.message
      });
    }
  });

  app.post("/api/weekly-planner/create-plan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { selectedRecipes, preferences, days } = req.body;

      // Check subscription limits
      const isFreeTier = user.subscription_tier === 'free';
      const hasUsedFreePlan = user.meal_plans_generated > 0;

      if (isFreeTier && hasUsedFreePlan) {
        return res.status(403).json({
          error: "Free plan limit reached",
          message: "You've reached your free meal plan limit. Please upgrade to premium for unlimited meal plans.",
          code: "UPGRADE_REQUIRED"
        });
      }

      // Check cooldown period - user must wait until their last meal plan expires
      const lastMealPlan = await db
        .select()
        .from(mealPlans)
        .where(eq(mealPlans.user_id, user.id))
        .orderBy(desc(mealPlans.created_at))
        .limit(1);

      if (lastMealPlan.length > 0) {
        const lastPlan = lastMealPlan[0];
        const now = new Date();
        const planEndDate = new Date(lastPlan.end_date);
        
        if (now < planEndDate) {
          const timeRemaining = planEndDate.getTime() - now.getTime();
          const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
          const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
          
          return res.status(429).json({
            error: "Cooldown active",
            message: `You must wait until your current meal plan expires before creating a new one.`,
            code: "COOLDOWN_ACTIVE",
            cooldownInfo: {
              lastPlanEndDate: planEndDate.toISOString(),
              timeRemainingMs: timeRemaining,
              daysRemaining,
              hoursRemaining,
              lastPlanName: lastPlan.name,
              lastPlanDays: lastPlan.days_generated
            }
          });
        }
      }

      // Validate input
      if (!selectedRecipes || !preferences || !days) {
        return res.status(400).json({
          error: "Bad Request",
          message: "Missing required parameters: selectedRecipes, preferences, days"
        });
      }

      console.log('Creating weekly meal plan:', {
        selectedRecipes,
        preferences: JSON.stringify(preferences, null, 2),
        days,
        userId: user.id
      });

      // Normalize preferences
      const normalizedPreferences = {
        dietary: Array.isArray(preferences.dietary) ? preferences.dietary : [],
        allergies: Array.isArray(preferences.allergies) ? preferences.allergies : [],
        cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine : [],
        meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes : []
      };

      // Collect all selected recipe titles with their meal types
      const allSelectedTitles = [
        ...selectedRecipes.breakfast,
        ...selectedRecipes.lunch,
        ...selectedRecipes.dinner
      ];

      console.log('Processing selected recipes:', allSelectedTitles);

      // Check if any of these titles correspond to existing PantryPal recipes
      const existingRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, user.id),
            isNull(temporaryRecipes.meal_type), // PantryPal recipes don't have meal_type
            inArray(temporaryRecipes.name, allSelectedTitles)
          )
        );

      console.log('Found existing PantryPal recipes:', existingRecipes.length);

      // Separate existing recipes from titles that need generation
      const existingRecipeNames = new Set(existingRecipes.map(r => r.name));
      const titlesToGenerate = allSelectedTitles.filter(title => !existingRecipeNames.has(title));

      console.log('Titles to generate:', titlesToGenerate);
      console.log('Existing recipes to reuse:', existingRecipes.map(r => r.name));

      // Generate full recipes for titles that don't exist yet
      const generatedRecipes = [];
      const recipesByMealType: {
        breakfast: any[];
        lunch: any[];
        dinner: any[];
      } = {
        breakfast: [],
        lunch: [],
        dinner: []
      };
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2);

      // Process existing recipes first
      for (const existingRecipe of existingRecipes) {
        // Determine meal type based on which array the title came from
        let mealType: "breakfast" | "lunch" | "dinner" = "dinner";
        if (selectedRecipes.breakfast.includes(existingRecipe.name)) {
          mealType = "breakfast";
        } else if (selectedRecipes.lunch.includes(existingRecipe.name)) {
          mealType = "lunch";
        }

        // Update the existing recipe with the new meal type and expiration
        const [updatedRecipe] = await db
          .update(temporaryRecipes)
          .set({
            meal_type: mealType.charAt(0).toUpperCase() + mealType.slice(1) as z.infer<typeof MealTypeEnum>,
            expires_at: expirationDate
          })
          .where(eq(temporaryRecipes.id, existingRecipe.id))
          .returning();

        generatedRecipes.push(updatedRecipe);
        recipesByMealType[mealType].push(updatedRecipe);
        console.log(`Reused existing ${mealType} recipe: ${existingRecipe.name}`);
      }

      // Generate new recipes for titles that don't exist yet
      if (titlesToGenerate.length > 0) {
        console.log(`Starting parallel generation of ${titlesToGenerate.length} new recipes`);
        const startTime = Date.now();

        const recipeGenerationPromises = titlesToGenerate.map(async (title) => {
          try {
            console.log(`Generating full recipe for: ${title}`);
            
            const fullRecipe = await generateRecipeFromTitleAI(title, normalizedPreferences.allergies);
            
            if (fullRecipe && fullRecipe.name) {
              // Determine meal type based on which array the title came from
              let mealType: "breakfast" | "lunch" | "dinner" = "dinner";
              if (selectedRecipes.breakfast.includes(title)) {
                mealType = "breakfast";
              } else if (selectedRecipes.lunch.includes(title)) {
                mealType = "lunch";
              }

              return {
                recipe: fullRecipe,
                mealType,
                title
              };
            }
            return null;
          } catch (error) {
            console.error(`Error generating recipe for title "${title}":`, error);
            return null;
          }
        });

        // Wait for all recipe generations to complete
        const recipeResults = await Promise.all(recipeGenerationPromises);
        const generationTime = Date.now() - startTime;
        console.log(`Parallel recipe generation completed in ${generationTime}ms`);

        // Filter successful results and prepare for database insertion
        const successfulResults = recipeResults.filter(result => result !== null);
        
        // OPTIMIZED: Save all new recipes to database in parallel
        console.log('Starting parallel recipe saving...');
        const saveStartTime = Date.now();

        const savePromises = successfulResults.map(async (result) => {
          if (!result) return null;

          const { recipe: fullRecipe, mealType } = result;

          try {
            const insertData = {
              user_id: user.id,
              name: fullRecipe.name || "Untitled Recipe",
              description: fullRecipe.description || null,
              image_url: fullRecipe.image_url || null,
              permanent_url: null,
              prep_time: fullRecipe.prep_time || 0,
              cook_time: fullRecipe.cook_time || 0,
              servings: fullRecipe.servings || 4,
              ingredients: fullRecipe.ingredients || [],
              instructions: fullRecipe.instructions || [],
              meal_type: mealType.charAt(0).toUpperCase() + mealType.slice(1) as z.infer<typeof MealTypeEnum>,
              cuisine_type: (Array.isArray(fullRecipe.tags)
                ? (fullRecipe.tags.find((tag): tag is z.infer<typeof CuisineTypeEnum> => 
                    ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"].includes(tag as string)
                  ) || "Other")
                : "Other") as z.infer<typeof CuisineTypeEnum>,
              dietary_restrictions: (Array.isArray(fullRecipe.tags)
                ? fullRecipe.tags.filter((tag): tag is z.infer<typeof DietaryTypeEnum> => 
                    ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag as string)
                  )
                : []) as z.infer<typeof DietaryTypeEnum>[],
              difficulty: (() => {
                switch(fullRecipe.complexity) {
                  case 1: return "Easy" as const;
                  case 2: return "Moderate" as const;
                  case 3: return "Advanced" as const;
                  default: return "Moderate" as const;
                }
              })() as z.infer<typeof DifficultyEnum>,
              tags: fullRecipe.tags || [],
              nutrition: fullRecipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
              complexity: fullRecipe.complexity || 1,
              created_at: new Date(),
              expires_at: expirationDate,
              favorited: false,
              favorites_count: 0
            };

            const [savedRecipe] = await db.insert(temporaryRecipes).values(insertData).returning();
            
            // Handle image storage asynchronously (don't block the response)
            if (savedRecipe.image_url) {
              downloadAndStoreImage(savedRecipe.image_url, String(savedRecipe.id))
                .then(permanentUrl => {
                  if (permanentUrl) {
                    db.update(temporaryRecipes)
                      .set({ permanent_url: permanentUrl })
                      .where(eq(temporaryRecipes.id, savedRecipe.id))
                      .catch(error => console.error('Failed to update permanent URL:', error));
                  }
                })
                .catch(error => console.error('Failed to store image:', error));
            }

            return {
              savedRecipe,
              mealType
            };
          } catch (error) {
            console.error(`Error saving recipe for "${fullRecipe.name}":`, error);
            return null;
          }
        });

        const saveResults = await Promise.all(savePromises);
        const saveTime = Date.now() - saveStartTime;
        console.log(`Parallel recipe saving completed in ${saveTime}ms`);

        // Process saved results and organize by meal type
        const successfulSaves = saveResults.filter(result => result !== null);
        
        for (const result of successfulSaves) {
          if (result) {
            generatedRecipes.push(result.savedRecipe);
            recipesByMealType[result.mealType].push(result.savedRecipe);
            console.log(`Successfully generated ${result.mealType} recipe: ${result.savedRecipe.name}`);
          }
        }
      }

      if (generatedRecipes.length === 0) {
        return res.status(500).json({
          error: "Failed to generate meal plan",
          message: "Could not generate or reuse any recipes from the selected titles"
        });
      }

      // Create meal plan
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days - 1);

      const [mealPlan] = await db.insert(mealPlans).values({
        user_id: user.id,
        name: `Weekly Plan - ${days} Days`,
        start_date: startDate,
        end_date: endDate,
        expiration_date: expirationDate,
        days_generated: days,
        is_expired: false,
        created_at: new Date()
      }).returning();

      // Create meal plan recipe associations with proper meal type mapping
      const mealPlanRecipeValues = [];

      for (let day = 0; day < days; day++) {
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + day);

        // Add breakfast for this day
        if (recipesByMealType.breakfast[day]) {
          mealPlanRecipeValues.push({
            meal_plan_id: mealPlan.id,
            recipe_id: recipesByMealType.breakfast[day].id,
            day: dayDate,
            meal: "breakfast",
            created_at: new Date()
          });
        }

        // Add lunch for this day
        if (recipesByMealType.lunch[day]) {
          mealPlanRecipeValues.push({
            meal_plan_id: mealPlan.id,
            recipe_id: recipesByMealType.lunch[day].id,
            day: dayDate,
            meal: "lunch",
            created_at: new Date()
          });
        }

        // Add dinner for this day
        if (recipesByMealType.dinner[day]) {
          mealPlanRecipeValues.push({
            meal_plan_id: mealPlan.id,
            recipe_id: recipesByMealType.dinner[day].id,
            day: dayDate,
            meal: "dinner",
            created_at: new Date()
          });
        }
      }

      if (mealPlanRecipeValues.length > 0) {
        await db.insert(mealPlanRecipes).values(mealPlanRecipeValues);
      }

      // Update user's meal plan counter
      await db
        .update(users)
        .set({ meal_plans_generated: user.meal_plans_generated + 1 })
        .where(eq(users.id, user.id));

      console.log(`Created weekly meal plan with ${generatedRecipes.length} recipes`);
      res.json({
        mealPlan,
        recipesGenerated: generatedRecipes.length,
        message: "Weekly meal plan created successfully"
      });
    } catch (error: any) {
      console.error("Error creating weekly meal plan:", error);
      res.status(500).json({
        error: "Failed to create meal plan",
        message: error.message
      });
    }
  });

  // Detect and resolve user limbo states
  app.post('/api/auth/resolve-limbo', async (req, res) => {
    try {
      console.log('Limbo resolution request received');
      const { email } = req.body;
      
      if (!email?.trim()) {
        return res.status(400).json({ 
          message: 'Email is required',
          type: 'VALIDATION_ERROR'
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Checking limbo state for email: ${normalizedEmail}`);
      
      // Check native database first
      const [nativeUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      
      let firebaseUser = null;
      try {
        firebaseUser = await auth.getUserByEmail(normalizedEmail);
      } catch (firebaseError: any) {
        console.log('Firebase user lookup failed:', firebaseError.message);
      }
      
      // Analyze the situation
      const analysis = {
        email: normalizedEmail,
        native_user_exists: !!nativeUser,
        firebase_user_exists: !!firebaseUser,
        native_user_partial: nativeUser?.is_partial_registration === true,
        native_user_has_temp_password: false,
        firebase_uid: firebaseUser?.uid || null,
        native_firebase_uid: nativeUser?.firebase_uid || null,
        limbo_state: 'none' as 'none' | 'firebase_only' | 'native_only' | 'partial_native' | 'uid_mismatch',
        can_auto_resolve: false,
        suggested_action: 'none' as 'none' | 'password_reset' | 'complete_registration' | 'manual_intervention'
      };
      
      // Check if native user has temporary password
      if (nativeUser?.password_hash) {
        try {
          analysis.native_user_has_temp_password = await cryptoUtils.compare("TEMPORARY_PASSWORD", nativeUser.password_hash);
        } catch (tempCheckError) {
          console.log('Could not verify temporary password:', tempCheckError);
        }
      }
      
      // Determine limbo state
      if (firebaseUser && !nativeUser) {
        analysis.limbo_state = 'firebase_only';
        analysis.can_auto_resolve = true;
        analysis.suggested_action = 'password_reset';
      } else if (!firebaseUser && nativeUser) {
        analysis.limbo_state = 'native_only';
        analysis.suggested_action = 'complete_registration';
      } else if (nativeUser && (analysis.native_user_partial || analysis.native_user_has_temp_password)) {
        analysis.limbo_state = 'partial_native';
        analysis.can_auto_resolve = true;
        analysis.suggested_action = 'complete_registration';
      } else if (firebaseUser && nativeUser && firebaseUser.uid !== nativeUser.firebase_uid) {
        analysis.limbo_state = 'uid_mismatch';
        analysis.suggested_action = 'manual_intervention';
      }
      
      console.log('Limbo analysis:', analysis);
      
      // Auto-resolve if possible
      if (analysis.can_auto_resolve && analysis.limbo_state === 'firebase_only') {
        console.log('Auto-resolving Firebase-only limbo state');
        
        // Create native user from Firebase user
        const tempPasswordHash = await cryptoUtils.hash("TEMPORARY_PASSWORD");
        
        const [newUser] = await db
          .insert(users)
          .values({
            email: normalizedEmail,
            password_hash: tempPasswordHash,
            name: firebaseUser?.displayName || normalizedEmail.split('@')[0],
            firebase_uid: firebaseUser?.uid || '',
            subscription_status: 'inactive' as const,
            subscription_tier: 'free' as const,
            meal_plans_generated: 0,
            ingredient_recipes_generated: 0,
            created_at: new Date(),
            is_partial_registration: true
          })
          .returning();
          
        console.log(`Created native user ${newUser.id} from Firebase user ${firebaseUser?.uid}`);
        
        return res.json({
          message: 'Limbo state resolved automatically',
          analysis,
          resolved: true,
          action_taken: 'created_native_user',
          next_step: 'Use password reset to set your password'
        });
      }
      
      // Return analysis without auto-resolution
      return res.json({
        message: 'Limbo state analysis completed',
        analysis,
        resolved: false,
        recommendations: {
          firebase_only: 'Use password reset to sync accounts',
          native_only: 'Complete registration process',
          partial_native: 'Use password reset or complete registration',
          uid_mismatch: 'Contact support for manual resolution'
        }
      });
      
    } catch (error) {
      console.error('Error resolving limbo state:', error);
      res.status(500).json({ 
        message: 'Failed to resolve limbo state',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin Routes - User Management and Troubleshooting
  
  // Get current user's admin status
  app.get('/api/admin/status', isAuthenticated, checkAdminStatus, (req, res) => {
    res.json({
      isAdmin: req.isAdmin || false,
      userId: req.user?.id || null
    });
  });

  // Admin Dashboard - Get system stats
  app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
    try {
      // Get user statistics
      const userStats = await db
        .select({
          total_users: sql<number>`count(*)`,
          admin_users: sql<number>`count(*) filter (where is_admin = true)`,
          partial_registrations: sql<number>`count(*) filter (where is_partial_registration = true)`,
          premium_users: sql<number>`count(*) filter (where subscription_tier = 'premium')`,
          users_last_24h: sql<number>`count(*) filter (where created_at > now() - interval '24 hours')`
        })
        .from(users);

      // Get recent problematic users (partial registrations, temp passwords)
      const problematicUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          created_at: users.created_at,
          is_partial_registration: users.is_partial_registration,
          firebase_uid: users.firebase_uid,
          subscription_tier: users.subscription_tier
        })
        .from(users)
        .where(
          or(
            eq(users.is_partial_registration, true),
            sql`password_hash LIKE 'TEMPORARY_%'`
          )
        )
        .orderBy(desc(users.created_at))
        .limit(20);

      // Check for potential limbo users (users with Firebase UID but no proper password)
      const potentialLimboUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          firebase_uid: users.firebase_uid,
          created_at: users.created_at
        })
        .from(users)
        .where(
          and(
            isNotNull(users.firebase_uid),
            or(
              eq(users.is_partial_registration, true),
              sql`password_hash LIKE 'FIREBASE_USER_%'`
            )
          )
        )
        .orderBy(desc(users.created_at))
        .limit(10);

      res.json({
        stats: userStats[0],
        problematic_users: problematicUsers,
        potential_limbo_users: potentialLimboUsers,
        generated_at: new Date()
      });
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Admin - Search users
  app.get('/api/admin/users/search', requireAdmin, async (req, res) => {
    try {
      const { q, limit = 20 } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }

      const searchTerm = `%${q.toLowerCase()}%`;
      
      const searchResults = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          created_at: users.created_at,
          subscription_tier: users.subscription_tier,
          subscription_status: users.subscription_status,
          is_partial_registration: users.is_partial_registration,
          firebase_uid: users.firebase_uid,
          is_admin: users.is_admin
        })
        .from(users)
        .where(
          or(
            sql`lower(email) LIKE ${searchTerm}`,
            sql`lower(name) LIKE ${searchTerm}`,
            sql`cast(id as text) = ${q}`
          )
        )
        .orderBy(desc(users.created_at))
        .limit(Number(limit));

      res.json({
        results: searchResults,
        query: q,
        count: searchResults.length
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({ error: 'Failed to search users' });
    }
  });

  // Admin - Get detailed user info for troubleshooting
  app.get('/api/admin/users/:userId', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check Firebase status if user has Firebase UID
      let firebaseStatus = null;
      if (user.firebase_uid) {
        try {
          const firebaseUser = await auth.getUser(user.firebase_uid);
          firebaseStatus = {
            exists: true,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified,
            disabled: firebaseUser.disabled,
            creationTime: firebaseUser.metadata.creationTime,
            lastSignInTime: firebaseUser.metadata.lastSignInTime
          };
        } catch (firebaseError: any) {
          firebaseStatus = {
            exists: false,
            error: firebaseError.message
          };
        }
      }

      // Check for temporary password
      let hasTemporaryPassword = false;
      try {
        hasTemporaryPassword = await cryptoUtils.compare("TEMPORARY_PASSWORD", user.password_hash);
      } catch (error) {
        // Ignore error, just assume not temporary
      }

      // Analyze user state
      const userAnalysis = {
        user_state: 'normal' as 'normal' | 'partial' | 'limbo' | 'firebase_only' | 'problematic',
        issues: [] as string[],
        recommendations: [] as string[]
      };

      if (user.is_partial_registration) {
        userAnalysis.user_state = 'partial';
        userAnalysis.issues.push('User has partial registration flag set');
        userAnalysis.recommendations.push('User should complete registration or use password reset');
      }

      if (hasTemporaryPassword) {
        userAnalysis.user_state = 'partial';
        userAnalysis.issues.push('User has temporary password');
        userAnalysis.recommendations.push('User should set a real password via password reset');
      }

      if (user.firebase_uid && firebaseStatus && !firebaseStatus.exists) {
        userAnalysis.user_state = 'problematic';
        userAnalysis.issues.push('User has Firebase UID but Firebase user does not exist');
        userAnalysis.recommendations.push('Clear Firebase UID or recreate Firebase user');
      }

      if (!user.firebase_uid && firebaseStatus === null) {
        // Check if Firebase user exists with this email
        try {
          const firebaseUser = await auth.getUserByEmail(user.email);
          if (firebaseUser) {
            userAnalysis.user_state = 'limbo';
            userAnalysis.issues.push('Firebase user exists but not linked to native user');
            userAnalysis.recommendations.push('Link Firebase UID to native user');
          }
        } catch (error) {
          // Firebase user doesn't exist, which is fine
        }
      }

      // Remove sensitive data
      const safeUser = {
        ...user,
        password_hash: '[HIDDEN]'
      };

      res.json({
        user: safeUser,
        firebase_status: firebaseStatus,
        analysis: userAnalysis,
        has_temporary_password: hasTemporaryPassword,
        checked_at: new Date()
      });
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  // Admin - Fix user limbo state
  app.post('/api/admin/users/:userId/fix-limbo', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { action } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      let result = { success: false, message: '', action_taken: '' };

      switch (action) {
        case 'reset_to_partial':
          // Reset user to partial registration state
          const tempPasswordHash = await cryptoUtils.hash("TEMPORARY_PASSWORD");
          await db
            .update(users)
            .set({
              password_hash: tempPasswordHash,
              is_partial_registration: true
            })
            .where(eq(users.id, userId));
          
          result = {
            success: true,
            message: 'User reset to partial registration state',
            action_taken: 'reset_to_partial'
          };
          break;

        case 'link_firebase':
          // Try to link Firebase user by email
          try {
            const firebaseUser = await auth.getUserByEmail(user.email);
            await db
              .update(users)
              .set({ firebase_uid: firebaseUser.uid })
              .where(eq(users.id, userId));
            
            result = {
              success: true,
              message: `Linked Firebase user ${firebaseUser.uid}`,
              action_taken: 'link_firebase'
            };
          } catch (firebaseError: any) {
            result = {
              success: false,
              message: `Failed to find Firebase user: ${firebaseError.message}`,
              action_taken: 'link_firebase_failed'
            };
          }
          break;

        case 'clear_firebase_uid':
          // Clear Firebase UID
          await db
            .update(users)
            .set({ firebase_uid: null })
            .where(eq(users.id, userId));
          
          result = {
            success: true,
            message: 'Cleared Firebase UID',
            action_taken: 'clear_firebase_uid'
          };
          break;

        case 'complete_registration':
          // Mark registration as complete
          await db
            .update(users)
            .set({ is_partial_registration: false })
            .where(eq(users.id, userId));
          
          result = {
            success: true,
            message: 'Marked registration as complete',
            action_taken: 'complete_registration'
          };
          break;

        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      console.log(`Admin ${req.user?.email} performed action ${action} on user ${user.email} (ID: ${userId})`);
      res.json(result);
    } catch (error) {
      console.error('Error fixing user limbo state:', error);
      res.status(500).json({ error: 'Failed to fix user state' });
    }
  });

  // Admin - Toggle admin status
  app.post('/api/admin/users/:userId/toggle-admin', requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Prevent self-demotion
      if (userId === req.user?.id) {
        return res.status(400).json({ error: 'Cannot modify your own admin status' });
      }

      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          is_admin: users.is_admin
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const newAdminStatus = !user.is_admin;
      
      await db
        .update(users)
        .set({ is_admin: newAdminStatus })
        .where(eq(users.id, userId));

      console.log(`Admin ${req.user?.email} ${newAdminStatus ? 'granted' : 'revoked'} admin access to user ${user.email} (ID: ${userId})`);
      
      res.json({
        success: true,
        message: `User ${newAdminStatus ? 'granted' : 'revoked'} admin access`,
        new_admin_status: newAdminStatus
      });
    } catch (error) {
      console.error('Error toggling admin status:', error);
      res.status(500).json({ error: 'Failed to toggle admin status' });
    }
  });

  // Get archived PantryPal recipes
  app.get("/api/pantrypal-recipes/archived", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const now = new Date();

      // Get archived PantryPal recipes (expired recipes without meal_type)
      const archivedRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, user.id),
            isNull(temporaryRecipes.meal_type), // PantryPal recipes don't have meal_type
            lt(temporaryRecipes.expires_at, now) // Expired recipes
          )
        )
        .orderBy(desc(temporaryRecipes.created_at));

      res.json(archivedRecipes);
    } catch (error) {
      console.error("Error fetching archived PantryPal recipes:", error);
      res.status(500).json({ error: "Failed to fetch archived PantryPal recipes" });
    }
  });

  // Get all user's favorite recipes (both archived PantryPal and explicitly favorited)
  app.get("/api/user-favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const now = new Date();

      // Get all favorite recipes - both archived PantryPal and explicitly favorited
      const favoriteRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.user_id, user.id),
            or(
              // Archived PantryPal recipes (expired, no meal_type)
              and(
                isNull(temporaryRecipes.meal_type),
                lt(temporaryRecipes.expires_at, now)
              ),
              // Explicitly favorited recipes
              eq(temporaryRecipes.favorited, true)
            )
          )
        )
        .orderBy(desc(temporaryRecipes.created_at));

      res.json(favoriteRecipes);
    } catch (error) {
      console.error("Error fetching user favorite recipes:", error);
      res.status(500).json({ error: "Failed to fetch user favorite recipes" });
    }
  });

  // Debug route to check user's current subscription status
  app.get("/api/debug/subscription-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // Get current user data from database
      const [dbUser] = await db
        .select({
          id: users.id,
          email: users.email,
          stripe_customer_id: users.stripe_customer_id,
          stripe_subscription_id: users.stripe_subscription_id,
          subscription_status: users.subscription_status,
          subscription_tier: users.subscription_tier,
          subscription_end_date: users.subscription_end_date
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      res.json({
        user_id: user.id,
        email: user.email,
        database_record: dbUser,
        session_data: {
          subscription_status: user.subscription_status,
          subscription_tier: user.subscription_tier,
          stripe_customer_id: user.stripe_customer_id
        }
      });
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
  });

  // Debug route to check user's stripe customer ID
  // Test the database update manually (for debugging subscription issues)
  app.post("/api/debug/test-subscription-update", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { customer_id, subscription_id } = req.body;

      console.log('Manual subscription update test for user:', {
        userId: user.id,
        customerId: customer_id,
        subscriptionId: subscription_id
      });

      // Update the user's subscription manually
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

      const [updatedUser] = await db
        .update(users)
        .set({
          subscription_status: 'active' as const,
          subscription_tier: 'premium' as const,
          subscription_end_date: subscriptionEndDate,
          stripe_customer_id: customer_id || user.stripe_customer_id,
          stripe_subscription_id: subscription_id || 'sub_test_manual'
        })
        .where(eq(users.id, user.id))
        .returning();

      res.json({
        success: true,
        message: 'Subscription updated manually',
        user: updatedUser,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Manual subscription update failed:', error);
      res.status(500).json({
        error: 'Manual update failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/debug/user-stripe-id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // Get current user data from database
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);
      
      res.json({
        user_id: user.id,
        email: user.email,
        session_stripe_customer_id: user.stripe_customer_id,
        db_stripe_customer_id: dbUser?.stripe_customer_id,
        subscription_status: dbUser?.subscription_status,
        subscription_tier: dbUser?.subscription_tier,
        subscription_end_date: dbUser?.subscription_end_date
      });
    } catch (error) {
      console.error('Error fetching user stripe ID:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });

  // Debug route to manually update subscription status
  app.post("/api/debug/update-subscription", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      
      // Calculate subscription end date (30 days from now)
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

      // Update the user's subscription status
      const [updatedUser] = await db
        .update(users)
        .set({
          subscription_status: 'active' as const,
          subscription_tier: 'premium' as const,
          subscription_end_date: subscriptionEndDate
        })
        .where(eq(users.id, user.id))
        .returning();

      console.log('Manual subscription update result:', {
        userId: user.id,
        updatedUser: updatedUser ? {
          id: updatedUser.id,
          subscription_status: updatedUser.subscription_status,
          subscription_tier: updatedUser.subscription_tier,
          subscription_end_date: updatedUser.subscription_end_date
        } : null
      });

      res.json({
        success: true,
        message: 'Subscription status updated manually',
        user: updatedUser ? {
          id: updatedUser.id,
          subscription_status: updatedUser.subscription_status,
          subscription_tier: updatedUser.subscription_tier,
          subscription_end_date: updatedUser.subscription_end_date
        } : null
      });
    } catch (error) {
      console.error('Error updating subscription status:', error);
      res.status(500).json({ error: 'Failed to update subscription status' });
    }
  });

  // Debug route to test webhook secret configuration
  app.get("/api/debug/webhook-secret-test", async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        return res.json({
          error: 'STRIPE_WEBHOOK_SECRET not configured',
          configured: false
        });
      }

      // Check if it looks like a valid webhook secret
      const isValidFormat = webhookSecret.startsWith('whsec_');
      
      res.json({
        configured: true,
        valid_format: isValidFormat,
        secret_length: webhookSecret.length,
        secret_prefix: webhookSecret.substring(0, 10) + '...',
        expected_format: 'whsec_...',
        instructions: isValidFormat ? 
          'Webhook secret appears to be correctly formatted' : 
          'Webhook secret should start with "whsec_". Please check your Stripe dashboard for the correct webhook secret.'
      });
    } catch (error) {
      console.error('Error checking webhook secret:', error);
      res.status(500).json({ error: 'Failed to check webhook secret' });
    }
  });

  // Debug route to check webhook configuration
  app.get("/api/debug/webhook-config", async (req: Request, res: Response) => {
    try {
      res.json({
        webhook_secret_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
        webhook_secret_length: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
        stripe_secret_configured: !!process.env.STRIPE_SECRET_KEY,
        stripe_publishable_configured: !!process.env.STRIPE_PUBLISHABLE_KEY,
        base_url: process.env.NODE_ENV === 'production' ? 'https://dine-n.replit.app' : 'http://localhost:3001'
      });
    } catch (error) {
      console.error('Error checking webhook config:', error);
      res.status(500).json({ error: 'Failed to check webhook config' });
    }
  });
}