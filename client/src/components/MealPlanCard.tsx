import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChefHat, Heart, Wand2, Calendar, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getIngredientSubstitutions, createInstacartRecipePage } from "@/lib/api";
import { InstacartCTA } from "@/components/InstacartCTA";
import { useTheme } from "@/hooks/use-theme";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { CalendarEventModal } from "@/components/CalendarEventModal";
import type { Preferences } from "@db/schema";
import type { Recipe } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type ComplexityLevel = 1 | 2 | 3;

const isValidComplexity = (value: number): value is ComplexityLevel =>
  value === 1 || value === 2 || value === 3;

type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";

interface MealPlanCardProps {
  recipe: Recipe;
  day: Date;
  meal: "breakfast" | "lunch" | "dinner";
  onRemove?: () => void;
}

const complexityNames: Record<ComplexityLevel, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
};

const mealColors: Record<MealPlanCardProps["meal"], string> = {
  breakfast: "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100",
  lunch: "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100",
  dinner: "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100",
};

interface IngredientSubstitutionProps {
  ingredient: string;
  amount: number;
  unit: string;
  preferences: Partial<Preferences>;
  onClose: () => void;
  onSwap: (oldIngredient: string, newIngredient: string) => void;
}

function IngredientSubstitution({ 
  ingredient, 
  amount, 
  unit, 
  preferences,
  onClose, 
  onSwap 
}: IngredientSubstitutionProps) {
  const [substitutions, setSubstitutions] = useState<string[]>([]);
  const [reasoning, setReasoning] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSubstitutions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getIngredientSubstitutions(ingredient, {
        dietary: preferences.dietary || [],
        allergies: preferences.allergies || []
      });
      setSubstitutions(result.substitutions);
      setReasoning(result.reasoning);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get substitutions");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to get substitutions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstitutions();
  }, [ingredient, preferences]);

  const handleSwap = (newIngredient: string) => {
    onSwap(ingredient, newIngredient);
    toast({
      title: "Ingredient Swapped",
      description: `Replaced ${amount} ${unit} ${ingredient} with ${amount} ${unit} ${newIngredient}`,
    });
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Substitutions for {amount} {unit} {ingredient}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading substitutions...</div>
          ) : error ? (
            <div className="text-center text-destructive py-4">{error}</div>
          ) : (
            <>
              <div>
                <h3 className="font-semibold mb-2">Alternatives:</h3>
                <ul className="space-y-2">
                  {substitutions.map((sub, index) => (
                    <li key={index} className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted">
                      <span className="text-muted-foreground">{sub}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwap(sub)}
                      >
                        Use Instead
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
              {reasoning && (
                <div>
                  <h3 className="font-semibold mb-2">Why these work:</h3>
                  <p className="text-muted-foreground">{reasoning}</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MealPlanCard({ recipe, day, meal, onRemove }: MealPlanCardProps) {
  const [selectedDate] = useState<Date>(new Date());
  const [showPreferences, setShowPreferences] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [featureContext, setFeatureContext] = useState<string>("");
  const [selectedIngredient, setSelectedIngredient] = useState<{name: string; amount: number; unit: string} | null>(null);
  const [isFavorited, setIsFavorited] = useState(recipe.favorited ?? false);
  const [localIngredients, setLocalIngredients] = useState(recipe.ingredients ?? []);
  const [isCreatingInstacartPage, setIsCreatingInstacartPage] = useState(false);
  const { theme } = useTheme();
  
  // Helper function to resolve the actual theme
  const getResolvedTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };
  const { toast } = useToast();
  const { data: user } = useUser();
  const { subscription } = useSubscription();
  const queryClient = useQueryClient();

  // Initialize local ingredients when recipe changes
  useEffect(() => {
    setLocalIngredients(recipe.ingredients ?? []);
  }, [recipe.ingredients]);

  const handleIngredientSwap = (oldIngredient: string, newIngredient: string) => {
    const updatedIngredients = localIngredients.map(ing => 
      ing.name === oldIngredient
        ? { ...ing, name: newIngredient }
        : ing
    );
    setLocalIngredients(updatedIngredients);
    
    // Update the grocery list in the parent component
    queryClient.setQueryData(['groceryList'], (oldData: any) => {
      if (!oldData) return oldData;
      
      const updatedList = oldData.map((item: any) => {
        if (item.name === oldIngredient) {
          return { ...item, name: newIngredient };
        }
        return item;
      });
      
      return updatedList;
    });
  };

  const handleShopWithInstacart = async () => {
    console.log('🚀 MEAL PLAN CARD [' + new Date().toISOString() + ']: Starting Instacart integration for recipe:', {
      recipeId: recipe.id,
      recipeName: recipe.name,
      version: 'NEW_VERSION_WITH_URL_IN_TOAST'
    });
    
    setIsCreatingInstacartPage(true);
    try {
      console.log('📡 API CALL: Calling createInstacartRecipePage...');
      const result = await createInstacartRecipePage(recipe.id);
      console.log('✅ API SUCCESS: Got result:', result);
      
      // Try to open in new tab (works on most browsers/devices)
      console.log('🔗 OPENING WINDOW: Attempting window.open with:', result.instacart_url);
      const newWindow = window.open(result.instacart_url, '_blank');
      console.log('🪟 WINDOW RESULT:', newWindow ? 'Window opened' : 'Window blocked/failed');
      
      // Always show toast with clickable link as fallback
      console.log('🍞 SHOWING TOAST: About to show toast with URL');
      toast({
        title: "Instacart Recipe Ready!",
        description: `Recipe page created with ${result.ingredient_count} ingredients. Tap anywhere to open Instacart.`,
        variant: "default",
        onClick: () => {
          console.log('🔗 TOAST CLICKED: Opening Instacart URL');
          window.open(result.instacart_url, '_blank');
        }
      });
      console.log('🍞 TOAST CALLED: Toast function has been called');
      
      console.log('✅ COMPLETE: Instacart URL created:', result.instacart_url);
      
    } catch (error) {
      console.error('Error creating Instacart recipe page:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Instacart recipe page",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInstacartPage(false);
    }
  };

  // Fetch user preferences
  const { data: userPreferences } = useQuery({
    queryKey: ['userPreferences'],
    queryFn: async () => {
      if (!user) return null;
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user preferences');
      }
      const data = await response.json();
      return data.preferences as Preferences;
    },
    enabled: !!user
  });

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
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to favorite recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsFavorited(!isFavorited);
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

  const complexity: ComplexityLevel = isValidComplexity(recipe.complexity)
    ? recipe.complexity
    : 1;

  const prepTime = recipe.prepTime ?? recipe.prep_time ?? 0;
  const cookTime = recipe.cookTime ?? recipe.cook_time ?? 0;
  const totalTime = prepTime + cookTime;
  const servings = recipe.servings ?? 2;
  const imageUrl = recipe.permanent_url || recipe.image_url || '';
  const description = recipe.description ?? '';

  const nutrition = {
    calories: recipe.nutrition?.calories ?? 0,
    protein: recipe.nutrition?.protein ?? 0,
    carbs: recipe.nutrition?.carbs ?? 0,
    fat: recipe.nutrition?.fat ?? 0,
  } as const;

  const ingredients = recipe.ingredients ?? [];
  const instructions = recipe.instructions ?? [];
  const tags = recipe.tags ?? [];

  // Convert meal type to proper format for calendar
  const getMealTypeForCalendar = (): MealType => {
    switch (meal) {
      case "breakfast":
        return "Breakfast";
      case "lunch":
        return "Lunch";
      case "dinner":
        return "Dinner";
      default:
        return "Dinner";
    }
  };

  return (
    <>
      <Card
        className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <CardHeader className="relative pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold">{recipe.name}</CardTitle>
            {onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 absolute top-2 right-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {day.toLocaleDateString()} - {meal.charAt(0).toUpperCase() + meal.slice(1)}
          </div>
        </CardHeader>
        <CardContent>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={recipe.name}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
          )}
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Prep:</span>{" "}
              {prepTime ? `${prepTime}m` : "N/A"}
            </div>
            <div>
              <span className="font-medium">Cook:</span>{" "}
              {cookTime ? `${cookTime}m` : "N/A"}
            </div>
            <div>
              <span className="font-medium">Servings:</span> {servings}
            </div>
            <div>
              <span className="font-medium">Calories:</span>{" "}
              {nutrition.calories || "N/A"}
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite.mutate();
              }}
              disabled={toggleFavorite.isPending}
              className={isFavorited ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-foreground"}
            >
              <Heart className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`} />
            </Button>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 border-primary/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCalendarModal(true);
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Add to Calendar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Schedule this recipe in your calendar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              

            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{recipe.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {imageUrl && (
              <>
                <img
                  src={imageUrl}
                  alt={recipe.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                  ⚠️ This image is generated by AI and may include ingredients that are not actually in the recipe. As with all cases, use your best reasoning and judgment.
                </div>
              </>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold">Prep Time:</span>
                <br />
                {prepTime ? `${prepTime} mins` : "N/A"}
              </div>
              <div>
                <span className="font-semibold">Cook Time:</span>
                <br />
                {cookTime ? `${cookTime} mins` : "N/A"}
              </div>
              <div>
                <span className="font-semibold">Total Time:</span>
                <br />
                {totalTime ? `${totalTime} mins` : "N/A"}
              </div>
              <div>
                <span className="font-semibold">Servings:</span>
                <br />
                {servings}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{description}</p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Ingredients</h3>
              <ul className="space-y-2">
                {localIngredients.map((ingredient, i) => (
                  <li key={i} className="flex items-center justify-between group">
                    <span>
                      {ingredient.amount} {ingredient.unit} {ingredient.name}
                    </span>
                    {subscription?.tier === 'premium' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedIngredient(ingredient)}
                      >
                        <Wand2 className="h-4 w-4 mr-2" />
                        Substitute
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Instructions</h3>
              <ol className="list-decimal list-inside space-y-2">
                {instructions.map((step, i) => (
                  <li key={i} className="text-muted-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Shop for Ingredients CTA */}
            <div className="bg-gradient-to-r from-[#FAF1E5]/20 to-[#FAF1E5]/10 border border-[#EFE9E1] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold mb-1">Get Recipe Ingredients</h3>
                  <p className="text-sm text-muted-foreground">
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
              <h3 className="font-semibold mb-2">Nutrition (per serving)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Calories:</span>
                  <br />
                  {nutrition.calories}
                </div>
                <div>
                  <span className="font-medium">Protein:</span>
                  <br />
                  {nutrition.protein}g
                </div>
                <div>
                  <span className="font-medium">Carbs:</span>
                  <br />
                  {nutrition.carbs}g
                </div>
                <div>
                  <span className="font-medium">Fat:</span>
                  <br />
                  {nutrition.fat}g
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

      {showCalendarModal && (
        <CalendarEventModal
          isOpen={showCalendarModal}
          onClose={() => setShowCalendarModal(false)}
          recipeName={recipe.name}
          recipeDescription={description}
          mealType={getMealTypeForCalendar()}
          initialDate={day}
          recipeId={recipe.id}
        />
      )}

      {selectedIngredient && (
        <IngredientSubstitution
          ingredient={selectedIngredient.name}
          amount={selectedIngredient.amount}
          unit={selectedIngredient.unit}
          preferences={userPreferences || {}}
          onClose={() => setSelectedIngredient(null)}
          onSwap={handleIngredientSwap}
        />
      )}

      {showSubscriptionModal && (
        <SubscriptionModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          feature={featureContext}
        />
      )}
    </>
  );
}