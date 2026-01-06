import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser, type AuthUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { AddToHomeScreen } from "@/components/AddToHomeScreen";
import { generateRecipeFromTitle } from "@/lib/api";
import type { Recipe } from "@/lib/types";
import { RecipeSchema } from "@/lib/types";
import { Loader2, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { PreferenceSchema, type Preferences } from "@db/schema";
import RecipePreferencesModal from "@/components/RecipePreferencesModal";
import PantryImportModal from "@/components/PantryImportModal";
import UsageTrackingModal from "@/components/UsageTrackingModal";
import { z } from "zod";

const STORAGE_KEY = 'ingredient-recipe';
const FREE_RECIPE_LIMIT = 3;
const FREE_INGREDIENT_LIMIT = 3;
const PREMIUM_INGREDIENT_LIMIT = 10;

// Add PantryPal specific recipe schema
const PantryPalRecipeSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  image_url: z.string().nullable(),
  permanentUrl: z.string().nullable(),
  permanent_url: z.string().nullable(),
  prepTime: z.number().nullable(),
  prep_time: z.number().nullable(),
  cookTime: z.number().nullable(),
  cook_time: z.number().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.number(),
    unit: z.string()
  })).nullable().default([]),
  instructions: z.array(z.string()).nullable().default([]),
  tags: z.array(z.string()).nullable().default([]),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number()
  }).nullable().default({ calories: 0, protein: 0, carbs: 0, fat: 0 }),
  complexity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  userId: z.number().optional(),
  favorited: z.boolean().default(false),
  favorites_count: z.number().default(0),
  created_at: z.coerce.date(),
  expiresAt: z.coerce.date().optional(),
  recipe_id: z.number().optional()
}).transform((data) => ({
  ...data,
  imageUrl: data.permanent_url || data.image_url || data.imageUrl,
  permanentUrl: data.permanent_url || data.permanentUrl,
  prepTime: data.prepTime ?? data.prep_time,
  cookTime: data.cookTime ?? data.cook_time,
  isFavorited: data.favorited
}));

type PantryPalRecipe = z.infer<typeof PantryPalRecipeSchema>;

// Add preference schema
// const PreferenceSchema = z.object({
//   dietary: z.array(z.string()),
//   allergies: z.array(z.string()),
//   cuisine: z.array(z.string()),
//   meatTypes: z.array(z.string())
// });

// type Preference = z.infer<typeof PreferenceSchema>;

