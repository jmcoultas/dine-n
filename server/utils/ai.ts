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

export async function generateRecipeRecommendation(params: RecipeGenerationParams): Promise<Partial<Recipe>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    // Log detailed parameters at entry point
    // Ensure all arrays exist and remove any undefined/null values
    const cleanParams = {
      dietary: Array.isArray(params.dietary) ? params.dietary.filter(Boolean) : [],
      allergies: Array.isArray(params.allergies) ? params.allergies.filter(Boolean) : [],
      cuisine: Array.isArray(params.cuisine) ? params.cuisine.filter(Boolean) : [],
      meatTypes: Array.isArray(params.meatTypes) ? params.meatTypes.filter(Boolean) : [],
      mealType: params.mealType,
      excludeNames: Array.isArray(params.excludeNames) ? params.excludeNames.filter(Boolean) : []
    };

    console.log('Generating recipe with cleaned params:', JSON.stringify(cleanParams, null, 2));
    
    const excludeNamesStr = params.excludeNames && params.excludeNames.length > 0 
      ? `\nMust NOT generate any of these recipes: ${params.excludeNames.join(", ")}`
      : "";
    
    console.log('User preferences being applied:', JSON.stringify({
      dietary: params.dietary,
      allergies: params.allergies,
      cuisine: params.cuisine,
      meatTypes: params.meatTypes
    }, null, 2));
      
    const prompt = `Generate a unique and detailed recipe that is suitable for ${params.mealType}.
${params.dietary.length > 0 ? `Must follow dietary restrictions: ${params.dietary.join(", ")}` : "No specific dietary restrictions"}
${params.allergies.length > 0 ? `STRICT REQUIREMENT - Must completely avoid these allergens and any ingredients that contain them: ${params.allergies.join(", ")}. Do not include any ingredients that could contain these allergens.` : "No allergies to consider"}
${params.cuisine.length > 0 ? `Preferred cuisines: ${params.cuisine.join(", ")}` : "No specific cuisine preference"}
${params.meatTypes.length > 0 ? `Preferred meat types: ${params.meatTypes.join(", ")}` : "No specific meat preference"}
${excludeNamesStr}

You must respond with a valid recipe in this exact JSON format:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prepTime": minutes (number),
  "cookTime": minutes (number),
  "servings": number,
  "ingredients": [{ "name": "ingredient", "amount": number, "unit": "unit" }],
  "instructions": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "complexity": number (1 for easy, 2 for medium, 3 for hard)
}

The response must be valid JSON and include all fields. Generate appropriate values for each field.

Please assign complexity based on:
- Easy (1): < 5 ingredients, < 4 steps, < 30 min total time
- Medium (2): 5-8 ingredients, 4-6 steps, 30-60 min total time
- Hard (3): > 8 ingredients, > 6 steps, > 60 min total time`;

    console.log('Generated prompt:', prompt);

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
      throw new Error("Invalid response format from OpenAI API");
    }

    console.log('OpenAI API response:', completion.choices[0].message);
    
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Empty response from OpenAI API");
    }

    try {
      const recipeData = JSON.parse(content) as Partial<Recipe>;
      console.log('Parsed recipe data:', JSON.stringify(recipeData, null, 2));
      
      // Start image generation as soon as we have the name
      const imagePromise = recipeData.name ? 
        openai.images.generate({
          model: "dall-e-3",
          prompt: `A professional, appetizing photo of ${recipeData.name}. The image should be well-lit, showing the complete dish from a top-down or 45-degree angle.`,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "natural"
        }) : Promise.resolve(null);

      // Validate required fields while image generates
      if (!recipeData.name || !recipeData.description || !Array.isArray(recipeData.ingredients) || !Array.isArray(recipeData.instructions)) {
        throw new Error("Missing required fields in recipe data");
      }

      // Wait for image generation
      try {
        console.log('Generating image for recipe:', recipeData.name);
        const imageResponse = await imagePromise;

        if (imageResponse && imageResponse.data && imageResponse.data[0]?.url) {
          console.log('Successfully generated image for recipe:', recipeData.name);
          recipeData.imageUrl = imageResponse.data[0].url;
        } else {
          console.warn('No image URL in DALL-E response, falling back to placeholder');
          recipeData.imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(String(recipeData.name).split(" ").join(","))}`;
        }
      } catch (imageError) {
        console.error('Error generating image with DALL-E:', imageError);
        // Fallback to Unsplash if DALL-E fails
        recipeData.imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(String(recipeData.name).split(" ").join(","))}`;
      }
      

      const validatedRecipe = {
                name: String(recipeData.name || '').trim(),
                description: String(recipeData.description || 'No description available').trim(),
                imageUrl: String(recipeData.imageUrl || '').trim() || null,
                prep_time: Math.max(0, Number(recipeData.prepTime) || 0),
                cook_time: Math.max(0, Number(recipeData.cookTime) || 0),
                servings: Math.max(1, Number(recipeData.servings) || 2),
                ingredients: recipeData.ingredients, // Assuming ingredients are already validated
                instructions: recipeData.instructions, // Assuming instructions are already validated
                tags: recipeData.tags, // Assuming tags are already validated
                nutrition: recipeData.nutrition, // Assuming nutrition is already validated
                complexity: Math.max(1, Math.min(3, Number(recipeData.complexity) || 1)),
                created_at: new Date()
              };
      
      return validatedRecipe;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error("Failed to parse recipe data from OpenAI response");
    }
  } catch (error: any) {
    console.error("OpenAI API Error:", error);
    
    // Handle API errors with specific messages
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      throw new Error("Failed to connect to OpenAI API");
    }

    if (error.status === 401) {
      throw new Error("Invalid OpenAI API key");
    }

    if (error.status === 429) {
      throw new Error("OpenAI API rate limit exceeded");
    }

    // For any other errors, throw with a generic message
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