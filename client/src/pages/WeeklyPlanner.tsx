import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { Calendar, Sunrise, Sun, Moon, Wand2, CheckCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import type { Preferences } from "@db/schema";
import { PreferenceSchema } from "@db/schema";

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
      servingSize: '4',
      mealPlanDuration: '2'
    }
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateSuggestions = async () => {
    // Check subscription limits
    const isFreeTier = user?.subscription_tier === 'free';
    const hasUsedFreePlan = (user?.meal_plans_generated || 0) > 0;

    if (isFreeTier && hasUsedFreePlan) {
      setFeatureContext("Weekly Planner");
      setShowSubscriptionModal(true);
      return;
    }

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
        // Add selection if under limit
        if (currentSelections.length < selectedDays) {
          return {
            ...prev,
            [mealType]: [...currentSelections, recipeTitle]
          };
        }
      }
      
      return prev;
    });
  };

  const getSelectionProgress = () => {
    const breakfast = { selected: selectedRecipes.breakfast.length, required: selectedDays };
    const lunch = { selected: selectedRecipes.lunch.length, required: selectedDays };
    const dinner = { selected: selectedRecipes.dinner.length, required: selectedDays };
    const totalSelected = breakfast.selected + lunch.selected + dinner.selected;
    const totalRequired = selectedDays * 3;

    return { breakfast, lunch, dinner, totalSelected, totalRequired };
  };

  const progress = getSelectionProgress();
  const isSelectionComplete = progress.breakfast.selected === selectedDays && 
                             progress.lunch.selected === selectedDays && 
                             progress.dinner.selected === selectedDays;

  const handleCreatePlan = () => {
    if (!isSelectionComplete) {
      toast({
        title: "Incomplete Selection",
        description: "Please select the required number of recipes for each meal type.",
        variant: "destructive",
      });
      return;
    }

    createMealPlanMutation.mutate({ selectedRecipes, preferences });
  };

  if (isUserLoading) {
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
              You'll need to select {selectedDays} recipes for each meal type ({selectedDays * 3} total recipes)
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
            </div>
          </CardContent>
        </Card>

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
                            Choose {selectedDays} of {SUGGESTIONS_PER_MEAL_TYPE}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={mealProgress.selected === mealProgress.required ? "default" : "secondary"}>
                          {mealProgress.selected}/{mealProgress.required}
                        </Badge>
                        {mealProgress.selected === mealProgress.required && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>

                    {/* Recipe Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mealSuggestions.map((suggestion, index) => {
                        const isSelected = selectedRecipes[typedMealType].includes(suggestion.title);
                        const isDisabled = !isSelected && selectedRecipes[typedMealType].length >= selectedDays;

                        return (
                          <Card 
                            key={`${mealType}-${index}`}
                            className={`cursor-pointer transition-all duration-200 ${
                              isSelected 
                                ? 'ring-2 ring-primary bg-primary/5' 
                                : isDisabled 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : 'hover:shadow-md'
                            }`}
                            onClick={() => !isDisabled && handleRecipeToggle(typedMealType, suggestion.title)}
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
                {!isSelectionComplete && (
                  <Alert>
                    <AlertDescription>
                      Please complete your recipe selections before creating your meal plan.
                      You need {selectedDays} recipes for each meal type.
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button
                  onClick={handleCreatePlan}
                  disabled={!isSelectionComplete || createMealPlanMutation.isPending}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {createMealPlanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Your Plan...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      Create My {selectedDays}-Day Plan
                    </>
                  )}
                </Button>
                
                {isSelectionComplete && (
                  <p className="text-sm text-muted-foreground">
                    This will generate {progress.totalSelected} complete recipes and organize them into your meal plan.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={(open) => setShowSubscriptionModal(open)}
        feature={featureContext}
      />
    </div>
  );
} 