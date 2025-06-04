import { useState, useEffect, type MouseEvent, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Settings2, Wand2, AlertTriangle } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { SnakeLoadingGame } from "@/components/SnakeLoadingGame";
import { PreferenceSchema, type Preferences } from "@db/schema";
import { ChefPreferencesSchema, type ChefPreferences } from "@/lib/types";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { celebrateOnboarding, celebrate } from "@/lib/confetti";

type PreferenceField = keyof Omit<Preferences, 'chefPreferences'>;
type PreferenceValue = string[] | ChefPreferences;

function isPreferenceArray(value: unknown): value is string[] {
  return Array.isArray(value);
}

const CHEF_PREFERENCES = {
  difficulty: ChefPreferencesSchema.shape.difficulty.options,
  cookTime: ChefPreferencesSchema.shape.cookTime.options,
  servingSize: ChefPreferencesSchema.shape.servingSize.options
} as const;

const STEPS = [
  {
    title: "Welcome to Your Meal Preferences",
    description: "Let's personalize your meal planning experience. We'll guide you through a few quick steps to understand your dietary needs and preferences.",
    field: "dietary" as const,
    options: PreferenceSchema.shape.dietary.element.options
  },
  {
    title: "Food Allergies & Intolerances",
    description: "Your safety matters. Select any food allergies or intolerances you have.",
    field: "allergies" as const,
    options: PreferenceSchema.shape.allergies.element.options
  },
  {
    title: "Cuisine Preferences",
    description: "What types of cuisine do you enjoy? Select all that interest you.",
    field: "cuisine" as const,
    options: PreferenceSchema.shape.cuisine.element.options
  },
  {
    title: "Meat Preferences",
    description: "Select your preferred types of meat, or skip if you're vegetarian.",
    field: "meatTypes" as const,
    options: PreferenceSchema.shape.meatTypes.element.options
  },
  {
    title: "Chef Preferences",
    description: "Let's customize your meal plan. Choose your cooking preferences for this meal plan.",
    field: null,
    options: [] as const
  },
  {
    title: "Review & Generate",
    description: "Review your preferences below. You can always change these later.",
    field: null,
    options: [] as const
  }
] as const;

const ONBOARDING_STEPS = [
  {
    title: "First Things First - What's Your Vibe? 🌱",
    description: "Time for a quick taste test! Are you team keto, going green with vegetarian, or just here for the good vibes? Don't worry, we won't judge your midnight pizza cravings.",
    field: "dietary" as const,
    options: PreferenceSchema.shape.dietary.element.options
  },
  {
    title: "Let's Keep You Safe & Sound 🛡️",
    description: "Nobody wants a surprise ingredient ruining the party! Tell us about any food allergies or things that don't play nice with your system.",
    field: "allergies" as const,
    options: PreferenceSchema.shape.allergies.element.options
  },
  {
    title: "Around the World in 80 Bites 🌍",
    description: "Passport not required! Which cuisines make your taste buds do a happy dance? From spicy Thai to comforting Italian - the world is your oyster (unless you're allergic to shellfish).",
    field: "cuisine" as const,
    options: PreferenceSchema.shape.cuisine.element.options
  },
  {
    title: "The Protein Plot Thickens 🥩",
    description: "Let's talk about the main event! What proteins are you excited to see on your plate? Or maybe you're team plants-only? We've got options for every appetite.",
    field: "meatTypes" as const,
    options: PreferenceSchema.shape.meatTypes.element.options
  },
  {
    title: "Chef Mode: Activated! 👨‍🍳",
    description: "Time to set your kitchen confidence level! Are you a 'microwave-is-my-best-friend' type or ready to channel your inner Gordon Ramsay? No judgment - we're here to meet you where you're at.",
    field: null,
    options: [] as const
  },
  {
    title: "The Grand Finale! 🎉",
    description: "Look at you go! You're all set up for culinary success. These preferences will help us craft meals that'll make your future self thank you. Ready to start your delicious journey?",
    field: null,
    options: [] as const
  }
] as const;

// Function to get the appropriate steps based on onboarding mode
const getSteps = (isOnboarding: boolean) => isOnboarding ? ONBOARDING_STEPS : STEPS;

