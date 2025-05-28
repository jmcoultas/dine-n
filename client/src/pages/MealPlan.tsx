import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import PreferenceModal from "@/components/PreferenceModal";
import PreferenceSheet from "@/components/PreferenceSheet";
import MealPlanCard from "@/components/MealPlanCard";
import MissingRecipeCard from "@/components/MissingRecipeCard";
import GroceryList from "@/components/GroceryList";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { MealPlanLoadingState } from "@/components/MealPlanLoadingState";
import { createMealPlan, createGroceryList, generateMealPlan, getTemporaryRecipes, getCurrentMealPlan } from "@/lib/api";
import { downloadCalendarEvent } from "@/lib/calendar";
import type { Recipe, ChefPreferences, CreateMealPlanInput } from "@/lib/types";
import type { Preferences, MealPlan } from "@db/schema";
import { PreferenceSchema } from "@db/schema";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { Wand2, AlertCircle, Calendar, Plus, Bug, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMediaQuery } from "@/hooks/use-media-query";

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

interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

// Update the transformRecipe function with proper type handling
const transformRecipe = (recipe: any): Recipe => {
  // Handle dates with proper coercion
  const created = recipe.created_at ? new Date(recipe.created_at) : new Date();
  const recipeDay = recipe.day ? new Date(recipe.day) : null;
  const expiresAt = recipe.expires_at ? new Date(recipe.expires_at) : undefined;

  // Calculate meal type based on index if not present
  const mealType = recipe.meal || (recipe.index !== undefined ? 
    (recipe.index % 3 === 0 ? "breakfast" : recipe.index % 3 === 1 ? "lunch" : "dinner") : 
    "dinner"); // Default to dinner if no index available

  return {
    ...recipe,
    imageUrl: recipe.permanent_url || recipe.image_url || null,
    permanentUrl: recipe.permanent_url || null,
    prepTime: recipe.prep_time || null,
    cookTime: recipe.cook_time || null,
    isFavorited: recipe.favorited || false,
    // Ensure all required properties are present
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ingredient: Partial<Ingredient>) => ({
      name: String(ingredient.name || ''),
      amount: Number(ingredient.amount || 0),
      unit: String(ingredient.unit || '')
    })) : [],
    instructions: recipe.instructions || [],
    tags: recipe.tags || [],
    nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
    complexity: recipe.complexity || 1,
    created_at: created,
    meal: mealType,
    day: recipeDay,
    expiresAt,
    // Ensure the recipe_id is included if present
    recipe_id: recipe.recipe_id
  };
};

