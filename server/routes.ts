import type { Express, Request } from "express";
import { db } from "../db";
import { recipes, mealPlans, groceryLists, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { generateRecipeRecommendation } from "./utils/ai";
import { hashPassword, comparePasswords, generateToken, authenticateToken } from "./utils/auth";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: { id: number };
    }
  }
}

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
                  ingredients: Array.isArray(recipeData.ingredients) 
                    ? recipeData.ingredients.map((ing) => {
                        if (typeof ing === 'object' && ing !== null) {
                          return {
                            name: String((ing as any).name || ''),
                            amount: Number((ing as any).amount || 0),
                            unit: String((ing as any).unit || '')
                          };
                        }
                        return { name: '', amount: 0, unit: '' };
                      })
                    : [],
                  instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
                  tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
                  nutrition: typeof recipeData.nutrition === 'object' && recipeData.nutrition !== null ? {
                    calories: Number((recipeData.nutrition as any)?.calories) || 0,
                    protein: Number((recipeData.nutrition as any)?.protein) || 0,
                    carbs: Number((recipeData.nutrition as any)?.carbs) || 0,
                    fat: Number((recipeData.nutrition as any)?.fat) || 0
                  } : {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                  },
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
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          name,
          password_hash: hashedPassword,
          username: email, // Using email as username for now
          preferences: {
            dietary: [],
            allergies: [],
            cuisine: [],
            meatTypes: []
          }
        })
        .returning();

      const token = generateToken(newUser.id);

      res.json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await comparePasswords(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user!.id),
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Failed to authenticate user" });
    }
  });

  // Add authentication middleware to protected routes
  app.use("/api/meal-plans", authenticateToken);
  app.use("/api/grocery-lists", authenticateToken);
        errorMessage = 'Unable to connect to recipe service. Please check your connection.';
      }
      
      res.status(500).json({ 
        error: errorMessage,
        type: errorType
      });
    }
  });
}
