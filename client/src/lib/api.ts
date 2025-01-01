import type { Recipe, MealPlan, GroceryList } from "@db/schema";

const API_BASE = "/api";

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`);
  return response.json();
}

interface MealPlanPreferences {
  dietary: string[];
  allergies: string[];
  cuisine: string[];
  meatTypes: string[];
}

interface ChefPreferences {
  difficulty: string;
  mealType: string;
  cookTime: string;
}

interface GenerateMealPlanResponse {
  recipes: Recipe[];
  status: 'success' | 'partial';
}

export async function getTemporaryRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/temporary-recipes`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch temporary recipes");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
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
    meatTypes: Array.isArray(preferences.meatTypes) ? preferences.meatTypes.filter(Boolean) : []
  };

  const response = await fetch(`${API_BASE}/generate-meal-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      preferences: cleanPreferences,
      days,
      chefPreferences
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to generate meal plan");
  }

  return response.json();
}

export async function createMealPlan(mealPlan: Partial<MealPlan>): Promise<MealPlan> {
  const response = await fetch(`${API_BASE}/meal-plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(mealPlan),
  });

  if (!response.ok) {
    throw new Error("Failed to create meal plan");
  }

  return response.json();
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