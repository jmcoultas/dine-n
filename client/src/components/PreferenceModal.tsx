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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Wand2 } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { PreferenceSchema } from "@db/schema";
import type { Preferences } from "@db/schema";

type PreferenceField = keyof Preferences;

// Define specific preference value types based on the schema
type DietaryPreference = "No Preference" | "Vegetarian" | "Vegan" | "Gluten-Free" | "Keto" | "Paleo" | "Mediterranean";
type AllergyPreference = "Dairy" | "Eggs" | "Tree Nuts" | "Peanuts" | "Shellfish" | "Wheat" | "Soy";
type CuisinePreference = "Italian" | "Mexican" | "Chinese" | "Japanese" | "Indian" | "Thai" | "Mediterranean" | "American" | "French";
type MeatPreference = "Chicken" | "Beef" | "Pork" | "Fish" | "Lamb" | "Turkey" | "None";

type PreferenceValue<T extends PreferenceField> = 
  T extends "dietary" ? DietaryPreference :
  T extends "allergies" ? AllergyPreference :
  T extends "cuisine" ? CuisinePreference :
  T extends "meatTypes" ? MeatPreference :
  never;

interface Step {
  title: string;
  description: string;
  field: PreferenceField | null;
  options: PreferenceValue<PreferenceField>[];
}

const STEPS: Step[] = [
  {
    title: "Dietary Preferences",
    description: "Select any dietary restrictions or preferences you follow.",
    field: "dietary",
    options: [
      "No Preference",
      "Vegetarian",
      "Vegan",
      "Gluten-Free",
      "Keto",
      "Paleo",
      "Mediterranean"
    ] as DietaryPreference[]
  },
  {
    title: "Allergies",
    description: "Select any food allergies or intolerances.",
    field: "allergies",
    options: [
      "Dairy",
      "Eggs",
      "Tree Nuts",
      "Peanuts",
      "Shellfish",
      "Wheat",
      "Soy"
    ] as AllergyPreference[]
  },
  {
    title: "Cuisine Preferences",
    description: "Select your preferred cuisine types.",
    field: "cuisine",
    options: [
      "Italian",
      "Mexican",
      "Chinese",
      "Japanese",
      "Indian",
      "Thai",
      "Mediterranean",
      "American",
      "French"
    ] as CuisinePreference[]
  },
  {
    title: "Meat Preferences",
    description: "Select your preferred meat types.",
    field: "meatTypes",
    options: [
      "Chicken",
      "Beef",
      "Pork",
      "Fish",
      "Lamb",
      "Turkey",
      "None"
    ] as MeatPreference[]
  },
  {
    title: "Review & Generate",
    description: "Review your preferences and generate your meal plan.",
    field: null,
    options: []
  }
];

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

  const handleSelectPreference = <T extends PreferenceField>(field: T, value: PreferenceValue<T>) => {
    setTempPreferences((prev) => {
      const currentValues = prev[field];

      if (field === "dietary") {
        if (value === "No Preference") {
          const newPrefs = {
            ...prev,
            [field]: ["No Preference" as const]
          };
          onUpdatePreferences(newPrefs);
          return newPrefs;
        } else {
          const filtered = currentValues.filter(v => v !== "No Preference");
          const newPrefs = {
            ...prev,
            [field]: [...filtered, value]
          };
          onUpdatePreferences(newPrefs);
          return newPrefs;
        }
      }

      const newPrefs = {
        ...prev,
        [field]: [...currentValues, value]
      };
      onUpdatePreferences(newPrefs);
      return newPrefs;
    });
  };

  const handleRemovePreference = <T extends PreferenceField>(field: T, value: PreferenceValue<T>) => {
    setTempPreferences((prev) => {
      const newPrefs = {
        ...prev,
        [field]: prev[field].filter((item) => item !== value)
      };
      onUpdatePreferences(newPrefs);
      return newPrefs;
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
              {(Object.entries(tempPreferences) as [PreferenceField, PreferenceValue<PreferenceField>[]][]).map(([key, values]) => (
                <div key={key} className="space-y-2">
                  <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
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
                  <Select defaultOpen={false}>
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={`Select multiple ${currentStepConfig.title.toLowerCase()} (optional)`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        {currentStepConfig.field && currentStepConfig.options.map((option) => {
                          const field = currentStepConfig.field as PreferenceField;
                          const isSelected = tempPreferences[field].includes(option);

                          return (
                            <div
                              key={option}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-sm cursor-pointer"
                              onClick={() => {
                                if (isSelected) {
                                  handleRemovePreference(field, option as PreferenceValue<typeof field>);
                                } else {
                                  handleSelectPreference(field, option as PreferenceValue<typeof field>);
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
                        <div className="mt-2 pt-2 border-t">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              const trigger = document.querySelector('[role="combobox"]') as HTMLElement;
                              if (trigger) {
                                trigger.click();
                                const dropdown = document.querySelector('[role="listbox"]');
                                if (dropdown) {
                                  (dropdown as HTMLElement).style.display = 'none';
                                }
                              }
                            }}
                          >
                            Done
                          </Button>
                        </div>
                      </div>
                    </SelectContent>
                  </Select>
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-primary">✨ Multi-Select Enabled</p>
                    <p className="text-muted-foreground">
                      • Click multiple options to add them
                      • Click the badges below to remove selections
                      • All selections are optional
                    </p>
                  </div>
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
                      onClick={() => handleRemovePreference(currentStepConfig.field!, item as PreferenceValue<typeof currentStepConfig.field>)}
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