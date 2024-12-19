
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
  const instructions = recipe.instructions;
  if (instructions && typeof instructions === 'object' && !Array.isArray(instructions) && 'steps' in instructions) {
    return {
      ...recipe,
      instructions: instructions.steps
    };
  }
  return recipe;
}
