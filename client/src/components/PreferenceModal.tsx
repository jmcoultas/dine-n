import { useState, useEffect } from "react";
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
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Settings2, Wand2 } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { PreferenceSchema } from "@db/schema";
import type { Preferences } from "@db/schema";

type PreferenceField = keyof Preferences;

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
    title: "Almost Done!",
    description: "Review your preferences below. You can always change these later.",
    field: null,
    options: [] as const
  }
] as const;

interface PreferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preferences: Preferences;
  onUpdatePreferences: (preferences: Preferences) => void;
  isGenerating?: boolean;
  onGenerate?: () => void;
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
  const [currentStep, setCurrentStep] = useState(-1); // -1 represents the quick view
  const [tempPreferences, setTempPreferences] = useState<Preferences>(preferences);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    setTempPreferences(preferences);
    // If user has existing preferences, start in quick view mode
    setCurrentStep(Object.values(preferences).some(arr => arr.length > 0) ? -1 : 0);
    setIsEditMode(false);
  }, [preferences, open]);

  const currentStepConfig = currentStep >= 0 ? STEPS[currentStep] : null;
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const hasExistingPreferences = Object.values(preferences).some(arr => arr.length > 0);

  const handleNext = async () => {
    if (isLastStep) {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            preferences: tempPreferences
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update preferences');
        }

        onGenerate?.();
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
      const parsed = PreferenceSchema.shape[field].element.safeParse(value);
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
    const parsed = PreferenceSchema.shape[field].element.safeParse(value);
    if (!parsed.success) return;

    setTempPreferences((prev) => {
      const newPrefs = {
        ...prev,
        [field]: (prev[field] || []).filter((item) => item !== value)
      };

      const validated = PreferenceSchema.safeParse(newPrefs);
      if (validated.success) {
        onUpdatePreferences(validated.data);
        return validated.data;
      }

      return prev;
    });
  };

  if (isGenerating) {
    return <LoadingAnimation message="Cooking up your personalized meal plan..." />;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        {currentStep === -1 ? (
          // Quick view mode
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
              <Button
                variant="outline"
                onClick={handleEditPreferences}
                className="w-full sm:w-auto"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Modify Preferences
              </Button>
              <Button
                onClick={onGenerate}
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Meal Plan
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Step-by-step edit mode
          <>
            <DialogHeader>
              <DialogTitle>{currentStepConfig?.title}</DialogTitle>
              <DialogDescription>{currentStepConfig?.description}</DialogDescription>
            </DialogHeader>

            {/* Progress indicator */}
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
              {isLastStep ? (
                <div className="space-y-6">
                  {(Object.entries(tempPreferences) as [PreferenceField, string[]][]).map(([key, values]) => (
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
                    onClick={() => onUpdatePreferences(tempPreferences)}
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