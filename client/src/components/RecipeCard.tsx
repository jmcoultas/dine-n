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
import type { Recipe } from "@db/schema";

interface RecipeCardProps {
  recipe: {
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

export default function RecipeCard({ recipe, isFavorited = false, onClick }: RecipeCardProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const imageUrl = recipe.image_url || '';
  const description = recipe.description ?? '';
  const prepTime = recipe.prepTime ?? 0;
  const cookTime = recipe.cookTime ?? 0;
  const servings = recipe.servings ?? 2;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'favorites'] });
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
          {imageUrl && (
            <img
              src={imageUrl}
              alt={recipe.name}
              className="object-cover w-full h-full"
            />
          )}
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