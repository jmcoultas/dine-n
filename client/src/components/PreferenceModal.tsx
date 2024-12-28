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
import { ArrowLeft, ArrowRight, Wand2 } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { PreferenceSchema } from "@db/schema";
import type { Preferences } from "@db/schema";

type PreferenceField = keyof Preferences;

const STEPS = [
  {
    title: "Dietary Preferences",
    description: "Select any dietary restrictions or preferences you follow.",
    field: "dietary" as const,
    options: PreferenceSchema.shape.dietary.element.options
  },
  {
    title: "Allergies",
    description: "Select any food allergies or intolerances.",
    field: "allergies" as const,
    options: PreferenceSchema.shape.allergies.element.options
  },
  {
    title: "Cuisine Preferences",
    description: "Select your preferred cuisine types.",
    field: "cuisine" as const,
    options: PreferenceSchema.shape.cuisine.element.options
  },
  {
    title: "Meat Preferences",
    description: "Select your preferred meat types.",
    field: "meatTypes" as const,
    options: PreferenceSchema.shape.meatTypes.element.options
  },
  {
    title: "Review & Generate",
    description: "Review your preferences and generate your meal plan.",
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
  const [currentStep, setCurrentStep] = useState(0);
  const [tempPreferences, setTempPreferences] = useState<Preferences>(preferences);

  useEffect(() => {
    setTempPreferences(preferences);
  }, [preferences]);

  const currentStepConfig = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      onGenerate?.();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
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
        try {
          const currentValues = Array.isArray(prev[field]) ? prev[field] as string[] : [];
          let newValues: string[];

          if (field === "dietary" && value === "No Preference") {
            newValues = [value];
          } else if (field === "dietary" && currentValues.includes(value as any)) {
            newValues = [value];
          } else {
            newValues = [...currentValues, value];
          }

          const newPrefs = {
            ...prev,
            [field]: newValues
          };

          // Validate the entire preferences object
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

          onUpdatePreferences(validated.data);
          return validated.data;
        } catch (error) {
          console.error('Error updating preferences:', error);
          toast({
            title: "Error",
            description: "Failed to update preferences",
            variant: "destructive",
          });
          return prev;
        }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isGenerating && (
        <LoadingAnimation message="Cooking up your personalized meal plan..." />
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentStepConfig.title}</DialogTitle>
          <DialogDescription>{currentStepConfig.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
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
              {currentStepConfig.field && (
                <div className="space-y-2">
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={`Select multiple ${currentStepConfig.title.toLowerCase()} (optional)`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        {currentStepConfig.field && currentStepConfig.options.map((option) => {
                          const field = currentStepConfig.field!;
                          const isSelected = (tempPreferences[field] as string[]).includes(option);

                          return (
                            <div
                              key={option}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-sm cursor-pointer"
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
                {currentStepConfig.field && tempPreferences[currentStepConfig.field].map((item) => (
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

        <DialogFooter className="flex justify-between mt-6">
          <div>
            {!isFirstStep && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <Button onClick={handleNext} disabled={isGenerating}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}