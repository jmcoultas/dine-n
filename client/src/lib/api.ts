import type { Recipe, MealPlan, GroceryList } from "@db/schema";

const API_BASE = "/api";

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`);
  return response.json();
}

export async function createMealPlan(mealPlan: Omit<MealPlan, "id">): Promise<MealPlan> {
  const response = await fetch(`${API_BASE}/meal-plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(mealPlan),
  });
  return response.json();
}

interface MealPlanPreferences {
  dietary: string[];
  allergies: string[];
  cuisine: string[];
  meatTypes: string[];
}

interface GenerateMealPlanResponse {
  recipes: Recipe[];
  status: 'success' | 'partial';
}

export async function generateMealPlan(preferences: MealPlanPreferences, days: number): Promise<GenerateMealPlanResponse> {
  // Log the exact data being sent
  console.log('Raw preferences received:', preferences);
  
  // Only filter out falsy values but keep empty arrays
  const cleanPreferences = {
    dietary: Array.isArray(preferences.dietary) ? preferences.dietary.filter(Boolean) : [],
    allergies: Array.isArray(preferences.allergies) ? preferences.allergies.filter(Boolean) : [],
    cuisine: Array.isArray(preferences.cuisine) ? preferences.cuisine.filter(Boolean) : [],
    meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes.filter(Boolean) : []
  };
  console.log('Cleaned preferences being sent to API:', cleanPreferences);
  const response = await fetch(`${API_BASE}/generate-meal-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      preferences: {
        dietary: preferences.dietary,
        allergies: preferences.allergies,
        cuisine: preferences.cuisine,
        meatTypes: preferences.meatTypes
      },
      days
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("You must be logged in to generate meal plans");
    }
    const errorText = await response.text();
    throw new Error(errorText || "Failed to generate meal plan");
  }

  return response.json();
}

export async function getGroceryList(mealPlanId: number): Promise<GroceryList> {
  const response = await fetch(`${API_BASE}/grocery-lists/${mealPlanId}`);
  return response.json();
}

export async function createGroceryList(groceryList: Omit<GroceryList, "id">): Promise<GroceryList> {
  const response = await fetch(`${API_BASE}/grocery-lists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(groceryList),
  });
  return response.json();
}
