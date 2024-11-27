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
import { ArrowLeft, ArrowRight, Check, Wand2 } from "lucide-react";

const STEPS = [
  {
    title: "Dietary Preferences",
    description: "Select any dietary restrictions or preferences you follow.",
    field: "dietary" as const,
    options: [
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
    field: "allergies" as const,
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
    field: "cuisine" as const,
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
    field: "meatTypes" as const,
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
  preferences: {
    dietary: string[];
    allergies: string[];
    cuisine: string[];
    meatTypes: string[];
  };
  onUpdatePreferences: (preferences: {
    dietary: string[];
    allergies: string[];
    cuisine: string[];
    meatTypes: string[];
  }) => void;
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
  const [tempPreferences, setTempPreferences] = useState(preferences);

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

  const handleSelectPreference = (value: string) => {
    const field = currentStepConfig.field;
    if (!tempPreferences[field].includes(value)) {
      setTempPreferences((prev) => ({
        ...prev,
        [field]: [...prev[field], value],
      }));
    }
  };

  const handleRemovePreference = (value: string) => {
    const field = currentStepConfig.field;
    setTempPreferences((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
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
              {Object.entries(tempPreferences).map(([key, values]) => (
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
              <Select
                value={tempPreferences[currentStepConfig.field!][0] || ""}
                onValueChange={handleSelectPreference}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select ${currentStepConfig.title.toLowerCase()}`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {currentStepConfig.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-wrap gap-2">
                {tempPreferences[currentStepConfig.field!].map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {item}
                    <button
                      className="ml-1 hover:bg-muted rounded-full"
                      onClick={() => handleRemovePreference(item)}
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
