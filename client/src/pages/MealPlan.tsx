
import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import PreferenceModal from "@/components/PreferenceModal";
import MealPlanCard from "@/components/MealPlanCard";
import GroceryList from "@/components/GroceryList";
import { createMealPlan, createGroceryList, getTemporaryRecipes, generateMealPlan } from "@/lib/api";
import type { Recipe } from "@/lib/types";

type MealType = "breakfast" | "lunch" | "dinner";

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

export default function MealPlan() {
  type PreferenceType = "No Preference" | "Vegetarian" | "Vegan" | "Gluten-Free" | "Keto" | "Paleo" | "Mediterranean";
  type AllergyType = "Dairy" | "Eggs" | "Tree Nuts" | "Peanuts" | "Shellfish" | "Wheat" | "Soy";
  type CuisineType = "Italian" | "Mexican" | "Chinese" | "Japanese" | "Indian" | "Thai" | "Mediterranean" | "American" | "French";
  type MeatType = "Chicken" | "Beef" | "Pork" | "Fish" | "Lamb" | "Turkey" | "None";

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPreferences, setShowPreferences] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const { data: temporaryRecipes, isLoading, refetch } = useQuery({
    queryKey: ['temporaryRecipes'],
    queryFn: async () => {
      const response = await getTemporaryRecipes();
      return response as Recipe[];
    },
    refetchInterval: 60000,
  });

  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  useEffect(() => {
    if (temporaryRecipes && Array.isArray(temporaryRecipes)) {
      setGeneratedRecipes(temporaryRecipes.filter((recipe): recipe is Recipe => recipe !== null));
    }
  }, [temporaryRecipes]);

  useEffect(() => {
    localStorage.setItem('mealPlanPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const handleGenerateMealPlan = async () => {
    try {
      setIsGenerating(true);
      const result = await generateMealPlan(preferences, 2); // Generates 6 meals (2 days × 3 meals)
      await refetch();
      toast({
        title: "Success",
        description: "Meal plan generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate meal plan",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setShowPreferences(false);
    }
  };

  const saveMutation = useMutation<MealPlan, Error, void, unknown>({
    mutationFn: async (): Promise<MealPlan> => {
      if (!generatedRecipes.length) {
        throw new Error("No recipes generated to save");
      }

      const mealPlanData = {
        name: "Weekly Plan",
        startDate: selectedDate,
        endDate: new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        userId: user?.id ?? 0,
        recipes: generatedRecipes.map((recipe, index) => ({
          recipeId: recipe.id, // Ensure we pass negative IDs for temporary recipes
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
          userId: mealPlan.userId,
          mealPlanId: mealPlan.id,
          items,
          created: new Date(),
        });
      }

      const recipes = generatedRecipes.map((recipe, index) => ({
        recipeId: recipe.id,
        day: new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000).toISOString(),
        meal: index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner" as MealType
      }));

      return {
        id: mealPlan.id,
        userId: mealPlan.userId,
        name: mealPlan.name,
        startDate: mealPlan.startDate,
        endDate: mealPlan.endDate,
        recipes: recipes
      };
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
        description="Set your meal preferences and generate a personalized meal plan"
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
                <div className="text-center py-12">
                  <span className="loading loading-spinner"></span>
                  {isGenerating ? 'Generating meal plan...' : 'Loading meal plan...'}
                </div>
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
