import OpenAI from "openai";
import type { Recipe } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RecipeGenerationParams {
  dietary: string[];
  allergies: string[];
  mealType: "breakfast" | "lunch" | "dinner";
}

// Default fallback recipes for different meal types
const DEFAULT_RECIPES: Record<string, Partial<Recipe>> = {
  breakfast: {
    name: "Classic Oatmeal with Fruits",
    description: "A healthy and filling breakfast of oatmeal topped with fresh fruits and nuts",
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    ingredients: [
      { name: "rolled oats", amount: 1, unit: "cup" },
      { name: "milk", amount: 2, unit: "cups" },
      { name: "banana", amount: 1, unit: "piece" },
      { name: "honey", amount: 2, unit: "tablespoons" },
      { name: "mixed berries", amount: 1, unit: "cup" }
    ],
    instructions: [
      "Combine oats and milk in a pot",
      "Cook over medium heat for 5-7 minutes, stirring occasionally",
      "Top with sliced banana, berries, and honey"
    ],
    tags: ["breakfast", "healthy", "vegetarian"],
    nutrition: { calories: 350, protein: 12, carbs: 68, fat: 6 }
  },
  lunch: {
    name: "Mediterranean Quinoa Bowl",
    description: "A nutritious bowl of quinoa with vegetables and chickpeas",
    prepTime: 15,
    cookTime: 20,
    servings: 2,
    ingredients: [
      { name: "quinoa", amount: 1, unit: "cup" },
      { name: "chickpeas", amount: 1, unit: "can" },
      { name: "cucumber", amount: 1, unit: "piece" },
      { name: "cherry tomatoes", amount: 1, unit: "cup" },
      { name: "olive oil", amount: 2, unit: "tablespoons" }
    ],
    instructions: [
      "Cook quinoa according to package instructions",
      "Dice cucumber and halve tomatoes",
      "Combine all ingredients in a bowl",
      "Drizzle with olive oil and season to taste"
    ],
    tags: ["lunch", "vegetarian", "healthy"],
    nutrition: { calories: 420, protein: 15, carbs: 62, fat: 14 }
  },
  dinner: {
    name: "Baked Salmon with Roasted Vegetables",
    description: "Simple and healthy baked salmon with seasonal vegetables",
    prepTime: 15,
    cookTime: 25,
    servings: 2,
    ingredients: [
      { name: "salmon fillet", amount: 2, unit: "pieces" },
      { name: "broccoli", amount: 2, unit: "cups" },
      { name: "carrots", amount: 2, unit: "pieces" },
      { name: "olive oil", amount: 2, unit: "tablespoons" },
      { name: "lemon", amount: 1, unit: "piece" }
    ],
    instructions: [
      "Preheat oven to 400°F (200°C)",
      "Place salmon and vegetables on a baking sheet",
      "Drizzle with olive oil and season",
      "Bake for 20-25 minutes"
    ],
    tags: ["dinner", "healthy", "seafood"],
    nutrition: { calories: 480, protein: 36, carbs: 22, fat: 28 }
  }
};

// Helper function to check if recipe meets dietary restrictions
function meetsRestrictions(recipe: Partial<Recipe>, params: RecipeGenerationParams): boolean {
  const allergies = params.allergies.map(a => a.toLowerCase());
  const dietary = params.dietary.map(d => d.toLowerCase());
  
  // Check ingredients against allergies
  const hasAllergens = recipe.ingredients?.some(ing => 
    allergies.some(allergy => ing.name.toLowerCase().includes(allergy))
  );
  if (hasAllergens) return false;
  
  // Check dietary restrictions
  const isVegetarian = dietary.includes('vegetarian');
  const isVegan = dietary.includes('vegan');
  const tags = recipe.tags?.map(t => t.toLowerCase()) || [];
  
  if (isVegan && !tags.includes('vegan')) return false;
  if (isVegetarian && !tags.includes('vegetarian')) return false;
  
  return true;
}

export async function generateRecipeRecommendation(params: RecipeGenerationParams): Promise<Partial<Recipe>> {
  try {
    const prompt = `Generate a detailed recipe that is suitable for ${params.mealType}.
${params.dietary.length > 0 ? `Must follow dietary restrictions: ${params.dietary.join(", ")}` : ""}
${params.allergies.length > 0 ? `Must avoid allergens: ${params.allergies.join(", ")}` : ""}

Response should be in JSON format with the following structure:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prepTime": minutes (number),
  "cookTime": minutes (number),
  "servings": number,
  "ingredients": [{ "name": "ingredient", "amount": number, "unit": "unit" }],
  "instructions": ["step 1", "step 2", ...],
  "tags": ["tag1", "tag2"],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number }
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional chef and nutritionist who creates detailed, healthy recipes.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
    });

    const recipeData = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Add a default image URL based on the recipe name
    recipeData.imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(recipeData.name.split(" ").join(","))}`;
    
    return recipeData;
  } catch (error: any) {
    console.log("OpenAI API Error:", error.message);
    
    // Get default recipe for meal type
    let fallbackRecipe = { ...DEFAULT_RECIPES[params.mealType] };
    
    // If the default recipe doesn't meet restrictions, modify it
    if (!meetsRestrictions(fallbackRecipe, params)) {
      // Provide a simple vegetarian/vegan alternative
      fallbackRecipe = {
        ...DEFAULT_RECIPES[params.mealType],
        name: "Simple Vegetable Stir-Fry",
        description: "A quick and healthy vegetable stir-fry",
        ingredients: [
          { name: "mixed vegetables", amount: 4, unit: "cups" },
          { name: "rice", amount: 2, unit: "cups" },
          { name: "olive oil", amount: 2, unit: "tablespoons" },
          { name: "soy sauce", amount: 2, unit: "tablespoons" }
        ],
        tags: ["vegetarian", "vegan", "healthy"],
      };
    }
    
    // Add image URL for fallback recipe
    fallbackRecipe.imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(fallbackRecipe.name.split(" ").join(","))}`;
    
    // Throw a custom error that includes the fallback recipe
    const customError = new Error("API_FALLBACK");
    (customError as any).fallbackRecipe = fallbackRecipe;
    (customError as any).originalError = error;
    throw customError;
  }
}
