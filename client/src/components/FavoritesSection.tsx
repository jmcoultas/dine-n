import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { Heart, Plus, Sunrise, Sun, Moon, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Recipe } from "@/lib/types";

interface FavoritesSectionProps {
  onAddToMealPlan: (recipe: Recipe, mealType: 'breakfast' | 'lunch' | 'dinner') => void;
  selectedArchivedRecipes: {
    breakfast: Recipe[];
    lunch: Recipe[];
    dinner: Recipe[];
  };
}

const mealTypeConfig = {
  breakfast: {
    icon: Sunrise,
    label: "Breakfast",
    emoji: "🌅",
    color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100"
  },
  lunch: {
    icon: Sun,
    label: "Lunch", 
    emoji: "🌞",
    color: "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
  },
  dinner: {
    icon: Moon,
    label: "Dinner",
    emoji: "🌙", 
    color: "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
  }
} as const;

export default function FavoritesSection({ onAddToMealPlan, selectedArchivedRecipes }: FavoritesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const { data: user } = useUser();
  const { subscription } = useSubscription();

  // Query for user's favorite recipes using the existing API endpoint
  const { data: favoriteRecipes = [], isLoading, error } = useQuery({
    queryKey: ["user-favorites"],
    queryFn: async () => {
      const response = await fetch('/api/user-favorites', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch favorite recipes');
      }
      return response.json();
    },
    enabled: !!user && subscription?.tier === 'premium',
  });

  const isRecipeSelected = (recipe: Recipe) => {
    return Object.values(selectedArchivedRecipes).some(mealRecipes => 
      mealRecipes.some(selected => selected.id === recipe.id)
    );
  };

  const handleAddToMealPlan = (recipe: Recipe, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    onAddToMealPlan(recipe, mealType);
  };

  // Don't show if user doesn't have premium subscription
  if (!user || subscription?.tier !== 'premium') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Favorite Recipes
            </div>
            <div className="flex items-center gap-2">
              <LoadingAnimation />
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <LoadingAnimation />
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Favorite Recipes
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load your favorite recipes. Please try again later.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
    );
  }

  if (favoriteRecipes.length === 0) {
    return (
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Your Favorite Recipes
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">0</Badge>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No favorite recipes yet. Start favoriting recipes to see them here!
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Your Favorite Recipes
            <Badge variant="secondary">{favoriteRecipes.length}</Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
        {isExpanded && (
          <p className="text-sm text-muted-foreground mt-2">
            Add your favorite recipes directly to your meal plan
          </p>
        )}
      </CardHeader>
      {isExpanded && (
        <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favoriteRecipes.map((recipe: Recipe) => {
            const isSelected = isRecipeSelected(recipe);
            const isExpanded = expandedRecipe === recipe.id;

            return (
              <Card 
                key={recipe.id}
                className={`transition-all duration-200 ${
                  isSelected 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Recipe Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm leading-tight mb-2">
                          {recipe.name}
                        </h4>
                        {recipe.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {recipe.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {recipe.tags?.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {recipe.cookTime && (
                            <Badge variant="outline" className="text-xs">
                              {recipe.cookTime}min
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          Added
                        </Badge>
                      )}
                    </div>

                    {/* Recipe Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {recipe.servings ? `${recipe.servings} servings` : 'Recipe'}
                      </span>
                      <span>
                        {recipe.complexity === 1 ? 'Easy' : recipe.complexity === 2 ? 'Medium' : 'Hard'}
                      </span>
                    </div>

                    {/* Add to Meal Plan Buttons */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Add to:</p>
                      <div className="flex gap-1">
                        {Object.entries(mealTypeConfig).map(([mealType, config]) => {
                          const typedMealType = mealType as 'breakfast' | 'lunch' | 'dinner';
                          const Icon = config.icon;
                          const isAlreadyAdded = selectedArchivedRecipes[typedMealType].some(
                            selected => selected.id === recipe.id
                          );

                          return (
                            <Button
                              key={mealType}
                              size="sm"
                              variant={isAlreadyAdded ? "default" : "outline"}
                              className="flex-1 text-xs h-8"
                              onClick={() => handleAddToMealPlan(recipe, typedMealType)}
                              disabled={isAlreadyAdded}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </CardContent>
      )}
    </Card>
  );
} 