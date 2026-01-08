import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Recipe, TemporaryRecipe } from "@db/schema";
import { MealTypeEnum } from "@db/schema";
import { z } from "zod";
import { config } from "../config/environment";

type MealType = z.infer<typeof MealTypeEnum>;

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

const genAI = new GoogleGenerativeAI(config.googleAiApiKey);

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

export async function generateRecipeRecommendation(
  params: RecipeGenerationParams,
): Promise<RecipeGenerationResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const maxRetries = params.maxRetries || 3; // Default to 3 retries
  let lastError: Error | null = null;
  let relaxationLevel = 1;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const cleanParams = {
        dietary: Array.isArray(params.dietary)
          ? params.dietary.filter(Boolean)
          : [],
        allergies: Array.isArray(params.allergies)
          ? params.allergies.filter(Boolean)
          : [],
        cuisine: Array.isArray(params.cuisine)
          ? params.cuisine.filter(Boolean)
          : [],
        meatTypes: Array.isArray(params.meatTypes)
          ? params.meatTypes.filter(Boolean)
          : [],
        mealType: params.mealType,
        excludeNames: Array.isArray(params.excludeNames)
          ? params.excludeNames.filter(Boolean)
          : [],
      };

      console.log(
        `AI Service: Generating recipe with cleaned params (attempt ${attempt}/${maxRetries}, relaxation level ${relaxationLevel}):`,
        JSON.stringify(cleanParams, null, 2),
      );

      const excludeNamesStr =
        params.excludeNames && params.excludeNames.length > 0
          ? `\nMust NOT generate any of these exact recipes: ${params.excludeNames.join(", ")}`
          : "";

      // Build the prompt based on relaxation level - OPTIMIZED FOR SPEED
      let uniquenessConstraint = "";
      if (relaxationLevel === 1) {
        uniquenessConstraint =
          "Create a completely unique recipe name that hasn't been used before.";
      } else if (relaxationLevel === 2) {
        uniquenessConstraint =
          "Create a recipe with a creative variation on common dishes.";
      } else if (relaxationLevel === 3) {
        uniquenessConstraint =
          "Create any suitable recipe, variations of existing dishes are acceptable.";
      } else {
        uniquenessConstraint =
          "Create any recipe that meets the basic requirements.";
      }

      // OPTIMIZED PROMPT - Reduced token count while maintaining quality
      const prompt = `Generate a ${params.mealType} recipe. ${uniquenessConstraint}${excludeNamesStr}

Requirements:
${cleanParams.dietary.length > 0 ? `- Diet: ${cleanParams.dietary.join(", ")}` : ""}
${cleanParams.allergies.length > 0 ? `- Avoid: ${cleanParams.allergies.join(", ")}` : ""}
${cleanParams.cuisine.length > 0 ? `- Cuisine: ${cleanParams.cuisine.join(", ")}` : ""}
${cleanParams.meatTypes.length > 0 ? `- Proteins: ${cleanParams.meatTypes.join(", ")}` : ""}

Use US units only (cups, tbsp, tsp, oz, lbs). Respond with valid JSON:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prep_time": minutes,
  "cook_time": minutes,
  "servings": number,
  "ingredients": [{"name": "ingredient", "amount": number, "unit": "unit"}],
  "instructions": ["step 1", "step 2"],
  "meal_type": "${params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1)}",
  "tags": ["tag1", "tag2"],
  "nutrition": {"calories": number, "protein": number, "carbs": number, "fat": number},
  "complexity": number
}`;

      console.log("AI Service: Generated optimized prompt");

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional chef. Create detailed, healthy recipes following dietary restrictions exactly. Use US customary units only. Always respond with complete, valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "gpt-4o-2024-08-06",
        response_format: { type: "json_object" },
        temperature: 0.7 + attempt * 0.1 + relaxationLevel * 0.1, // Increase temperature with each retry and relaxation level
        max_tokens: 800, // Reduced from 1000 for faster generation
      });

      if (!completion.choices?.[0]?.message?.content) {
        throw new Error("Invalid response from OpenAI API");
      }

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI API");
      }

      console.log("AI Service: Received response from OpenAI");

      try {
        const parsedRecipe = JSON.parse(content);

        // Validate the parsed recipe structure
        const validatedRecipe = {
          name: parsedRecipe.name || "Untitled Recipe",
          description: parsedRecipe.description || "",
          prep_time: Number(parsedRecipe.prep_time) || 15,
          cook_time: Number(parsedRecipe.cook_time) || 30,
          servings: Number(parsedRecipe.servings) || 4,
          ingredients: Array.isArray(parsedRecipe.ingredients)
            ? parsedRecipe.ingredients
            : [],
          instructions: Array.isArray(parsedRecipe.instructions)
            ? parsedRecipe.instructions
            : [],
          meal_type:
            parsedRecipe.meal_type ||
            params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1),
          tags: Array.isArray(parsedRecipe.tags) ? parsedRecipe.tags : [],
          nutrition: parsedRecipe.nutrition || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
          complexity: Number(parsedRecipe.complexity) || 2,
          image_url: parsedRecipe.image_url || null,
        };

        // Validate ingredients structure
        if (
          !Array.isArray(validatedRecipe.ingredients) ||
          validatedRecipe.ingredients.length === 0
        ) {
          console.error("AI Service: Invalid ingredients array");
          lastError = new Error("Generated recipe has invalid ingredients");
          continue;
        }

        // Validate instructions
        if (
          !Array.isArray(validatedRecipe.instructions) ||
          validatedRecipe.instructions.length === 0
        ) {
          console.error("AI Service: Invalid instructions array");
          lastError = new Error("Generated recipe has invalid instructions");
          continue;
        }

        // Add validation check for meal type
        if (
          validatedRecipe.meal_type !==
          params.mealType.charAt(0).toUpperCase() + params.mealType.slice(1)
        ) {
          console.error(
            "AI Service: Generated recipe has incorrect meal type:",
            {
              expected:
                params.mealType.charAt(0).toUpperCase() +
                params.mealType.slice(1),
              received: validatedRecipe.meal_type,
            },
          );
          lastError = new Error("Generated recipe has incorrect meal type");
          continue;
        }

        console.log(
          "AI Service: Successfully generated and validated recipe:",
          validatedRecipe.name,
        );

        // Generate image for the recipe using Gemini
        console.log('AI Service: Generating image for recipe:', validatedRecipe.name);
        try {
          const imageUrl = await generateRecipeImage(
            validatedRecipe.name,
            cleanParams.allergies
          );
          validatedRecipe.image_url = imageUrl;
          console.log('AI Service: Image generated successfully with Gemini');
        } catch (imageError) {
          console.error('AI Service: Failed to generate image, using fallback:', imageError);
          validatedRecipe.image_url = 'https://res.cloudinary.com/dxv6zb1od/image/upload/v1732391429/samples/food/spices.jpg';
        }

        return validatedRecipe;
      } catch (parseError) {
        console.error("AI Service: Error parsing OpenAI response:", parseError);
        lastError = new Error(
          "Failed to parse recipe data from OpenAI response",
        );
        if (attempt < maxRetries) {
          continue;
        }
        throw lastError;
      }
    } catch (error: any) {
      console.error(
        `AI Service: Error in attempt ${attempt}/${maxRetries}:`,
        error,
      );
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
  throw (
    lastError ||
    new Error(
      "Failed to generate recipe after all retries and relaxation levels",
    )
  );
}

