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

export async function generateRecipeRecommendation(params: RecipeGenerationParams): Promise<Partial<Recipe>> {
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

  const recipeData = JSON.parse(completion.choices[0].message.content);
  
  // Add a default image URL based on the recipe name
  recipeData.imageUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(recipeData.name.split(" ").join(","))}`;
  
  return recipeData;
}
