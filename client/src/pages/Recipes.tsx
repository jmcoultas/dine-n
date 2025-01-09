import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRecipes } from "@/lib/api";
import { useUser } from "@/hooks/use-user";
import RecipeCard from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

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
}

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const { user } = useUser();
  const { data: recipes = [], isLoading, isError, error } = useQuery({
    queryKey: ["recipes", user?.id],
    queryFn: async () => {
      const response = await fetch('/api/recipes/favorites', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }
      return response.json();
    },
    enabled: !!user,
  }) as { data: Recipe[]; isLoading: boolean; isError: boolean; error: Error | null };

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

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-4">
          <p className="text-lg text-red-500">Error loading recipes</p>
          <p className="text-muted-foreground">{(error as Error)?.message || 'Please try again later'}</p>
        </div>
      </div>
    );
  }

  const filteredRecipes = recipes.filter((recipe: Recipe) => {
    const isMatch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Include both regular and temporary favorited recipes
    return isMatch;
  });

  return (
    <div className="space-y-6">
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

      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isFavorited={true}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              {searchTerm ? 'No recipes found matching your search' : 'No recipes available'}
            </p>
          </div>
        </div>
      )}

      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        {selectedRecipe && (
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <ScrollArea className="h-full w-full">
              <div className="space-y-4 p-6">
                <DialogTitle className="text-2xl font-bold">{selectedRecipe.name}</DialogTitle>
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