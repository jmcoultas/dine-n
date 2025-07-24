import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Clock, Users, ChefHat, Search, Filter, Star, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarEventModal } from "@/components/CalendarEventModal";

export interface Recipe {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  permanent_url?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  meal_type?: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  cuisine_type?: string;
  dietary_restrictions?: string[];
  difficulty?: string; // Allow any string to match the Recipes page type
  complexity?: 1 | 2 | 3;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  favorites_count?: number;
  favorited?: boolean;
  created_at?: string;
  tags?: string[];
}

export interface MyRecipesProps {
  recipes: Recipe[];
  onRecipeClick?: (recipe: Recipe) => void;
  onFavoriteToggle?: (recipe: Recipe) => void;
  isLoading?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  layout?: "grid" | "list" | "masonry";
  columns?: 2 | 3 | 4;
  className?: string;
}

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-100 text-green-800 border-green-200",
  Moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Advanced: "bg-red-100 text-red-800 border-red-200",
};

const mealTypeColors = {
  Breakfast: "bg-orange-100 text-orange-800 border-orange-200",
  Lunch: "bg-blue-100 text-blue-800 border-blue-200",
  Dinner: "bg-purple-100 text-purple-800 border-purple-200",
  Snack: "bg-pink-100 text-pink-800 border-pink-200",
  Dessert: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export function MyRecipes({
  recipes,
  onRecipeClick,
  onFavoriteToggle,
  isLoading = false,
  showSearch = true,
  showFilters = true,
  layout = "grid",
  columns = 3,
  className,
}: MyRecipesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedRecipeForCalendar, setSelectedRecipeForCalendar] = useState<Recipe | null>(null);

  const filteredAndSortedRecipes = useMemo(() => {
    let filtered = recipes.filter((recipe) => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMealType = selectedMealType === "all" || recipe.meal_type === selectedMealType;
      const matchesDifficulty = selectedDifficulty === "all" || recipe.difficulty === selectedDifficulty;

      return matchesSearch && matchesMealType && matchesDifficulty;
    });

    // Sort recipes
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "name":
          return a.name.localeCompare(b.name);
        case "favorites":
          return (b.favorites_count || 0) - (a.favorites_count || 0);
        case "time":
          return ((a.prep_time || 0) + (a.cook_time || 0)) - ((b.prep_time || 0) + (b.cook_time || 0));
        default:
          return 0;
      }
    });

    return filtered;
  }, [recipes, searchTerm, selectedMealType, selectedDifficulty, sortBy]);

  const getImageUrl = (recipe: Recipe) => {
    return recipe.permanent_url || recipe.image_url || "https://images.unsplash.com/photo-1546548970-71785318a17b?w=400&h=300&fit=crop&crop=center";
  };

  const getDifficultyFromComplexity = (complexity?: number) => {
    switch (complexity) {
      case 1: return "Easy";
      case 2: return "Moderate";
      case 3: return "Advanced";
      default: return "Easy";
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return "N/A";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {showSearch && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <div className="h-10 bg-muted animate-pulse rounded-md" />
            </div>
            {showFilters && (
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
                <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
                <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
              </div>
            )}
          </div>
        )}
        <div className={cn(
          "grid gap-6",
          layout === "grid" && {
            "grid-cols-1 sm:grid-cols-2": columns === 2,
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3": columns === 3,
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4": columns === 4,
          }
        )}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video bg-muted animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="h-6 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                  <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {showSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {showFilters && (
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Meal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Meals</SelectItem>
                  <SelectItem value="Breakfast">Breakfast</SelectItem>
                  <SelectItem value="Lunch">Lunch</SelectItem>
                  <SelectItem value="Dinner">Dinner</SelectItem>
                  <SelectItem value="Snack">Snack</SelectItem>
                  <SelectItem value="Dessert">Dessert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="favorites">Most Liked</SelectItem>
                  <SelectItem value="time">Cook Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedRecipes.length} recipe{filteredAndSortedRecipes.length !== 1 ? 's' : ''} found
        </p>
        {filteredAndSortedRecipes.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtered & Sorted</span>
          </div>
        )}
      </div>

      {/* Recipe Grid */}
      {filteredAndSortedRecipes.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
          <p className="text-muted-foreground">
            {recipes.length === 0 
              ? "You haven't created any recipes yet." 
              : "Try adjusting your search or filters."}
          </p>
        </div>
      ) : (
        <div className={cn(
          "grid gap-6",
          layout === "grid" && {
            "grid-cols-1 sm:grid-cols-2": columns === 2,
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3": columns === 3,
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4": columns === 4,
          },
          layout === "list" && "grid-cols-1",
          layout === "masonry" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}>
          {filteredAndSortedRecipes.map((recipe) => {
            const imageUrl = getImageUrl(recipe);
            const difficulty = recipe.difficulty || getDifficultyFromComplexity(recipe.complexity);
            const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

            return (
              <Card 
                key={recipe.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => onRecipeClick?.(recipe)}
              >
                {/* Recipe Image */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={recipe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onFavoriteToggle && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 bg-white/90 hover:bg-white text-gray-700 hover:text-red-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFavoriteToggle(recipe);
                          }}
                        >
                          <Heart 
                            className={cn(
                              "h-4 w-4 transition-colors",
                              recipe.favorited ? "fill-red-500 text-red-500" : ""
                            )}
                          />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs font-medium border",
                        difficultyColors[difficulty] || difficultyColors.Easy
                      )}
                    >
                      {difficulty}
                    </Badge>
                  </div>

                  {/* Favorites Count */}
                  {recipe.favorites_count && recipe.favorites_count > 0 && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="text-xs bg-white/90 text-gray-700">
                        <Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
                        {recipe.favorites_count}
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Recipe Title */}
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {recipe.name}
                    </h3>
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {recipe.description}
                      </p>
                    )}
                  </div>

                  {/* Recipe Meta */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {totalTime > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(totalTime)}</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{recipe.servings}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Section with Tags and Calendar Button */}
                  <div className="flex items-end justify-between gap-2">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 flex-1">
                      {recipe.meal_type && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            mealTypeColors[recipe.meal_type as keyof typeof mealTypeColors]
                          )}
                        >
                          {recipe.meal_type}
                        </Badge>
                      )}
                      {recipe.cuisine_type && (
                        <Badge variant="outline" className="text-xs">
                          {recipe.cuisine_type}
                        </Badge>
                      )}
                      {recipe.dietary_restrictions?.slice(0, 2).map((restriction) => (
                        <Badge key={restriction} variant="outline" className="text-xs">
                          {restriction}
                        </Badge>
                      ))}
                      {recipe.dietary_restrictions && recipe.dietary_restrictions.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipe.dietary_restrictions.length - 2}
                        </Badge>
                      )}
                    </div>

                    {/* Calendar Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRecipeForCalendar(recipe);
                        setShowCalendarModal(true);
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Nutrition Preview */}
                  {recipe.nutrition && recipe.nutrition.calories > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {recipe.nutrition.calories} cal
                      {recipe.nutrition.protein > 0 && ` • ${recipe.nutrition.protein}g protein`}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Calendar Modal */}
      {selectedRecipeForCalendar && (
        <CalendarEventModal
          isOpen={showCalendarModal}
          onClose={() => {
            setShowCalendarModal(false);
            setSelectedRecipeForCalendar(null);
          }}
          recipeName={selectedRecipeForCalendar.name}
          recipeDescription={selectedRecipeForCalendar.description || ""}
          mealType={selectedRecipeForCalendar.meal_type || "Dinner"}
          recipeId={selectedRecipeForCalendar.id}
        />
      )}
    </div>
  );
}

export default MyRecipes; 