interface PreferenceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  onUpdatePreferences: (preferences: Preferences) => void;
  isGenerating?: boolean;
  onGenerate?: (chefPreferences: ChefPreferences, updatedPreferences: Preferences) => void;
  user?: {
    subscription_tier: string | null;
    meal_plans_generated: number | undefined;
  };
  skipToChefPreferences?: boolean;
  hideGenerateOption?: boolean;
  isOnboarding?: boolean;
}

const defaultChefPreferences: ChefPreferences = {
  difficulty: 'Moderate',
  cookTime: '30-60 minutes',
  servingSize: '4'
};

export default function PreferenceSheet({
  open,
  onOpenChange,
  preferences,
  onUpdatePreferences,
  isGenerating = false,
  onGenerate,
  user,
  skipToChefPreferences = false,
  hideGenerateOption = false,
  isOnboarding = false
}: PreferenceSheetProps) {
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [currentStep, setCurrentStep] = useState(-1);
  const [tempPreferences, setTempPreferences] = useState<Preferences>(preferences);
  const [chefPreferences, setChefPreferences] = useState<ChefPreferences>(
    preferences.chefPreferences || defaultChefPreferences
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    // Initialize or update preferences when sheet opens
    if (open) {
      setTempPreferences({
        ...preferences,
        chefPreferences: preferences.chefPreferences || defaultChefPreferences
      });
      setChefPreferences(preferences.chefPreferences || defaultChefPreferences);
      
      const hasValues = Object.entries(preferences).some(([key, value]) =>
        key !== 'chefPreferences' && isPreferenceArray(value) && value.length > 0
      );
      
      // If skipToChefPreferences is true and we have existing preferences, go to chef preferences step
      if (skipToChefPreferences && hasValues && !isEditMode) {
        setCurrentStep(STEPS.length - 2); // Chef preferences step
      } else if (hideGenerateOption && hasValues && !isEditMode) {
        // For user profile page, start at the first step for editing
        setCurrentStep(0);
      } else {
        setCurrentStep(hasValues ? -1 : 0);
      }
      
      setIsEditMode(false);
    }
  }, [preferences, open, skipToChefPreferences, isEditMode, hideGenerateOption]);

  const currentStepConfig = currentStep >= 0 ? getSteps(isOnboarding)[currentStep] : null;
  const isLastStep = currentStep === getSteps(isOnboarding).length - 1;
  const isFirstStep = currentStep === 0;

  const hasExistingPreferences = Object.entries(preferences).some(([key, value]) =>
    key !== 'chefPreferences' && isPreferenceArray(value) && value.length > 0
  );

  const handleNext = async () => {
    if (isLastStep) {
      try {
        if (onGenerate) {
          // Check if user is on free tier and has already generated a meal plan
          if (user?.subscription_tier === 'free' && (user?.meal_plans_generated ?? 0) > 0) {
            toast({
              title: "Subscription Required",
              description: "You've reached the limit for meal plan generation on the free tier.",
              variant: "destructive",
            });
            setShowSubscriptionModal(true);
            return;
          }

          const updatedPreferences = {
            ...tempPreferences,
            chefPreferences
          };
          onGenerate(chefPreferences, updatedPreferences);
          onOpenChange(false);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate meal plan",
          variant: "destructive",
        });
      }
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 0 && hasExistingPreferences) {
      setCurrentStep(-1);
      setIsEditMode(false);
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleEditPreferences = () => {
    setIsEditMode(true);
    setCurrentStep(0);
  };

  const handleSelectPreference = useCallback((field: PreferenceField, value: string) => {
    try {
      const fieldSchema = PreferenceSchema.shape[field];
      if (!('element' in fieldSchema)) return;

      const parsed = fieldSchema.element.safeParse(value);
      if (!parsed.success) {
        console.error('Invalid preference value:', parsed.error);
        toast({
          title: "Error",
          description: "Invalid preference selection",
          variant: "destructive",
        });
        return;
      }

      setTempPreferences((prev) => {
        // Ensure we're working with a copy of the array to avoid reference issues
        const currentValues = Array.isArray(prev[field]) 
          ? [...(prev[field] as string[])] 
          : [];
        let newValues: string[];

        if (field === "dietary" && value === "No Preference") {
          // Special case for "No Preference" which should be exclusive
          newValues = [value];
        } else if (currentValues.includes(value)) {
          // If already selected, remove it (handled by handleRemovePreference)
          newValues = currentValues.filter(v => v !== value);
        } else {
          // Add the new value to the existing array, ensuring uniqueness
          newValues = Array.from(new Set([...currentValues, value]));
          
          // If "No Preference" was previously selected, remove it when adding other options
          if (field === "dietary" && newValues.includes("No Preference") && value !== "No Preference") {
            newValues = newValues.filter(v => v !== "No Preference");
          }
        }

        return {
          ...prev,
          [field]: newValues,
          chefPreferences: chefPreferences || defaultChefPreferences
        };
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive",
      });
    }
  }, [chefPreferences, toast]);

  const handleRemovePreference = useCallback((field: PreferenceField, value: string) => {
    setTempPreferences((prev) => {
      if (!isPreferenceArray(prev[field])) return prev;

      const newValues = (prev[field] as string[]).filter(v => v !== value);
      
      return {
        ...prev,
        [field]: newValues,
        chefPreferences: chefPreferences || defaultChefPreferences
      };
    });
  }, [chefPreferences]);

  const handleGenerateClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    
    try {
      if (onGenerate) {
        // Check if user is on free tier and has already generated a meal plan
        if (user?.subscription_tier === 'free' && (user?.meal_plans_generated ?? 0) > 0) {
          toast({
            title: "Subscription Required",
            description: "You've reached the limit for meal plan generation on the free tier.",
            variant: "destructive",
          });
          setShowSubscriptionModal(true);
          return;
        }

        const updatedPreferences = {
          ...tempPreferences,
          chefPreferences
        };
        onGenerate(chefPreferences, updatedPreferences);
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate meal plan",
        variant: "destructive",
      });
    }
  };

  const handleSavePreferences = async () => {
    try {
      const updatedPreferences = {
        ...tempPreferences,
        chefPreferences
      };
      
      // Validate the preferences
      PreferenceSchema.parse(updatedPreferences);
      
      // Update local state through the parent component
      onUpdatePreferences(updatedPreferences);
      
      // Save to database if user is logged in
      if (user) {
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
      }
      
      // Trigger confetti celebration!
      if (isOnboarding) {
        celebrateOnboarding();
      } else {
        celebrate();
      }
      
      toast({
        title: isOnboarding ? "🎉 You're all set!" : "Preferences Saved! 🎉",
        description: isOnboarding 
          ? "Your taste profile is ready. Let's start cooking up something amazing!"
          : "Your preferences have been updated successfully."
      });

      if (hideGenerateOption) {
        // Small delay to show the confetti before closing
        setTimeout(() => {
          onOpenChange(false);
        }, 1000);
      } else {
        setCurrentStep(getSteps(isOnboarding).length - 1);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please check your selections.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
      />

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={`${isMobile ? 'h-[90vh] rounded-t-lg' : 'h-full max-w-md'} overflow-y-auto pb-24 sm:pb-0`}
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {currentStep === -1 || isLastStep ? (
            <>
              <SheetHeader>
                <SheetTitle>Your Preferences</SheetTitle>
                <SheetDescription>
                  Customize your meal plan by setting your preferences.
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 my-6">
                {Object.entries(preferences).map(([key, value]) => {
                  if (key === 'chefPreferences') return null;
                  const field = key as PreferenceField;
                  if (!isPreferenceArray(value) || value.length === 0) return null;

                  return (
                    <div key={field} className="space-y-2">
                      <h3 className="text-sm font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</h3>
                      <div className="flex flex-wrap gap-2">
                        {value.map((item) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {preferences.chefPreferences && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Chef Preferences</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Difficulty:</span>
                        <p className="text-sm">{preferences.chefPreferences.difficulty}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Cooking Time:</span>
                        <p className="text-sm">{preferences.chefPreferences.cookTime}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Serving Size:</span>
                        <p className="text-sm">{preferences.chefPreferences.servingSize} servings</p>
                      </div>
                    </div>
                  </div>
                )}

                {isGenerating && (
                  <div className="flex flex-col items-center justify-center p-6">
                    <SnakeLoadingGame 
                      baseMessage="Creating your personalized meal plan..."
                    />
                  </div>
                )}
              </div>

              <SheetFooter className="mt-6">
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    onClick={handleEditPreferences}
                    className="text-sm w-full"
                    size={isMobile ? "lg" : "default"}
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    {hideGenerateOption ? "Edit Preferences" : "Modify Preferences"}
                  </Button>
                  {!hideGenerateOption && (
                    <Button
                      onClick={handleGenerateClick}
                      disabled={isGenerating}
                      className="text-sm w-full"
                      size={isMobile ? "lg" : "default"}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Meal Plan
                    </Button>
                  )}
                </div>
              </SheetFooter>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>{currentStepConfig?.title}</SheetTitle>
                <SheetDescription>{currentStepConfig?.description}</SheetDescription>
              </SheetHeader>

              <div className="w-full bg-secondary h-2 rounded-full mt-4">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / getSteps(isOnboarding).length) * 100}%` }}
                />
              </div>
              <div className="text-sm text-muted-foreground text-center mt-1 mb-4">
                Step {currentStep + 1} of {getSteps(isOnboarding).length}
              </div>

              {isLastStep && (
                <div className="flex flex-col gap-2 mb-6 sticky top-0 bg-background z-10">
                  <div className="flex flex-row justify-between gap-2 w-full">
                    <div className="w-full">
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        className="w-full"
                        size={isMobile ? "lg" : "default"}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    </div>
                    <Button
                      variant={hideGenerateOption ? "default" : "outline"}
                      onClick={handleSavePreferences}
                      className="w-full"
                      size={isMobile ? "lg" : "default"}
                    >
                      {hideGenerateOption ? "Save Changes" : "Save Preferences"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="my-6 space-y-6">
                {currentStepConfig?.field === null ? (
                  // Chef preferences step
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Difficulty Level</label>
                      <Select
                        value={chefPreferences.difficulty}
                        onValueChange={(value: typeof CHEF_PREFERENCES.difficulty[number]) =>
                          setChefPreferences(prev => ({ ...prev, difficulty: value }))
                        }
                      >
                        <SelectTrigger className={`${isMobile ? "h-12" : ""} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[300px]">
                          {CHEF_PREFERENCES.difficulty.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Cooking Time</label>
                      <Select
                        value={chefPreferences.cookTime}
                        onValueChange={(value: typeof CHEF_PREFERENCES.cookTime[number]) =>
                          setChefPreferences(prev => ({ ...prev, cookTime: value }))
                        }
                      >
                        <SelectTrigger className={`${isMobile ? "h-12" : ""} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[300px]">
                          {CHEF_PREFERENCES.cookTime.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Serving Size</label>
                      <Select
                        value={chefPreferences.servingSize}
                        onValueChange={(value: typeof CHEF_PREFERENCES.servingSize[number]) =>
                          setChefPreferences(prev => ({ ...prev, servingSize: value }))
                        }
                      >
                        <SelectTrigger className={`${isMobile ? "h-12" : ""} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-[300px]">
                          {CHEF_PREFERENCES.servingSize.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size} servings
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <>
                    {currentStepConfig?.field && (
                      <div className="space-y-4">
                        <div>
                          <Button 
                            variant="outline" 
                            className="w-full flex justify-between items-center text-left font-normal" 
                            size={isMobile ? "lg" : "default"}
                            onClick={() => setSelectOpen(true)}
                          >
                            <span className="truncate">
                              {tempPreferences[currentStepConfig.field].length > 0 
                                ? `${tempPreferences[currentStepConfig.field].length} ${tempPreferences[currentStepConfig.field].length === 1 ? 'item' : 'items'} selected`
                                : `Select ${currentStepConfig.title.toLowerCase()} (optional)`}
                            </span>
                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50">
                              <path d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                            </svg>
                          </Button>
                          
                          {/* Selected items summary (visible only if we have selections) */}
                          {tempPreferences[currentStepConfig.field].length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              <span>Selected: </span>
                              <span className="font-medium">
                                {tempPreferences[currentStepConfig.field]
                                  .slice(0, 2)
                                  .join(", ")}
                                {tempPreferences[currentStepConfig.field].length > 2 && 
                                  ` (+${tempPreferences[currentStepConfig.field].length - 2} more)`}
                              </span>
                            </div>
                          )}
                          
                          {/* Full-screen mobile-friendly options panel */}
                          {selectOpen && (
                            <div className="fixed inset-0 bg-background z-50 flex flex-col">
                              {/* Header with title and close button */}
                              <div className="border-b p-4 flex justify-between items-center sticky top-0 bg-background z-10">
                                <h2 className="font-semibold">
                                  Select {currentStepConfig.title}
                                </h2>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => setSelectOpen(false)}
                                  className="rounded-full h-8 w-8 p-0 flex items-center justify-center"
                                >
                                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.8071 2.99385 3.44303 2.99385 3.21848 3.2184C2.99394 3.44295 2.99394 3.80702 3.21848 4.03157L6.6869 7.49999L3.21848 10.9684C2.99394 11.193 2.99394 11.557 3.21848 11.7816C3.44303 12.0061 3.8071 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                  </svg>
                                </Button>
                              </div>
                              
                              {/* Scrollable options list */}
                              <div className="flex-1 overflow-y-auto">
                                <div className="p-4 space-y-1 pb-20">
                                  {currentStepConfig.field && currentStepConfig.options
                                    .map((option) => {
                                      const field = currentStepConfig.field!;
                                      const isSelected = (tempPreferences[field] as string[]).includes(option);
                                      
                                      return (
                                        <div
                                          key={option}
                                          className={`flex items-center gap-3 px-3 py-4 md:py-3 border rounded-md cursor-pointer ${isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-accent'}`}
                                          onClick={() => {
                                            if (isSelected) {
                                              handleRemovePreference(field, option);
                                            } else {
                                              handleSelectPreference(field, option);
                                            }
                                          }}
                                        >
                                          <div className={`w-6 h-6 border rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                                            {isSelected && (
                                              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-foreground">
                                                <path d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
                                              </svg>
                                            )}
                                          </div>
                                          <span className="text-base md:text-sm">{option}</span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                              
                              {/* Fixed footer with buttons */}
                              <div className="border-t p-4 flex justify-between bg-background w-full absolute bottom-0 left-0 right-0">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    if (currentStepConfig?.field) {
                                      setTempPreferences(prev => ({
                                        ...prev,
                                        [currentStepConfig.field]: preferences[currentStepConfig.field]
                                      }));
                                    }
                                    setSelectOpen(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => {
                                    // Keep the current selections (which are already in tempPreferences)
                                    setSelectOpen(false);
                                    
                                    // If we're on the last field step, proceed to save or next step
                                    if (currentStep === getSteps(isOnboarding).length - 2) {
                                      // Save preferences when done selecting options on the final field step
                                      handleSavePreferences();
                                    } else if (currentStep < getSteps(isOnboarding).length - 1) {
                                      // Move to the next step when done selecting options
                                      handleNext();
                                    }
                                  }}
                                >
                                  Done
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="min-h-[40px] flex flex-wrap gap-2">
                          {currentStepConfig?.field && tempPreferences[currentStepConfig.field].map((item) => (
                            <Badge
                              key={item}
                              variant="secondary"
                              className={`flex items-center gap-1 ${isMobile ? "text-base py-1.5 px-3" : ""}`}
                            >
                              {item}
                              <button
                                className={`ml-1 hover:bg-muted rounded-full ${isMobile ? "text-lg p-0.5" : ""}`}
                                onClick={() => handleRemovePreference(currentStepConfig.field!, item)}
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isLastStep && (
                <SheetFooter className="flex flex-col gap-2 mt-6 pb-6">
                  <div className="flex flex-row justify-between gap-2 w-full">
                    <div className="w-full">
                      {(!isFirstStep || hasExistingPreferences) && (
                        <Button
                          variant="outline"
                          onClick={handleBack}
                          className="w-full"
                          size={isMobile ? "lg" : "default"}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                      )}
                    </div>
                    {currentStep === getSteps(isOnboarding).length - 2 ? (
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          onClick={handleNext}
                          className="w-full"
                          size={isMobile ? "lg" : "default"}
                        >
                          Next
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          onClick={handleSavePreferences}
                          className="w-full"
                          size={isMobile ? "lg" : "default"}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="w-full"
                        size={isMobile ? "lg" : "default"}
                      >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
} 