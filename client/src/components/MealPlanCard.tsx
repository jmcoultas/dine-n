import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChefHat, Heart, Wand2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { getIngredientSubstitutions } from "@/lib/api";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import type { Preferences } from "@db/schema";

type ComplexityLevel = 1 | 2 | 3;

const isValidComplexity = (value: number): value is ComplexityLevel =>
  value === 1 || value === 2 || value === 3;

interface MealPlanCardProps {
  recipe: {
    id: number;
    name: string;
    description: string | null;
    image_url: string | undefined;
    permanent_url?: string | null;
    isFavorited?: boolean;
    prepTime: number | null;
    cookTime: number | null;
    servings: number | null;
    ingredients: Array<{
      name: string;
      amount: number;
      unit: string;
    }> | null;
    instructions: string[] | null;
    tags: string[] | null;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    } | null;
    complexity: ComplexityLevel;
  };
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
  const [showDetails, setShowDetails] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<{name: string; amount: number; unit: string} | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [localIngredients, setLocalIngredients] = useState(recipe.ingredients ?? []);
  const { toast } = useToast();
  const { user } = useUser();
  const { subscription } = useSubscription();
  const queryClient = useQueryClient();

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

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Must be logged in to favorite recipes");
      }

      const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(recipe.id < 0 ? { recipe } : {})
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to favorite recipe");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'favorites'] });
      toast({
        title: "Recipe added to favorites",
        description: "The recipe has been added to your collection",
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

  const prepTime = recipe.prepTime ?? 0;
  const cookTime = recipe.cookTime ?? 0;
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
          <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
            <span
              className={`${
                mealColors[meal]
              } px-2 py-1 rounded-full text-sm font-medium capitalize`}
            >
              {meal}
            </span>
            <div className="flex gap-2">
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-white/80 hover:bg-white/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite.mutate();
                  }}
                >
                  <Heart className="h-5 w-5 text-gray-500 hover:text-red-500 transition-colors" />
                  <span className="sr-only">Add to favorites</span>
                </Button>
              )}
              {onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="bg-background/80 hover:bg-background text-foreground rounded-full w-6 h-6 flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        <CardHeader className="p-4">
          <div className="text-sm text-muted-foreground">
            {format(day, "EEEE, MMM do")}
          </div>
          <div className="font-semibold">{recipe.name}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
              <ChefHat className="w-4 h-4" />
              {complexityNames[complexity]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{totalTime} min</span>
            <span>{servings} servings</span>
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
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
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
                  {localIngredients.map((ingredient, i) => (
                    <li key={i} className="flex items-center justify-between group">
                      <span>
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (subscription?.tier !== 'premium') {
                            setShowSubscriptionModal(true);
                          } else {
                            setSelectedIngredient(ingredient);
                          }
                        }}
                      >
                        <Wand2 className="h-4 w-4" />
                        <span className="sr-only">Find substitutes</span>
                      </Button>
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

      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature="ingredient substitution"
      />
    </>
  );
}