export default function IngredientRecipes() {
  const { data: user } = useUser() as { data: AuthUser | null };

  // Get user preferences directly from user object like weekly planner does
  const userPreferences = useMemo(() => {
    if (!user?.preferences) return null;
    const parsedPrefs = PreferenceSchema.safeParse(user.preferences);
    return parsedPrefs.success ? parsedPrefs.data : null;
  }, [user?.preferences]);

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState<string>("");
  const { subscription } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const remainingGenerations = FREE_RECIPE_LIMIT - (user?.ingredient_recipes_generated || 0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<{ dietary: string[]; allergies: string[] }>({
    dietary: [],
    allergies: []
  });
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [generatingRecipeTitle, setGeneratingRecipeTitle] = useState<string | null>(null);
  const [showPantryImport, setShowPantryImport] = useState(false);
  const [pantryOnlyMode, setPantryOnlyMode] = useState(false);
  const [showUsageTracking, setShowUsageTracking] = useState(false);

  // Initialize ingredients from localStorage when user loads
  useEffect(() => {
    if (user) {
      const storageKey = `ingredients-${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsedIngredients = JSON.parse(saved);
          if (Array.isArray(parsedIngredients)) {
            setIngredients(parsedIngredients);
          }
        } catch (e) {
          console.error('Failed to parse saved ingredients', e);
        }
      }
    }
  }, [user?.id]);

  // Initialize tempPreferences from user account
  useEffect(() => {
    if (userPreferences) {
      setTempPreferences({
        dietary: userPreferences.dietary || [],
        allergies: userPreferences.allergies || []
      });
    }
  }, [userPreferences]);

  // Save preferences to user account
  const savePreferencesToAccount = async (updatedPreferences: Partial<Preferences>) => {
    if (!user) return;
    
    try {
      // Merge with existing preferences to maintain other preference values
      const mergedPreferences = userPreferences 
        ? { ...userPreferences, ...updatedPreferences }
        : { 
            dietary: [],
            allergies: [],
            cuisine: [],
            meatTypes: []
          };
      
      // Validate the preferences using the schema
      const parsedPrefs = PreferenceSchema.safeParse(mergedPreferences);
      if (!parsedPrefs.success) {
        console.error('Invalid preferences format:', parsedPrefs.error);
        throw new Error('Invalid preferences format');
      }
      
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          preferences: parsedPrefs.data
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

  // Clear data when user changes or logs out
  useEffect(() => {
    if (!user) {
      setIngredients([]);
      setSuggestions([]);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
  }, [user?.id]);

  // Check and clear reload flag on component mount and restore suggestions if needed
  useEffect(() => {
    // If we've completed a reload to show suggestions, clear the flag
    if (sessionStorage.getItem('pantrypal-needs-reload') === 'completed') {
      console.log('Clearing reload flag after successful reload');
      sessionStorage.removeItem('pantrypal-needs-reload');
    }
    
    // Check if we have suggestions in localStorage that we should restore
    if (user) {
      const storageKey = user ? `suggestions-${user.id}` : null;
      if (storageKey && suggestions.length === 0) {
        const savedSuggestions = localStorage.getItem(storageKey);
        if (savedSuggestions) {
          try {
            const parsedSuggestions = JSON.parse(savedSuggestions);
            if (Array.isArray(parsedSuggestions) && parsedSuggestions.length > 0) {
              console.log('Found saved suggestions in localStorage, restoring them', parsedSuggestions);
              setSuggestions(parsedSuggestions);
            }
          } catch (e) {
            console.error('Failed to parse saved suggestions', e);
          }
        }
      }
    }
  }, [user?.id, suggestions.length]);

  // Save ingredients to localStorage whenever they change
  useEffect(() => {
    if (user) {
      const storageKey = `ingredients-${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(ingredients));
    }
  }, [ingredients, user?.id]);

  // Save suggestions to localStorage whenever they change
  useEffect(() => {
    if (user) {
      const storageKey = `suggestions-${user.id}`;
      localStorage.setItem(storageKey, JSON.stringify(suggestions));
    }
  }, [suggestions, user?.id]);

  // Query for persisted recipe with proper error handling
  const { data: selectedRecipe, refetch: refetchRecipe } = useQuery<PantryPalRecipe | null>({
    queryKey: ['ingredient-recipe', user?.id],
    queryFn: async () => {
      try {
        if (!user) return null;
        const storageKey = `${STORAGE_KEY}-${user.id}`;
        const saved = localStorage.getItem(storageKey);
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        const validatedRecipe = PantryPalRecipeSchema.parse(parsed);
        return validatedRecipe;
      } catch (error) {
        console.error('Error parsing saved recipe:', error);
        if (user) {
          const storageKey = `${STORAGE_KEY}-${user.id}`;
          localStorage.removeItem(storageKey);
        }
        return null;
      }
    },
    initialData: null,
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!user
  });

  const handleAddIngredient = () => {
    if (inputValue.trim()) {
      // Check ingredient limits based on subscription tier
      if (user?.subscription_tier !== "premium" && ingredients.length >= FREE_INGREDIENT_LIMIT) {
        setFeatureContext("adding more ingredients");
        setShowSubscriptionModal(true);
        setInputValue("");
        return;
      }
      
      if (user?.subscription_tier === "premium" && ingredients.length >= PREMIUM_INGREDIENT_LIMIT) {
        toast({
          title: "Ingredient Limit Reached",
          description: `Premium users can add up to ${PREMIUM_INGREDIENT_LIMIT} ingredients to PantryPal.`,
          variant: "destructive",
        });
        setInputValue("");
        return;
      }
      
      setIngredients([...ingredients, inputValue.trim()]);
      setInputValue("");
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handlePantryImport = (selectedItems: string[]) => {
    // Check ingredient limits based on subscription tier
    const totalIngredients = ingredients.length + selectedItems.length;
    
    if (user?.subscription_tier !== "premium" && totalIngredients > FREE_INGREDIENT_LIMIT) {
      const availableSlots = FREE_INGREDIENT_LIMIT - ingredients.length;
      if (availableSlots <= 0) {
        setFeatureContext("importing pantry ingredients");
        setShowSubscriptionModal(true);
        return;
      }
      
      // Take only what fits
      const itemsToAdd = selectedItems.slice(0, availableSlots);
      const newIngredients = [...ingredients, ...itemsToAdd];
      setIngredients(newIngredients);
      
      toast({
        title: "Partial Import",
        description: `Added ${itemsToAdd.length} ingredients. Upgrade to Premium to add more.`,
        variant: "default",
      });
      return;
    }
    
    if (user?.subscription_tier === "premium" && totalIngredients > PREMIUM_INGREDIENT_LIMIT) {
      const availableSlots = PREMIUM_INGREDIENT_LIMIT - ingredients.length;
      const itemsToAdd = selectedItems.slice(0, availableSlots);
      const newIngredients = [...ingredients, ...itemsToAdd];
      setIngredients(newIngredients);
      
      toast({
        title: "Import Limit Reached",
        description: `Added ${itemsToAdd.length} ingredients. Premium limit is ${PREMIUM_INGREDIENT_LIMIT} ingredients.`,
        variant: "default",
      });
      return;
    }
    
    // Add all selected items
    const newIngredients = [...ingredients, ...selectedItems];
    setIngredients(newIngredients);
    
    toast({
      title: "Pantry Items Imported",
      description: `Added ${selectedItems.length} ingredient${selectedItems.length !== 1 ? 's' : ''} from your pantry.`,
    });
  };

  const handleTogglePantryMode = () => {
    setPantryOnlyMode(!pantryOnlyMode);
    if (!pantryOnlyMode) {
      toast({
        title: "Pantry-Only Mode",
        description: "Recipe suggestions will only use ingredients from your pantry.",
      });
    } else {
      toast({
        title: "Mixed Mode",
        description: "Recipe suggestions can include additional ingredients.",
      });
    }
  };

  const handleGenerateSuggestions = async () => {
    if (ingredients.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one ingredient",
        variant: "destructive",
      });
      return;
    }

    if (selectedRecipe) {
      const shouldClear = window.confirm("Generating new suggestions will clear your current recipe. Continue?");
      if (!shouldClear) {
        return;
      }
    }

    // Set loading state immediately
    setIsGeneratingIdeas(true);

    try {
      // Check if user has saved preferences
      if (userPreferences && (userPreferences.dietary?.length > 0 || userPreferences.allergies?.length > 0)) {
        // Use saved preferences directly, similar to weekly meal planner
        console.log('Using saved user preferences for dietary restrictions:', userPreferences.dietary);
        console.log('Using saved user preferences for allergies:', userPreferences.allergies);
        
        setTempPreferences({
          dietary: userPreferences.dietary || [],
          allergies: userPreferences.allergies || []
        });
        
        // Generate suggestions directly without showing modal
        await handleGenerateWithPreferences({
          dietary: userPreferences.dietary || [],
          allergies: userPreferences.allergies || []
        });
      } else {
        // No saved preferences, show the modal to set them
        setTempPreferences({
          dietary: [],
          allergies: []
        });
        setShowPreferences(true);
        // Note: loading state will be cleared when modal is submitted or closed
      }
    } catch (error) {
      console.error('Error in handleGenerateSuggestions:', error);
      setIsGeneratingIdeas(false);
    }
  };

  const handleGenerateWithPreferences = async (preferences: { dietary: string[]; allergies: string[] }) => {
    try {
      // Save the provided preferences
      setTempPreferences(preferences);
      setShowPreferences(false);
      
      // Ensure allergies from user profile are included, even if not selected in the modal
      const combinedAllergies = [...preferences.allergies];
      
      // Add any allergies from the user profile that aren't already in the preferences
      if (userPreferences?.allergies && userPreferences.allergies.length > 0) {
        console.log('Checking for additional allergies from user profile:', userPreferences.allergies);
        
        // Add any missing allergies from user profile
        userPreferences.allergies.forEach(allergy => {
          if (!combinedAllergies.includes(allergy)) {
            console.log(`Adding allergy from user profile: ${allergy}`);
            combinedAllergies.push(allergy);
          }
        });
      }
      
      // Update tempPreferences with the combined allergies
      setTempPreferences(prev => ({
        ...prev,
        allergies: combinedAllergies
      }));
      
      console.log('Final allergies used for recipe generation:', combinedAllergies);
      
      // Save the dietary and allergy preferences to user account
      if (user) {
        try {
          // Filter dietary to only include valid values from the schema enum
          const dietaryOptions = PreferenceSchema.shape.dietary.element.enum;

          const validatedDietary = preferences.dietary.filter(item =>
            Object.values(dietaryOptions).includes(item as any)
          );

          // Allergies now support custom values (any non-empty string up to 50 chars)
          // Filter out empty strings but allow all other values
          const validatedAllergies = combinedAllergies.filter(item =>
            item && item.trim().length > 0 && item.trim().length <= 50
          );

          await savePreferencesToAccount({
            dietary: validatedDietary as any,
            allergies: validatedAllergies as any
          });
        } catch (error) {
          console.error('Error validating preferences:', error);
          // Continue with generation even if preference saving fails
        }
      }
      
      setSuggestions([]);
      if (user) {
        const storageKey = `${STORAGE_KEY}-${user.id}`;
        localStorage.removeItem(storageKey);
      }
      queryClient.setQueryData(['ingredient-recipe', user?.id], null);
      
      // Generate suggestions with the updated preferences including all allergens
      await generateSuggestionsMutation.mutateAsync();
    } catch (error) {
      console.error('Error in handleGenerateWithPreferences:', error);
      setIsGeneratingIdeas(false);
      throw error;
    }
  };

  const generateSuggestionsMutation = useMutation({
    mutationFn: async () => {
      console.log('Sending ingredients to generate recipe suggestions:', ingredients);
      console.log('Using dietary restrictions:', tempPreferences.dietary);
      console.log('Using allergy restrictions:', tempPreferences.allergies);
      
      const response = await fetch("/api/generate-recipe-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          ingredients,
          dietary: tempPreferences.dietary,
          allergies: tempPreferences.allergies,
          pantryOnlyMode
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error response from generate-recipe-suggestions:', error);
        if (error.code === "UPGRADE_REQUIRED") {
          setFeatureContext("recipe suggestion");
          setShowSubscriptionModal(true);
          return [];
        }
        throw new Error(error.message || "Failed to generate suggestions");
      }

      const data = await response.json();
      console.log('Received recipe suggestions from server:', data);
      
      // Validate the response format
      if (!data.suggestions) {
        console.error('Missing suggestions field in response:', data);
        throw new Error("Invalid response format: missing suggestions field");
      }
      
      if (!Array.isArray(data.suggestions)) {
        console.error('Suggestions is not an array:', data.suggestions);
        throw new Error("Invalid response format: suggestions must be an array");
      }
      
      // Filter out any non-string or empty suggestions
      const validSuggestions = (data.suggestions as any[])
        .filter(suggestion => typeof suggestion === 'string' && suggestion.trim() !== '')
        .map(suggestion => suggestion.trim());
      
      if (validSuggestions.length === 0) {
        console.error('No valid suggestions found in response:', data.suggestions);
        throw new Error("No valid recipe suggestions were generated");
      }
      
      console.log('Validated suggestions:', validSuggestions);
      return validSuggestions;
    },
    onSuccess: (data) => {
      console.log('Setting suggestions state with:', data);
      setSuggestions(data);
      setIsGeneratingIdeas(false);
      
      // Store in local storage
      if (user) {
        const storageKey = `suggestions-${user.id}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
      
      // Set a flag in sessionStorage to indicate we need a reload
      // This prevents an infinite refresh loop
      const needsReloadFlag = sessionStorage.getItem('pantrypal-needs-reload');
      if (needsReloadFlag !== 'completed') {
        console.log('Setting reload flag');
        sessionStorage.setItem('pantrypal-needs-reload', 'pending');
        
        // Give React a chance to render, then check if we need to reload
        setTimeout(() => {
          // Check if suggestions are visible in the DOM
          const suggestionCards = document.querySelectorAll('[data-suggestion-card]');
          console.log(`Found ${suggestionCards.length} suggestion cards in the DOM after setting state`);
          
          if (sessionStorage.getItem('pantrypal-needs-reload') === 'pending') {
            console.log('Triggering page reload to ensure suggestions appear');
            sessionStorage.setItem('pantrypal-needs-reload', 'completed');
            window.location.reload();
          }
        }, 1000);
      }
    },
    onError: (error: Error) => {
      console.error('Error in generateSuggestionsMutation:', error);
      setIsGeneratingIdeas(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateRecipeMutation = useMutation<PantryPalRecipe, Error, string>({
    mutationFn: async (title: string) => {
      if (user?.subscription_tier !== "premium" && remainingGenerations <= 0) {
        throw new Error("FREE_PLAN_LIMIT_REACHED");
      }
      
      // Get allergies from user preferences
      const userAllergies = userPreferences?.allergies || [];
      
      // Combine with any allergies in tempPreferences
      const allergies = [...tempPreferences.allergies];
      
      // Add any allergies from user profile that aren't already included
      userAllergies.forEach(allergy => {
        if (!allergies.includes(allergy)) {
          allergies.push(allergy);
        }
      });
      
      console.log('Generating recipe for title:', title);
      console.log('Using allergies from user preferences:', allergies);
      console.log('Using pantry-only mode:', pantryOnlyMode);
      console.log('Available ingredients:', ingredients);
      
      const recipe = await generateRecipeFromTitle(title, allergies, {
        ingredients: pantryOnlyMode ? ingredients : undefined,
        pantryOnlyMode
      });
      console.log('Recipe before validation:', JSON.stringify(recipe, null, 2));
      const parsedRecipe = PantryPalRecipeSchema.parse(recipe);
      console.log('Recipe after validation:', JSON.stringify(parsedRecipe, null, 2));
      return parsedRecipe;
    },
    onSuccess: (recipe: PantryPalRecipe) => {
      try {
        console.log('Saving recipe to storage:', JSON.stringify(recipe, null, 2));
        if (user) {
          const storageKey = `${STORAGE_KEY}-${user.id}`;
          console.log('Storage key:', storageKey);
          localStorage.setItem(storageKey, JSON.stringify(recipe));
          console.log('Recipe saved to localStorage');
        }
        queryClient.setQueryData(['ingredient-recipe', user?.id], recipe);
        console.log('Recipe saved to query cache');
        queryClient.invalidateQueries({ queryKey: ['user'] });
        setGeneratingRecipeTitle(null);
      } catch (error) {
        console.error('Error saving recipe:', error);
        setGeneratingRecipeTitle(null);
      }
    },
    onError: (error: Error) => {
      console.error('Recipe generation error:', error);
      setGeneratingRecipeTitle(null);
      if (error.message === "FREE_PLAN_LIMIT_REACHED") {
        setFeatureContext("recipe generation");
        setShowSubscriptionModal(true);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleSelectRecipe = async (title: string) => {
    if (!title || typeof title !== 'string') {
      console.error('Invalid recipe title:', title);
      toast({
        title: "Error",
        description: "Invalid recipe selection",
        variant: "destructive",
      });
      return;
    }
    
    console.log('User selected recipe with title:', title);
    console.log('Current allergies in tempPreferences:', tempPreferences.allergies);
    console.log('User account allergies:', userPreferences?.allergies || []);
    
    if (user?.subscription_tier !== "premium" && remainingGenerations <= 0) {
      console.log('Free tier limit reached, showing subscription modal');
      setFeatureContext("recipe generation");
      setShowSubscriptionModal(true);
      return;
    }
    
    // Set loading state for this specific recipe
    setGeneratingRecipeTitle(title);
    
    try {
      // Clear any existing recipe first
      if (selectedRecipe) {
        console.log('Clearing existing recipe before generating new one');
        if (user) {
          const storageKey = `${STORAGE_KEY}-${user.id}`;
          localStorage.removeItem(storageKey);
        }
        queryClient.setQueryData(['ingredient-recipe', user?.id], null);
      }
      
      console.log('Generating full recipe for:', title);
      await generateRecipeMutation.mutateAsync(title);
    } catch (error) {
      console.error('Error in handleSelectRecipe:', error);
      // Error will be handled by mutation's onError
    }
  };

  const handleUpdateFavorite = async (recipe: PantryPalRecipe, isFavorited: boolean) => {
    try {
      await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        credentials: 'include',
      });

      const updatedRecipe = {
        ...recipe,
        favorited: !isFavorited,
        favorites_count: isFavorited 
          ? Math.max(0, (recipe.favorites_count || 0) - 1)
          : (recipe.favorites_count || 0) + 1
      };

      try {
        if (user) {
          const storageKey = `${STORAGE_KEY}-${user.id}`;
          localStorage.setItem(storageKey, JSON.stringify(updatedRecipe));
        }
        queryClient.setQueryData(['ingredient-recipe', user?.id], updatedRecipe);
      } catch (error) {
        console.error('Error saving updated recipe:', error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive",
      });
    }
  };

  const handleClearSuggestions = () => {
    setSuggestions([]);
    if (user) {
      const storageKey = `suggestions-${user.id}`;
      localStorage.removeItem(storageKey);
    }
  };

  const handlePreferencesModalChange = (open: boolean) => {
    setShowPreferences(open);
    // If modal is being closed and we're still in loading state, clear it
    if (!open && isGeneratingIdeas) {
      setIsGeneratingIdeas(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">PantryPal</h1>
        <p className="text-xl text-muted-foreground">Your friendly AI that whips up meals from what you have.</p>
        
        {/* Show preferences indicator when user has saved preferences */}
        {userPreferences && (userPreferences.dietary?.length > 0 || userPreferences.allergies?.length > 0) && (
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
            <div className="flex items-center gap-2 justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium text-primary">Using your saved preferences</span>
            </div>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {userPreferences.dietary?.map((diet) => (
                <Badge key={diet} variant="secondary" className="text-xs">{diet}</Badge>
              ))}
              {userPreferences.allergies?.map((allergy) => (
                <Badge key={allergy} variant="destructive" className="text-xs">{allergy}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature={featureContext}
      />
      <RecipePreferencesModal
        open={showPreferences}
        onOpenChange={handlePreferencesModalChange}
        userPreferences={userPreferences}
        onGenerate={handleGenerateWithPreferences}
        isGenerating={generateSuggestionsMutation.isPending}
      />
      <AddToHomeScreen daysToWait={14} isLoggedIn={!!user} />

      {/* Main content container */}
      <div className="flex flex-col items-center space-y-8">
        {/* Spline Scene - Only shown when no suggestions and not generating */}
        {suggestions.length === 0 && !generateSuggestionsMutation.isPending && (
          <div className="w-full flex justify-center items-center my-8">
            <div className="w-[225px] h-[180px] relative bg-background rounded-xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <spline-viewer
                  url="https://prod.spline.design/XCK0HAh2vliGiGxC/scene.splinecode"
                  className="w-full h-full"
                  style={{
                    background: 'transparent',
                    transform: 'scale(1.5) translateY(-10%)',
                    transformOrigin: 'center center'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Recipe Cards Section - Shown when suggestions exist or when generating */}
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl">
            {/* Free tier info and clear button */}
            {(suggestions.length > 0 || generateSuggestionsMutation.isPending) && (
              <div className="flex justify-between items-center mb-6">
                <div>
                  {user?.subscription_tier !== "premium" && (
                    <p className="text-muted-foreground">
                      {remainingGenerations > 0 
                        ? `You have ${remainingGenerations} free recipe generation${remainingGenerations === 1 ? '' : 's'} remaining` 
                        : 'You have used all your free recipe generations'}
                    </p>
                  )}
                </div>
                {suggestions.length > 0 && !generateSuggestionsMutation.isPending && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearSuggestions}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear Suggestions
                  </Button>
                )}
              </div>
            )}

            {/* Loading state */}
            {generateSuggestionsMutation.isPending && (
              <>
                <h2 className="text-xl font-medium mb-4">Generating Recipe Ideas...</h2>
                <p className="text-muted-foreground mb-6">
                  Our AI chef is thinking of delicious recipes using your ingredients.
                </p>
                <div className="flex justify-center py-8">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
              </>
            )}

            {/* Suggestions header and cards */}
            {!generateSuggestionsMutation.isPending && suggestions.length > 0 && (
              <>
                <h2 className="text-xl font-medium mb-4">Recipe Suggestions</h2>
                <p className="text-muted-foreground mb-6">
                  Click on a recipe card to generate a complete recipe with ingredients and instructions.
                </p>

                {/* Upgrade button for free tier users */}
                {remainingGenerations <= 1 && user?.subscription_tier !== "premium" && (
                  <div className="text-center mb-6">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFeatureContext("unlimited recipe generation");
                        setShowSubscriptionModal(true);
                      }}
                    >
                      Upgrade for unlimited recipes
                    </Button>
                  </div>
                )}

                {/* Recipe suggestion cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {suggestions.map((title, index) => {
                    const isGeneratingThisRecipe = generatingRecipeTitle === title;
                    return (
                      <Card
                        key={index}
                        data-suggestion-card={`suggestion-${index}`}
                        className={cn(
                          "cursor-pointer transition-all border-2 hover:shadow-md",
                          generateRecipeMutation.isPending || isGeneratingThisRecipe ? "opacity-50 pointer-events-none" : "",
                          user?.subscription_tier !== "premium" && remainingGenerations <= 0
                            ? "opacity-50 pointer-events-none"
                            : "hover:border-primary/50 hover:bg-secondary/10"
                        )}
                        onClick={() => handleSelectRecipe(title)}
                      >
                        <CardContent className="p-6">
                          <h3 className="font-medium text-lg mb-2">{title}</h3>
                          <div className="flex justify-between items-center mt-4">
                            {isGeneratingThisRecipe ? (
                              <>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Generating recipe...
                                </div>
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              </>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground">
                                  Click to generate full recipe
                                </p>
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className="h-5 w-5 text-primary" 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="w-full flex justify-center">
          {ingredients.length > 0 && (
            <div className="w-full max-w-2xl flex flex-wrap gap-2 justify-center">
              {ingredients.map((ingredient, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer text-base py-2"
                  onClick={() => handleRemoveIngredient(index)}
                >
                  {ingredient} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Loading Animation */}
        {generateRecipeMutation.isPending && (
          <LoadingAnimation
            messages={[
              "Crafting your recipe...",
              "Calculating ingredients and portions...",
              "Adding cooking instructions...",
              "Finalizing nutritional information...",
            ]}
          />
        )}

        {/* Selected Recipe Display */}
        {selectedRecipe && (
          <div className="w-full max-w-4xl">
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  {(selectedRecipe.permanent_url || selectedRecipe.imageUrl) && (
                    <div className="space-y-2">
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                        <img
                          src={selectedRecipe.permanent_url || selectedRecipe.imageUrl || '/placeholder-recipe.jpg'}
                          alt={selectedRecipe.name || 'Recipe image'}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                        ⚠️ This image is generated by AI and may include ingredients that are not actually in the recipe. As with all cases, use your best reasoning and judgment.
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h2 className="text-2xl font-semibold">{selectedRecipe.name}</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUpdateFavorite(selectedRecipe, selectedRecipe.favorited)}
                      >
                        {selectedRecipe.favorited ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-5 h-5 text-red-500"
                          >
                            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                            />
                          </svg>
                        )}
                      </Button>
                    </div>

                    <p className="text-muted-foreground">{selectedRecipe.description}</p>

                    {/* Show allergies that were considered */}
                    {(() => {
                      // Collect all allergies
                      const userAllergies = userPreferences?.allergies || [];
                      const allAllergies = [...userAllergies, ...tempPreferences.allergies];
                      const hasAllergies = allAllergies.length > 0;
                      
                      // Return the component only if we have allergies
                      return hasAllergies ? (
                        <div className="rounded-md bg-yellow-50 p-3">
                          <div className="flex">
                            <div className="shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">Allergy Information</h3>
                              <div className="mt-1 text-sm text-yellow-700">
                                <p>
                                  This recipe was generated to avoid the following allergens:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {/* Filter out duplicate allergies */}
                                  {allAllergies
                                    .filter((allergy, index) => allAllergies.indexOf(allergy) === index)
                                    .map((allergy) => (
                                      <Badge key={allergy} variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                        {allergy}
                                      </Badge>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h3 className="font-medium mb-1">Prep Time</h3>
                        <p>{selectedRecipe.prepTime} minutes</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Cook Time</h3>
                        <p>{selectedRecipe.cookTime} minutes</p>
                      </div>
                      <div>
                        <h3 className="font-medium mb-1">Servings</h3>
                        <p>{selectedRecipe.servings}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Ingredients</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {selectedRecipe.ingredients?.map((ingredient, index) => (
                          <li key={index}>
                            {ingredient.amount} {ingredient.unit} {ingredient.name}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Instructions</h3>
                      <ol className="list-decimal pl-5 space-y-2">
                        {selectedRecipe.instructions?.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>

                    {selectedRecipe.nutrition && (
                      <div>
                        <h3 className="font-medium mb-2">Nutrition (per serving)</h3>
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Calories</p>
                            <p className="font-medium">{selectedRecipe.nutrition.calories}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Protein</p>
                            <p className="font-medium">{selectedRecipe.nutrition.protein}g</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Carbs</p>
                            <p className="font-medium">{selectedRecipe.nutrition.carbs}g</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Fat</p>
                            <p className="font-medium">{selectedRecipe.nutrition.fat}g</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Usage Tracking Button - Only show if ingredients came from pantry */}
                    {ingredients.length > 0 && (
                      <div className="pt-4 border-t">
                        <Button
                          onClick={() => setShowUsageTracking(true)}
                          className="w-full flex items-center gap-2"
                          variant="outline"
                        >
                          <Package className="h-4 w-4" />
                          Mark Ingredients as Used in Pantry
                        </Button>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Track ingredient usage to keep your pantry up to date
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Input Section - Non-sticky, near bottom */}
        <div className="w-full max-w-2xl mx-auto mt-8 mb-16 bg-background p-4 rounded-lg border">
          <div className="space-y-4">
            {/* Pantry Import and Mode Toggle */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPantryImport(true)}
                className="flex items-center gap-2"
              >
                <Package className="h-4 w-4" />
                Import from Pantry
              </Button>
              
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-muted-foreground">Mode:</span>
                <Button
                  variant={pantryOnlyMode ? "default" : "outline"}
                  size="sm"
                  onClick={handleTogglePantryMode}
                  className="text-xs"
                >
                  {pantryOnlyMode ? "Pantry Only" : "Mixed"}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddIngredient()}
                placeholder={pantryOnlyMode ? "Add ingredients from pantry above" : "Enter an ingredient"}
                className="flex-1"
                inputMode="text"
                style={{ fontSize: '16px' }}
                disabled={pantryOnlyMode}
              />
              <Button 
                onClick={handleAddIngredient}
                disabled={
                  pantryOnlyMode ||
                  !inputValue.trim() || 
                  (user?.subscription_tier === "premium" && ingredients.length >= PREMIUM_INGREDIENT_LIMIT) ||
                  (user?.subscription_tier !== "premium" && ingredients.length >= FREE_INGREDIENT_LIMIT)
                }
              >
                Add
              </Button>
                        </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateSuggestions}
                disabled={ingredients.length === 0 || isGeneratingIdeas || generateSuggestionsMutation.isPending}
                className="flex-1"
              >
                {(isGeneratingIdeas || generateSuggestionsMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Ideas...
                  </>
                ) : (
                  "Generate Recipe Ideas"
                )}
              </Button>
              
              {/* Show override button only if user has saved preferences */}
              {userPreferences && (userPreferences.dietary?.length > 0 || userPreferences.allergies?.length > 0) && (
                <Button
                  variant="outline"
                  onClick={() => setShowPreferences(true)}
                  disabled={ingredients.length === 0 || isGeneratingIdeas || generateSuggestionsMutation.isPending}
                  className="shrink-0"
                  title="Override your saved preferences for this generation"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pantry Import Modal */}
      <PantryImportModal
        open={showPantryImport}
        onOpenChange={setShowPantryImport}
        onImport={handlePantryImport}
        currentIngredients={ingredients}
      />

      {/* Usage Tracking Modal */}
      <UsageTrackingModal
        open={showUsageTracking}
        onOpenChange={setShowUsageTracking}
        ingredients={ingredients}
        recipeName={selectedRecipe?.name}
      />

      {/* Preferences Modal */}
      <RecipePreferencesModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        userPreferences={userPreferences}
        onGenerate={(preferences) => {
          setTempPreferences(preferences);
          setShowPreferences(false);
        }}
        isGenerating={isGeneratingIdeas || generateSuggestionsMutation.isPending}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature={featureContext}
      />
    </div>
  );
} 