interface SubstitutionRequest {
  ingredient: string;
  dietary?: string[];
  allergies?: string[];
}

export async function generateIngredientSubstitution({
  ingredient,
  dietary = [],
  allergies = [],
}: SubstitutionRequest): Promise<{
  substitutions: string[];
  reasoning: string;
}> {
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
          content:
            "You are a professional chef specializing in ingredient substitutions and dietary accommodations. Provide accurate, practical substitutions that maintain the culinary function of ingredients while respecting dietary restrictions.",
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

    if (
      !Array.isArray(response.substitutions) ||
      typeof response.reasoning !== "string"
    ) {
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
  pantryOnlyMode?: boolean;
}

export async function generateRecipeSuggestionsFromIngredients(
  params: IngredientBasedRecipeParams,
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const ingredientContext = params.pantryOnlyMode
      ? `ONLY using these pantry ingredients: ${params.ingredients.join(", ")}`
      : `primarily using these ingredients: ${params.ingredients.join(", ")}`;

    const additionalIngredientRule = params.pantryOnlyMode
      ? "STRICT REQUIREMENT: You may ONLY use the ingredients listed above. Do not suggest any additional ingredients or seasonings beyond what is provided."
      : "You may suggest a few additional common ingredients that would complement the provided ones, but keep additional ingredients minimal and common.";

    const prompt = `Generate 3 unique recipe titles that can be made ${ingredientContext}.
${params.dietary?.length ? `REQUIREMENT: Must strictly follow these dietary restrictions: ${params.dietary.join(", ")}` : ""}
${params.allergies?.length ? `STRICT REQUIREMENT: Must completely avoid these allergens and any ingredients that might contain them. The recipes MUST NOT contain or use ${params.allergies.join(", ")} in any form, even as minor ingredients: ${params.allergies.join(", ")}` : ""}

${additionalIngredientRule}

The recipes should be practical and make sense with the given ingredients. Ensure they don't violate any dietary restrictions or allergen requirements.

IMPORTANT: Double check that none of the suggested recipes contain any of the specified allergens or violate dietary restrictions.

Respond with exactly 3 recipe titles in this JSON format:
{
  "recipes": ["Recipe 1", "Recipe 2", "Recipe 3"]
}`;

    const systemPrompt = params.pantryOnlyMode
      ? "You are a professional chef specializing in allergen-free and dietary-restricted cooking using only available pantry ingredients. You are extremely careful about allergen avoidance, dietary requirements, and ingredient limitations. You excel at creating recipes using only the ingredients provided, without any additional ingredients."
      : "You are a professional chef specializing in allergen-free and dietary-restricted cooking. You are extremely careful about allergen avoidance and dietary requirements. Never suggest recipes that could contain allergens or violate dietary restrictions.";

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
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
function transformRecipeToSnakeCase(
  recipe: RecipeAPIResponse,
): Partial<TemporaryRecipe> {
  return {
    name: recipe.name,
    description: recipe.description,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    meal_type: Array.isArray(recipe.tags)
      ? recipe.tags.find((tag) =>
          ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"].includes(tag),
        ) || "Dinner"
      : "Dinner",
    cuisine_type: Array.isArray(recipe.tags)
      ? recipe.tags.find((tag) =>
          [
            "Italian",
            "Mexican",
            "Chinese",
            "Japanese",
            "Indian",
            "Thai",
            "Mediterranean",
            "American",
            "French",
          ].includes(tag),
        ) || "Other"
      : "Other",
    dietary_restrictions: Array.isArray(recipe.tags)
      ? recipe.tags.filter((tag) =>
          [
            "Vegetarian",
            "Vegan",
            "Gluten-Free",
            "Dairy-Free",
            "Keto",
            "Paleo",
            "Low-Carb",
          ].includes(tag),
        )
      : [],
    difficulty: (() => {
      switch (recipe.complexity) {
        case 1:
          return "Easy" as const;
        case 2:
          return "Moderate" as const;
        case 3:
          return "Advanced" as const;
        default:
          return "Moderate" as const;
      }
    })(),
    tags: Array.isArray(recipe.tags)
      ? recipe.tags.filter(
          (tag) =>
            ![
              "Breakfast",
              "Lunch",
              "Dinner",
              "Snack",
              "Dessert",
              "Italian",
              "Mexican",
              "Chinese",
              "Japanese",
              "Indian",
              "Thai",
              "Mediterranean",
              "American",
              "French",
              "Vegetarian",
              "Vegan",
              "Gluten-Free",
              "Dairy-Free",
              "Keto",
              "Paleo",
              "Low-Carb",
            ].includes(tag),
        )
      : [],
    nutrition: recipe.nutrition,
    complexity: Math.min(3, Math.max(1, recipe.complexity)),
    image_url: null,
    permanent_url: null,
    favorites_count: 0,
    favorited: false,
  };
}

export async function generateRecipeImage(
  recipeName: string,
  allergies: string[] = [],
  retries = 3,
): Promise<string | null> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(
        `AI Service: Generating image with Gemini Nano Banana for recipe: ${recipeName} (attempt ${attempt}/${retries})`,
      );

      const prompt = `Professional food photography of ${recipeName}. High quality, appetizing, well-lit, natural style. Shot from a flattering angle on a clean background.`;

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-image",
      });

      const result = await model.generateContent(prompt);

      if (result?.response) {
        const response = result.response;

        if (response.candidates && response.candidates.length > 0) {
          const candidate = response.candidates[0];

          if (candidate.content?.parts && candidate.content.parts.length > 0) {
            for (const part of candidate.content.parts) {
              if (part.inlineData?.data) {
                const base64Data = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || "image/png";
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                console.log(
                  `AI Service: Successfully generated image with Gemini (${mimeType} format, ${base64Data.length} bytes)`,
                );
                return dataUrl;
              }
            }
          }
        }
      }

      throw new Error("No image data found in response");
    } catch (error: any) {
      lastError = error;
      console.error(
        `AI Service: Error generating image with Gemini (attempt ${attempt}/${retries}):`,
        error,
      );

      if (
        error.message?.includes("API key") ||
        error.status === 401 ||
        error.status === 403
      ) {
        console.error("AI Service: Authentication error, will not retry");
        break;
      }

      if (attempt < retries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`AI Service: Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error("AI Service: All image generation attempts failed:", lastError);
  return "https://res.cloudinary.com/dxv6zb1od/image/upload/v1732391429/samples/food/spices.jpg";
}

// MARK: - Receipt Scanning with Gemini Vision

interface ScannedPantryItem {
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  estimatedShelfLifeDays: number | null;
}

export async function parseReceiptWithVision(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<ScannedPantryItem[]> {
  if (!config.googleAiApiKey) {
    throw new Error("Google AI API key is not configured");
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `AI Service: Parsing receipt with Gemini Vision (attempt ${attempt}/${maxRetries})`
      );

      const prompt = `Analyze this grocery receipt image and extract all food/grocery items.

For each item found, return:
1. name: Simplified product name (e.g., "Organic Milk" not "KIRKLAND ORG MILK 2% 1GL")
2. category: One of: produce, dairy, meat, pantry, frozen, condiments, spices, beverages, other
3. quantity: Number of items purchased (if visible, otherwise null)
4. unit: Unit of measurement if applicable (e.g., "lb", "oz", "gallon", null if just count)
5. estimatedShelfLifeDays: Estimated days the item typically stays fresh (null if unknown)

RULES:
- Only extract FOOD items (ignore household goods, cleaning supplies, bags, etc.)
- Normalize product names to simple, recognizable names
- If quantity is not clear, default to 1
- Use standard US units
- If the image is not a receipt or no food items are found, return an empty items array

Respond with valid JSON only in this exact format:
{
  "items": [
    {
      "name": "Product Name",
      "category": "category",
      "quantity": 1,
      "unit": "unit or null",
      "estimatedShelfLifeDays": 7
    }
  ]
}`;

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        { text: prompt },
      ]);

      if (!result?.response) {
        throw new Error("Empty response from Gemini Vision");
      }

      const content = result.response.text();
      if (!content) {
        throw new Error("No text content in Gemini response");
      }

      console.log("AI Service: Received response from Gemini Vision");

      const parsed = JSON.parse(content);

      if (!Array.isArray(parsed.items)) {
        throw new Error("Invalid response format - items must be an array");
      }

      // Validate and normalize each item
      const validatedItems: ScannedPantryItem[] = parsed.items
        .filter((item: any) => item.name && typeof item.name === "string")
        .map((item: any) => ({
          name: item.name.trim().substring(0, 100), // Limit name length
          category: normalizeReceiptCategory(item.category),
          quantity: typeof item.quantity === "number" ? item.quantity : null,
          unit: item.unit ? String(item.unit).trim() : null,
          estimatedShelfLifeDays:
            typeof item.estimatedShelfLifeDays === "number"
              ? item.estimatedShelfLifeDays
              : null,
        }));

      console.log(
        `AI Service: Successfully parsed ${validatedItems.length} items from receipt`
      );
      return validatedItems;
    } catch (error: any) {
      console.error(
        `AI Service: Receipt parsing error (attempt ${attempt}):`,
        error
      );
      lastError = error;

      // Don't retry on auth errors
      if (
        error.message?.includes("API key") ||
        error.status === 401 ||
        error.status === 403
      ) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        console.log(`AI Service: Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to parse receipt after all retries");
}

// Helper function to normalize category strings from receipt scanning
function normalizeReceiptCategory(category: string | undefined): string {
  if (!category) return "other";

  const normalized = category.toLowerCase().trim();
  const validCategories = [
    "produce",
    "dairy",
    "meat",
    "pantry",
    "frozen",
    "condiments",
    "spices",
    "beverages",
    "other",
  ];

  if (validCategories.includes(normalized)) {
    return normalized;
  }

  // Map common variations
  const categoryMap: Record<string, string> = {
    fruit: "produce",
    fruits: "produce",
    vegetable: "produce",
    vegetables: "produce",
    veggies: "produce",
    milk: "dairy",
    cheese: "dairy",
    eggs: "dairy",
    beef: "meat",
    chicken: "meat",
    pork: "meat",
    seafood: "meat",
    fish: "meat",
    protein: "meat",
    proteins: "meat",
    drinks: "beverages",
    drink: "beverages",
    sauce: "condiments",
    sauces: "condiments",
    seasoning: "spices",
    seasonings: "spices",
    herb: "spices",
    herbs: "spices",
    grain: "pantry",
    grains: "pantry",
    canned: "pantry",
    "dry goods": "pantry",
  };

  return categoryMap[normalized] || "other";
}

export async function generateRecipeFromTitleAI(
  title: string,
  allergies: string[] = [],
  options?: {
    ingredients?: string[];
    pantryOnlyMode?: boolean;
  },
): Promise<Partial<TemporaryRecipe>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const pantryConstraint =
      options?.pantryOnlyMode && options?.ingredients
        ? `PANTRY CONSTRAINT - You may ONLY use these available ingredients: ${options.ingredients.join(", ")}. Do not use any ingredients not listed here.`
        : "";

    const prompt = `USER REQUEST: "${title}"

Based on the user's request above, create an appropriate recipe that fulfills their requirements.

RECIPE TITLE REQUIREMENTS:
- Create a concise, professional recipe title (2-5 words)
- The title should describe the dish, not the user's request
- Examples:
  * User: "Pizza, three meats, three cheeses, and 6 vegetables" → Title: "Supreme Pizza"
  * User: "Quick Italian dinner under 30 minutes" → Title: "Chicken Carbonara"
  * User: "Healthy breakfast with eggs" → Title: "Veggie Omelet"
  * User: "comfort food for a rainy day" → Title: "Creamy Mac and Cheese"

${allergies.length > 0 ? `STRICT REQUIREMENT - Must completely avoid these allergens and any ingredients that contain them: ${allergies.join(", ")}` : ""}
${pantryConstraint}

MEASUREMENT REQUIREMENTS:
- Use ONLY US customary units (cups, tablespoons, teaspoons, ounces, pounds, fluid ounces)
- DO NOT use metric units (grams, kilograms, milliliters, liters)
- Examples: "1 cup flour", "2 tablespoons olive oil", "8 ounces chicken breast", "1 pound ground beef"
- For small amounts use teaspoons/tablespoons, for larger amounts use cups/ounces/pounds

You must respond with a valid recipe in this exact JSON format:
{
  "name": "Professional Recipe Title Here",
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

IMPORTANT: The "name" field should be a concise, professional recipe title (2-5 words), NOT the user's original request.
The recipe should be practical and detailed. Include all necessary ingredients and clear step-by-step instructions.
ALL ingredient measurements MUST use US customary units only (no grams, kilograms, milliliters, etc.).`;

    const systemPrompt = options?.pantryOnlyMode
      ? "You are a professional chef and nutritionist who specializes in creating recipes using only available pantry ingredients. Create detailed, practical recipes with accurate measurements and clear instructions using ONLY the ingredients provided. Always respond with complete, valid JSON containing all required fields. IMPORTANT: Always use US customary units (cups, tablespoons, teaspoons, ounces, pounds) for all ingredient measurements - never use metric units. Never suggest ingredients not in the provided pantry list."
      : "You are a professional chef and nutritionist. Create detailed, practical recipes with accurate measurements and clear instructions. Always respond with complete, valid JSON containing all required fields. IMPORTANT: Always use US customary units (cups, tablespoons, teaspoons, ounces, pounds) for all ingredient measurements - never use metric units.";

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
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

      // Use the AI-generated recipe name for image generation (not user's input)
      const recipeName = recipeData.name || title;

      try {
        console.log("AI Service: Generating image for recipe:", recipeName);
        console.log("AI Service: Original user request was:", title);
        imageUrl = await generateRecipeImage(recipeName, allergies);
      } catch (error) {
        console.error("AI Service: Error in image generation flow:", error);
        imageUrl =
          "https://res.cloudinary.com/dxv6zb1od/image/upload/v1732391429/samples/food/spices.jpg";
      }

      // Transform the recipe data to snake_case
      const transformedRecipe = transformRecipeToSnakeCase(recipeData);
      transformedRecipe.image_url = imageUrl;

      console.log(
        "AI Service: Generated recipe:",
        JSON.stringify(transformedRecipe, null, 2),
      );
      return transformedRecipe;
    } catch (parseError) {
      console.error("AI Service: Error parsing OpenAI response:", parseError);
      throw new Error("Failed to parse recipe data from OpenAI response");
    }
  } catch (error: any) {
    console.error("AI Service: OpenAI API Error:", error);

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
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

// MARK: - Meal Prep Mode AI Functions

export interface MealPrepComponentParams {
  componentType: "protein" | "carb" | "vegetable";
  goal: string;
  servings: number;
  selectedIngredients: string[]; // e.g., ["Chicken Breast", "Chicken Thighs"] or ["Brown Rice", "White Rice"]
  dietaryRestrictions?: string[];
  allergies?: string[];
}

export interface MealPrepComponentResult {
  recipe: Partial<TemporaryRecipe>;
  prepTimeMinutes: number;
  storageInstructions: string;
  reheatInstructions: string;
}

export async function generateMealPrepComponent(
  params: MealPrepComponentParams & { skipImage?: boolean }
): Promise<MealPrepComponentResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const goalContext = {
      high_protein: "Focus on maximizing protein content. Choose lean preparations with minimal added fats.",
      budget_friendly: "Use cost-effective cooking methods. Stretch ingredients efficiently.",
      time_saving: "Simple preparation, minimal active cooking time. Easy batch cooking.",
      kid_friendly: "Mild flavors, familiar textures. Easy to reheat and eat.",
      low_carb: "Minimize carbohydrates. Use keto-friendly seasonings."
    }[params.goal] || "";

    const componentContext = {
      protein: "This is a protein component for meal prep. It should be versatile enough to pair with various carbs and vegetables.",
      carb: "This is a carb/starch component for meal prep. It should be a neutral base that pairs well with proteins and vegetables.",
      vegetable: "This is a vegetable component for meal prep. It should reheat well and maintain texture."
    }[params.componentType];

    const ingredientsList = params.selectedIngredients.length > 0
      ? `Use one of these ingredients: ${params.selectedIngredients.join(", ")}`
      : `Choose an appropriate ${params.componentType} ingredient`;

    const prompt = `Create a meal prep ${params.componentType} recipe optimized for batch cooking.

${componentContext}

Goal: ${params.goal.replace(/_/g, " ")}
${goalContext}

${ingredientsList}
Total servings needed: ${params.servings}
${params.dietaryRestrictions?.length ? `Dietary restrictions: ${params.dietaryRestrictions.join(", ")}` : ""}
${params.allergies?.length ? `STRICT - Avoid allergens: ${params.allergies.join(", ")}` : ""}

Requirements:
- Optimized for batch cooking and storing for up to 5 days
- Should reheat well in microwave or stovetop
- Simple seasoning that pairs with various dishes
- Use US customary units only

Respond with valid JSON:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "prep_time": minutes,
  "cook_time": minutes,
  "servings": ${params.servings},
  "ingredients": [{"name": "ingredient", "amount": number, "unit": "unit"}],
  "instructions": ["step 1", "step 2"],
  "tags": ["Meal Prep", "${params.componentType}"],
  "nutrition": {"calories": number, "protein": number, "carbs": number, "fat": number},
  "complexity": 1,
  "storage_instructions": "How to store (container type, fridge duration)",
  "reheat_instructions": "How to reheat (method, time)"
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional meal prep chef. Create simple, batch-friendly recipes optimized for storage and reheating. Always use US customary units. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4o-2024-08-06",
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    const parsed = JSON.parse(completion.choices[0].message.content);

    // Only generate image if not skipped (for parallel processing)
    let imageUrl: string | null = null;
    if (!params.skipImage) {
      try {
        imageUrl = await generateRecipeImage(parsed.name, params.allergies || []);
      } catch (error) {
        console.error("Error generating meal prep component image:", error);
        imageUrl = "https://res.cloudinary.com/dxv6zb1od/image/upload/v1732391429/samples/food/spices.jpg";
      }
    }

    // Transform to snake_case
    const recipe: Partial<TemporaryRecipe> = {
      name: parsed.name,
      description: parsed.description,
      prep_time: parsed.prep_time,
      cook_time: parsed.cook_time,
      servings: parsed.servings,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
      meal_type: "Dinner", // Components are general
      tags: parsed.tags,
      nutrition: parsed.nutrition,
      complexity: parsed.complexity || 1,
      image_url: imageUrl
    };

    return {
      recipe,
      prepTimeMinutes: (parsed.prep_time || 10) + (parsed.cook_time || 20),
      storageInstructions: parsed.storage_instructions || "Store in airtight container, refrigerate up to 5 days",
      reheatInstructions: parsed.reheat_instructions || "Microwave 2-3 minutes or pan-heat until warm"
    };

  } catch (error: any) {
    console.error("Error generating meal prep component:", error);
    throw new Error(`Failed to generate ${params.componentType} component`);
  }
}

export interface MealPrepAssemblyParams {
  components: Array<{
    id: number;
    name: string;
    type: "protein" | "carb" | "vegetable";
  }>;
  goal: string;
  servings: number;
  numberOfAssemblies: number;
}

export interface MealPrepAssemblyResult {
  name: string;
  description: string;
  recipe: Partial<TemporaryRecipe>;
  componentIds: number[];
  sauceSuggestion: string;
}

export async function generateMealPrepAssemblies(
  params: MealPrepAssemblyParams & { skipImages?: boolean }
): Promise<MealPrepAssemblyResult[]> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  try {
    const componentsList = params.components.map(c =>
      `ID:${c.id} - ${c.name} (${c.type})`
    ).join("\n");

    const prompt = `Create ${params.numberOfAssemblies} meal assembly recipes using these pre-cooked meal prep components:

AVAILABLE COMPONENTS:
${componentsList}

Goal: ${params.goal.replace(/_/g, " ")}

Requirements:
- Each assembly uses 1 protein + 1 carb + 1-2 vegetables from the available components
- Suggest a sauce/seasoning for each that elevates the combination
- Vary flavor profiles (e.g., Asian, Mediterranean, Mexican, American)
- These are "assembly" meals - minimal cooking, just combining prepped components
- Assembly time should be 5-10 minutes max

For each assembly, provide a FULL recipe that includes:
- All ingredients from the components used
- A simple sauce/seasoning recipe
- Brief assembly instructions

Respond with valid JSON:
{
  "assemblies": [
    {
      "name": "Assembly Name",
      "description": "Brief appetizing description",
      "component_ids": [1, 2, 3],
      "sauce_suggestion": "Name of sauce/seasoning to add",
      "flavor_profile": "Asian/Mediterranean/Mexican/American/etc",
      "prep_time": 5,
      "ingredients": [{"name": "ingredient", "amount": number, "unit": "unit"}],
      "instructions": ["Combine protein with carb", "Add vegetables", "Drizzle with sauce"],
      "nutrition": {"calories": number, "protein": number, "carbs": number, "fat": number}
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a meal prep expert who creates delicious meal combinations from pre-cooked components. Create varied, appetizing assemblies with complementary flavors. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4o-2024-08-06",
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 1500
    });

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error("Invalid response from OpenAI API");
    }

    const parsed = JSON.parse(completion.choices[0].message.content);

    if (!Array.isArray(parsed.assemblies)) {
      throw new Error("Invalid assemblies format");
    }

    // Transform results (skip images if requested for parallel processing)
    const results: MealPrepAssemblyResult[] = [];

    for (const assembly of parsed.assemblies) {
      let imageUrl: string | null = null;

      // Only generate images inline if not skipping (for backward compatibility)
      if (!params.skipImages) {
        try {
          imageUrl = await generateRecipeImage(assembly.name, []);
        } catch (error) {
          console.error("Error generating assembly image:", error);
          imageUrl = "https://res.cloudinary.com/dxv6zb1od/image/upload/v1732391429/samples/food/spices.jpg";
        }
      }

      const recipe: Partial<TemporaryRecipe> = {
        name: assembly.name,
        description: assembly.description,
        prep_time: assembly.prep_time || 5,
        cook_time: 0, // Assembly meals have no cook time
        servings: Math.ceil(params.servings / params.numberOfAssemblies),
        ingredients: assembly.ingredients || [],
        instructions: assembly.instructions || [],
        meal_type: "Dinner",
        tags: ["Meal Prep", "Quick Assembly", assembly.flavor_profile].filter(Boolean),
        nutrition: assembly.nutrition,
        complexity: 1,
        image_url: imageUrl
      };

      results.push({
        name: assembly.name,
        description: assembly.description,
        recipe,
        componentIds: assembly.component_ids || [],
        sauceSuggestion: assembly.sauce_suggestion || ""
      });
    }

    return results;

  } catch (error: any) {
    console.error("Error generating meal prep assemblies:", error);
    throw new Error("Failed to generate meal assemblies");
  }
}
