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
}

export async function generateMealPlan(preferences: MealPlanPreferences, days: number): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/generate-meal-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ preferences, days }),
  });
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
