import express, { type Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { generateRecipeRecommendation, generateIngredientSubstitution } from "./utils/ai";
import { recipes, mealPlans, groceryLists, users, userRecipes, temporaryRecipes, type Recipe, type TemporaryRecipe, PreferenceSchema } from "@db/schema";
import { db } from "../db";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

export function registerRoutes(app: express.Express) {
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

  // Favorite Recipes Routes - Protected Routes
  app.get("/api/recipes/favorites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userFavorites = await db
        .select({
          id: recipes.id,
          name: recipes.name,
          description: recipes.description,
          imageUrl: recipes.imageUrl,
          prepTime: recipes.prepTime,
          cookTime: recipes.cookTime,
          servings: recipes.servings,
          ingredients: recipes.ingredients,
          instructions: recipes.instructions,
          tags: recipes.tags,
          nutrition: recipes.nutrition,
          complexity: recipes.complexity,
        })
        .from(userRecipes)
        .innerJoin(recipes, eq(recipes.id, userRecipes.recipe_id))
        .where(eq(userRecipes.user_id, req.user.id));

      res.setHeader('Content-Type', 'application/json');
      return res.json(userFavorites);
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

      // If it's a temporary recipe (negative ID), we need to save it first
      if (recipeId < 0) {
        // First, fetch the temporary recipe using absolute value of ID
        const tempRecipe = await db
          .select()
          .from(temporaryRecipes)
          .where(eq(temporaryRecipes.id, Math.abs(recipeId)))
          .limit(1);

        if (!tempRecipe || tempRecipe.length === 0) {
          return res.status(404).json({ error: "Temporary recipe not found" });
        }

        // Transform and insert the recipe into the database
        const transformedRecipe = {
          name: tempRecipe[0].name,
          description: tempRecipe[0].description,
          image_url: tempRecipe[0].imageUrl,
          prep_time: tempRecipe[0].prepTime,
          cook_time: tempRecipe[0].cookTime,
          servings: tempRecipe[0].servings,
          ingredients: tempRecipe[0].ingredients,
          instructions: tempRecipe[0].instructions,
          tags: tempRecipe[0].tags,
          nutrition: tempRecipe[0].nutrition,
          complexity: tempRecipe[0].complexity,
          created_at: new Date()
        };

        // First, insert into permanent recipes table
        const [savedRecipe] = await db
          .insert(recipes)
          .values(transformedRecipe)
          .returning();

        // Then, delete from temporary recipes
        await db
          .delete(temporaryRecipes)
          .where(eq(temporaryRecipes.id, Math.abs(recipeId)));

        // Add to user's favorites using the new permanent ID
        await db.insert(userRecipes).values({
          user_id: req.user!.id,
          recipe_id: savedRecipe.id,
        });

        return res.json({
          message: "Recipe saved and added to favorites",
          permanentId: savedRecipe.id
        });
      }

      // For existing recipes, just add to favorites
      const [recipe] = await db
        .select()
        .from(recipes)
        .where(eq(recipes.id, recipeId));

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      await db.insert(userRecipes).values({
        user_id: req.user!.id,
        recipe_id: recipeId,
      });

      res.json({ message: "Recipe added to favorites" });
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

      await db
        .delete(userRecipes)
        .where(
          and(
            eq(userRecipes.user_id, req.user!.id),
            eq(userRecipes.recipe_id, recipeId)
          )
        );

      res.json({ message: "Recipe removed from favorites" });
    } catch (error: any) {
      console.error("Error removing recipe from favorites:", error);
      res.status(500).json({ error: "Failed to remove recipe from favorites" });
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
      const { name, startDate, endDate } = req.body;

      const [newMealPlan] = await db
        .insert(mealPlans)
        .values({
          name,
          userId: req.user!.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        })
        .returning();

      res.json(newMealPlan);
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

      const [newGroceryList] = await db
        .insert(groceryLists)
        .values({
          userId: req.user!.id,
          mealPlanId,
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

  // AI Meal Plan Generation - Protected Route
  app.get("/api/temporary-recipes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const activeRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.userId, req.user!.id),
            gt(temporaryRecipes.expiresAt, now)
          )
        );

      res.json(activeRecipes);
    } catch (error: any) {
      console.error("Error fetching temporary recipes:", error);
      res.status(500).json({ error: "Failed to fetch temporary recipes" });
    }
  });

  app.post("/api/generate-meal-plan", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check for existing active temporary recipes
      const now = new Date();
      const existingRecipes = await db
        .select()
        .from(temporaryRecipes)
        .where(
          and(
            eq(temporaryRecipes.userId, req.user!.id),
            gt(temporaryRecipes.expiresAt, now)
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

      console.log('Starting meal plan generation with preferences:', JSON.stringify({
        dietary: preferences.dietary,
        allergies: preferences.allergies,
        cuisine: preferences.cuisine,
        meatTypes: preferences.meatTypes,
        days
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

      console.log('Starting meal plan generation with normalized preferences:', JSON.stringify({
        dietary: normalizedPreferences.dietary,
        allergies: normalizedPreferences.allergies,
        cuisine: normalizedPreferences.cuisine,
        meatTypes: normalizedPreferences.meatTypes,
        days
      }, null, 2));

      // Generate exactly one recipe per meal type per day
      for (let day = 0; day < days; day++) {
        for (const mealType of mealTypes) {
          console.log(`Generating recipe for day ${day + 1}, meal ${mealType}`);
          try {
            const existingNames = Array.from(usedRecipeNames);
            console.log(`Generating recipe for ${mealType} with preferences:`, {
              dietary: preferences.dietary,
              allergies: preferences.allergies,
              cuisine: preferences.cuisine,
              meatTypes: preferences.meatTypes,
              excludeNames: existingNames
            });

            console.log(`Generating recipe for ${mealType} with preferences:`, {
              dietary: preferences.dietary,
              allergies: preferences.allergies,
              cuisine: preferences.cuisine,
              meatTypes: preferences.meatTypes,
              excludeNames: existingNames
            });

            const recipeData = await generateRecipeRecommendation({
              dietary: preferences.dietary.filter(Boolean),
              allergies: preferences.allergies.filter(Boolean),
              cuisine: preferences.cuisine.filter(Boolean),
              meatTypes: preferences.meatTypes.filter(Boolean),
              mealType: mealType,
              excludeNames: existingNames,
            });

            if (!recipeData || typeof recipeData !== 'object') {
              console.error('Invalid recipe data received:', recipeData);
              throw new Error('Invalid recipe data received from API');
            }

            if (!recipeData || !recipeData.name) {
              console.error('Invalid recipe data received:', recipeData);
              throw new Error('Invalid recipe data received from API');
            }

            if (!usedRecipeNames.has(recipeData.name)) {
              // Validate and clean recipe data before insertion
              type JsonObject = { [key: string]: any };

              const validatedIngredients = Array.isArray(recipeData.ingredients)
                ? recipeData.ingredients
                    .filter((ing): ing is JsonObject =>
                      ing !== null &&
                      typeof ing === 'object' &&
                      !Array.isArray(ing)
                    )
                    .map(ing => ({
                      name: String(ing?.name || '').trim(),
                      amount: Number(ing?.amount) || 0,
                      unit: String(ing?.unit || '').trim()
                    }))
                : [];

              console.log('Validated ingredients:', JSON.stringify(validatedIngredients, null, 2));

              const validatedInstructions = Array.isArray(recipeData.instructions)
                ? recipeData.instructions
                    .filter(instruction => instruction && typeof instruction === 'string')
                    .map(instruction => String(instruction).trim())
                : [];
              console.log('Validated instructions:', JSON.stringify(validatedInstructions, null, 2));

              const validatedTags = Array.isArray(recipeData.tags)
                ? recipeData.tags
                    .filter(tag => tag && typeof tag === 'string')
                    .map(tag => String(tag).trim())
                : [];
              console.log('Validated tags:', JSON.stringify(validatedTags, null, 2));

              const validatedNutrition = (() => {
                interface NutritionInput {
                  calories?: number | string;
                  protein?: number | string;
                  carbs?: number | string;
                  fat?: number | string;
                }

                const nutrition = recipeData.nutrition as NutritionInput;
                if (nutrition && typeof nutrition === 'object') {
                  const calories = Number(nutrition.calories);
                  const protein = Number(nutrition.protein);
                  const carbs = Number(nutrition.carbs);
                  const fat = Number(nutrition.fat);

                  if (!isNaN(calories) && !isNaN(protein) &&
                    !isNaN(carbs) && !isNaN(fat)) {
                    return {
                      calories: Math.max(0, calories),
                      protein: Math.max(0, protein),
                      carbs: Math.max(0, carbs),
                      fat: Math.max(0, fat)
                    };
                  }
                }
                return { calories: 0, protein: 0, carbs: 0, fat: 0 };
              })();
              console.log('Validated nutrition:', JSON.stringify(validatedNutrition, null, 2));

              const recipeToInsert = {
                name: String(recipeData.name || '').trim(),
                description: String(recipeData.description || 'No description available').trim(),
                image_url: String(recipeData.imageUrl || '').trim() || null,
                prep_time: Math.max(0, Number(recipeData.prepTime) || 0),
                cook_time: Math.max(0, Number(recipeData.cookTime) || 0),
                servings: Math.max(1, Number(recipeData.servings) || 2),
                ingredients: validatedIngredients,
                instructions: validatedInstructions,
                tags: validatedTags,
                nutrition: validatedNutrition,
                complexity: Math.max(1, Math.min(3, Number(recipeData.complexity) || 1)),
                created_at: new Date()
              };

              // Format and validate recipe data for database insertion
              const validatedRecipe = {
                name: recipeData.name,
                description: recipeData.description || 'No description available',
                imageUrl: recipeData.imageUrl || null,
                prep_time: recipeData.prepTime || 0,
                cook_time: recipeData.cookTime || 0,
                servings: recipeData.servings || 2,
                ingredients: Array.isArray(recipeData.ingredients)
                  ? recipeData.ingredients.map(ing => {
                    try {
                      const ingredient = ing as { name?: string; amount?: number; unit?: string };
                      return {
                        name: String(ingredient?.name || '').trim(),
                        amount: Number(ingredient?.amount || 0),
                        unit: String(ingredient?.unit || '').trim()
                      };
                    } catch (e) {
                      console.error('Error processing ingredient:', ing, e);
                      return null;
                    }
                  }).filter(Boolean)
                  : [],
                instructions: Array.isArray(recipeData.instructions)
                  ? recipeData.instructions
                    .filter(instruction => instruction && typeof instruction === 'string')
                    .map(instruction => String(instruction).trim())
                  : [],
                tags: Array.isArray(recipeData.tags)
                  ? recipeData.tags
                    .filter(tag => tag && typeof tag === 'string')
                    .map(tag => String(tag).trim())
                  : [],
                nutrition: (() => {
                  try {
                    if (typeof recipeData.nutrition === 'object' && recipeData.nutrition) {
                      const calories = Number((recipeData.nutrition as any)?.calories);
                      const protein = Number((recipeData.nutrition as any)?.protein);
                      const carbs = Number((recipeData.nutrition as any)?.carbs);
                      const fat = Number((recipeData.nutrition as any)?.fat);

                      if (!isNaN(calories) && !isNaN(protein) && !isNaN(carbs) && !isNaN(fat)) {
                        return {
                          calories: Math.max(0, calories),
                          protein: Math.max(0, protein),
                          carbs: Math.max(0, carbs),
                          fat: Math.max(0, fat)
                        };
                      }
                    }
                  } catch (e) {
                    console.error('Error processing nutrition data:', e);
                  }
                  return {
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0
                  };
                })(),
                complexity: Math.max(1, Math.min(3, Number(recipeData.complexity || 1))),
                created_at: new Date()
              };

              // Validate all arrays are properly formatted
              if (!Array.isArray(validatedRecipe.ingredients) ||
                !Array.isArray(validatedRecipe.instructions) ||
                !Array.isArray(validatedRecipe.tags)) {
                throw new Error('Invalid array format in recipe data');
              }

              // Log the validated data before insertion
              console.log('Validated recipe data:', JSON.stringify(validatedRecipe, null, 2));

              // Instead of saving to database, just add the validated recipe to our suggestions
              const generatedRecipe: Partial<Recipe> = {
                ...validatedRecipe,
                // Generate a temporary ID for frontend reference
                id: -(suggestedRecipes.length + 1), // Using negative IDs to distinguish from DB records
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

      // Instead of returning directly, save to temporary_recipes table
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 2); // Set expiration to 2 days from now

      const savedRecipes: TemporaryRecipe[] = [];
      for (const recipe of suggestedRecipes) {
        if (!recipe) continue;

        const [savedRecipe] = await db
          .insert(temporaryRecipes)
          .values({
            userId: req.user!.id,
            name: String(recipe.name || ''),
            description: recipe.description?.toString() || null,
            imageUrl: recipe.imageUrl?.toString() || null,
            prepTime: Number(recipe.prepTime) || 0,
            cookTime: Number(recipe.cookTime) || 0,
            servings: Number(recipe.servings) || 2,
            ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
            instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
            tags: Array.isArray(recipe.tags) ? recipe.tags : [],
            nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
            complexity: Number(recipe.complexity) || 1,
            createdAt: new Date(),
            expiresAt: expirationDate
          })
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

  // Ingredient Substitution endpoint
  app.post("/api/substitute-ingredient", isAuthenticated, async (req: Request, res: Response) => {
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