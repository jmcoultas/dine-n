import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ChefHat, Heart } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Recipe } from "@/lib/types";

type ComplexityLevel = 1 | 2 | 3;

const isValidComplexity = (value: number): value is ComplexityLevel =>
  value === 1 || value === 2 || value === 3;

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

export default function MealPlanCard({ recipe, day, meal, onRemove }: MealPlanCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

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
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to favorite recipe");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'favorites'] });
      queryClient.invalidateQueries({ queryKey: ['temporaryRecipes'] });
      toast({
        title: "Recipe added to favorites",
        description: data.message,
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

  // Ensure type safety for complexity
  const complexity: ComplexityLevel = isValidComplexity(recipe.complexity) 
    ? recipe.complexity 
    : 1;

  // Add strict null checking for optional properties
  const prepTime = recipe.prep_time ?? 0;
  const cookTime = recipe.cook_time ?? 0;
  const totalTime = prepTime + cookTime;
  const servings = recipe.servings ?? 2;
  const imageUrl = recipe.image_url ?? '';
  const description = recipe.description ?? '';

  return (
    <>
      <Card 
        className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <div
          className="aspect-video relative"
          style={{
            backgroundImage: `url(${imageUrl})`,
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
            {imageUrl && (
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={recipe.name}
                  className="object-cover w-full h-full"
                />
              </div>
            )}

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
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Ingredients</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {recipe.ingredients.map((ingredient, i) => (
                      <li key={i}>
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recipe.instructions && recipe.instructions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <ol className="list-decimal list-inside space-y-1">
                    {recipe.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {recipe.nutrition && (
              <div>
                <h3 className="font-semibold mb-2">Nutrition</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{recipe.nutrition.calories}</div>
                    <div className="text-sm text-muted-foreground">Calories</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{recipe.nutrition.protein}g</div>
                    <div className="text-sm text-muted-foreground">Protein</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{recipe.nutrition.carbs}g</div>
                    <div className="text-sm text-muted-foreground">Carbs</div>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <div className="font-semibold">{recipe.nutrition.fat}g</div>
                    <div className="text-sm text-muted-foreground">Fat</div>
                  </div>
                </div>
              </div>
            )}

            {recipe.tags && recipe.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag, i) => (
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
    </>
  );
}