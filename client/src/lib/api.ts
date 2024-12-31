
import type { Recipe, MealPlan, GroceryList } from "@db/schema";

const API_BASE = "/api";

export async function fetchRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE}/recipes`);
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

// ... rest of the file remains the same
