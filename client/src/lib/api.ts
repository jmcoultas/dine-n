import type { Recipe, GroceryList } from "@db/schema";

const API_BASE = "/api";

interface MealPlanPreferences {
  dietary: string[];
  allergies: string[];
  cuisine: string[];
  meatTypes: string[];
  chefPreferences?: ChefPreferences;
}

interface ChefPreferences {
  difficulty: string;
  cookTime: string;
  servingSize: string;
}

export interface GenerateMealPlanResponse {
  recipes: Recipe[];
  status?: 'success' | 'partial';
  missingMeals?: Array<{ day: number; meal: string }>;
  message?: string;
  remaining_free_plans?: number | null;
}

// Transform snake_case to camelCase for recipe data
function transformRecipeData(recipe: any): Recipe {
  return {
    ...recipe,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    imageUrl: recipe.permanent_url || recipe.image_url || null,
    permanentUrl: recipe.permanent_url || null,
    isFavorited: recipe.favorited || false,
    // Ensure required fields have default values
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    tags: recipe.tags || [],
    nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    favorites_count: recipe.favorites_count || 0,
    created_at: recipe.created_at ? new Date(recipe.created_at) : new Date(),
    ...(recipe.expires_at ? { expiresAt: new Date(recipe.expires_at) } : {}),
    meal: recipe.meal || null,
    day: recipe.day ? new Date(recipe.day) : null,
  };
}

export async function generateMealPlan(
  preferences: MealPlanPreferences,
  days: number,
  chefPreferences?: ChefPreferences
): Promise<GenerateMealPlanResponse> {
  const cleanPreferences = {
    dietary: Array.isArray(preferences.dietary) ? preferences.dietary.filter(Boolean) : [],
    allergies: Array.isArray(preferences.allergies) ? preferences.allergies.filter(Boolean) : [],
    cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine.filter(Boolean) : [],
    meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes.filter(Boolean) : [],
    chefPreferences: preferences.chefPreferences || chefPreferences || {}
  };

  console.log('Client: Sending preferences to server:', JSON.stringify(cleanPreferences, null, 2));

  const response = await fetch(`${API_BASE}/generate-meal-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      preferences: cleanPreferences,
      days,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.code === 'UPGRADE_REQUIRED' || errorData.code === 'FREE_PLAN_LIMIT_REACHED') {
      throw new Error('FREE_PLAN_LIMIT_REACHED');
    }
    throw new Error(errorData.message || "Failed to generate meal plan");
  }

  const data = await response.json();
  if (!data.recipes || !Array.isArray(data.recipes)) {
    throw new Error('Invalid response format from server');
  }

  return data;
}

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`);
  const data = await response.json();
  return Array.isArray(data) ? data.map(transformRecipeData) : [];
}

export async function getTemporaryRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/temporary-recipes`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch temporary recipes");
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(transformRecipeData) : [];
}

export async function getArchivedPantryPalRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/pantrypal-recipes/archived`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch archived PantryPal recipes");
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(transformRecipeData) : [];
}

export async function getUserFavorites(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/user-favorites`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch user favorites");
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(transformRecipeData) : [];
}

export interface MealPlan {
  id: number;
  user_id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  expiration_date: Date | null;
  days_generated: number;
  is_expired: boolean;
  created_at: Date;
  recipes: Array<Recipe & { meal: string; day: string; }>;
}

export interface CreateMealPlanInput {
  name: string;
  start_date: Date;
  end_date: Date;
  expiration_date: Date;
  days_generated: number;
  is_expired: boolean;
  recipes: Array<{ id: number; }>;
}

export async function createMealPlan(mealPlan: CreateMealPlanInput): Promise<MealPlan> {
  console.log('Creating meal plan with data:', JSON.stringify(mealPlan, null, 2));
  
  const response = await fetch(`${API_BASE}/meal-plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(mealPlan),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.error('Failed to create meal plan:', {
      status: response.status,
      statusText: response.statusText,
      errorData
    });
    throw new Error(errorData?.error || "Failed to create meal plan");
  }

  const data = await response.json();
  console.log('Meal plan created successfully:', JSON.stringify(data, null, 2));
  
  return {
    ...data,
    start_date: new Date(data.start_date),
    end_date: new Date(data.end_date),
    expiration_date: data.expiration_date ? new Date(data.expiration_date) : null,
    created_at: new Date(data.created_at)
  };
}

export async function getGroceryList(mealPlanId: number): Promise<GroceryList> {
  const response = await fetch(`${API_BASE}/grocery-lists/${mealPlanId}`, {
    credentials: "include",
  });
  return response.json();
}

