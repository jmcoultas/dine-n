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

type PreferenceValue<T extends PreferenceField> = 
  T extends "dietary" ? PreferenceType :
  T extends "allergies" ? AllergyType :
  T extends "cuisine" ? CuisineType :
  T extends "meatTypes" ? MeatType :
  never;

interface Preferences {
  dietary: PreferenceType[];
  allergies: AllergyType[];
  cuisine: CuisineType[];
  meatTypes: MeatType[];
}

type PreferenceField = keyof Preferences;

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

  const handleSelectPreference = <T extends PreferenceField>(field: T, value: PreferenceValue<T>) => {
    setTempPreferences((prev) => {
      const updatedPreferences = { ...prev };
      const currentValues = prev[field] as Array<PreferenceValue<T>>;
      
      if (field === "dietary" && value === "No Preference" as PreferenceValue<T>) {
        updatedPreferences[field] = [value as PreferenceValue<T>] as Preferences[T];
      } else {
        const noPreference = "No Preference" as PreferenceValue<T>;
        const hasNoPreference = currentValues.includes(noPreference);
        const newValues = hasNoPreference 
          ? [value] 
          : [...currentValues.filter(v => v !== noPreference), value];
        updatedPreferences[field] = newValues as Preferences[T];
      }
      
      onUpdatePreferences(updatedPreferences);
      return updatedPreferences;
    });
  };

  const handleRemovePreference = <T extends PreferenceField>(field: T, value: PreferenceValue<T>) => {
    setTempPreferences((prev) => {
      const currentValues = prev[field] as PreferenceValue<T>[];
      const updatedPreferences = {
        ...prev,
        [field]: currentValues.filter((item) => item !== value)
      };
      onUpdatePreferences(updatedPreferences);
      return updatedPreferences;
    });
  };

  const getOptionsForField = <T extends PreferenceField>(field: T): PreferenceValue<T>[] => {
    const step = STEPS.find(s => s.field === field);
    return (step?.options ?? []) as PreferenceValue<T>[];
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
              {(Object.entries(tempPreferences) as [PreferenceField, PreferenceValue<PreferenceField>[]][]).map(([key, values]) => (
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
                  <Select
                    value={tempPreferences[currentStepConfig.field][0] ?? ""}
                    onValueChange={(value) => {
                      if (currentStepConfig.field) {
                        const field = currentStepConfig.field;
                        const typedValue = value as PreferenceValue<typeof field>;
                        handleSelectPreference(field, typedValue);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={`Select ${currentStepConfig.title.toLowerCase()}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {currentStepConfig.field && getOptionsForField(currentStepConfig.field).map((option) => (
                        <SelectItem key={option} value={option} className="flex items-center space-x-2">
                          <div className="h-4 w-4 border rounded flex items-center justify-center">
                            {tempPreferences[currentStepConfig.field].includes(option) && (
                              <div className="h-2 w-2 bg-primary rounded-sm" />
                            )}
                          </div>
                          <span>{option}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    You can select multiple options. Click an option to add it, and use the badges below to remove selections.
                  </p>
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
                      onClick={() => handleRemovePreference(
                        currentStepConfig.field as PreferenceField,
                        item as PreferenceValue<typeof currentStepConfig.field>
                      )}
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
