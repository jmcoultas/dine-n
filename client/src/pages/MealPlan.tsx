import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import PreferenceModal from "@/components/PreferenceModal";
import MealPlanCard from "@/components/MealPlanCard";
import GroceryList from "@/components/GroceryList";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { createMealPlan, createGroceryList, getTemporaryRecipes, generateMealPlan } from "@/lib/api";
import type { Recipe } from "@/lib/types";
import type { Preferences } from "@db/schema";
import type { ChefPreferences } from "@/lib/types";
import { SubscriptionModal } from "@/components/SubscriptionModal";

type MealType = "breakfast" | "lunch" | "dinner";

interface MealPlanRecipe {
  recipe_id: number;
  day: string;
  meal: MealType;
}

interface MealPlan {
  id: number;
  user_id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  recipes: MealPlanRecipe[];
}

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
      chefPreferences: undefined
    };
  });

  const { data: temporaryRecipes, isLoading, refetch } = useQuery({
    queryKey: ['temporaryRecipes'],
    queryFn: async () => {
      const response = await fetch('/api/temporary-recipes?source=mealplan', {
        credentials: 'include'
      });
      if (!response.ok) {
        if (response.status === 403) {
          setFeatureContext("Meal plan viewing");
          setShowSubscriptionModal(true);
          return [];
        }
        throw new Error('Failed to fetch recipes');
      }
      return response.json() as Promise<Recipe[]>;
    },
    refetchInterval: 60000,
  });

  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  useEffect(() => {
    if (temporaryRecipes && Array.isArray(temporaryRecipes)) {
      setGeneratedRecipes(temporaryRecipes.filter((recipe): recipe is Recipe =>
        recipe !== null && typeof recipe === 'object' && 'id' in recipe
      ));
    }
  }, [temporaryRecipes]);

  useEffect(() => {
    localStorage.setItem('mealPlanPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const generateLoadingMessages = (preferences: Preferences, chefPreferences?: ChefPreferences): string[] => {
    const messages: string[] = [];

    // Add cuisine-based messages
    if (preferences.cuisine?.length) {
      preferences.cuisine.forEach(cuisine => {
        messages.push(`Exploring ${cuisine} cuisine recipes...`);
      });
    }

    // Add dietary restriction messages
    if (preferences.dietary?.length) {
      preferences.dietary.forEach(diet => {
        messages.push(`Ensuring recipes follow ${diet} guidelines...`);
      });
    }

    // Add allergy check messages
    if (preferences.allergies?.length) {
      preferences.allergies.forEach(allergy => {
        messages.push(`Checking for ${allergy} free alternatives...`);
      });
    }

    // Add meat preference messages
    if (preferences.meatTypes?.length) {
      messages.push(`Including your preferred protein choices...`);
    }

    // Add chef preference messages
    if (chefPreferences) {
      messages.push(
        `Finding ${chefPreferences.difficulty.toLowerCase()} level recipes...`,
        `Selecting dishes that take ${chefPreferences.cookTime.toLowerCase()} to prepare...`
      );
    }

    // Add general processing messages
    messages.push(
      "Calculating nutritional balance...",
      "Arranging your weekly menu...",
      "Adding finishing touches to your meal plan..."
    );

    return messages;
  };


  const handleGenerateMealPlan = async (chefPreferences: ChefPreferences) => {
    if (subscription?.tier !== 'premium') {
      setFeatureContext("Meal plan generation");
      setShowSubscriptionModal(true);
      return;
    }

    try {
      setIsGenerating(true);
      const result = await generateMealPlan(preferences, 2, chefPreferences);
      if (!result.recipes || result.recipes.length === 0) {
        throw new Error('No recipes were generated. Please try again.');
      }
      await refetch();
      toast({
        title: "Success",
        description: "Meal plan generated successfully",
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('subscription')) {
        setFeatureContext("Meal plan generation");
        setShowSubscriptionModal(true);
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate meal plan",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
      setShowPreferences(false);
    }
  };

  const saveMutation = useMutation<MealPlan, Error, void, unknown>({
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

      const mealPlan = await createMealPlan(mealPlanData);

      const items = generatedRecipes.flatMap(recipe =>
        recipe.ingredients?.map(ingredient => ({
          ...ingredient,
          checked: false,
        })) ?? []
      );

      if (items.length > 0) {
        await createGroceryList({
          user_id: mealPlan.user_id,
          meal_plan_id: mealPlan.id,
          items,
          created: new Date(),
        });
      }

      return {
        id: mealPlan.id,
        user_id: mealPlan.user_id,
        name: mealPlan.name,
        start_date: mealPlan.start_date,
        end_date: mealPlan.end_date,
        recipes: generatedRecipes.map((recipe, index) => ({
          recipe_id: recipe.id,
          day: new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000).toISOString(),
          meal: index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner" as MealType
        }))
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      toast({
        title: "Success!",
        description: "Meal plan saved with grocery list.",
      });
    },
    onError: (error) => {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Meal Planning</h1>
            <p className="text-muted-foreground mb-4">
              Generate a personalized meal plan and organize your grocery shopping
            </p>
            <div className="bg-secondary/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">Current Preferences</h3>
              {Object.entries(preferences).some(([key, values]) =>
                key !== 'chefPreferences' && Array.isArray(values) && values.length > 0
              ) ? (
                <div className="space-y-3">
                  {Object.entries(preferences).map(([key, values]) =>
                    key !== 'chefPreferences' && Array.isArray(values) && values.length > 0 ? (
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
            <Button
              onClick={() => setShowPreferences(true)}
              className="mt-4"
              variant="outline"
            >
              Update Preferences & Generate
            </Button>
          </div>
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
              {isLoading || isGenerating ? (
                <LoadingAnimation
                  messages={generateLoadingMessages(preferences, preferences.chefPreferences)}
                />
              ) : generatedRecipes.length > 0 ? (
                <>
                  {temporaryRecipes?.[0]?.expiresAt && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        This meal plan will expire in{" "}
                        {Math.ceil(
                          (new Date(temporaryRecipes[0].expiresAt).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                        )}{" "}
                        days. Save it to keep it permanently!
                      </p>
                    </div>
                  )}
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