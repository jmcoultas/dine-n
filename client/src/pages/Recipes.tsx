import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRecipes } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import RecipeCard from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SubscriptionModal } from "@/components/SubscriptionModal";

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
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  ingredients?: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions?: string[];
  tags?: string[];
  nutrition?: RecipeNutrition;
  complexity: 1 | 2 | 3;
  favorites_count?: number;
}

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const { subscription } = useSubscription();
  const { data: user } = useUser();
  
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

  // Create a Set of favorited recipe IDs for easy lookup
  const favoritedRecipeIds = new Set(favoriteRecipes.map((recipe: Recipe) => recipe.id));

  const filterRecipes = (recipes: Recipe[]) => {
    return recipes.filter((recipe: Recipe) => 
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredFavoriteRecipes = filterRecipes(favoriteRecipes);
  const filteredCommunityRecipes = filterRecipes(communityRecipes);

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

  return (
    <div className="space-y-6">
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature="My Recipes"
      />

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
          {renderRecipeGrid(filteredCommunityRecipes, isLoadingCommunity)}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-6">
          {subscription?.tier === "premium" ? (
            renderRecipeGrid(filteredFavoriteRecipes, isLoadingFavorites, true)
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
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <ScrollArea className="h-full w-full">
              <div className="space-y-4 p-6">
                <DialogTitle className="text-2xl font-bold">
                  {selectedRecipe.name}
                  {selectedRecipe.favorites_count !== undefined && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {selectedRecipe.favorites_count} {selectedRecipe.favorites_count === 1 ? 'favorite' : 'favorites'}
                    </span>
                  )}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedRecipe.description}
                </DialogDescription>

                <div className="aspect-video relative rounded-lg overflow-hidden">
                  <img
                    src={selectedRecipe.image_url}
                    alt={selectedRecipe.name}
                    className="object-cover w-full h-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {selectedRecipe.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Ingredients</h3>
                    <ScrollArea className="h-48">
                      <ul className="space-y-2">
                        {selectedRecipe.ingredients?.map((ingredient, i) => (
                          <li key={i}>
                            {ingredient.amount} {ingredient.unit} {ingredient.name}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Instructions</h3>
                    <ScrollArea className="h-48">
                      <ol className="list-decimal list-inside space-y-2">
                        {selectedRecipe.instructions?.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </ScrollArea>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="font-bold">
                      {selectedRecipe.nutrition?.calories ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Calories</div>
                  </div>
                  <div>
                    <div className="font-bold">
                      {selectedRecipe.nutrition?.protein ?? 0}g
                    </div>
                    <div className="text-sm text-muted-foreground">Protein</div>
                  </div>
                  <div>
                    <div className="font-bold">
                      {selectedRecipe.nutrition?.carbs ?? 0}g
                    </div>
                    <div className="text-sm text-muted-foreground">Carbs</div>
                  </div>
                  <div>
                    <div className="font-bold">
                      {selectedRecipe.nutrition?.fat ?? 0}g
                    </div>
                    <div className="text-sm text-muted-foreground">Fat</div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}