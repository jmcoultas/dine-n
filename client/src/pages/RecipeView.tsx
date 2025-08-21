import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@db/schema";
import { Clock, Users } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { RecipeSchema } from "@/components/RecipeSchema";
import { InstacartCTA } from "@/components/InstacartCTA";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/components/ui/use-toast";
import { createInstacartRecipePage } from "@/lib/api";
import { useState, useEffect } from "react";
import { ClarityService } from "@/lib/clarity";

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

export interface RecipeData extends Omit<Recipe, 'ingredients' | 'instructions' | 'tags' | 'nutrition'> {
  ingredients: RecipeIngredient[];
  instructions: string[];
  tags: string[];
  nutrition: RecipeNutrition;
}

export default function RecipeView() {
  const params = useParams<{ id: string }>();
  const [isCreatingInstacartPage, setIsCreatingInstacartPage] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  
  // Helper function to resolve the actual theme
  const getResolvedTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };
  
  // Parse the ID directly since we're not using recipe title in URL
  const numericId = params.id ? parseInt(params.id) : null;
  
  console.log('RecipeView mounted with params:', {
    params,
    numericId,
    url: window.location.pathname,
    timestamp: new Date().toISOString()
  });
  
  const { data: recipe, isLoading, error } = useQuery<RecipeData>({
    queryKey: ['recipe', numericId],
    queryFn: async () => {
      if (!numericId) {
        throw new Error('Invalid recipe ID');
      }

      console.log('Fetching recipe data:', {
        numericId,
        url: `/api/recipes/${numericId}`,
        timestamp: new Date().toISOString()
      });

      try {
        const response = await fetch(`/api/recipes/${numericId}`);
        
        console.log('Recipe API response:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString()
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Recipe API error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
            timestamp: new Date().toISOString()
          });
          throw new Error(errorText || 'Recipe not found');
        }

        const data = await response.json();
        
        console.log('Recipe data received:', {
          recipeId: data.id,
          recipeName: data.name,
          fullData: data,
          timestamp: new Date().toISOString()
        });

        return data;
      } catch (err) {
        console.error('Error in recipe fetch:', {
          error: err,
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        });
        throw err;
      }
    },
    retry: false, // Disable retries so we can see errors immediately
    enabled: numericId !== null // Only run query if we have a valid numeric ID
  });

  // Track recipe view in Clarity
  useEffect(() => {
    if (recipe && numericId) {
      ClarityService.event('recipe_viewed');
      ClarityService.setTag('recipe_id', numericId.toString());
      ClarityService.setTag('recipe_title', recipe.name);
      if (recipe.tags && recipe.tags.length > 0) {
        ClarityService.setTag('recipe_category', recipe.tags[0]);
      }
    }
  }, [recipe, numericId]);

  const handleShopWithInstacart = async () => {
    if (!recipe?.id) {
      toast({
        title: "Error",
        description: "Recipe ID not found",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Attempting to create Instacart page for recipe:', {
      recipeId: recipe.id,
      recipeName: recipe.name,
      hasIngredients: recipe.ingredients && recipe.ingredients.length > 0
    });
    
    setIsCreatingInstacartPage(true);
    try {
      // Track Instacart integration usage
      ClarityService.event('instacart_recipe_created');
      ClarityService.setTag('instacart_recipe_id', recipe.id.toString());
      
      const result = await createInstacartRecipePage(recipe.id);
      
      // Try to open in new tab (works on most browsers/devices)
      const newWindow = window.open(result.instacart_url, '_blank');
      
      // Always show toast with clickable link as fallback
      toast({
        title: "Instacart Recipe Ready!",
        description: `Recipe page created with ${result.ingredient_count} ingredients. Tap anywhere to open Instacart.`,
        variant: "default",
        onClick: () => {
          console.log('🔗 TOAST CLICKED: Opening Instacart URL');
          window.open(result.instacart_url, '_blank');
        }
      });
      
      // If window didn't open, the user can click the URL in the toast
      console.log('Instacart URL created:', result.instacart_url);
      
    } catch (error) {
      console.error('Error creating Instacart recipe page:', {
        error,
        recipeId: recipe.id,
        recipeName: recipe.name,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      let errorMessage = "Failed to create Instacart recipe page";
      if (error instanceof Error) {
        if (error.message.includes("Recipe not found")) {
          errorMessage = "This recipe could not be found.";
        } else if (error.message.includes("No ingredients found")) {
          errorMessage = "This recipe doesn't contain any ingredients to shop for.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreatingInstacartPage(false);
    }
  };

  if (isLoading) {
    console.log('Recipe view loading...', {
      params,
      timestamp: new Date().toISOString()
    });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation />
      </div>
    );
  }

  if (error || !recipe) {
    console.error('Recipe view error:', {
      error,
      errorMessage: error instanceof Error ? error.message : undefined,
      stack: error instanceof Error ? error.stack : undefined,
      params,
      timestamp: new Date().toISOString()
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900">Recipe not found</h1>
        <p className="text-gray-600">The recipe you're looking for doesn't exist or has been removed.</p>
        <p className="text-sm text-red-600 mt-2">
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
      </div>
    );
  }

  console.log('Rendering recipe:', {
    id: recipe.id,
    name: recipe.name,
    fullRecipe: recipe,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <RecipeSchema recipe={recipe} />
      {/* Hero Image */}
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden mb-8">
        <img
          src={recipe.permanent_url || recipe.image_url || ''}
          alt={recipe.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Recipe Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{recipe.name}</h1>
        <p className="text-muted-foreground mb-4">{recipe.description}</p>
        
        {/* Recipe Meta Info */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Prep: {recipe.prep_time}m | Cook: {recipe.cook_time}m
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground">Serves {recipe.servings}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Ingredients and Instructions */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Ingredients */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients?.map((ingredient, index) => (
              <li key={index} className="text-muted-foreground">
                {ingredient.amount} {ingredient.unit} {ingredient.name}
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Instructions</h2>
          <ol className="space-y-4">
            {recipe.instructions?.map((instruction, index) => (
              <li key={index} className="text-muted-foreground">
                <span className="font-bold mr-2">{index + 1}.</span>
                {instruction}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Shop for Ingredients CTA */}
      <div className="mt-8">
        <div className="bg-gradient-to-r from-[#FAF1E5]/20 to-[#FAF1E5]/10 border border-[#EFE9E1] rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Get Recipe Ingredients</h3>
              <p className="text-muted-foreground">
                Shop for all the ingredients you need for this recipe
              </p>
            </div>
            <InstacartCTA
              contentType="recipe"
              theme={getResolvedTheme()}
              onClick={handleShopWithInstacart}
              disabled={isCreatingInstacartPage}
            />
          </div>
        </div>
      </div>

      {/* Nutrition Information */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Nutrition Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg">
            <p className="text-lg font-semibold">{recipe.nutrition.calories}</p>
            <p className="text-sm text-muted-foreground">Calories</p>
          </div>
          <div className="p-4 rounded-lg">
            <p className="text-lg font-semibold">{recipe.nutrition.protein}g</p>
            <p className="text-sm text-muted-foreground">Protein</p>
          </div>
          <div className="p-4 rounded-lg">
            <p className="text-lg font-semibold">{recipe.nutrition.carbs}g</p>
            <p className="text-sm text-muted-foreground">Carbs</p>
          </div>
          <div className="p-4 rounded-lg">
            <p className="text-lg font-semibold">{recipe.nutrition.fat}g</p>
            <p className="text-sm text-muted-foreground">Fat</p>
          </div>
        </div>
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 