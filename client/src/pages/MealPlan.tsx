import { useState, useEffect } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import PreferenceModal from "@/components/PreferenceModal";
import MealPlanCard from "@/components/MealPlanCard";
import GroceryList from "@/components/GroceryList";
import { createMealPlan, createGroceryList } from "@/lib/api";
import { recipeSchema, type Recipe } from '@/types/recipe';
import { z } from 'zod';

// Define a schema for the grocery list item
const groceryItemSchema = z.object({
  name: z.string(),
  amount: z.number(),
  unit: z.string(),
  checked: z.boolean().default(false),
});

export default function MealPlan() {
  // Type definitions
  type PreferenceType = "No Preference" | "Vegetarian" | "Vegan" | "Gluten-Free" | "Keto" | "Paleo" | "Mediterranean";
  type AllergyType = "Dairy" | "Eggs" | "Tree Nuts" | "Peanuts" | "Shellfish" | "Wheat" | "Soy";
  type CuisineType = "Italian" | "Mexican" | "Chinese" | "Japanese" | "Indian" | "Thai" | "Mediterranean" | "American" | "French";
  type MeatType = "Chicken" | "Beef" | "Pork" | "Fish" | "Lamb" | "Turkey" | "None";
  type MealType = "breakfast" | "lunch" | "dinner";

  // State declarations
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<{
    dietary: PreferenceType[];
    allergies: AllergyType[];
    cuisine: CuisineType[];
    meatTypes: MeatType[];
  }>(() => {
    const savedPreferences = localStorage.getItem('mealPlanPreferences');
    return savedPreferences ? JSON.parse(savedPreferences) : {
      dietary: [],
      allergies: [],
      cuisine: [],
      meatTypes: [],
    };
  });

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

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('mealPlanPreferences', JSON.stringify(preferences));
  }, [preferences]);

  // Hooks
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [_, setLocation] = useLocation();

  // Effects
  useEffect(() => {
    return () => {
      localStorage.removeItem('generatedRecipes');
    };
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!generatedRecipes.length) {
        throw new Error("No recipes generated to save");
      }

      // First, ensure all recipes are properly validated and saved
      const savedRecipes = await Promise.all(
        generatedRecipes
          .filter((recipe): recipe is Recipe => recipe !== null)
          .map(async (recipe) => {
            if (recipe.id < 0) {
              try {
                // Validate recipe data using Zod schema
                const validatedRecipe = recipeSchema.parse({
                  ...recipe,
                  description: recipe.description || null,
                  imageUrl: recipe.imageUrl || null,
                  prepTime: recipe.prepTime || 0,
                  cookTime: recipe.cookTime || 0,
                  servings: recipe.servings || 2,
                  ingredients: recipe.ingredients?.map(ing => ({
                    name: String(ing.name || '').trim(),
                    amount: Number(ing.amount) || 0,
                    unit: String(ing.unit || '').trim()
                  })) ?? [],
                  instructions: recipe.instructions?.map(str => String(str).trim()) ?? [],
                  tags: recipe.tags?.map(tag => String(tag).trim()) ?? [],
                  nutrition: {
                    calories: Number(recipe.nutrition?.calories) || 0,
                    protein: Number(recipe.nutrition?.protein) || 0,
                    carbs: Number(recipe.nutrition?.carbs) || 0,
                    fat: Number(recipe.nutrition?.fat) || 0
                  },
                  complexity: recipe.complexity || 1
                });

                // Save validated recipe to favorites
                const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ recipe: validatedRecipe })
                });

                if (!response.ok) {
                  throw new Error(`Failed to save recipe: ${recipe.name}`);
                }

                const result = await response.json();
                return { ...recipe, id: result.permanentId };
              } catch (error) {
                console.error(`Error saving recipe ${recipe.name}:`, error);
                throw error;
              }
            }
            return recipe;
          })
      );

      // Create the meal plan with the saved recipes
      const mealPlan = await createMealPlan({
        name: "Weekly Plan",
        startDate: selectedDate,
        endDate: new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        userId: user?.id ?? 0,
      });

      // Validate and create grocery list items
      const groceryItems = savedRecipes.flatMap(recipe =>
        recipe.ingredients?.map(ingredient =>
          groceryItemSchema.parse({
            ...ingredient,
            checked: false,
          })
        ) ?? []
      );

      if (groceryItems.length > 0) {
        await createGroceryList({
          userId: mealPlan.userId,
          mealPlanId: mealPlan.id,
          items: groceryItems,
          created: new Date(),
        });
      }

      return { mealPlan, savedRecipes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      queryClient.invalidateQueries({ queryKey: ["recipes", "favorites"] });
      toast({
        title: "Success!",
        description: "Meal plan saved with grocery list. Redirecting to your recipes...",
      });
      // Ensure we navigate to the recipes page after successful save
      setLocation("/recipes");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Meal Planning</h1>
            <p className="text-muted-foreground mb-4">
              Generate a personalized meal plan and organize your grocery shopping
            </p>
            <div className="bg-secondary/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Current Preferences</h3>
              {Object.entries(preferences).some(([_, values]) => values.length > 0) ? (
                <div className="space-y-3">
                  {Object.entries(preferences).map(([key, values]) =>
                    values.length > 0 ? (
                      <div key={key} className="space-y-1.5">
                        <p className="text-sm font-medium capitalize">{key}:</p>
                        <div className="flex flex-wrap gap-2">
                          {values.map((item) => (
                            <Badge
                              key={item}
                              variant={
                                key === 'allergies' ? 'destructive' :
                                key === 'dietary' ? 'default' :
                                'secondary'
                              }
                              className="capitalize"
                            >
                              {String(item)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No preferences set</p>
              )}
            </div>
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
        isGenerating={false}
        onGenerate={() => {}}
      />

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
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