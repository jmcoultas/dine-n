import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRecipes } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import RecipeCard from "@/components/RecipeCard";
import { MyRecipes } from "@/components/MyRecipes";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight, ChefHat } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { InstacartCTA } from "@/components/InstacartCTA";
import { useTheme } from "@/hooks/use-theme";
import { InstacartRedirectModal } from "@/components/InstacartRedirectModal";
import { createInstacartRecipePage } from "@/lib/api";

interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Recipe {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  permanent_url?: string;
  prepTime?: number;
  cookTime?: number;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  ingredients?: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions?: string[];
  tags?: string[];
  meal_type?: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  cuisine_type?: string;
  dietary_restrictions?: string[];
  difficulty?: string;
  nutrition?: RecipeNutrition;
  complexity?: 1 | 2 | 3;
  favorites_count?: number;
  created_at?: string;
}

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showUnfavoriteModal, setShowUnfavoriteModal] = useState(false);
  const [recipeToUnfavorite, setRecipeToUnfavorite] = useState<Recipe | null>(null);
  const [isCreatingInstacartPage, setIsCreatingInstacartPage] = useState(false);
  const { subscription } = useSubscription();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const [showInstacartModal, setShowInstacartModal] = useState(false);
  const [instacartData, setInstacartData] = useState<{
    url: string;
    recipeName: string;
    ingredientCount: number;
  } | null>(null);
  
  // Helper function to resolve the actual theme
  const getResolvedTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };
  
  // Query for user's favorite recipes
  const { data: favoriteRecipes = [], isLoading: isLoadingFavorites } = useQuery({
    queryKey: ["recipes", "favorites", user?.id],
    queryFn: async () => {
      const response = await fetch('/api/recipes/favorites', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch favorite recipes');
      }
      return response.json();
    },
    enabled: !!user && subscription?.tier === 'premium',
  });

  // Query for community recipes (most favorited)
  const { data: communityRecipes = [], isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["recipes", "community"],
    queryFn: async () => {
      const response = await fetch('/api/recipes/community', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch community recipes');
      }
      return response.json();
    },
  });

  // Query for top breakfast recipes
  const { data: breakfastRecipes = [], isLoading: isLoadingBreakfast } = useQuery({
    queryKey: ["recipes", "breakfast"],
    queryFn: async () => {
      const response = await fetch('/api/recipes/breakfast', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch breakfast recipes');
      }
      return response.json();
    },
  });

  // Query for top lunch recipes
  const { data: lunchRecipes = [], isLoading: isLoadingLunch } = useQuery({
    queryKey: ["recipes", "lunch"],
    queryFn: async () => {
      const response = await fetch('/api/recipes/lunch', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch lunch recipes');
      }
      return response.json();
    },
  });

  // Query for top dinner recipes
  const { data: dinnerRecipes = [], isLoading: isLoadingDinner } = useQuery({
    queryKey: ["recipes", "dinner"],
    queryFn: async () => {
      const response = await fetch('/api/recipes/dinner', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch dinner recipes');
      }
      return response.json();
    },
  });

  // Create a Set of favorited recipe IDs for easy lookup
  const favoritedRecipeIds = new Set(favoriteRecipes.map((recipe: Recipe) => recipe.id));

  const filterRecipes = (recipes: Recipe[]) => {
    return recipes.filter((recipe: Recipe) => 
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredFavoriteRecipes = filterRecipes(favoriteRecipes);
  const filteredCommunityRecipes = filterRecipes(communityRecipes);
  const filteredBreakfastRecipes = filterRecipes(breakfastRecipes);
  const filteredLunchRecipes = filterRecipes(lunchRecipes);
  const filteredDinnerRecipes = filterRecipes(dinnerRecipes);

  const renderRecipeGrid = (recipes: Recipe[], isLoading: boolean, isFavoritesTab: boolean = false) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading recipes...</p>
          </div>
        </div>
      );
    }

    if (recipes.length === 0) {
      return (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              {searchTerm 
                ? 'No recipes found matching your search' 
                : isFavoritesTab 
                  ? 'No favorite recipes yet' 
                  : 'No community recipes available'}
            </p>
          </div>
        </div>
      );
    }

    if (!isFavoritesTab) {
      // Horizontal scrolling for community recipes
      return (
        <div className="relative">
          <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex w-max space-x-6 p-4">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="w-[300px] shrink-0 animate-slide-left">
                  <RecipeCard
                    recipe={recipe}
                    isFavorited={favoritedRecipeIds.has(recipe.id)}
                    onClick={() => setSelectedRecipe(recipe)}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => {
                const scrollArea = document.querySelector('.scroll-area');
                if (scrollArea) {
                  scrollArea.scrollBy({ left: -300, behavior: 'smooth' });
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={() => {
                const scrollArea = document.querySelector('.scroll-area');
                if (scrollArea) {
                  scrollArea.scrollBy({ left: 300, behavior: 'smooth' });
                }
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Regular grid for favorites tab
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isFavorited={favoritedRecipeIds.has(recipe.id)}
            onClick={() => setSelectedRecipe(recipe)}
          />
        ))}
      </div>
    );
  };

  const handleTabChange = (value: string) => {
    if (value === "favorites" && subscription?.tier !== "premium") {
      setShowSubscriptionModal(true);
      return false; // Prevent tab change
    }
    return true;
  };

  const handleFavoriteToggle = async (recipe: any) => {
    const isFavorited = favoritedRecipeIds.has(recipe.id);
    
    if (isFavorited) {
      // Show confirmation modal for unfavoriting
      setRecipeToUnfavorite(recipe);
      setShowUnfavoriteModal(true);
    } else {
      // Directly favorite the recipe
      await performFavoriteToggle(recipe, false);
    }
  };

  const performFavoriteToggle = async (recipe: any, isFavorited: boolean) => {
    try {
      const method = isFavorited ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      // Refetch favorite recipes to update the UI
      queryClient.invalidateQueries({ queryKey: ["recipes", "favorites", user?.id] });
      
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Could add a toast notification here if needed
    }
  };

  const handleConfirmUnfavorite = async () => {
    if (recipeToUnfavorite) {
      await performFavoriteToggle(recipeToUnfavorite, true);
      setShowUnfavoriteModal(false);
      setRecipeToUnfavorite(null);
    }
  };

  const handleShopWithInstacart = async () => {
    if (!selectedRecipe?.id) {
      alert("Recipe ID not found");
      return;
    }
    
    console.log('🚀 RECIPES: Starting Instacart integration for recipe:', {
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name
    });
    
    setIsCreatingInstacartPage(true);
    try {
      console.log('📡 API CALL: Calling createInstacartRecipePage...');
      const result = await createInstacartRecipePage(selectedRecipe.id);
      console.log('✅ API SUCCESS: Got result:', result);
      
      // Set the data and show the modal
      setInstacartData({
        url: result.instacart_url,
        recipeName: result.recipe_name,
        ingredientCount: result.ingredient_count
      });
      setShowInstacartModal(true);
      
      console.log('🔗 MODAL: Showing Instacart redirect modal');
      
    } catch (error) {
      console.error('❌ ERROR: Creating Instacart recipe page:', error);
      
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
      
      alert(errorMessage);
    } finally {
      setIsCreatingInstacartPage(false);
    }
  };

  const handleCancelUnfavorite = () => {
    setShowUnfavoriteModal(false);
    setRecipeToUnfavorite(null);
  };

  return (
    <div className="space-y-6">
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature="My Recipes"
      />

      <AlertDialog open={showUnfavoriteModal} onOpenChange={setShowUnfavoriteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Favorites?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{recipeToUnfavorite?.name}" from your favorites? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUnfavorite}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUnfavorite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove from Favorites
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Recipe Collection</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs 
        defaultValue="community" 
        className="space-y-6"
        onValueChange={handleTabChange}
      >
        <TabsList>
          <TabsTrigger value="community">Community Recipes</TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            My Recipes
            {subscription?.tier !== "premium" && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground text-[10px] px-1 py-0 h-4">
                PRO
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-6">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes slide-left {
                  from {
                    opacity: 0;
                    transform: translateX(20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateX(0);
                  }
                }
                .animate-slide-left {
                  animation: slide-left 0.3s ease-out forwards;
                  animation-delay: calc(var(--animation-order) * 0.1s);
                }
              `
            }}
          />
          <h2 className="text-2xl font-semibold">Community Favorites!</h2>
          {renderRecipeGrid(filteredCommunityRecipes, isLoadingCommunity)}

          {filteredBreakfastRecipes.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-10">Top Breakfast Recipes</h2>
              {renderRecipeGrid(filteredBreakfastRecipes, isLoadingBreakfast)}
            </>
          )}

          {filteredLunchRecipes.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-10">Top Lunch Recipes</h2>
              {renderRecipeGrid(filteredLunchRecipes, isLoadingLunch)}
            </>
          )}

          {filteredDinnerRecipes.length > 0 && (
            <>
              <h2 className="text-2xl font-semibold mt-10">Top Dinner Recipes</h2>
              {renderRecipeGrid(filteredDinnerRecipes, isLoadingDinner)}
            </>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          {subscription?.tier === "premium" ? (
            <MyRecipes
              recipes={filteredFavoriteRecipes.map(recipe => ({ ...recipe, favorited: true }))}
              onRecipeClick={(recipe) => setSelectedRecipe(recipe as Recipe)}
              onFavoriteToggle={handleFavoriteToggle}
              isLoading={isLoadingFavorites}
              showSearch={false}
              showFilters={true}
              layout="grid"
              columns={3}
            />
          ) : (
            <div className="flex items-center justify-center h-[40vh]">
              <div className="text-center space-y-4">
                <p className="text-lg text-muted-foreground">
                  Upgrade to Premium to access My Recipes
                </p>
                <Button 
                  onClick={() => setShowSubscriptionModal(true)}
                  className="mt-4"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        {selectedRecipe && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedRecipe.name}
                {selectedRecipe.favorites_count !== undefined && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {selectedRecipe.favorites_count} {selectedRecipe.favorites_count === 1 ? 'favorite' : 'favorites'}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <img
                  src={selectedRecipe.permanent_url || selectedRecipe.image_url}
                  alt={selectedRecipe.name}
                  className="object-cover w-full h-full"
                />
              </div>

              {(selectedRecipe.permanent_url || selectedRecipe.image_url) && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                  ⚠️ This image is generated by AI and may include ingredients that are not actually in the recipe. As with all cases, use your best reasoning and judgment.
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
                  <ChefHat className="w-4 h-4" />
                  {selectedRecipe.difficulty || "Easy"}
                </span>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                  {((selectedRecipe.prep_time || selectedRecipe.prepTime || 0) + (selectedRecipe.cook_time || selectedRecipe.cookTime || 0))} min
                </span>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                  {selectedRecipe.servings || 2} servings
                </span>
              </div>

              {selectedRecipe.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{selectedRecipe.description}</p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Ingredients</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedRecipe.ingredients?.map((ingredient, i) => (
                      <li key={i}>
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    {selectedRecipe.instructions?.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Shop for Ingredients CTA */}
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

              <div>
                <h3 className="font-semibold mb-2">Nutrition</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{selectedRecipe.nutrition?.calories ?? 0}</div>
                    <div className="text-sm text-muted-foreground">Calories</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{selectedRecipe.nutrition?.protein ?? 0}g</div>
                    <div className="text-sm text-muted-foreground">Protein</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{selectedRecipe.nutrition?.carbs ?? 0}g</div>
                    <div className="text-sm text-muted-foreground">Carbs</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{selectedRecipe.nutrition?.fat ?? 0}g</div>
                    <div className="text-sm text-muted-foreground">Fat</div>
                  </div>
                </div>
              </div>

              {selectedRecipe.tags && selectedRecipe.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.tags.map((tag, i) => (
                      <span key={i} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {instacartData && (
        <InstacartRedirectModal
          isOpen={showInstacartModal}
          onClose={() => {
            setShowInstacartModal(false);
            setInstacartData(null);
          }}
          instacartUrl={instacartData.url}
          recipeName={instacartData.recipeName}
          ingredientCount={instacartData.ingredientCount}
        />
      )}
    </div>
  );
}