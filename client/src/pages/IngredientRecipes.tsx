import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { generateRecipeFromTitle } from "@/lib/api";
import type { Recipe } from "@/lib/types";
import { RecipeSchema } from "@/lib/types";
import { Loader2 } from "lucide-react";

const STORAGE_KEY = 'ingredient-recipe';

export default function IngredientRecipes() {
  const [ingredients, setIngredients] = useState<string[]>(() => {
    const saved = localStorage.getItem('ingredients');
    return saved ? JSON.parse(saved) : [];
  });
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    const saved = localStorage.getItem('suggestions');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState<string>("");
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for persisted recipe with proper error handling
  const { data: selectedRecipe, refetch: refetchRecipe } = useQuery({
    queryKey: ['ingredient-recipe'],
    queryFn: async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        const validatedRecipe = RecipeSchema.parse(parsed);
        return validatedRecipe;
      } catch (error) {
        console.error('Error parsing saved recipe:', error);
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    },
    initialData: null,
    staleTime: Infinity, // Keep the data fresh indefinitely
    gcTime: Infinity // Never remove from cache (formerly cacheTime)
  });

  // Save ingredients to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ingredients', JSON.stringify(ingredients));
  }, [ingredients]);

  // Save suggestions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('suggestions', JSON.stringify(suggestions));
  }, [suggestions]);

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/generate-recipe-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredients }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.code === "UPGRADE_REQUIRED") {
          setFeatureContext("recipe suggestion");
          setShowSubscriptionModal(true);
          return [];
        }
        throw new Error(error.message || "Failed to generate suggestions");
      }

      const data = await response.json();
      return data.suggestions;
    },
    onSuccess: (data) => {
      setSuggestions(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateRecipeMutation = useMutation({
    mutationFn: async (title: string) => {
      const recipe = await generateRecipeFromTitle(title);
      const parsedRecipe = RecipeSchema.parse(recipe);
      return parsedRecipe;
    },
    onSuccess: (recipe: Recipe) => {
      // Save to localStorage and update React Query cache
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recipe));
        queryClient.setQueryData(['ingredient-recipe'], recipe);
      } catch (error) {
        console.error('Error saving recipe:', error);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddIngredient = () => {
    if (inputValue.trim()) {
      if (subscription?.tier !== "premium" && ingredients.length >= 3) {
        setFeatureContext("adding more ingredients");
        setShowSubscriptionModal(true);
        setInputValue("");
        return;
      }
      setIngredients([...ingredients, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleGenerateSuggestions = async () => {
    if (ingredients.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one ingredient",
        variant: "destructive",
      });
      return;
    }

    setSuggestions([]);
    // Only clear the stored recipe if the user confirms
    if (selectedRecipe) {
      const shouldClear = window.confirm("Generating new suggestions will clear your current recipe. Continue?");
      if (!shouldClear) {
        return;
      }
    }
    localStorage.removeItem(STORAGE_KEY);
    queryClient.setQueryData(['ingredient-recipe'], null);
    await generateSuggestionsMutation.mutateAsync();
  };

  const handleSelectRecipe = async (title: string) => {
    if (subscription?.tier !== "premium") {
      setFeatureContext("recipe generation");
      setShowSubscriptionModal(true);
      return;
    }
    await generateRecipeMutation.mutateAsync(title);
  };

  const handleUpdateFavorite = async (recipe: Recipe, isFavorited: boolean) => {
    try {
      await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        credentials: 'include',
      });

      const updatedRecipe = {
        ...recipe,
        favorited: !isFavorited,
        favorites_count: isFavorited 
          ? Math.max(0, (recipe.favorites_count || 0) - 1)
          : (recipe.favorites_count || 0) + 1
      };

      // Update both localStorage and React Query cache
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecipe));
        queryClient.setQueryData(['ingredient-recipe'], updatedRecipe);
      } catch (error) {
        console.error('Error saving updated recipe:', error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature={featureContext}
      />

      {/* Main content container with vertical spacing */}
      <div className="flex flex-col items-center pt-[20vh] space-y-8 px-4">
        {/* Header section */}
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold mb-4">Recipe Ideas from Ingredients</h1>
          <p className="text-muted-foreground">
            Enter the ingredients you have on hand and we'll suggest recipes you can make
          </p>
        </div>

        {/* Input section */}
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
              placeholder="Enter an ingredient"
              className="flex-1"
            />
            <Button onClick={handleAddIngredient}>Add</Button>
          </div>

          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRemoveIngredient(index)}
                >
                  {ingredient} ×
                </Badge>
              ))}
            </div>
          )}

          <Button
            onClick={handleGenerateSuggestions}
            disabled={ingredients.length === 0 || generateSuggestionsMutation.isPending}
            className="w-full"
          >
            {generateSuggestionsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Ideas...
              </>
            ) : (
              "Generate Recipe Ideas"
            )}
          </Button>
        </div>

        {/* Suggestions section */}
        {suggestions.length > 0 && (
          <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-semibold mb-4 text-center">Suggested Recipes</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {suggestions.map((title, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => handleSelectRecipe(title)}
                >
                  <CardContent className="p-4">
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click to generate full recipe
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recipe display section */}
        {generateRecipeMutation.isPending ? (
          <LoadingAnimation
            messages={[
              "Crafting your recipe...",
              "Calculating ingredients and portions...",
              "Adding cooking instructions...",
              "Finalizing nutritional information...",
            ]}
          />
        ) : selectedRecipe && (
          <div className="w-full max-w-4xl mt-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-semibold">{selectedRecipe.name}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpdateFavorite(selectedRecipe, selectedRecipe.favorited);
                }}
              >
                {selectedRecipe.favorited ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-red-500"
                  >
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                    />
                  </svg>
                )}
                <span className="sr-only">
                  {selectedRecipe.favorited ? "Remove from favorites" : "Add to favorites"}
                </span>
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  {(selectedRecipe.imageUrl || selectedRecipe.permanent_url) && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                      <img
                        src={selectedRecipe.permanent_url || selectedRecipe.imageUrl || '/placeholder-recipe.jpg'}
                        alt={selectedRecipe.name || 'Recipe image'}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium mb-2">Description</h3>
                    <p className="text-muted-foreground">{selectedRecipe.description}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-medium mb-2">Prep Time</h3>
                      <p>{selectedRecipe.prepTime} minutes</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Cook Time</h3>
                      <p>{selectedRecipe.cookTime} minutes</p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Servings</h3>
                      <p>{selectedRecipe.servings}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Ingredients</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {selectedRecipe.ingredients?.map((ingredient, index) => (
                        <li key={index}>
                          {ingredient.amount} {ingredient.unit} {ingredient.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Instructions</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      {selectedRecipe.instructions?.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {selectedRecipe.nutrition && (
                    <div>
                      <h3 className="font-medium mb-2">Nutrition (per serving)</h3>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Calories</p>
                          <p className="font-medium">{selectedRecipe.nutrition.calories}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Protein</p>
                          <p className="font-medium">{selectedRecipe.nutrition.protein}g</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Carbs</p>
                          <p className="font-medium">{selectedRecipe.nutrition.carbs}g</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fat</p>
                          <p className="font-medium">{selectedRecipe.nutrition.fat}g</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 