import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { MealPlanLoadingState } from "@/components/MealPlanLoadingState";
import { SuggestionLoadingState } from "@/components/SuggestionLoadingState";
import { SubscriptionModal } from "@/components/SubscriptionModal";

import { Calendar, Sunrise, Sun, Moon, Wand2, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { getCurrentMealPlan } from "@/lib/api";
import type { Preferences } from "@db/schema";
import { PreferenceSchema } from "@db/schema";
import type { Recipe } from "@/lib/types";

interface RecipeSuggestion {
  title: string;
  cuisineType: string;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
  estimatedTime: string;
  tags: string[];
}

interface WeeklyPlannerSuggestions {
  breakfast: RecipeSuggestion[];
  lunch: RecipeSuggestion[];
  dinner: RecipeSuggestion[];
}

interface SelectedRecipes {
  breakfast: string[];
  lunch: string[];
  dinner: string[];
}

interface SelectedArchivedRecipes {
  breakfast: Recipe[];
  lunch: Recipe[];
  dinner: Recipe[];
}

interface CooldownInfo {
  lastPlanEndDate: string;
  timeRemainingMs: number;
  daysRemaining: number;
  hoursRemaining: number;
  lastPlanName: string;
  lastPlanDays: number;
}

const DURATION_OPTIONS = [1, 2, 3, 4];
const SUGGESTIONS_PER_MEAL_TYPE = 6;

const mealTypeConfig = {
  breakfast: {
    icon: Sunrise,
    label: "Breakfast",
    emoji: "🌅",
    color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100"
  },
  lunch: {
    icon: Sun,
    label: "Lunch", 
    emoji: "🌞",
    color: "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
  },
  dinner: {
    icon: Moon,
    label: "Dinner",
    emoji: "🌙", 
    color: "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
  }
};

// Generate loading messages based on user preferences and selections
const generateLoadingMessages = (preferences: Preferences, selectedRecipes: SelectedRecipes, selectedDays: number): string[] => {
  const messages: string[] = [];

  // Add preference-based messages
  if (preferences.dietary?.length) {
    preferences.dietary.forEach(diet => {
      messages.push(`Ensuring recipes follow ${diet} guidelines...`);
    });
  }

  if (preferences.allergies?.length) {
    preferences.allergies.forEach(allergy => {
      messages.push(`Checking for ${allergy}-free alternatives...`);
    });
  }

  if (preferences.cuisine?.length) {
    preferences.cuisine.forEach(cuisine => {
      messages.push(`Exploring ${cuisine} cuisine recipes...`);
    });
  }

  if (preferences.meatTypes?.length) {
    messages.push(`Including your preferred protein choices...`);
  }

  // Add recipe generation messages
  const totalRecipes = selectedDays * 3;
  messages.push(
    `Generating ${totalRecipes} complete recipes from your selections...`,
    `Creating detailed ingredients lists...`,
    `Calculating cooking times and difficulty levels...`,
    `Adding nutritional information...`,
    `Organizing your ${selectedDays}-day meal plan...`,
    `Preparing your grocery list...`,
    `Adding finishing touches...`
  );

  return messages;
};

export default function WeeklyPlanner() {
  const [selectedDays, setSelectedDays] = useState(2);
  const [suggestions, setSuggestions] = useState<WeeklyPlannerSuggestions>({
    breakfast: [],
    lunch: [],
    dinner: []
  });
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipes>({
    breakfast: [],
    lunch: [],
    dinner: []
  });
  const [selectedArchivedRecipes, setSelectedArchivedRecipes] = useState<SelectedArchivedRecipes>({
    breakfast: [],
    lunch: [],
    dinner: []
  });
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState("");
  const [cooldownInfo, setCooldownInfo] = useState<CooldownInfo | null>(null);
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading } = useUser();
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize preferences from user account
  const [preferences, setPreferences] = useState<Preferences>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: [],
    chefPreferences: {
      difficulty: 'Moderate',
      cookTime: '30-60 minutes',
      servingSize: '4'
    }
  });

  // Check for current meal plan
  const { data: currentMealPlan, isLoading: isLoadingCurrentPlan } = useQuery({
    queryKey: ['current-meal-plan'],
    queryFn: getCurrentMealPlan,
    staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  useEffect(() => {
    if (user?.preferences) {
      const parsedPrefs = PreferenceSchema.safeParse(user.preferences);
      if (parsedPrefs.success) {
        setPreferences(parsedPrefs.data);
      }
    }
  }, [user]);

  // Generate suggestions mutation
  const generateSuggestionsMutation = useMutation({
    mutationFn: async ({ days, preferences }: { days: number; preferences: Preferences }) => {
      const response = await fetch('/api/weekly-planner/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          days,
          suggestionsPerMealType: SUGGESTIONS_PER_MEAL_TYPE,
          preferences
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle cooldown specifically
        if (response.status === 429 && errorData.code === 'COOLDOWN_ACTIVE' && errorData.cooldownInfo) {
          // Set cooldown info and throw a special error
          setCooldownInfo(errorData.cooldownInfo);
          const cooldownError = new Error(errorData.message || 'Cooldown active');
          (cooldownError as any).isCooldown = true;
          throw cooldownError;
        }
        
        throw new Error(errorData.message || 'Failed to generate suggestions');
      }

      return response.json();
    },
    onSuccess: (data: WeeklyPlannerSuggestions) => {
      setSuggestions(data);
      setCooldownInfo(null); // Clear any existing cooldown info
      // Reset selections when new suggestions are generated
      setSelectedRecipes({
        breakfast: [],
        lunch: [],
        dinner: []
      });
      toast({
        title: "Suggestions Generated!",
        description: `Generated ${SUGGESTIONS_PER_MEAL_TYPE} suggestions for each meal type.`,
      });
    },
    onError: (error: Error) => {
      // Check if this is a cooldown error
      if ((error as any).isCooldown) {
        toast({
          title: "Cooldown Active",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create meal plan mutation
  const createMealPlanMutation = useMutation({
    mutationFn: async ({ selectedRecipes, preferences }: { selectedRecipes: SelectedRecipes; preferences: Preferences }) => {
      const response = await fetch('/api/weekly-planner/create-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          selectedRecipes,
          preferences,
          days: selectedDays
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if this is an upgrade required error
        if (response.status === 403 && errorData.code === 'UPGRADE_REQUIRED') {
          const upgradeError = new Error(errorData.message || 'Upgrade required');
          (upgradeError as any).isUpgradeRequired = true;
          throw upgradeError;
        }
        
        throw new Error(errorData.message || 'Failed to create meal plan');
      }

      return response.json();
    },
    onSuccess: async () => {
      // Invalidate and refetch the current meal plan query to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ['current-meal-plan'] });
      
      toast({
        title: "Meal Plan Created!",
        description: "Your weekly meal plan has been generated successfully.",
      });
      
      // Small delay to ensure query invalidation completes before redirect
      setTimeout(() => {
        setLocation('/meal-plan');
      }, 100);
    },
    onError: (error: Error) => {
      // Check if this is an upgrade required error
      if ((error as any).isUpgradeRequired) {
        setFeatureContext("Weekly Planner");
        setShowSubscriptionModal(true);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateSuggestions = async () => {
    // Remove the subscription limit check here - allow free users to generate suggestions
    // The limit will be enforced when they try to create the actual meal plan
    
    // Use the mutation instead of manual fetch
    generateSuggestionsMutation.mutate({ 
      days: selectedDays, 
      preferences 
    });
  };

  const handleRecipeToggle = (mealType: keyof SelectedRecipes, recipeTitle: string) => {
    setSelectedRecipes(prev => {
      const currentSelections = prev[mealType];
      const isSelected = currentSelections.includes(recipeTitle);
      
      if (isSelected) {
        // Remove selection
        return {
          ...prev,
          [mealType]: currentSelections.filter(title => title !== recipeTitle)
        };
      } else {
        // Add selection (no limit per meal type)
        return {
          ...prev,
          [mealType]: [...currentSelections, recipeTitle]
        };
      }
    });
  };



  const getSelectionProgress = () => {
    const totalArchivedBreakfast = selectedArchivedRecipes.breakfast.length;
    const totalArchivedLunch = selectedArchivedRecipes.lunch.length;
    const totalArchivedDinner = selectedArchivedRecipes.dinner.length;
    
    const breakfast = { 
      selected: selectedRecipes.breakfast.length + totalArchivedBreakfast, 
      required: selectedDays 
    };
    const lunch = { 
      selected: selectedRecipes.lunch.length + totalArchivedLunch, 
      required: selectedDays 
    };
    const dinner = { 
      selected: selectedRecipes.dinner.length + totalArchivedDinner, 
      required: selectedDays 
    };
    const totalSelected = breakfast.selected + lunch.selected + dinner.selected;
    const totalRequired = selectedDays * 3;

    return { breakfast, lunch, dinner, totalSelected, totalRequired };
  };

  const progress = getSelectionProgress();
  const isSelectionComplete = progress.totalSelected > 0; // Just require at least one recipe

  const handleCreatePlan = () => {
    if (!isSelectionComplete) {
      toast({
        title: "No Recipes Selected",
        description: "Please select at least one recipe to create your meal plan.",
        variant: "destructive",
      });
      return;
    }

    // Combine selected recipe titles and archived recipe data
    const combinedSelectedRecipes = {
      breakfast: [...selectedRecipes.breakfast, ...selectedArchivedRecipes.breakfast.map(r => r.name)],
      lunch: [...selectedRecipes.lunch, ...selectedArchivedRecipes.lunch.map(r => r.name)],
      dinner: [...selectedRecipes.dinner, ...selectedArchivedRecipes.dinner.map(r => r.name)]
    };

    // The subscription limit check is now handled server-side
    // If the user exceeds their limit, the server will return an error that triggers the modal
    createMealPlanMutation.mutate({ 
      selectedRecipes: combinedSelectedRecipes, 
      preferences 
    });
  };



  if (isUserLoading || isLoadingCurrentPlan) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingAnimation />
      </div>
    );
  }

  const hasSuggestions = suggestions.breakfast.length > 0 || suggestions.lunch.length > 0 || suggestions.dinner.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Weekly Planner</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Plan your week with AI-generated recipe suggestions
        </p>
      </div>

      {/* Active Meal Plan Alert */}
      {currentMealPlan && !isLoadingCurrentPlan && (
        <Alert className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 dark:border-primary/30 dark:from-primary/10 dark:to-primary/20 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <AlertDescription className="text-foreground flex-1">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    🍽️ You already have an active meal plan!
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Your current meal plan "{currentMealPlan.name}" is active until{' '}
                    <span className="font-semibold bg-primary/10 text-primary px-2 py-1 rounded">
                      {new Date(currentMealPlan.end_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </p>
                </div>
                <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-lg border border-primary/10 dark:border-primary/20">
                  <p className="text-xs font-medium text-primary mb-1">
                    💡 What you can do:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• View your current meal plan and recipes</li>
                    <li>• Generate new suggestions to prepare for your next plan</li>
                    <li>• Wait until your current plan expires to create a new one</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => setLocation('/meal-plan')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    View Current Plan
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Cooldown Alert */}
      {cooldownInfo && (
        <Alert className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 dark:border-orange-800 dark:from-orange-950 dark:to-yellow-950 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full">
              <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertDescription className="text-orange-900 dark:text-orange-100 flex-1">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">
                    🍳 Whoa there, eager chef! 
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Looks like you're already committed to "{cooldownInfo.lastPlanName}" — and we're not about to let you become a meal planning commitment-phobe! 
                    Your current plan expires in{' '}
                    <span className="font-semibold bg-orange-200 dark:bg-orange-800 px-2 py-1 rounded text-orange-800 dark:text-orange-200">
                      {cooldownInfo.daysRemaining > 1 
                        ? `${cooldownInfo.daysRemaining} days` 
                        : cooldownInfo.hoursRemaining > 1
                          ? `${cooldownInfo.hoursRemaining} hours`
                          : "less than an hour"
                      }
                    </span>
                  </p>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                    ⏰ Your meal planning freedom returns:
                  </p>
                  <p className="text-sm font-mono text-orange-800 dark:text-orange-200">
                    {new Date(cooldownInfo.lastPlanEndDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} at {new Date(cooldownInfo.lastPlanEndDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <p className="text-xs text-orange-600 dark:text-orange-400 italic">
                  💡 Pro tip: Use this time to actually cook the recipes you already planned! (Revolutionary concept, we know.)
                </p>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Main Content - Dulled when cooldown is active */}
      <div>
        {/* Step 1: Duration Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Choose Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {DURATION_OPTIONS.map((days) => (
                <Button
                  key={days}
                  variant={selectedDays === days ? "default" : "outline"}
                  onClick={() => setSelectedDays(days)}
                  className="min-w-[80px]"
                >
                  {days} {days === 1 ? 'Day' : 'Days'}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Select any combination of recipes across meal types (total recipes needed: {selectedDays * 3})
            </p>
          </CardContent>
        </Card>

        {/* Step 2: Generate Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Generate Recipe Ideas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Generate {SUGGESTIONS_PER_MEAL_TYPE} suggestions for each meal type based on your preferences.
              </p>
              <Button
                onClick={handleGenerateSuggestions}
                disabled={!!cooldownInfo || generateSuggestionsMutation.isPending}
                className="w-full sm:w-auto"
              >
                {generateSuggestionsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Suggestions...
                  </>
                ) : cooldownInfo ? (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Patience, Young Padawan
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Recipe Ideas
                  </>
                )}
              </Button>
              {!generateSuggestionsMutation.isPending && !cooldownInfo && (
                <p className="text-xs text-muted-foreground">
                  ⏱️ This process typically takes 30-60 seconds to analyze your preferences and generate personalized suggestions.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Favorites Section - temporarily removed until component is implemented */}

        {/* Step 3: Recipe Suggestions (only show if we have suggestions) */}
        {hasSuggestions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                Select Your Recipes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Progress Overview */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Selection Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {progress.totalSelected}/{progress.totalRequired} recipes selected
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.totalSelected / progress.totalRequired) * 100}%` }}
                  />
                </div>
              </div>

              {/* Meal Type Sections */}
              {Object.entries(mealTypeConfig).map(([mealType, config]) => {
                const typedMealType = mealType as keyof SelectedRecipes;
                const mealSuggestions = suggestions[typedMealType];
                const mealProgress = progress[typedMealType];
                const Icon = config.icon;

                return (
                  <div key={mealType} className="space-y-4">
                    {/* Meal Type Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">
                            {config.emoji} {config.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Choose any number of {SUGGESTIONS_PER_MEAL_TYPE} options
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={mealProgress.selected > 0 ? "default" : "secondary"}>
                          {mealProgress.selected} selected
                        </Badge>
                        {mealProgress.selected > 0 && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>

                    {/* Recipe Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mealSuggestions.map((suggestion, index) => {
                        const isSelected = selectedRecipes[typedMealType].includes(suggestion.title);

                        return (
                          <Card 
                            key={`${mealType}-${index}`}
                            className={`cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? 'ring-2 ring-primary bg-primary/5' 
                                : 'hover:shadow-md'
                            }`}
                            onClick={() => handleRecipeToggle(typedMealType, suggestion.title)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm leading-tight mb-2">
                                    {suggestion.title}
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {suggestion.cuisineType}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {suggestion.difficulty}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {suggestion.estimatedTime}
                                    </Badge>
                                  </div>
                                </div>
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                  isSelected 
                                    ? 'bg-primary border-primary' 
                                    : 'border-muted-foreground'
                                }`}>
                                  {isSelected && (
                                    <CheckCircle className="h-3 w-3 text-primary-foreground" />
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Create Plan (only show if we have suggestions) */}
        {hasSuggestions && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                Create Your Meal Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentMealPlan ? (
                  <Alert>
                    <AlertDescription>
                      You already have an active meal plan. You can save these suggestions for later or wait until your current plan expires to create a new one.
                    </AlertDescription>
                  </Alert>
                ) : !isSelectionComplete ? (
                  <Alert>
                    <AlertDescription>
                      Please select at least one recipe to create your meal plan.
                      You can choose any combination across meal types.
                    </AlertDescription>
                  </Alert>
                ) : null}
                
                <Button
                  onClick={handleCreatePlan}
                  disabled={!isSelectionComplete || createMealPlanMutation.isPending || !!currentMealPlan}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {createMealPlanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Your Plan...
                    </>
                  ) : currentMealPlan ? (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Plan Already Active
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Create My {selectedDays}-Day Plan
                    </>
                  )}
                </Button>
                
                {isSelectionComplete && !currentMealPlan && (
                  <p className="text-sm text-muted-foreground">
                    This will generate {progress.totalSelected} complete recipes and organize them into your meal plan.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Suggestion Generation Loading Modal */}
      {generateSuggestionsMutation.isPending && (
        <SuggestionLoadingState
          preferences={preferences}
          selectedDays={selectedDays}
          suggestionsPerMealType={SUGGESTIONS_PER_MEAL_TYPE}
        />
      )}

      {/* Meal Plan Creation Loading Modal */}
      {createMealPlanMutation.isPending && (
        <MealPlanLoadingState
          messages={generateLoadingMessages(preferences, selectedRecipes, selectedDays)}
          baseMessage={`Creating your ${selectedDays}-day meal plan...`}
        />
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={(open) => setShowSubscriptionModal(open)}
        feature={featureContext}
      />
    </div>
  );
} 