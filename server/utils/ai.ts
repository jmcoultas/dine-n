import OpenAI from "openai";
import type { Recipe, TemporaryRecipe } from "@db/schema";

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

export async function generateRecipeRecommendation(params: RecipeGenerationParams): Promise<Partial<Recipe>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const cleanParams = {
      dietary: Array.isArray(params.dietary) ? params.dietary.filter(Boolean) : [],
      allergies: Array.isArray(params.allergies) ? params.allergies.filter(Boolean) : [],
      cuisine: Array.isArray(params.cuisine) ? params.cuisine.filter(Boolean) : [],
      meatTypes: Array.isArray(params.meatTypes) ? params.meatTypes.filter(Boolean) : [],
      mealType: params.mealType,
      excludeNames: Array.isArray(params.excludeNames) ? params.excludeNames.filter(Boolean) : []
    };

    console.log('AI Service: Generating recipe with cleaned params:', JSON.stringify(cleanParams, null, 2));

    const excludeNamesStr = params.excludeNames && params.excludeNames.length > 0 
      ? `\nMust NOT generate any of these recipes: ${params.excludeNames.join(", ")}`
      : "";

    // Log the actual parameters being used to generate the prompt
    console.log('AI Service: Using dietary restrictions:', cleanParams.dietary);
    console.log('AI Service: Using allergies:', cleanParams.allergies);
    console.log('AI Service: Using cuisine preferences:', cleanParams.cuisine);
    console.log('AI Service: Using meat preferences:', cleanParams.meatTypes);
    console.log('AI Service: Meal type:', cleanParams.mealType);

    const prompt = `Generate a unique and detailed recipe that is suitable for ${params.mealType}. Do not include recipes with Tofu unless the user chose Vegetarian or Vegan.
${cleanParams.dietary.length > 0 ? `Must follow dietary restrictions: ${cleanParams.dietary.join(", ")}` : "No specific dietary restrictions"}
${cleanParams.allergies.length > 0 ? `STRICT REQUIREMENT - Must completely avoid these allergens and any ingredients that contain them: ${cleanParams.allergies.join(", ")}` : "No allergies to consider"}
${cleanParams.cuisine.length > 0 ? `Preferred cuisines: ${cleanParams.cuisine.join(", ")}` : "No specific cuisine preference"}
${cleanParams.meatTypes.length > 0 ? `Preferred meat types: ${cleanParams.meatTypes.join(", ")}` : "No specific meat preference"}
${excludeNamesStr}

You must respond with a valid recipe in this exact JSON format:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prep_time": minutes (number),
  "cook_time": minutes (number),
  "servings": number,
  "ingredients": [{ "name": "ingredient", "amount": number, "unit": "unit" }],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "complexity": number (1 for easy, 2 for medium, 3 for hard)
}`;

    console.log('AI Service: Generated prompt:', prompt);

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional chef and nutritionist. Create detailed, healthy recipes following the dietary restrictions and allergies exactly. Always respond with complete, valid JSON containing all required fields.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-3.5-turbo-1106",
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
      const recipeData = JSON.parse(content) as Partial<Recipe>;
      let imageUrl: string | null = null;

      if (recipeData.name) {
        try {
          console.log('AI Service: Generating image for recipe:', recipeData.name);
          const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A professional, appetizing photo of ${recipeData.name}. The image should be well-lit, showing the complete dish from a top-down or 45-degree angle.`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            style: "natural"
          });

          if (imageResponse.data[0]?.url) {
            console.log('AI Service: Successfully generated image URL:', imageResponse.data[0].url);
            imageUrl = imageResponse.data[0].url;
          }
        } catch (imageError) {
          console.error('AI Service: Error generating image:', imageError);
          imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(String(recipeData.name).split(" ").join(","))}`;
          console.log('AI Service: Using fallback image URL:', imageUrl);
        }
      }

      const validatedRecipe: Partial<Recipe> = {
        name: String(recipeData.name || '').trim(),
        description: String(recipeData.description || 'No description available').trim(),
        image_url: imageUrl,
        prep_time: Math.max(0, Number(recipeData.prep_time) || 0),
        cook_time: Math.max(0, Number(recipeData.cook_time) || 0),
        servings: Math.max(1, Number(recipeData.servings) || 2),
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        tags: recipeData.tags,
        nutrition: recipeData.nutrition,
        complexity: Math.max(1, Math.min(3, Number(recipeData.complexity) || 1)),
      };

      console.log('AI Service: Generated recipe:', JSON.stringify(validatedRecipe, null, 2));
      return validatedRecipe;
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

    throw new Error("Failed to generate recipe recommendation");
  }
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
      model: "gpt-3.5-turbo-1106",
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
${params.dietary?.length ? `Must follow dietary restrictions: ${params.dietary.join(", ")}` : ""}
${params.allergies?.length ? `Must avoid these allergens: ${params.allergies.join(", ")}` : ""}

The recipes should be practical and make sense with the given ingredients. You may suggest a few additional common ingredients that would complement the provided ones.
Respond with exactly 3 recipe titles in this JSON format:
{
  "recipes": ["Recipe 1", "Recipe 2", "Recipe 3"]
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a creative chef who can suggest practical recipes based on available ingredients. Focus on recipes that primarily use the given ingredients, with minimal additional ingredients needed.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-3.5-turbo-1106",
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

export async function generateRecipeFromTitleAI(title: string): Promise<Partial<TemporaryRecipe>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const prompt = `Generate a detailed recipe for "${title}".

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

The recipe should be practical and detailed. Include all necessary ingredients and clear step-by-step instructions.`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional chef and nutritionist. Create detailed, practical recipes with accurate measurements and clear instructions. Always respond with complete, valid JSON containing all required fields.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-3.5-turbo-1106",
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
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: `A professional, appetizing photo of ${title}. The image should be well-lit, showing the complete dish from a top-down or 45-degree angle.`,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "natural"
        });

        if (imageResponse.data[0]?.url) {
          console.log('AI Service: Successfully generated image URL:', imageResponse.data[0].url);
          imageUrl = imageResponse.data[0].url;
        }
      } catch (imageError) {
        console.error('AI Service: Error generating image:', imageError);
        imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(title.split(" ").join(","))}`;
        console.log('AI Service: Using fallback image URL:', imageUrl);
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