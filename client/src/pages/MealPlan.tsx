import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PreferenceModal from "@/components/PreferenceModal";
import MealPlanCard from "@/components/MealPlanCard";
import GroceryList from "@/components/GroceryList";
import { generateMealPlan, createMealPlan, createGroceryList } from "@/lib/api";

export default function MealPlan() {
  // Type definitions
  type PreferenceType = "No Preference" | "Vegetarian" | "Vegan" | "Gluten-Free" | "Keto" | "Paleo" | "Mediterranean";
  type AllergyType = "Dairy" | "Eggs" | "Tree Nuts" | "Peanuts" | "Shellfish" | "Wheat" | "Soy";
  type CuisineType = "Italian" | "Mexican" | "Chinese" | "Japanese" | "Indian" | "Thai" | "Mediterranean" | "American" | "French";
  type MeatType = "Chicken" | "Beef" | "Pork" | "Fish" | "Lamb" | "Turkey" | "None";
  type MealType = "breakfast" | "lunch" | "dinner";

  // State declarations
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  interface RecipeIngredient {
    name: string;
    amount: number;
    unit: string;
  }

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
    imageUrl?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<RecipeIngredient>;
    instructions?: Array<string>;
    tags?: Array<string>;
    nutrition?: RecipeNutrition;
    complexity: 1 | 2 | 3;
  }

  interface MealPlanRecipe {
    recipeId: number;
    day: string;
    meal: MealType;
  }

  interface MealPlan {
    id: number;
    userId: number;
    name: string;
    startDate: Date;
    endDate: Date;
    recipes: MealPlanRecipe[];
  }

  const [generatedRecipes, setGeneratedRecipes] = useState<(Recipe | null)[]>(() => {
    const savedRecipes = localStorage.getItem('generatedRecipes');
    try {
      return savedRecipes ? JSON.parse(savedRecipes) : [];
    } catch {
      return [];
    }
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<{
    dietary: PreferenceType[];
    allergies: AllergyType[];
    cuisine: CuisineType[];
    meatTypes: MeatType[];
  }>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: [],
  });

  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Effects
  useEffect(() => {
    return () => {
      localStorage.removeItem('generatedRecipes');
    };
  }, []);

  // Mutations
  const generateMutation = useMutation({
    mutationFn: () => generateMealPlan(preferences, 2),
    onSuccess: (data) => {
      if (Array.isArray(data.recipes)) {
        setGeneratedRecipes(data.recipes.map(recipe => {
          const complexity = recipe.complexity;
          if (complexity !== 1 && complexity !== 2 && complexity !== 3) {
            return null;
          }
          return {
            ...recipe,
            complexity: complexity as 1 | 2 | 3,
            description: recipe.description ?? undefined,
            imageUrl: recipe.imageUrl ?? undefined,
            prepTime: recipe.prepTime ?? undefined,
            cookTime: recipe.cookTime ?? undefined,
            servings: recipe.servings ?? undefined,
            instructions: recipe.instructions ? JSON.parse(recipe.instructions) : undefined,
            tags: recipe.tags ? JSON.parse(recipe.tags) : undefined,
            ingredients: recipe.ingredients ? JSON.parse(JSON.stringify(recipe.ingredients)) : undefined,
            nutrition: recipe.nutrition ? JSON.parse(JSON.stringify(recipe.nutrition)) : undefined,
          };
        }));
        if (data.status === 'partial') {
          toast({
            title: "Using fallback recipes",
            description: "Generated meal plan with pre-defined recipes that match your preferences.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Meal plan generated!",
            description: "Your personalized meal plan is ready.",
          });
        }
      }
    },
    onError: (error: any) => {
      const errorType = error.response?.data?.type;
      let title = "Error";
      let description = "Failed to generate meal plan. Please try again.";

      switch (errorType) {
        case "service_unavailable":
          title = "Service Unavailable";
          description = "Recipe generation service is temporarily unavailable. Please try again later.";
          break;
        case "connection_error":
          title = "Connection Error";
          description = "Unable to connect to the recipe service. Please check your connection.";
          break;
        case "invalid_preferences":
          title = "Invalid Preferences";
          description = "Unable to generate recipes with the selected preferences. Please adjust and try again.";
          break;
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const mealPlan = await createMealPlan({
        userId: 1, // Mock user ID
        name: "Weekly Plan",
        startDate: selectedDate,
        endDate: new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        recipes: generatedRecipes
          .filter((recipe): recipe is Recipe => recipe !== null)
          .map((recipe, index) => ({
            recipeId: recipe.id,
            day: new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000).toISOString(),
            meal: (index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner") as MealType,
          })),
      });

      await createGroceryList({
        userId: 1,
        mealPlanId: mealPlan.id,
        items: generatedRecipes
          .filter((recipe): recipe is Recipe => recipe !== null)
          .flatMap((recipe) =>
            recipe.ingredients?.map((ingredient) => ({
              ...ingredient,
              checked: false,
            })) ?? []
          ),
        created: new Date(),
      });

      return mealPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      toast({
        title: "Success!",
        description: "Meal plan saved with grocery list.",
      });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Meal Planning</h1>
            <p className="text-muted-foreground">
              Generate a personalized meal plan and organize your grocery shopping
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowPreferences(true)}
          >
            Set Preferences
          </Button>
        </div>
      </div>

      <PreferenceModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onUpdatePreferences={setPreferences}
        isGenerating={generateMutation.isPending}
        onGenerate={() => generateMutation.mutate()}
      />

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border mb-4"
            />
            <Button
              className="w-full"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Meal Plan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="meals">
          <TabsList>
            <TabsTrigger value="meals">Meal Plan</TabsTrigger>
            <TabsTrigger value="grocery">Grocery List</TabsTrigger>
          </TabsList>

          <TabsContent value="meals" className="mt-6">
            <div className="grid gap-6">
              {generatedRecipes.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, index) => {
                      const recipe = generatedRecipes[index];
                      const currentDay = new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000);
                      const mealType = index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner";
                      
                      return recipe ? (
                        <MealPlanCard
                          key={recipe.id}
                          recipe={recipe}
                          day={currentDay}
                          meal={mealType}
                          onRemove={() => {
                            const newRecipes = [...generatedRecipes];
                            const removedRecipe = newRecipes[index];
                            newRecipes[index] = null;
                            setGeneratedRecipes(newRecipes);
                            localStorage.setItem('generatedRecipes', JSON.stringify(newRecipes.filter(Boolean)));
                            
                            // Update localStorage and show success message
                            toast({
                              title: "Recipe removed",
                              description: `${removedRecipe?.name || 'Recipe'} has been removed from your meal plan and grocery list updated.`,
                            });
                          }}
                        />
                      ) : (
                        <div 
                          key={`empty-${index}`} 
                          className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center"
                        >
                          <span className="text-muted-foreground">
                            {mealType.charAt(0).toUpperCase() + mealType.slice(1)} slot
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    Save Meal Plan
                  </Button>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Generate a meal plan to get started
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="grocery">
            <GroceryList 
              items={
                Array.isArray(generatedRecipes) 
                  ? generatedRecipes
                      .filter((recipe): recipe is Recipe => recipe !== null)
                      .flatMap(recipe => recipe.ingredients ?? [])
                  : []
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}