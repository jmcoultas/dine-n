
import type { Recipe } from "@db/schema";

export function transformInstructionsForDB(recipe: Partial<Recipe>): Partial<Recipe> {
  if (Array.isArray(recipe.instructions)) {
    return {
      ...recipe,
      instructions: { steps: recipe.instructions }
    };
  }
  return recipe;
}

export function transformInstructionsForClient(recipe: Partial<Recipe>): Partial<Recipe> {
  if (recipe.instructions && 'steps' in recipe.instructions) {
    return {
      ...recipe,
      instructions: recipe.instructions.steps
    };
  }
  return recipe;
}
