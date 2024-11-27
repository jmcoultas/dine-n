import { useState, useEffect } from "react";
import PreferenceModal from "@/components/PreferenceModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { generateMealPlan, createMealPlan, createGroceryList } from "@/lib/api";
import MealPlanCard from "@/components/MealPlanCard";
import GroceryList from "@/components/GroceryList";
import { Wand2 } from "lucide-react";
import type { Recipe } from "@db/schema";

// Add dietary options
const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Keto",
  "Paleo",
  "Mediterranean"
];

const CUISINE_OPTIONS = [
  "Italian",
  "Mexican",
  "Chinese",
  "Japanese",
  "Indian",
  "Thai",
  "Mediterranean",
  "American",
  "French"
];

const MEAT_TYPE_OPTIONS = [
  "Chicken",
  "Beef",
  "Pork",
  "Fish",
  "Lamb",
  "Turkey",
  "None"
];

// Add common allergens
const ALLERGY_OPTIONS = [
  "Dairy",
  "Eggs",
  "Tree Nuts",
  "Peanuts",
  "Shellfish",
  "Wheat",
  "Soy"
];

export default function MealPlan() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [generatedRecipes, setGeneratedRecipes] = useState<Recipe[]>(() => {
    const savedRecipes = localStorage.getItem('generatedRecipes');
  useEffect(() => {
    return () => {
      localStorage.removeItem('generatedRecipes');
    };
  }, []);
    try {
      return savedRecipes ? JSON.parse(savedRecipes) : [];
    } catch {
      return [];
    }
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [preferences, setPreferences] = useState({
    dietary: [] as string[],
    allergies: [] as string[],
    cuisine: [] as string[],
    meatTypes: [] as string[],
  });

  const removePreference = (type: 'dietary' | 'allergies', value: string) => {
    setPreferences(prev => ({
      ...prev,
      [type]: prev[type].filter(item => item !== value)
    }));
  };

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

  const [showPreferences, setShowPreferences] = useState(false);

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
      />

      <div className="grid md:grid-cols-[300px_1fr] gap-8">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4 mb-4">
              <div>
                <label className="text-sm font-medium">Dietary Preferences</label>
                <Select
                  value={preferences.dietary.length > 0 ? preferences.dietary[0] : ""}
                  onValueChange={(value) => {
                    if (!preferences.dietary.includes(value)) {
                      setPreferences(prev => ({ ...prev, dietary: [...prev.dietary, value] }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select dietary preferences">
                      {preferences.dietary.length > 0 
                        ? `${preferences.dietary.length} selected`
                        : "Select dietary preferences"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DIETARY_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {preferences.dietary.map(item => (
                    <Badge 
                      key={item}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {item}
                      <button
                        className="ml-1 hover:bg-muted rounded-full"
                        onClick={() => removePreference('dietary', item)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Allergies</label>
                <Select
                  value={preferences.allergies.length > 0 ? preferences.allergies[0] : ""}
                  onValueChange={(value) => {
                    if (!preferences.allergies.includes(value)) {
                      setPreferences(prev => ({ ...prev, allergies: [...prev.allergies, value] }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select allergies">
                      {preferences.allergies.length > 0 
                        ? `${preferences.allergies.length} selected`
                        : "Select allergies"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ALLERGY_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {preferences.allergies.map(item => (
                    <Badge 
                      key={item}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {item}
                      <button
                        className="ml-1 hover:bg-muted rounded-full"
                        onClick={() => removePreference('allergies', item)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Cuisine Preferences</label>
                <Select
                  value={preferences.cuisine.length > 0 ? preferences.cuisine[0] : ""}
                  onValueChange={(value) => {
                    if (!preferences.cuisine.includes(value)) {
                      setPreferences(prev => ({ ...prev, cuisine: [...prev.cuisine, value] }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cuisine preferences">
                      {preferences.cuisine.length > 0 
                        ? `${preferences.cuisine.length} selected`
                        : "Select cuisine preferences"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {CUISINE_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {preferences.cuisine.map(item => (
                    <Badge 
                      key={item}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {item}
                      <button
                        className="ml-1 hover:bg-muted rounded-full"
                        onClick={() => removePreference('cuisine', item)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Meat Preferences</label>
                <Select
                  value={preferences.meatTypes.length > 0 ? preferences.meatTypes[0] : ""}
                  onValueChange={(value) => {
                    if (!preferences.meatTypes.includes(value)) {
                      setPreferences(prev => ({ ...prev, meatTypes: [...prev.meatTypes, value] }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select meat preferences">
                      {preferences.meatTypes.length > 0 
                        ? `${preferences.meatTypes.length} selected`
                        : "Select meat preferences"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MEAT_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 mt-2">
                  {preferences.meatTypes.map(item => (
                    <Badge 
                      key={item}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {item}
                      <button
                        className="ml-1 hover:bg-muted rounded-full"
                        onClick={() => removePreference('meatTypes', item)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
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
