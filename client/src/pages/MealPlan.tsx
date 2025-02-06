import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import PreferenceModal from "@/components/PreferenceModal";
import MealPlanCard from "@/components/MealPlanCard";
import GroceryList from "@/components/GroceryList";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { createMealPlan, createGroceryList, generateMealPlan, getTemporaryRecipes } from "@/lib/api";
import type { Recipe, ChefPreferences } from "@/lib/types";
import type { Preferences, MealPlan } from "@db/schema";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { Wand2 } from "lucide-react";

type MealType = "breakfast" | "lunch" | "dinner";

const defaultChefPreferences: ChefPreferences = {
  difficulty: 'Moderate',
  cookTime: '30-60 minutes',
  servingSize: '4',
  mealPlanDuration: '2'
};

const calculateNutritionTotals = (recipes: Recipe[]) => {
  return recipes.reduce((totals, recipe) => {
    if (!recipe.nutrition) return totals;
    return {
      calories: (totals.calories || 0) + (recipe.nutrition.calories || 0),
      protein: (totals.protein || 0) + (recipe.nutrition.protein || 0),
      carbs: (totals.carbs || 0) + (recipe.nutrition.carbs || 0),
      fat: (totals.fat || 0) + (recipe.nutrition.fat || 0)
    };
  }, {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
};

const generateLoadingMessages = (preferences: Preferences, chefPreferences: ChefPreferences): string[] => {
  const messages: string[] = [];

  if (preferences.cuisine?.length) {
    preferences.cuisine.forEach(cuisine => {
      messages.push(`Exploring ${cuisine} cuisine recipes...`);
    });
  }

  if (preferences.dietary?.length) {
    preferences.dietary.forEach(diet => {
      messages.push(`Ensuring recipes follow ${diet} guidelines...`);
    });
  }

  if (preferences.allergies?.length) {
    preferences.allergies.forEach(allergy => {
      messages.push(`Checking for ${allergy} free alternatives...`);
    });
  }

  if (preferences.meatTypes?.length) {
    messages.push(`Including your preferred protein choices...`);
  }

  messages.push(
    `Finding ${chefPreferences.difficulty.toLowerCase()} level recipes...`,
    `Selecting dishes that take ${chefPreferences.cookTime.toLowerCase()} to prepare...`,
    `Adjusting portions for ${chefPreferences.servingSize} ${parseInt(chefPreferences.servingSize) === 1 ? 'person' : 'people'}...`
  );

  messages.push(
    "Calculating nutritional balance...",
    "Creating your personalized meal plan...",
    "Adding finishing touches..."
  );

  return messages;
};

export default function MealPlan() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPreferences, setShowPreferences] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState<string>("");
  const { subscription } = useSubscription();
  const [preferences, setPreferences] = useState<Preferences>(() => {
    const savedPreferences = localStorage.getItem('mealPlanPreferences');
    return savedPreferences ? JSON.parse(savedPreferences) : {
      dietary: [],
      allergies: [],
      cuisine: [],
      meatTypes: [],
      chefPreferences: defaultChefPreferences
    };
  });

  const { data: temporaryRecipes, isLoading: isLoadingRecipes } = useQuery({
    queryKey: ['temporary-recipes', 'mealplan'],
    queryFn: async () => {
      const response = await fetch('/api/temporary-recipes?source=mealplan', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch temporary recipes');
      }
      const data = await response.json();
      return data.map((recipe: any) => ({
        ...recipe,
        imageUrl: recipe.image_url || null,
        permanentUrl: recipe.permanent_url || null,
        prepTime: recipe.prep_time || null,
        cookTime: recipe.cook_time || null,
        favorited: false,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        tags: recipe.tags || [],
        nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        favorites_count: 0,
        expiresAt: recipe.expires_at
      }));
    }
  });

  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useUser();

  useEffect(() => {
    if (temporaryRecipes?.length > 0) {
      setGeneratedRecipes(temporaryRecipes);
    }
  }, [temporaryRecipes]);

  useEffect(() => {
    localStorage.setItem('mealPlanPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const handleGenerateMealPlan = async (chefPreferences: ChefPreferences, tempPreferences: Preferences) => {
    if (subscription?.tier !== 'premium') {
      setFeatureContext("Meal plan generation");
      setShowSubscriptionModal(true);
      return;
    }

    try {
      setIsGenerating(true);

      // Use the temporary preferences directly
      const updatedPreferences = {
        dietary: Array.isArray(tempPreferences.dietary) ? tempPreferences.dietary : [],
        allergies: Array.isArray(tempPreferences.allergies) ? tempPreferences.allergies : [],
        cuisine: Array.isArray(tempPreferences.cuisine) ? tempPreferences.cuisine : [],
        meatTypes: Array.isArray(tempPreferences.meatTypes) ? tempPreferences.meatTypes : [],
        chefPreferences: {
          difficulty: chefPreferences.difficulty || defaultChefPreferences.difficulty,
          cookTime: chefPreferences.cookTime || defaultChefPreferences.cookTime,
          servingSize: chefPreferences.servingSize || defaultChefPreferences.servingSize,
          mealPlanDuration: chefPreferences.mealPlanDuration || defaultChefPreferences.mealPlanDuration
        }
      };

      setPreferences(updatedPreferences);
      console.log('Generating meal plan with preferences:', JSON.stringify(updatedPreferences, null, 2));

      const result = await generateMealPlan(updatedPreferences, parseInt(chefPreferences.mealPlanDuration));
      if (!result.recipes || result.recipes.length === 0) {
        throw new Error('No recipes were generated. Please try again.');
      }

      // Transform and type cast the recipes
      const transformedRecipes = result.recipes.map(recipe => ({
        ...recipe,
        imageUrl: recipe.image_url || null,
        permanentUrl: recipe.permanent_url || null,
        prepTime: recipe.prep_time || null,
        cookTime: recipe.cook_time || null,
        favorited: false,
        ingredients: (recipe.ingredients || []) as { name: string; amount: number; unit: string; }[],
        instructions: (recipe.instructions || []) as string[],
        tags: (recipe.tags || []) as string[],
        nutrition: (recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 }) as { calories: number; protein: number; carbs: number; fat: number; },
        favorites_count: 0,
        expiresAt: undefined
      })) as Recipe[];

      setGeneratedRecipes(transformedRecipes);
      toast({
        title: "Success",
        description: "Meal plan generated successfully",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('subscription')) {
        setFeatureContext("Meal plan generation");
        setShowSubscriptionModal(true);
      } else if (error instanceof Error && !error.message.includes('format')) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
      setShowPreferences(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (subscription?.tier !== 'premium') {
        setFeatureContext("Meal plan saving");
        setShowSubscriptionModal(true);
        throw new Error("Premium subscription required");
      }

      if (!generatedRecipes.length) {
        throw new Error("No recipes generated to save");
      }

      const mealPlanData = {
        name: "Weekly Plan",
        start_date: selectedDate,
        end_date: new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        user_id: user?.id ?? 0,
        recipes: generatedRecipes.map((recipe, index) => ({
          recipe_id: recipe.id,
          day: new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000).toISOString(),
          meal: index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner"
        }))
      };

      const response = await createMealPlan(mealPlanData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      toast({
        title: "Success!",
        description: "Meal plan saved with grocery list.",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes('subscription')) {
        setFeatureContext("Meal plan saving");
        setShowSubscriptionModal(true);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  return (
    <div className="space-y-8">
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature={featureContext}
      />

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold">Meal Planning</h1>
          <p className="text-muted-foreground mb-4">
            Generate a personalized meal plan and organize your grocery shopping
          </p>
          {generatedRecipes.length > 0 && (
            <div className="bg-secondary/20 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold mb-2">Total Nutrition Facts</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(calculateNutritionTotals(generatedRecipes)).map(([nutrient, value]) => (
                  <div key={nutrient} className="space-y-1">
                    <p className="text-sm font-medium capitalize">{nutrient}</p>
                    <p className="text-lg font-semibold">
                      {nutrient === 'calories'
                        ? Math.round(value)
                        : `${Math.round(value)}g`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => setShowPreferences(true)}>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Meal Plan
          </Button>
        </div>
      </div>

      <PreferenceModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onUpdatePreferences={setPreferences}
        isGenerating={isGenerating}
        onGenerate={handleGenerateMealPlan}
        user={user ? {
          subscription_tier: user.subscription_tier,
          meal_plans_generated: user.meal_plans_generated
        } : undefined}
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
              {isGenerating ? (
                <LoadingAnimation
                  messages={generateLoadingMessages(preferences, preferences.chefPreferences || defaultChefPreferences)}
                />
              ) : generatedRecipes.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-3 gap-6">
                    {generatedRecipes.map((recipe, index) => {
                      const currentDay = new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000);
                      const mealType = index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner";

                      return (
                        <MealPlanCard
                          key={recipe.id}
                          recipe={{
                            ...recipe,
                            image_url: recipe.image_url || undefined,
                          }}
                          day={currentDay}
                          meal={mealType as MealType}
                          onRemove={() => {
                            const newRecipes = [...generatedRecipes];
                            const removedRecipe = newRecipes[index];
                            newRecipes.splice(index, 1);
                            setGeneratedRecipes(newRecipes);

                            toast({
                              title: "Recipe removed",
                              description: `${removedRecipe?.name || 'Recipe'} has been removed from your meal plan.`,
                            });
                          }}
                        />
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="mt-4"
                  >
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
                generatedRecipes
                  .flatMap(recipe => recipe.ingredients ?? [])
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const isPreferenceArray = (value: unknown): value is string[] => {
  return Array.isArray(value);
};