import OpenAI from "openai";
import type { Recipe, TemporaryRecipe } from "@db/schema";
import { MealTypeEnum } from "@db/schema";
import { z } from "zod";

type MealType = z.infer<typeof MealTypeEnum>;

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
  maxRetries?: number;
}

interface RecipeGenerationResponse extends Partial<TemporaryRecipe> {
  meal_type: MealType;
}

export async function generateRecipeRecommendation(params: RecipeGenerationParams): Promise<RecipeGenerationResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const maxRetries = params.maxRetries || 3; // Default to 3 retries
  let lastError: Error | null = null;
  let relaxationLevel = 1;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const cleanParams = {
        dietary: Array.isArray(params.dietary) ? params.dietary.filter(Boolean) : [],
        allergies: Array.isArray(params.allergies) ? params.allergies.filter(Boolean) : [],
        cuisine: Array.isArray(params.cuisine) ? params.cuisine.filter(Boolean) : [],
        meatTypes: Array.isArray(params.meatTypes) ? params.meatTypes.filter(Boolean) : [],
        mealType: params.mealType,
        excludeNames: Array.isArray(params.excludeNames) ? params.excludeNames.filter(Boolean) : []
      };

      console.log(`AI Service: Generating recipe with cleaned params (attempt ${attempt}/${maxRetries}, relaxation level ${relaxationLevel}):`, JSON.stringify(cleanParams, null, 2));

      const excludeNamesStr = params.excludeNames && params.excludeNames.length > 0 
        ? `\nMust NOT generate any of these exact recipes: ${params.excludeNames.join(", ")}`
        : "";

      // Log the actual parameters being used to generate the prompt
      console.log('AI Service: Using dietary restrictions:', cleanParams.dietary);
      console.log('AI Service: Using allergies:', cleanParams.allergies);
      console.log('AI Service: Using cuisine preferences:', cleanParams.cuisine);
      console.log('AI Service: Using meat preferences:', cleanParams.meatTypes);
      console.log('AI Service: Meal type:', cleanParams.mealType);

      // Build the prompt based on relaxation level
      let uniquenessConstraint = "";
      if (relaxationLevel === 1) {
        uniquenessConstraint = "Generate a completely unique recipe with a unique name and unique ingredients combination.";
      } else if (relaxationLevel === 2) {
        uniquenessConstraint = "You can use a similar recipe name but must use different main ingredients and cooking method.";
      } else if (relaxationLevel === 3) {
        uniquenessConstraint = "You can use a similar recipe structure but vary the main protein or primary ingredients.";
      } else {
        uniquenessConstraint = "You can use a similar recipe but must vary at least the sauce, seasoning, or preparation method.";
      }

      const prompt = `Generate a unique and detailed recipe that is suitable for ${params.mealType}. ${uniquenessConstraint}
Do not include recipes with Tofu unless the user chose Vegetarian or Vegan.
${cleanParams.dietary.length > 0 ? `Must follow dietary restrictions: ${cleanParams.dietary.join(", ")}` : "No specific dietary restrictions"}
${cleanParams.allergies.length > 0 ? `STRICT REQUIREMENT - Must completely avoid these allergens and any ingredients that contain them: ${cleanParams.allergies.join(", ")}` : "No allergies to consider"}
${cleanParams.cuisine.length > 0 ? `IMPORTANT: For this specific recipe, randomly select ONE of these cuisines and create an authentic recipe from that cuisine: ${cleanParams.cuisine.join(", ")}. Make sure to include the selected cuisine in the tags field.` : "No specific cuisine preference"}
${cleanParams.meatTypes.length > 0 ? `Preferred meat types: ${cleanParams.meatTypes.join(", ")}` : "No specific meat preference"}
${excludeNamesStr}

MEASUREMENT REQUIREMENTS:
- Use ONLY US customary units (cups, tablespoons, teaspoons, ounces, pounds, fluid ounces)
- DO NOT use metric units (grams, kilograms, milliliters, liters)
- Examples: "1 cup flour", "2 tablespoons olive oil", "8 ounces chicken breast", "1 pound ground beef"
- For small amounts use teaspoons/tablespoons, for larger amounts use cups/ounces/pounds

You must respond with a valid recipe in this exact JSON format:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prep_time": minutes (number),
  "cook_time": minutes (number),
  "servings": number,
  "ingredients": [{ "name": "ingredient", "amount": number, "unit": "unit" }],
  "instructions": ["step 1", "step 2"],
  "meal_type": "${params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1)}",
  "tags": ["tag1", "tag2"],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "complexity": number (1 for easy, 2 for medium, 3 for hard)
}

IMPORTANT REQUIREMENTS:
1. The meal_type field MUST be exactly "${params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1)}"
2. The recipe MUST be appropriate for the specified meal type
3. For breakfast: focus on breakfast-appropriate dishes (e.g., eggs, oatmeal, breakfast sandwiches)
4. For lunch: focus on midday-appropriate meals (e.g., sandwiches, salads, light proteins)
5. For dinner: focus on dinner-appropriate dishes (e.g., main courses, protein with sides)
6. The recipe name MUST be unique and NOT be one of the excluded names${excludeNamesStr ? " listed above" : ""}
7. If cuisines were provided, the selected cuisine MUST be included in the tags field
8. ALL ingredient measurements MUST use US customary units only (no grams, kilograms, milliliters, etc.)`;

      console.log('AI Service: Generated prompt:', prompt);

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a professional chef who creates awe-inspiring recipes. Create detailed, healthy recipes following the dietary restrictions and allergies exactly. When multiple cuisine types are provided, randomly select one for each recipe to ensure variety. Always respond with complete, valid JSON containing all required fields. IMPORTANT: Always use US customary units (cups, tablespoons, teaspoons, ounces, pounds) for all ingredient measurements - never use metric units.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "gpt-4o-2024-08-06",
        response_format: { type: "json_object" },
        temperature: 0.7 + (attempt * 0.1) + (relaxationLevel * 0.1), // Increase temperature with each retry and relaxation level
        max_tokens: 1000,
      });

      if (!completion.choices?.[0]?.message?.content) {
        throw new Error("Invalid response from OpenAI API");
      }

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI API");
      }

      try {
        const recipeData = JSON.parse(content) as RecipeGenerationResponse;
        
        // Check if the recipe name is in the excluded names list
        if (recipeData.name && params.excludeNames?.includes(recipeData.name)) {
          console.log(`AI Service: Generated recipe name "${recipeData.name}" is in exclude list, relaxing constraints...`);
          lastError = new Error("Generated recipe name is in exclude list");
          
          // Increase relaxation level before continuing
          if (attempt === maxRetries) {
            relaxationLevel++;
            attempt = 0; // Reset attempts for the new relaxation level
            if (relaxationLevel > 4) {
              throw new Error("Failed to generate unique recipe after all relaxation levels");
            }
          }
          continue;
        }

        let imageUrl: string | null = null;

        if (recipeData.name) {
          imageUrl = await generateRecipeImage(recipeData.name, cleanParams.allergies);
        }

        // Ensure the meal type is properly set
        const validatedRecipe: RecipeGenerationResponse = {
          ...recipeData,
          name: String(recipeData.name || '').trim(),
          description: String(recipeData.description || 'No description available').trim(),
          image_url: imageUrl,
          prep_time: Math.max(0, Number(recipeData.prep_time) || 0),
          cook_time: Math.max(0, Number(recipeData.cook_time) || 0),
          servings: Math.max(1, Number(recipeData.servings) || 2),
          ingredients: recipeData.ingredients,
          instructions: recipeData.instructions,
          meal_type: recipeData.meal_type || params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1),
          tags: Array.isArray(recipeData.tags) ? recipeData.tags : [],
          nutrition: recipeData.nutrition,
          complexity: Math.max(1, Math.min(3, Number(recipeData.complexity) || 1))
        };

        // Add validation check for meal type
        if (validatedRecipe.meal_type !== (params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1))) {
          console.error('AI Service: Generated recipe has incorrect meal type:', {
            expected: params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1),
            received: validatedRecipe.meal_type
          });
          lastError = new Error("Generated recipe has incorrect meal type");
          continue;
        }

        console.log('AI Service: Generated recipe:', JSON.stringify(validatedRecipe, null, 2));
        return validatedRecipe;
      } catch (parseError) {
        console.error('AI Service: Error parsing OpenAI response:', parseError);
        lastError = new Error("Failed to parse recipe data from OpenAI response");
        if (attempt < maxRetries) {
          continue;
        }
        throw lastError;
      }
    } catch (error: any) {
      console.error(`AI Service: Error in attempt ${attempt}/${maxRetries}:`, error);
      lastError = error;

      // Don't retry on these errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // If this is not the last attempt, continue to the next retry
      if (attempt < maxRetries) {
        continue;
      }
      
      // If we've exhausted retries at this relaxation level, try the next level
      if (relaxationLevel < 4) {
        relaxationLevel++;
        attempt = 0; // Reset attempts for the new relaxation level
        continue;
      }
    }
  }

  // If we've exhausted all retries and relaxation levels, throw the last error
  throw lastError || new Error("Failed to generate recipe after all retries and relaxation levels");
}

