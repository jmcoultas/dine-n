import { RecipeData } from "@/pages/RecipeView";
import { useEffect } from "react";

interface RecipeSchemaProps {
  recipe: RecipeData;
}

export function RecipeSchema({ recipe }: RecipeSchemaProps) {
  useEffect(() => {
    const prepTimeMinutes = recipe.prep_time || 0;
    const cookTimeMinutes = recipe.cook_time || 0;
    
    // Create the JSON-LD schema data
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: recipe.name,
      image: recipe.permanent_url || recipe.image_url,
      description: recipe.description,
      author: {
        "@type": "Person",
        name: "Recipe Author" // TODO: Add actual author data when available
      },
      datePublished: recipe.created_at,
      prepTime: `PT${prepTimeMinutes}M`,
      cookTime: `PT${cookTimeMinutes}M`,
      totalTime: `PT${prepTimeMinutes + cookTimeMinutes}M`,
      recipeYield: `${recipe.servings} servings`,
      recipeIngredient: recipe.ingredients.map(
        (ing: RecipeData['ingredients'][0]) => `${ing.amount} ${ing.unit} ${ing.name}`
      ),
      recipeInstructions: recipe.instructions.map((instruction: string) => ({
        "@type": "HowToStep",
        text: instruction
      })),
      nutrition: {
        "@type": "NutritionInformation",
        calories: `${recipe.nutrition.calories} calories`,
        proteinContent: `${recipe.nutrition.protein}g`,
        carbohydrateContent: `${recipe.nutrition.carbs}g`,
        fatContent: `${recipe.nutrition.fat}g`
      },
      keywords: recipe.tags.join(",")
    };

    // Create or update the script element
    let script = document.querySelector<HTMLScriptElement>('#recipe-schema');
    if (!script) {
      script = document.createElement('script');
      script.id = 'recipe-schema';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaData);

    // Cleanup
    return () => {
      const scriptToRemove = document.querySelector('#recipe-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [recipe]);

  // This component doesn't render anything visible
  return null;
} 