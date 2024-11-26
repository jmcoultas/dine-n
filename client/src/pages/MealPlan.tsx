import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { generateMealPlan, createMealPlan, createGroceryList } from "@/lib/api";
import MealPlanCard from "@/components/MealPlanCard";
import GroceryList from "@/components/GroceryList";
import { Wand2 } from "lucide-react";
import type { Recipe } from "@db/schema";

export default function MealPlan() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [preferences, setPreferences] = useState({
    dietary: [] as string[],
    allergies: [] as string[],
  });

  const generateMutation = useMutation({
    mutationFn: () => generateMealPlan(preferences, 7),
    onSuccess: (data) => {
      setGeneratedRecipes(data);
      toast({
        title: "Meal plan generated!",
        description: "Your personalized meal plan is ready.",
      });
    },
    onError: (error: any) => {
      const errorType = error.response?.data?.type;
      toast({
        title: "Error",
        description: errorType === "insufficient_quota" 
          ? "Service temporarily unavailable. Please try again later."
          : "Failed to generate meal plan. Please try again.",
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
          day: new Date(selectedDate.getTime() + index * 24 * 60 * 60 * 1000).toISOString(),
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
        <h1 className="text-4xl font-bold">Meal Planning</h1>
        <p className="text-muted-foreground">
          Generate a personalized meal plan and organize your grocery shopping
        </p>
      </div>

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <Button
              className="w-full mt-4"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Meal Plan
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
                    {generatedRecipes.map((recipe, index) => (
                      <MealPlanCard
                        key={recipe.id}
                        recipe={recipe}
                        day={new Date(selectedDate.getTime() + index * 24 * 60 * 60 * 1000)}
                        meal={index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner"}
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