interface SubstitutionRequest {
  ingredient: string;
  dietary?: string[];
  allergies?: string[];
}

export async function generateIngredientSubstitution({ ingredient, dietary = [], allergies = [] }: SubstitutionRequest): Promise<{ substitutions: string[], reasoning: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const prompt = `Generate cooking ingredient substitutions for "${ingredient}".
${dietary.length > 0 ? `Must follow dietary restrictions: ${dietary.join(", ")}` : ""}
${allergies.length > 0 ? `Must avoid these allergens: ${allergies.join(", ")}` : ""}

Provide response in this exact JSON format:
{
  "substitutions": ["option1", "option2", "option3"],
  "reasoning": "Brief explanation of why these substitutions work"
}

The substitutions must be common ingredients that are easy to find in most grocery stores.
Each substitution must maintain similar culinary function (texture, flavor profile, cooking properties).
Consider dietary restrictions and allergies as absolute requirements - do not suggest any substitutes that violate them.`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional chef specializing in ingredient substitutions and dietary accommodations. Provide accurate, practical substitutions that maintain the culinary function of ingredients while respecting dietary restrictions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-2024-08-06",
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from OpenAI API");
    }

    const content = completion.choices[0].message.content;
    const response = JSON.parse(content);

    if (!Array.isArray(response.substitutions) || typeof response.reasoning !== 'string') {
      throw new Error("Invalid response format from OpenAI API");
    }

    return {
      substitutions: response.substitutions,
      reasoning: response.reasoning,
    };
  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    throw new Error("Failed to generate ingredient substitutions");
  }
}

