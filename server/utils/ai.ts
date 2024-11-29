import OpenAI from "openai";
import type { Recipe } from "@db/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RecipeGenerationParams {
  dietary: string[];
  allergies: string[];
  cuisine: string[];
  meatTypes: string[];
  mealType: "breakfast" | "lunch" | "dinner";
  excludeNames?: string[];
}

interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface FallbackRecipe {
  name: string;
  description: string;
  imageUrl?: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  tags: string[];
  nutrition: RecipeNutrition;
  complexity: number;
}

// Default fallback recipes for different meal types
const DEFAULT_RECIPES: Record<string, FallbackRecipe> = {
  breakfast: {
    name: "Classic Oatmeal with Fruits",
    description: "A healthy and filling breakfast of oatmeal topped with fresh fruits and nuts",
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    complexity: 1,
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
    complexity: 2,
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
    complexity: 2,
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
function meetsRestrictions(recipe: FallbackRecipe | Partial<Recipe>, params: RecipeGenerationParams): boolean {
  const allergies = params.allergies.map(a => a.toLowerCase());
  const dietary = params.dietary.map(d => d.toLowerCase());
  
  // Check if recipe has ingredients and they're in the correct format
  const recipeIngredients = Array.isArray(recipe.ingredients) 
    ? recipe.ingredients
    : [];
  
  const hasAllergens = recipeIngredients.some(ing => {
    if (typeof ing === 'object' && ing !== null && 'name' in ing) {
      const ingredientName = String(ing.name).toLowerCase();
      return allergies.some(allergy => ingredientName.includes(allergy));
    }
    return false;
  });
  
  if (hasAllergens) return false;
  
  // Ensure tags is an array before processing
  const recipeTags = Array.isArray(recipe.tags) 
    ? recipe.tags.map(tag => String(tag).toLowerCase())
    : [];
  
  // Check dietary restrictions
  if (dietary.length > 0 && !dietary.some(diet => recipeTags.includes(diet.toLowerCase()))) {
    return false;
  }
  
  // Check cuisine preferences
  const cuisines = params.cuisine.map(c => c.toLowerCase());
  if (cuisines.length > 0 && !cuisines.some(cuisine => recipeTags.includes(cuisine.toLowerCase()))) {
    return false;
  }
  
  // Check meat preferences
  const meatTypes = params.meatTypes.map(m => m.toLowerCase());
  if (meatTypes.length > 0) {
    if (meatTypes.includes('none') && recipeIngredients.some(ing => 
      typeof ing === 'object' && ing !== null && 'name' in ing && 
      ['chicken', 'beef', 'pork', 'fish', 'lamb', 'turkey'].some(meat => 
        String(ing.name).toLowerCase().includes(meat)
      )
    )) {
      return false;
    }
    
    if (!meatTypes.includes('none') && !meatTypes.some(meat => 
      recipeIngredients.some(ing => 
        typeof ing === 'object' && ing !== null && 'name' in ing && 
        String(ing.name).toLowerCase().includes(meat)
      )
    )) {
      return false;
    }
  }
  
  return true;
}

export async function generateRecipeRecommendation(params: RecipeGenerationParams): Promise<Partial<Recipe>> {
  try {
    const excludeNamesStr = params.excludeNames && params.excludeNames.length > 0 
      ? `\nMust NOT generate any of these recipes: ${params.excludeNames.join(", ")}`
      : "";
      
    const prompt = `Generate a unique and detailed recipe that is suitable for ${params.mealType}.
${params.dietary.length > 0 ? `Must follow dietary restrictions: ${params.dietary.join(", ")}` : ""}
${params.allergies.length > 0 ? `Must avoid allergens: ${params.allergies.join(", ")}` : ""}
${params.cuisine.length > 0 ? `Preferred cuisines: ${params.cuisine.join(", ")}` : ""}
${params.meatTypes.length > 0 ? `Preferred meat types: ${params.meatTypes.join(", ")}` : ""}
${excludeNamesStr}

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
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "complexity": number (1 for easy, 2 for medium, 3 for hard)
}

Please assign complexity based on:
- Easy (1): < 5 ingredients, < 4 steps, < 30 min total time
- Medium (2): 5-8 ingredients, 4-6 steps, 30-60 min total time
- Hard (3): > 8 ingredients, > 6 steps, > 60 min total time`;

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
      temperature: 0.7,
      max_tokens: 1000,
    });

    const recipeData = JSON.parse(completion.choices[0].message.content || '{}') as Partial<Recipe>;
    
    recipeData.imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(String(recipeData.name).split(" ").join(","))}`;
    
    return recipeData;
  } catch (error: any) {
    console.error("OpenAI API Error:", error.message);
    
    let fallbackRecipe = { ...DEFAULT_RECIPES[params.mealType] };
    if (!fallbackRecipe) {
      fallbackRecipe = { ...DEFAULT_RECIPES.lunch };
    }
    
    if (!meetsRestrictions(fallbackRecipe, params)) {
      const simpleFallback: FallbackRecipe = {
        name: "Simple Vegetable Stir-Fry",
        description: "A quick and healthy vegetable stir-fry",
        complexity: 1,
        ingredients: [
          { name: "mixed vegetables", amount: 4, unit: "cups" },
          { name: "rice", amount: 2, unit: "cups" },
          { name: "olive oil", amount: 2, unit: "tablespoons" },
          { name: "soy sauce", amount: 2, unit: "tablespoons" }
        ],
        instructions: [
          "Cook rice according to package instructions",
          "Heat oil in a large pan or wok",
          "Stir-fry mixed vegetables until tender-crisp",
          "Season with soy sauce and serve over rice"
        ],
        tags: ["vegetarian", "vegan", "healthy"],
        nutrition: {
          calories: 300,
          protein: 6,
          carbs: 45,
          fat: 12
        },
        prepTime: 10,
        cookTime: 15,
        servings: 2
      };
      fallbackRecipe = simpleFallback;
    }
    
    if (fallbackRecipe.name) {
      fallbackRecipe.imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(fallbackRecipe.name.split(" ").join(","))}`;
    } else {
      fallbackRecipe.imageUrl = `https://source.unsplash.com/featured/?healthy,food`;
    }
    
    const customError = new Error("API_FALLBACK");
    (customError as any).fallbackRecipe = fallbackRecipe;
    (customError as any).originalError = error;
    throw customError;
  }
}
