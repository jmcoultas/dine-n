import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Users, Heart, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import type { Recipe } from "@db/schema";

interface RecipeCardProps {
  recipe: {
    id: number;
    name: string;
    description?: string;
    image_url?: string;
    imageUrl?: string;
    permanent_url?: string;
    permanentUrl?: string;
    prep_time?: number;
    prepTime?: number;
    cook_time?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
    instructions?: string[];
    tags?: string[];
    nutrition?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    complexity?: 1 | 2 | 3;
  };
  isFavorited?: boolean;
  onClick?: () => void;
}

const complexityNames: Record<1 | 2 | 3, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

export default function RecipeCard({ recipe, isFavorited = false, onClick }: RecipeCardProps) {
  const { toast } = useToast();
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [showUnfavoriteConfirm, setShowUnfavoriteConfirm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const imageUrl = recipe.permanentUrl || recipe.permanent_url || recipe.imageUrl || recipe.image_url || '';
  const description = recipe.description ?? '';
  const prepTime = recipe.prepTime ?? recipe.prep_time ?? 0;
  const cookTime = recipe.cookTime ?? recipe.cook_time ?? 0;
  const servings = recipe.servings ?? 2;
  const totalTime = prepTime + cookTime;
  const complexity = (recipe.complexity || 1) as 1 | 2 | 3;
  const ingredients = recipe.ingredients ?? [];
  const instructions = recipe.instructions ?? [];
  const tags = recipe.tags ?? [];
  const nutrition = recipe.nutrition ?? {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Must be logged in to favorite recipes");
      }

      const payload = {};
      const recipeId = recipe.id;
      const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update favorite status");
      }

      return response.json();
    },
    onMutate: async () => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['recipes', 'favorites'] });

      // Get the current recipes
      const previousRecipes = queryClient.getQueryData(['recipes', user?.id]);

      // Optimistically remove the recipe from the cache if unfavoriting
      if (isFavorited) {
        queryClient.setQueryData(['recipes', user?.id], (old: Recipe[] | undefined) => {
          if (!old) return [];
          return old.filter(r => r.id !== recipe.id);
        });
      }

      return { previousRecipes };
    },
    onError: (error: Error, _, context) => {
      // If the mutation fails, revert back to the previous state
      if (context?.previousRecipes) {
        queryClient.setQueryData(['recipes', user?.id], context.previousRecipes);
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      // Invalidate and refetch the recipes query to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['recipes', 'favorites'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', user?.id] });
      
      toast({
        title: isFavorited ? "Recipe removed from favorites" : "Recipe added to favorites",
        description: isFavorited ? 
          "The recipe has been removed from your collection" : 
          "The recipe has been added to your collection",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.refetchQueries({ queryKey: ['recipes', 'favorites'] });
      queryClient.refetchQueries({ queryKey: ['recipes', user?.id] });
    }
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorited) {
      setShowUnfavoriteConfirm(true);
    } else {
      toggleFavorite.mutate();
    }
  };

  return (
    <>
      <Card
        className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <div
          className="aspect-video relative"
          style={{
            backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white/90"
              onClick={handleFavoriteClick}
            >
              <Heart 
                className={`h-5 w-5 transition-colors ${
                  isFavorited 
                    ? 'fill-red-500 text-red-500 scale-110' 
                    : 'text-gray-500 hover:text-red-400'
                }`}
              />
              <span className="sr-only">
                {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              </span>
            </Button>
          )}
        </div>
        <CardHeader className="p-4">
          <div className="font-semibold">{recipe.name}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
              {totalTime} min
            </span>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
              {servings} servings
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-sm text-muted-foreground">
            {description}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{recipe.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="aspect-video relative rounded-lg overflow-hidden">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={recipe.name}
                  className="object-cover w-full h-full"
                />
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
                <ChefHat className="w-4 h-4" />
                {complexityNames[complexity]}
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                {totalTime} min
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                {servings} servings
              </span>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Ingredients</h3>
                <ul className="list-disc list-inside space-y-1">
                  {ingredients.map((ingredient, i) => (
                    <li key={i}>
                      {ingredient.amount} {ingredient.unit} {ingredient.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Instructions</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {instructions.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Nutrition</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{nutrition.calories}</div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{nutrition.protein}g</div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{nutrition.carbs}g</div>
                  <div className="text-sm text-muted-foreground">Carbs</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{nutrition.fat}g</div>
                  <div className="text-sm text-muted-foreground">Fat</div>
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span key={i} className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnfavoriteConfirm} onOpenChange={setShowUnfavoriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Favorites?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{recipe.name}" from your favorites? This will remove it from your recipe collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toggleFavorite.mutate();
                setShowUnfavoriteConfirm(false);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}