interface IngredientBasedRecipeParams {
  ingredients: string[];
  dietary?: string[];
  allergies?: string[];
}

export async function generateRecipeSuggestionsFromIngredients(params: IngredientBasedRecipeParams): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const prompt = `Generate 3 unique recipe titles that can be made primarily using these ingredients: ${params.ingredients.join(", ")}.
${params.dietary?.length ? `REQUIREMENT: Must strictly follow these dietary restrictions: ${params.dietary.join(", ")}` : ""}
${params.allergies?.length ? `STRICT REQUIREMENT: Must completely avoid these allergens and any ingredients that might contain them. The recipes MUST NOT contain or use ${params.allergies.join(", ")} in any form, even as minor ingredients: ${params.allergies.join(", ")}` : ""}

The recipes should be practical and make sense with the given ingredients. You may suggest a few additional common ingredients that would complement the provided ones, but ensure they don't violate any dietary restrictions or allergen requirements.

IMPORTANT: Double check that none of the suggested recipes contain any of the specified allergens or violate dietary restrictions.

Respond with exactly 3 recipe titles in this JSON format:
{
  "recipes": ["Recipe 1", "Recipe 2", "Recipe 3"]
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional chef specializing in allergen-free and dietary-restricted cooking. You are extremely careful about allergen avoidance and dietary requirements. Never suggest recipes that could contain allergens or violate dietary restrictions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-2024-08-06",
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 150,
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    const content = completion.choices[0].message.content;
    const data = JSON.parse(content);
    
    if (!Array.isArray(data.recipes) || data.recipes.length !== 3) {
      throw new Error("Invalid recipe suggestions format from API");
    }

    return data.recipes;
  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    throw new Error("Failed to generate recipe suggestions");
  }
}

// Add this interface for the camelCase API response
interface RecipeAPIResponse {
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: string[];
  tags: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  complexity: number;
}

// Add transformation function
function transformRecipeToSnakeCase(recipe: RecipeAPIResponse): Partial<TemporaryRecipe> {
  return {
    name: recipe.name,
    description: recipe.description,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    meal_type: (Array.isArray(recipe.tags) 
      ? (recipe.tags.find(tag => 
          ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"].includes(tag)
        ) || "Dinner")
      : "Dinner"),
    cuisine_type: (Array.isArray(recipe.tags)
      ? (recipe.tags.find(tag => 
          ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French"].includes(tag)
        ) || "Other")
      : "Other"),
    dietary_restrictions: (Array.isArray(recipe.tags)
      ? recipe.tags.filter(tag => 
          ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag)
        )
      : []),
    difficulty: (() => {
      switch(recipe.complexity) {
        case 1: return "Easy" as const;
        case 2: return "Moderate" as const;
        case 3: return "Advanced" as const;
        default: return "Moderate" as const;
      }
    })(),
    tags: (Array.isArray(recipe.tags)
      ? recipe.tags.filter(tag => 
          !["Breakfast", "Lunch", "Dinner", "Snack", "Dessert",
            "Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Mediterranean", "American", "French",
            "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Keto", "Paleo", "Low-Carb"].includes(tag)
        )
      : []),
    nutrition: recipe.nutrition,
    complexity: Math.min(3, Math.max(1, recipe.complexity)),
    image_url: null,
    permanent_url: null,
    favorites_count: 0,
    favorited: false
  };
}

async function generateRecipeImage(recipeName: string, allergies: string[] = [], retries = 3): Promise<string | null> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`AI Service: Generating image for recipe: ${recipeName} (attempt ${attempt}/${retries})`);
      
      const allergenWarning = allergies.length > 0 
        ? ` STRICT REQUIREMENT - The photo must NOT show or include any ${allergies.join(", ")} or foods containing these allergens.`
        : '';
      
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: `Create an image of ${recipeName}. DO NOT INCLUDE any ${allergenWarning} in the photo for unlettered viewers only`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural"
      });

      if (imageResponse.data[0]?.url) {
        console.log('AI Service: Successfully generated image URL:', imageResponse.data[0].url);
        return imageResponse.data[0].url;
      }
    } catch (error: any) {
      lastError = error;
      console.error(`AI Service: Error generating image (attempt ${attempt}/${retries}):`, error);
      
      // Don't retry on these errors
      if (error.status === 401 || error.status === 403) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all attempts failed, log the final error and return fallback URL
  console.error('AI Service: All image generation attempts failed:', lastError);
  return 'https://res.cloudinary.com/dxv6zb1od/image/upload/v1732391429/samples/food/spices.jpg';
}

export async function generateRecipeFromTitleAI(title: string, allergies: string[] = []): Promise<Partial<TemporaryRecipe>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const prompt = `Generate a detailed recipe for "${title}".
${allergies.length > 0 ? `STRICT REQUIREMENT - Must completely avoid these allergens and any ingredients that contain them: ${allergies.join(", ")}` : ""}

