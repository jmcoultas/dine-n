import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Clock, Users, ChefHat, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeForMoodBoard {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  permanent_url?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  meal_type?: string;
  cuisine_type?: string;
  dietary_restrictions?: string[];
  difficulty?: string;
  complexity?: 1 | 2 | 3;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  favorites_count?: number;
  created_at?: string;
}

interface RecipeMoodBoardProps {
  recipes: RecipeForMoodBoard[];
  onRecipeClick: (recipe: RecipeForMoodBoard) => void;
  onFavoriteToggle?: (recipe: RecipeForMoodBoard) => void;
  isLoading?: boolean;
}

// Color themes for meal types
const mealTypeColors = {
  Breakfast: {
    bg: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20",
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    icon: "text-orange-600 dark:text-orange-400"
  },
  Lunch: {
    bg: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    icon: "text-green-600 dark:text-green-400"
  },
  Dinner: {
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    icon: "text-blue-600 dark:text-blue-400"
  },
  Snack: {
    bg: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20",
    border: "border-purple-200 dark:border-purple-800",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    icon: "text-purple-600 dark:text-purple-400"
  },
  Dessert: {
    bg: "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20",
    border: "border-pink-200 dark:border-pink-800",
    badge: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    icon: "text-pink-600 dark:text-pink-400"
  }
};

// Difficulty size mapping
const difficultySize = {
  Easy: "small",
  Moderate: "medium", 
  Advanced: "large"
};

// Dietary restriction colors
const dietaryColors = {
  Vegetarian: "bg-green-500",
  Vegan: "bg-emerald-500",
  "Gluten-Free": "bg-yellow-500",
  "Dairy-Free": "bg-blue-500",
  Keto: "bg-purple-500",
  Paleo: "bg-orange-500",
  "Low-Carb": "bg-red-500"
};

export default function RecipeMoodBoard({ 
  recipes, 
  onRecipeClick, 
  onFavoriteToggle,
  isLoading = false 
}: RecipeMoodBoardProps) {
  const [hoveredRecipe, setHoveredRecipe] = useState<number | null>(null);

  // Smart clustering logic
  const clusteredRecipes = useMemo(() => {
    if (!recipes.length) return [];

    // Group by meal type first, then by cuisine within each meal type
    const mealGroups = recipes.reduce((acc, recipe) => {
      const mealType = recipe.meal_type || "Dinner";
      if (!acc[mealType]) acc[mealType] = [];
      acc[mealType].push(recipe);
      return acc;
    }, {} as Record<string, RecipeForMoodBoard[]>);

    // Sort each meal group by cuisine type and complexity for visual clustering
    Object.keys(mealGroups).forEach(mealType => {
      mealGroups[mealType].sort((a, b) => {
        // First by cuisine type
        if (a.cuisine_type !== b.cuisine_type) {
          return (a.cuisine_type || "Other").localeCompare(b.cuisine_type || "Other");
        }
        // Then by complexity for size variation
        return (a.complexity || 1) - (b.complexity || 1);
      });
    });

    return mealGroups;
  }, [recipes]);

  const getCardSize = (recipe: RecipeForMoodBoard) => {
    const difficulty = recipe.difficulty || "Easy";
    const size = difficultySize[difficulty as keyof typeof difficultySize] || "medium";
    
    switch (size) {
      case "small":
        return "h-64"; // Easy recipes - smaller cards
      case "medium":
        return "h-72"; // Moderate recipes - medium cards
      case "large":
        return "h-80"; // Advanced recipes - larger cards
      default:
        return "h-72";
    }
  };

  const getMealTypeTheme = (mealType: string) => {
    return mealTypeColors[mealType as keyof typeof mealTypeColors] || mealTypeColors.Dinner;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your recipe collection...</p>
        </div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-medium">No favorite recipes yet</p>
            <p className="text-muted-foreground">Start favoriting recipes to see them here!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(clusteredRecipes).map(([mealType, mealRecipes]) => {
        const theme = getMealTypeTheme(mealType);
        
        return (
          <div key={mealType} className="space-y-4">
            {/* Meal Type Header */}
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg", theme.bg, theme.border, "border")}>
                <Utensils className={cn("w-5 h-5", theme.icon)} />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{mealType}</h3>
                <p className="text-sm text-muted-foreground">
                  {mealRecipes.length} recipe{mealRecipes.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Masonry Grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
              {mealRecipes.map((recipe) => {
                const cardTheme = getMealTypeTheme(recipe.meal_type || "Dinner");
                const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
                
                return (
                  <Card
                    key={recipe.id}
                    className={cn(
                      "break-inside-avoid cursor-pointer transition-all duration-200 overflow-hidden",
                      getCardSize(recipe),
                      cardTheme.bg,
                      cardTheme.border,
                      "border-2",
                      hoveredRecipe === recipe.id 
                        ? "shadow-lg scale-[1.02] -translate-y-1" 
                        : "hover:shadow-md"
                    )}
                    onMouseEnter={() => setHoveredRecipe(recipe.id)}
                    onMouseLeave={() => setHoveredRecipe(null)}
                    onClick={() => onRecipeClick(recipe)}
                  >
                    <CardContent className="p-0 h-full flex flex-col">
                      {/* Recipe Image */}
                      <div className="relative aspect-video bg-muted">
                        {(recipe.image_url || recipe.permanent_url) ? (
                          <img
                            src={recipe.permanent_url || recipe.image_url}
                            alt={recipe.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ChefHat className="w-12 h-12 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Favorite Button */}
                        {onFavoriteToggle && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFavoriteToggle(recipe);
                            }}
                          >
                            <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                          </Button>
                        )}

                        {/* Complexity Badge */}
                        <div className="absolute top-2 left-2">
                          <Badge 
                            variant="secondary" 
                            className="text-xs bg-background/80 backdrop-blur-sm"
                          >
                            {recipe.difficulty || "Easy"}
                          </Badge>
                        </div>
                      </div>

                      {/* Recipe Info */}
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-semibold text-sm line-clamp-2 mb-2">
                          {recipe.name}
                        </h4>
                        
                        {recipe.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                            {recipe.description}
                          </p>
                        )}

                        {/* Time and Servings */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          {totalTime > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(totalTime)}</span>
                            </div>
                          )}
                          {recipe.servings && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{recipe.servings}</span>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mt-auto">
                          {/* Cuisine Badge */}
                          {recipe.cuisine_type && recipe.cuisine_type !== "Other" && (
                            <Badge variant="outline" className="text-xs border-current">
                              {recipe.cuisine_type}
                            </Badge>
                          )}
                          
                          {/* Dietary Restrictions as colored dots */}
                          <div className="flex items-center gap-1">
                            {recipe.dietary_restrictions?.slice(0, 3).map((dietary) => (
                              <div
                                key={dietary}
                                className={cn(
                                  "w-3 h-3 rounded-full border-2 border-background shadow-sm",
                                  dietaryColors[dietary as keyof typeof dietaryColors] || "bg-gray-400"
                                )}
                                title={dietary}
                              />
                            ))}
                            
                            {/* Show more indicator */}
                            {recipe.dietary_restrictions && recipe.dietary_restrictions.length > 3 && (
                              <span className="text-xs text-muted-foreground font-medium">
                                +{recipe.dietary_restrictions.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
} 