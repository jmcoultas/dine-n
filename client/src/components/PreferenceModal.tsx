import { useState } from "react";
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

type PreferenceType = "No Preference" | "Vegetarian" | "Vegan" | "Gluten-Free" | "Keto" | "Paleo" | "Mediterranean";
type AllergyType = "Dairy" | "Eggs" | "Tree Nuts" | "Peanuts" | "Shellfish" | "Wheat" | "Soy";
type CuisineType = "Italian" | "Mexican" | "Chinese" | "Japanese" | "Indian" | "Thai" | "Mediterranean" | "American" | "French";
type MeatType = "Chicken" | "Beef" | "Pork" | "Fish" | "Lamb" | "Turkey" | "None";

interface Preferences {
  dietary: PreferenceType[];
  allergies: AllergyType[];
  cuisine: CuisineType[];
  meatTypes: MeatType[];
}

type PreferenceField = keyof Preferences;

type PreferenceValueType = PreferenceType | AllergyType | CuisineType | MeatType;

interface Step {
  title: string;
  description: string;
  field: PreferenceField | null;
  options: string[];
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
    ]
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
    ]
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
    ]
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
    ]
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

  const handleSelectPreference = (field: PreferenceField, value: PreferenceValueType) => {
    setTempPreferences((prev) => {
      const updatedPreferences = { ...prev };
      const currentValues = prev[field];

      if (field === "dietary") {
        if (value === "No Preference") {
          return {
            ...prev,
            [field]: ["No Preference" as PreferenceType]
          };
        }
        const noPreference = "No Preference" as PreferenceType;
        const hasNoPreference = currentValues.some(v => v === noPreference);
        if (hasNoPreference) {
          return {
            ...prev,
            [field]: [value as PreferenceType]
          };
        }
      }

      return {
        ...prev,
        [field]: [...currentValues.filter(v => v !== "No Preference"), value as any]
      };
    });
  };

  const handleRemovePreference = (field: PreferenceField, value: PreferenceValueType) => {
    setTempPreferences((prev) => {
      const updatedPreferences = {
        ...prev,
        [field]: prev[field].filter((item) => item !== value)
      };
      onUpdatePreferences(updatedPreferences);
      return updatedPreferences;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{currentStepConfig.title}</DialogTitle>
          <DialogDescription>{currentStepConfig.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {isLastStep ? (
            <div className="space-y-6">
              {(Object.entries(tempPreferences) as [PreferenceField, PreferenceValueType[]][]).map(([key, values]) => (
                <div key={key} className="space-y-2">
                  <h4 className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                  <div className="flex flex-wrap gap-2">
                    {values.length > 0 ? values.map((item) => (
                      <Badge key={item} variant="secondary">{String(item)}</Badge>
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
                          const typedOption = option as PreferenceValueType;
                          const isSelected = tempPreferences[field].some(v => v === typedOption);
                          
                          return (
                            <div
                              key={option}
                              className="flex items-center gap-2 px-2 py-1 hover:bg-accent rounded-sm cursor-pointer"
                              onClick={() => {
                                if (isSelected) {
                                  handleRemovePreference(field, typedOption);
                                } else {
                                  handleSelectPreference(field, typedOption);
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
              isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Meal Plan
                </>
              )
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
