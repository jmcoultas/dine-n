import { useState, useEffect, type MouseEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowLeft, ArrowRight, Settings2, Wand2 } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { PreferenceSchema, type Preferences } from "@db/schema";
import { ChefPreferencesSchema, type ChefPreferences } from "@/lib/types";

type PreferenceField = keyof Omit<Preferences, 'chefPreferences'>;

const CHEF_PREFERENCES = {
  difficulty: ChefPreferencesSchema.shape.difficulty.options,
  mealType: ChefPreferencesSchema.shape.mealType.options,
  cookTime: ChefPreferencesSchema.shape.cookTime.options
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

// Type guard to check if a value is an array
function isArray<T>(value: T | T[]): value is T[] {
  return Array.isArray(value);
}

interface PreferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  onUpdatePreferences: (preferences: Preferences) => void;
  isGenerating?: boolean;
  onGenerate?: (chefPreferences: ChefPreferences) => void;
}

export default function PreferenceModal({
  open,
  onOpenChange,
  preferences,
  onUpdatePreferences,
  isGenerating = false,
  onGenerate,
}: PreferenceModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(-1);
  const [tempPreferences, setTempPreferences] = useState<Preferences>(preferences);
  const [chefPreferences, setChefPreferences] = useState<ChefPreferences>({
    difficulty: 'Moderate',
    mealType: 'Any',
    cookTime: '30-60 minutes'
  });
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setTempPreferences(preferences);
    // Check if any preference array has values
    const hasValues = Object.entries(preferences).some(([key, value]) =>
      key !== 'chefPreferences' && isArray(value) && value.length > 0
    );
    setCurrentStep(hasValues ? -1 : 0);
    setIsEditMode(false);
  }, [preferences, open]);

  const currentStepConfig = currentStep >= 0 ? STEPS[currentStep] : null;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const hasExistingPreferences = Object.entries(preferences).some(([key, value]) =>
    key !== 'chefPreferences' && isArray(value) && value.length > 0
  );

  const handleNext = async () => {
    if (isLastStep) {
      try {
        await handleSavePreferences();
        onGenerate?.(chefPreferences);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to update preferences",
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

  const handleSelectPreference = (field: PreferenceField, value: string) => {
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
        const currentValues = Array.isArray(prev[field]) ? prev[field] as string[] : [];
        let newValues: string[];

        if (field === "dietary" && value === "No Preference") {
          newValues = [value];
        } else if (currentValues.includes(value)) {
          newValues = currentValues.filter(v => v !== value);
        } else {
          newValues = Array.from(new Set([...currentValues, value]));
        }

        const newPrefs = {
          ...prev,
          [field]: newValues
        };

        const validated = PreferenceSchema.safeParse(newPrefs);
        if (!validated.success) {
          console.error('Invalid preferences:', validated.error);
          toast({
            title: "Error",
            description: "Invalid preference combination",
            variant: "destructive",
          });
          return prev;
        }

        return validated.data;
      });
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleRemovePreference = (field: PreferenceField, value: string) => {
    const fieldSchema = PreferenceSchema.shape[field];
    if (!('element' in fieldSchema)) return;

    const parsed = fieldSchema.element.safeParse(value);
    if (!parsed.success) return;

    setTempPreferences((prev) => {
      const currentValues = Array.isArray(prev[field]) ? prev[field] as string[] : [];
      const newValues = currentValues.filter(item => item !== value);

      const newPrefs = {
        ...prev,
        [field]: newValues
      };

      const validated = PreferenceSchema.safeParse(newPrefs);
      if (validated.success) {
        return validated.data;
      }

      return prev;
    });
  };

  const handleGenerateClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onGenerate?.(chefPreferences);
  };

  const handleSavePreferences = async () => {
    try {
      const updatedPreferences = {
        ...tempPreferences,
        chefPreferences
      };

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
        throw new Error('Failed to update preferences');
      }

      onUpdatePreferences(updatedPreferences);
      toast({
        title: "Success",
        description: "Preferences updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  if (isGenerating) {
    return <LoadingAnimation message="Cooking up your personalized meal plan..." />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        {currentStep === -1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Your Meal Preferences</DialogTitle>
              <DialogDescription>
                Here are your current preferences. You can generate a meal plan or modify your preferences.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              {(Object.entries(preferences) as [PreferenceField, string[]][]).map(([key, values]) => (
                <div key={key} className="space-y-2">
                  <h4 className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {values.length > 0 ? values.map((item) => (
                      <Badge key={item} variant="secondary">{item}</Badge>
                    )) : (
                      <span className="text-sm text-muted-foreground">None selected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={handleEditPreferences}
                  className="text-sm"
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Modify Preferences
                </Button>
                <Button
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                  className="text-sm"
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Meal Plan
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{currentStepConfig?.title}</DialogTitle>
              <DialogDescription>{currentStepConfig?.description}</DialogDescription>
            </DialogHeader>

            <div className="w-full bg-secondary h-2 rounded-full mt-4">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground text-center mt-1">
              Step {currentStep + 1} of {STEPS.length}
            </div>

            <div className="mt-6 space-y-4">
              {currentStep === STEPS.length - 2 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Difficulty Level</label>
                      <Select
                        value={chefPreferences.difficulty}
                        onValueChange={(value: typeof CHEF_PREFERENCES.difficulty[number]) =>
                          setChefPreferences(prev => ({ ...prev, difficulty: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHEF_PREFERENCES.difficulty.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Meal Type</label>
                      <Select
                        value={chefPreferences.mealType}
                        onValueChange={(value: typeof CHEF_PREFERENCES.mealType[number]) =>
                          setChefPreferences(prev => ({ ...prev, mealType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHEF_PREFERENCES.mealType.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHEF_PREFERENCES.cookTime.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : isLastStep ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Dietary Preferences</h3>
                    {(Object.entries(tempPreferences) as [PreferenceField, string[]][]).map(([key, values]) => (
                      <div key={key} className="space-y-2">
                        <h4 className="text-sm font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {values.length > 0 ? values.map((item) => (
                            <Badge key={item} variant="secondary">{item}</Badge>
                          )) : (
                            <span className="text-sm text-muted-foreground">None selected</span>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-medium mb-4">Chef Preferences</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Difficulty:</span>
                          <span className="text-sm font-medium">{chefPreferences.difficulty}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Meal Type:</span>
                          <span className="text-sm font-medium">{chefPreferences.mealType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Cooking Time:</span>
                          <span className="text-sm font-medium">{chefPreferences.cookTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {currentStepConfig?.field && (
                    <div className="space-y-2">
                      <Select>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={`Select ${currentStepConfig.title.toLowerCase()} (optional)`}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="p-2 max-h-[300px] overflow-y-auto">
                            {currentStepConfig.field && currentStepConfig.options.map((option) => {
                              const field = currentStepConfig.field!;
                              const isSelected = (tempPreferences[field] as string[]).includes(option);

                              return (
                                <div
                                  key={option}
                                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer"
                                  onClick={() => {
                                    if (isSelected) {
                                      handleRemovePreference(field, option);
                                    } else {
                                      handleSelectPreference(field, option);
                                    }
                                  }}
                                >
                                  <div className="w-4 h-4 border rounded flex items-center justify-center">
                                    {isSelected && (
                                      <div className="h-2 w-2 bg-primary rounded-sm" />
                                    )}
                                  </div>
                                  <span>{option}</span>
                                </div>
                              );
                            })}
                          </div>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {currentStepConfig?.field && tempPreferences[currentStepConfig.field].map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {item}
                        <button
                          className="ml-1 hover:bg-muted rounded-full"
                          onClick={() => handleRemovePreference(currentStepConfig.field!, item)}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between gap-2 mt-6">
              <div className="w-full sm:w-auto">
                {(!isFirstStep || hasExistingPreferences) && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {isLastStep && (
                  <Button
                    variant="outline"
                    onClick={handleSavePreferences}
                    className="w-full sm:w-auto"
                  >
                    Save Preferences
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={isGenerating}
                  className="w-full sm:w-auto"
                >
                  {isLastStep ? (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Meal Plan
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}