MEASUREMENT REQUIREMENTS:
- Use ONLY US customary units (cups, tablespoons, teaspoons, ounces, pounds, fluid ounces)
- DO NOT use metric units (grams, kilograms, milliliters, liters)
- Examples: "1 cup flour", "2 tablespoons olive oil", "8 ounces chicken breast", "1 pound ground beef"
- For small amounts use teaspoons/tablespoons, for larger amounts use cups/ounces/pounds

You must respond with a valid recipe in this exact JSON format:
{
  "name": "${title}",
  "description": "Brief description",
  "prepTime": number,
  "cookTime": number,
  "servings": number,
  "ingredients": [{ "name": "ingredient", "amount": number, "unit": "unit" }],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "complexity": number (1 for easy, 2 for medium, 3 for hard)
}

The recipe should be practical and detailed. Include all necessary ingredients and clear step-by-step instructions.
ALL ingredient measurements MUST use US customary units only (no grams, kilograms, milliliters, etc.).`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional chef and nutritionist. Create detailed, practical recipes with accurate measurements and clear instructions. Always respond with complete, valid JSON containing all required fields. IMPORTANT: Always use US customary units (cups, tablespoons, teaspoons, ounces, pounds) for all ingredient measurements - never use metric units.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-2024-08-06",
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI API");
    }

    try {
      const recipeData = JSON.parse(content) as RecipeAPIResponse;
      let imageUrl: string | null = null;

      try {
        console.log('AI Service: Generating image for recipe:', title);
        imageUrl = await generateRecipeImage(title, allergies);
      } catch (error) {
        console.error('AI Service: Error in image generation flow:', error);
        imageUrl = 'https://res.cloudinary.com/dxv6zb1od/image/upload/v1732391429/samples/food/spices.jpg';
      }

      // Transform the recipe data to snake_case
      const transformedRecipe = transformRecipeToSnakeCase(recipeData);
      transformedRecipe.image_url = imageUrl;

      console.log('AI Service: Generated recipe:', JSON.stringify(transformedRecipe, null, 2));
      return transformedRecipe;
    } catch (parseError) {
      console.error('AI Service: Error parsing OpenAI response:', parseError);
      throw new Error("Failed to parse recipe data from OpenAI response");
    }
  } catch (error: any) {
    console.error("AI Service: OpenAI API Error:", error);

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error("Failed to connect to OpenAI API");
    }

    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key");
    }

    if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded");
    }

    throw new Error("Failed to generate recipe");
  }
}