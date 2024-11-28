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
  // State declarations
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [generatedRecipes, setGeneratedRecipes] = useState(() => {
    const savedRecipes = localStorage.getItem('generatedRecipes');
    try {
      return savedRecipes ? JSON.parse(savedRecipes) : [];
    } catch {
      return [];
    }
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    dietary: [] as string[],
    allergies: [] as string[],
    cuisine: [] as string[],
    meatTypes: [] as string[],
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
      if (data.recipes) {
        setGeneratedRecipes(data.recipes);
        if (data.status === 'partial') {
          toast({
            title: "Using fallback recipes",
            description: "Generated meal plan with pre-defined recipes that match your preferences.",
            variant: "warning",
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
        recipes: generatedRecipes.map((recipe, index) => ({
          recipeId: recipe.id,
          day: new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000).toISOString(),
          meal: index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner",
        })),
      });

      await createGroceryList({
        userId: 1,
        mealPlanId: mealPlan.id,
        items: generatedRecipes.flatMap((recipe) =>
          recipe.ingredients?.map((ingredient) => ({
            ...ingredient,
            checked: false,
          })) ?? []
        ),
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
                    {generatedRecipes.slice(0, 6).map((recipe, index) => (
                      <MealPlanCard
                        key={recipe.id}
                        recipe={recipe}
                        day={new Date(selectedDate.getTime() + Math.floor(index / 3) * 24 * 60 * 60 * 1000)}
                        meal={index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner"}
                        onRemove={() => {
                          const newRecipes = generatedRecipes.filter((_, i) => i !== index);
                          setGeneratedRecipes(newRecipes);
                          localStorage.setItem('generatedRecipes', JSON.stringify(newRecipes));
                        }}
                      />
                    ))}
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
                  ? generatedRecipes.flatMap(r => r.ingredients || [])
                  : []
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}