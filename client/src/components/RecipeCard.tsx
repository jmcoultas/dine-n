import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Users, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Recipe } from "@/lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  isFavorited?: boolean;
  onClick?: () => void;
}

export default function RecipeCard({ recipe, isFavorited = false, onClick }: RecipeCardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Add null checks for optional properties
  const imageUrl = recipe.image_url || '';
  const description = recipe.description ?? '';
  const prepTime = recipe.prep_time ?? 0;
  const cookTime = recipe.cook_time ?? 0;
  const servings = recipe.servings ?? 2;

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Must be logged in to favorite recipes");
      }

      const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: recipe.id < 0 ? JSON.stringify({ recipe }) : undefined
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update favorite status");
      }

      const result = await response.json();
      // If this was a temporary recipe that got saved permanently, update the recipe ID
      if (result.permanentId) {
        recipe.id = result.permanentId;
      }
      return result;
    },
    onSuccess: (data) => {
      // Invalidate both temporary and favorite recipes queries
      queryClient.invalidateQueries({ queryKey: ['recipes', 'favorites'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'temporary'] });

      toast({
        title: isFavorited ? "Recipe removed from favorites" : "Recipe added to favorites",
        description: isFavorited ? 
          "The recipe has been removed from your collection" : 
          "The recipe has been added to your collection",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="p-0">
        <div className="aspect-video relative rounded-t-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={recipe.name}
            className="object-cover w-full h-full"
          />
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white/90"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite.mutate();
              }}
            >
              <Heart 
                className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
              />
              <span className="sr-only">
                {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              </span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-xl mb-2">{recipe.name}</CardTitle>
        <CardDescription className="mb-4">
          {description}
        </CardDescription>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {prepTime + cookTime} min
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {servings} servings
          </div>
        </div>
      </CardContent>
    </Card>
  );
}