export default function MealPlan() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPreferences, setShowPreferences] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState<string>("");
  const [showBatchCalendarModal, setShowBatchCalendarModal] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading: isUserLoading } = useUser();
  const isMobile = useMediaQuery("(max-width: 640px)");
  
  // Add a check for development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Test function to trigger loading state
  const handleTestLoadingState = () => {
    toast({
      title: "Test Mode",
      description: "Loading state activated for 15 seconds",
    });
    
    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Test Complete",
        description: "Loading state deactivated",
      });
    }, 15000);
  };

  // Update the currentMealPlan query to transform recipes
  const { data: currentMealPlan, isLoading: isLoadingMealPlan } = useQuery({
    queryKey: ['current-meal-plan'],
    queryFn: async () => {
      const plan = await getCurrentMealPlan();
      if (!plan) return null;
      return {
        ...plan,
        recipes: plan.recipes.map((recipe, index) => transformRecipe({ ...recipe, index }))
      };
    },
  });

  // Initialize preferences from user account or with default values
  const [preferences, setPreferences] = useState<Preferences>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: [],
    chefPreferences: defaultChefPreferences
  });

  // Set initial temp preferences
  const [tempPreferences, setTempPreferences] = useState<Preferences>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: []
  });
  const [missingMeals, setMissingMeals] = useState<Array<{ day: number; meal: string }>>([]);

  // Load preferences from user account when user data is loaded
  useEffect(() => {
    if (user && user.preferences) {
      const parsedPrefs = PreferenceSchema.safeParse(user.preferences);
      if (parsedPrefs.success) {
        setPreferences(parsedPrefs.data);
        setTempPreferences(parsedPrefs.data);
      }
    }
  }, [user]);

  // Function to save preferences to user account
  const savePreferencesToAccount = async (updatedPreferences: Preferences) => {
    if (!user) return;
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          preferences: updatedPreferences
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences to account');
      }

      // Invalidate the user query to ensure it has the latest preferences
      await queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error) {
      console.error('Error saving preferences to account:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save preferences",
        variant: "destructive",
      });
    }
  };

  const handleGenerateMealPlan = async (chefPreferences: ChefPreferences, tempPreferences: Preferences) => {
    if (!subscription) {
      setFeatureContext("Meal plan generation");
      setShowSubscriptionModal(true);
      return;
    }

    const allowedDays = subscription.tier === 'premium' ? 7 : 2;
    const requestedDays = parseInt(chefPreferences.mealPlanDuration);
    
    if (requestedDays > allowedDays) {
      toast({
        title: "Plan Duration Limit",
        description: `Free tier is limited to 2 days. Upgrade to premium for up to 7 days.`,
        variant: "destructive",
      });
      return;
    }

    // Prepare the preferences data
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

    // Update local state and close modal
    setPreferences(updatedPreferences);
    setTempPreferences(updatedPreferences);
    setShowPreferences(false);
    
    // Start loading state immediately
    setIsGenerating(true);

    try {
      // Save preferences to user account
      if (user) {
        await savePreferencesToAccount(updatedPreferences);
      }

      // Generate the meal plan
      const result = await generateMealPlan(updatedPreferences, requestedDays);
      if (!result.recipes || result.recipes.length === 0) {
        throw new Error('No recipes were generated. Please try again.');
      }

      console.log('Generated recipes:', JSON.stringify(result.recipes, null, 2));
      
      // Handle missing meals
      if (result.status === 'partial' && result.missingMeals) {
        setMissingMeals(result.missingMeals);
        toast({
          title: "Partial Success",
          description: result.message || `Generated ${result.recipes.length} out of ${requestedDays * 3} recipes`,
          variant: "default",
        });
      } else {
        setMissingMeals([]);
      }

      // Create the meal plan
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + requestedDays - 1);
      
      const expirationDate = new Date(selectedDate);
      expirationDate.setDate(expirationDate.getDate() + requestedDays);

      const mealPlanInput = {
        name: `Meal Plan ${new Date().toLocaleDateString()}`,
        start_date: selectedDate,
        end_date: endDate,
        expiration_date: expirationDate,
        days_generated: requestedDays,
        is_expired: false,
        recipes: result.recipes.map(recipe => ({ id: recipe.id }))
      };

      console.log('Creating meal plan with input:', JSON.stringify(mealPlanInput, null, 2));

      const createdMealPlan = await createMealPlan(mealPlanInput);
      console.log('Meal plan created:', JSON.stringify(createdMealPlan, null, 2));
      
      // Refresh the meal plan data
      await queryClient.invalidateQueries({ queryKey: ['current-meal-plan'] });
      await queryClient.refetchQueries({ queryKey: ['current-meal-plan'] });

      toast({
        title: "Success",
        description: `Meal plan generated successfully. Valid for ${requestedDays} days.`
      });

    } catch (error) {
      console.error('Error in meal plan generation:', error);
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      // Always clear loading state when done
      setIsGenerating(false);
    }
  };

  // Function to regenerate a missing recipe
  const handleRegenerateMissingRecipe = async (day: number, meal: string) => {
    try {
      // We don't set the full isGenerating state here because the MissingRecipeCard 
      // already shows its own loading state and we don't want to block the whole UI
      
      const response = await fetch("/api/regenerate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          day,
          meal,
          preferences: tempPreferences
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to regenerate recipe");
      }

      // Remove this meal from missing meals
      setMissingMeals(prev => prev.filter(m => !(m.day === day && m.meal === meal)));
      
      // Refresh the meal plan data
      await queryClient.invalidateQueries({ queryKey: ['current-meal-plan'] });
      
      return await response.json();
    } catch (error) {
      console.error('Error regenerating recipe:', error);
      throw error;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (subscription?.tier !== 'premium') {
        setFeatureContext("Meal plan saving");
        setShowSubscriptionModal(true);
        throw new Error("Premium subscription required");
      }

      const mealPlanData: CreateMealPlanInput = {
        name: "Weekly Plan",
        start_date: selectedDate,
        end_date: new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        expiration_date: new Date(selectedDate.getTime() + 8 * 24 * 60 * 60 * 1000),
        days_generated: 7,
        is_expired: false,
        recipes: currentMealPlan?.recipes.map(recipe => ({
          id: recipe.id
        })) ?? []
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

  // Update the empty state message based on meal plan status
  const renderEmptyState = () => {
    if (isLoadingMealPlan) {
      return (
        <div className="text-center py-12">
          <LoadingAnimation messages={["Loading your meal plan..."]} />
        </div>
      );
    }

    if (currentMealPlan?.is_expired) {
      return (
        <div className="text-center py-12 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-muted-foreground">Your meal plan has expired</h2>
            <p className="text-muted-foreground">Ready to plan your next delicious week?</p>
          </div>
          
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/20 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Weekly Planner</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-powered recipe suggestions and create your perfect meal plan in just a few clicks.
            </p>
            <Button 
              onClick={() => window.location.href = '/weekly-planner'} 
              className="w-full"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Create New Meal Plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Or{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs" 
              onClick={() => setShowPreferences(true)}
            >
              use the classic meal plan generator
            </Button>
          </div>
          
          {isDevelopment && (
            <Button variant="outline" onClick={handleTestLoadingState}>
              <Bug className="mr-2 h-4 w-4" />
              Test Loading State
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-12 space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-muted-foreground">No meal plan yet</h2>
          <p className="text-muted-foreground">Let's create your first personalized meal plan!</p>
        </div>
        
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/20 p-2 rounded-full">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">Weekly Planner</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Get AI-powered recipe suggestions and create your perfect meal plan in just a few clicks.
          </p>
          <Button 
            onClick={() => window.location.href = '/weekly-planner'} 
            className="w-full"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Start Planning
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Or{' '}
          <Button 
            variant="link" 
            className="p-0 h-auto text-xs" 
            onClick={() => setShowPreferences(true)}
          >
            use the classic meal plan generator
          </Button>
        </div>
        
        {isDevelopment && (
          <Button variant="outline" onClick={handleTestLoadingState}>
            <Bug className="mr-2 h-4 w-4" />
            Test Loading State
          </Button>
        )}
      </div>
    );
  };

  // Add expiration warning if meal plan is close to expiring
  const renderExpirationWarning = () => {
    if (!currentMealPlan?.expiration_date) return null;

    const now = new Date();
    const expirationDate = new Date(currentMealPlan.expiration_date);
    const hoursUntilExpiration = Math.max(0, (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (currentMealPlan.is_expired) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Meal Plan Expired</AlertTitle>
          <AlertDescription>
            This meal plan has expired. Please generate a new one.
          </AlertDescription>
        </Alert>
      );
    }

    if (hoursUntilExpiration < 24) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Meal Plan Expiring Soon</AlertTitle>
          <AlertDescription>
            This meal plan will expire in {Math.ceil(hoursUntilExpiration)} hours.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  // Add this function to handle batch calendar selection
  const handleBatchCalendarAdd = () => {
    if (!currentMealPlan || currentMealPlan.is_expired) return;
    
    setSelectedRecipes(currentMealPlan.recipes);
    setShowBatchCalendarModal(true);
  };

  // Add this component inside the MealPlan component, right before the final return statement
  const FloatingCalendarButton = () => {
    if (!currentMealPlan || currentMealPlan.is_expired) return null;
    
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                size="lg" 
                className="rounded-full h-14 w-14 shadow-lg flex items-center justify-center bg-primary hover:bg-primary/90"
                onClick={handleBatchCalendarAdd}
              >
                <Calendar className="h-6 w-6 text-primary-foreground" />
                <span className="sr-only">Add to Calendar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add all recipes to calendar</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  };

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
        </div>
      </div>

      {renderExpirationWarning()}

      {isMobile ? (
        <PreferenceSheet
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
          skipToChefPreferences={Object.entries(preferences).some(([key, value]) =>
            key !== 'chefPreferences' && Array.isArray(value) && value.length > 0
          )}
        />
      ) : (
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
          skipToChefPreferences={Object.entries(preferences).some(([key, value]) =>
            key !== 'chefPreferences' && Array.isArray(value) && value.length > 0
          )}
        />
      )}

      <Tabs defaultValue="meals" className="w-full">
        <TabsList>
          <TabsTrigger value="meals">Meal Plan</TabsTrigger>
          <TabsTrigger value="grocery">Grocery List</TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="mt-6">
          {currentMealPlan && !currentMealPlan.is_expired && !isGenerating && (
            <div className="flex justify-end mb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      onClick={handleBatchCalendarAdd}
                      className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border-primary/20"
                    >
                      <Calendar className="h-4 w-4" />
                      Add All to Calendar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Schedule all recipes in your calendar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {isDevelopment && (
                <Button 
                  variant="ghost" 
                  onClick={handleTestLoadingState}
                  className="ml-2 flex items-center gap-2 text-muted-foreground"
                >
                  <Bug className="h-4 w-4" />
                  Test Loading
                </Button>
              )}
            </div>
          )}
          <div className="grid gap-6">
            {isGenerating ? (
              <MealPlanLoadingState
                messages={generateLoadingMessages(tempPreferences, tempPreferences.chefPreferences || defaultChefPreferences)}
                baseMessage="Cooking up your personalized meal plan..."
              />
            ) : (
              <>
                {currentMealPlan && !currentMealPlan.is_expired ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    {currentMealPlan.recipes.map((recipe, index) => {
                      // Calculate the day based on the index if no valid date is provided
                      const day = new Date(selectedDate);
                      day.setDate(day.getDate() + Math.floor(index / 3));
                      const mealIndex = index % 3;
                      const mealType = ["breakfast", "lunch", "dinner"][mealIndex] as MealType;
                      
                      return (
                        <MealPlanCard
                          key={recipe.id}
                          recipe={recipe}
                          day={day}
                          meal={recipe.meal as MealType || mealType}
                          onRemove={() => {
                            // Handle recipe removal
                            toast({
                              title: "Recipe removed",
                              description: `${recipe.name} has been removed from your meal plan.`,
                            });
                          }}
                        />
                      );
                    })}
                    
                    {/* Display placeholders for missing recipes */}
                    {missingMeals.map((missingMeal, index) => {
                      const day = new Date(selectedDate);
                      day.setDate(day.getDate() + missingMeal.day);
                      
                      return (
                        <MissingRecipeCard
                          key={`missing-${missingMeal.day}-${missingMeal.meal}`}
                          day={day}
                          meal={missingMeal.meal}
                          onRegenerate={() => handleRegenerateMissingRecipe(missingMeal.day, missingMeal.meal)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  renderEmptyState()
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="grocery">
          {isGenerating ? (
            <MealPlanLoadingState
              messages={generateLoadingMessages(tempPreferences, tempPreferences.chefPreferences || defaultChefPreferences)}
              baseMessage="Preparing your grocery list..."
            />
          ) : (
            <>
              {isDevelopment && currentMealPlan && !currentMealPlan.is_expired && (
                <div className="flex justify-end mb-4">
                  <Button 
                    variant="ghost" 
                    onClick={handleTestLoadingState}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <Bug className="h-4 w-4" />
                    Test Loading
                  </Button>
                </div>
              )}
              <GroceryList
                items={
                  currentMealPlan?.recipes.flatMap(recipe => 
                    (recipe.ingredients || []).map(ingredient => ({
                      name: String(ingredient.name || ''),
                      amount: Number(ingredient.amount || 0),
                      unit: String(ingredient.unit || ''),
                      checked: false
                    }))
                  ) ?? []
                }
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {showBatchCalendarModal && (
        <Dialog open={showBatchCalendarModal} onOpenChange={setShowBatchCalendarModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add All Recipes to Calendar</DialogTitle>
              <DialogDescription>
                Choose when you'd like to start your meal plan
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBatchCalendarModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Add all recipes to calendar starting from selected date
                selectedRecipes.forEach((recipe, index) => {
                  const day = new Date(selectedDate);
                  day.setDate(day.getDate() + Math.floor(index / 3));
                  const mealIndex = index % 3;
                  const mealTypeMap = {
                    0: "Breakfast",
                    1: "Lunch",
                    2: "Dinner"
                  } as const;
                  const mealType = mealTypeMap[mealIndex as 0 | 1 | 2];
                  
                  downloadCalendarEvent({
                    title: `Cook: ${recipe.name}`,
                    description: recipe.description || "",
                    date: day,
                    mealType,
                    recipeId: recipe.id
                  });
                });
                
                setShowBatchCalendarModal(false);
                toast({
                  title: "Success",
                  description: `Added ${selectedRecipes.length} recipes to your calendar`,
                });
              }}>
                Add All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <FloatingCalendarButton />
    </div>
  );
}