export async function createGroceryList(groceryList: Omit<GroceryList, "id">): Promise<GroceryList> {
  const response = await fetch(`${API_BASE}/grocery-lists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(groceryList),
  });
  return response.json();
}

// Instacart Integration Functions
export async function createInstacartShoppingList(
  mealPlanId: number,
  title?: string
): Promise<{ success: boolean; instacart_url: string; ingredient_count: number }> {
  const response = await fetch(`${API_BASE}/instacart/shopping-list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      meal_plan_id: mealPlanId,
      title,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create Instacart shopping list");
  }

  return response.json();
}

export async function createInstacartRecipePage(
  recipeId: number
): Promise<{ success: boolean; instacart_url: string; recipe_name: string; ingredient_count: number }> {
  const response = await fetch(`${API_BASE}/instacart/recipe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      recipe_id: recipeId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create Instacart recipe page");
  }

  return response.json();
}

export async function getNearbyRetailers(
  postalCode: string,
  countryCode: string = 'US'
): Promise<any> {
  const response = await fetch(
    `${API_BASE}/instacart/retailers?postal_code=${postalCode}&country_code=${countryCode}`,
    {
      credentials: "include",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch nearby retailers");
  }

  return response.json();
}

interface SubstitutionResponse {
  substitutions: string[];
  reasoning: string;
}

export async function getIngredientSubstitutions(
  ingredient: string,
  preferences?: { dietary?: string[]; allergies?: string[] }
): Promise<SubstitutionResponse> {
  const response = await fetch(`${API_BASE}/substitute-ingredient`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      ingredient,
      ...preferences
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("You must be logged in to get ingredient substitutions");
    }
    const errorText = await response.text();
    throw new Error(errorText || "Failed to get ingredient substitutions");
  }

  return response.json();
}

export async function generateRecipeFromTitle(
  title: string,
  allergies: string[] = []
): Promise<Recipe> {
  console.log('API: Generating recipe for title:', title, 'with allergies:', allergies);
  
  try {
    const response = await fetch(`${API_BASE}/generate-recipe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ title, allergies }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(e => ({ 
        message: "Failed to parse error response", 
        originalError: e 
      }));
      
      console.error('API: Error response from generate-recipe:', errorData);
      
      if (errorData.code === "UPGRADE_REQUIRED") {
        throw new Error("FREE_PLAN_LIMIT_REACHED");
      }
      throw new Error(errorData.message || "Failed to generate recipe");
    }

    const data = await response.json().catch(e => {
      console.error('API: Failed to parse JSON response:', e);
      throw new Error("Invalid JSON response from server");
    });
    
    console.log('API: Raw recipe data from server:', JSON.stringify(data, null, 2));
    
    if (!data.recipe || typeof data.recipe !== 'object') {
      console.error('API: Invalid recipe data structure:', data);
      throw new Error("Invalid recipe data received from server");
    }
    
    const recipe = data.recipe;

    // Transform the data to include both snake_case and camelCase fields
    const transformedRecipe = {
      ...recipe,
      // Add camelCase versions of fields
      imageUrl: recipe.permanent_url || recipe.image_url || null,
      permanentUrl: recipe.permanent_url || null,
      prepTime: recipe.prep_time,
      cookTime: recipe.cook_time,
      // Keep snake_case versions for compatibility
      image_url: recipe.image_url || null,
      permanent_url: recipe.permanent_url || null,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      // Ensure required fields have default values
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      tags: recipe.tags || [],
      nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
      // Add favorite-related fields
      favorited: recipe.favorited || false,
      favorites_count: recipe.favorites_count || 0,
      // Add dates
      created_at: recipe.created_at ? new Date(recipe.created_at) : new Date(),
      ...(recipe.expires_at ? { expiresAt: new Date(recipe.expires_at) } : {})
    };

    console.log('API: Transformed recipe:', JSON.stringify(transformedRecipe, null, 2));
    return transformedRecipe;
  } catch (error) {
    console.error('API: Error in generateRecipeFromTitle:', error);
    throw error;
  }
}

export async function getCurrentMealPlan(): Promise<MealPlan | null> {
  try {
    const response = await fetch(`${API_BASE}/meal-plans/current`, {
      credentials: "include",
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No meal plan found
      }
      throw new Error("Failed to fetch current meal plan");
    }

    const data = await response.json();
    if (!data) return null;

    return {
      ...data,
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      expiration_date: data.expiration_date ? new Date(data.expiration_date) : undefined,
    };
  } catch (error) {
    console.error("Error fetching current meal plan:", error);
    return null;
  }
}