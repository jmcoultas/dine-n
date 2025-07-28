import { OnboardingStep } from "./OnboardingStep";
import { ButtonSelection } from "./ButtonSelection";
import { ChefPreferencesSchema, type ChefPreferences } from "@/lib/types";
import { ChefHat, Clock, Users } from "lucide-react";
import { useState } from "react";

interface ChefPreferencesStepProps {
  selectedChefPreferences: ChefPreferences;
  onChefPreferencesChange: (chefPreferences: ChefPreferences) => void;
  onNext: () => void;
  onBack: () => void;
}

const CHEF_PREFERENCES = {
  difficulty: ChefPreferencesSchema.shape.difficulty.options,
  cookTime: ChefPreferencesSchema.shape.cookTime.options,
  servingSize: ChefPreferencesSchema.shape.servingSize.options
} as const;

export function ChefPreferencesStep({
  selectedChefPreferences,
  onChefPreferencesChange,
  onNext,
  onBack
}: ChefPreferencesStepProps) {
  const [currentCategory, setCurrentCategory] = useState<'difficulty' | 'cookTime' | 'servingSize'>('difficulty');

  const handleSelectionChange = (category: keyof ChefPreferences, value: string) => {
    onChefPreferencesChange({
      ...selectedChefPreferences,
      [category]: value
    });
  };

  const handleNext = () => {
    if (currentCategory === 'difficulty') {
      setCurrentCategory('cookTime');
    } else if (currentCategory === 'cookTime') {
      setCurrentCategory('servingSize');
    } else {
      // All categories completed, proceed to next step
      onNext();
    }
  };

  const handleBack = () => {
    if (currentCategory === 'cookTime') {
      setCurrentCategory('difficulty');
    } else if (currentCategory === 'servingSize') {
      setCurrentCategory('cookTime');
    } else {
      // Back to previous onboarding step
      onBack();
    }
  };

  const canGoNext = () => {
    switch (currentCategory) {
      case 'difficulty':
        return !!selectedChefPreferences.difficulty;
      case 'cookTime':
        return !!selectedChefPreferences.cookTime;
      case 'servingSize':
        return !!selectedChefPreferences.servingSize;
      default:
        return false;
    }
  };

  const getStepInfo = () => {
    switch (currentCategory) {
      case 'difficulty':
        return {
          title: "Chef Mode: What's Your Kitchen Confidence? 👨‍🍳",
          description: "Are you a 'microwave-is-my-best-friend' type or ready to channel your inner Gordon Ramsay? No judgment - we're here to meet you where you're at!",
          icon: <ChefHat className="w-8 h-8 text-primary mb-4 mx-auto" />,
          options: CHEF_PREFERENCES.difficulty,
          selected: selectedChefPreferences.difficulty,
          subStep: "5a"
        };
      case 'cookTime':
        return {
          title: "Time Check: How Long Can You Commit? ⏰",
          description: "Sometimes you have 30 minutes, sometimes you have 'the kids are screaming' minutes. Let's set realistic expectations!",
          icon: <Clock className="w-8 h-8 text-primary mb-4 mx-auto" />,
          options: CHEF_PREFERENCES.cookTime,
          selected: selectedChefPreferences.cookTime,
          subStep: "5b"
        };
      case 'servingSize':
        return {
          title: "Feeding the Troops: How Many Mouths? 👥",
          description: "Cooking for one? Family of five? Let's make sure you have the right portions without tons of leftovers (unless that's your thing).",
          icon: <Users className="w-8 h-8 text-primary mb-4 mx-auto" />,
          options: CHEF_PREFERENCES.servingSize,
          selected: selectedChefPreferences.servingSize,
          subStep: "5c"
        };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <OnboardingStep
      title={stepInfo.title}
      description={stepInfo.description}
      currentStep={6}
      totalSteps={7}
      onNext={handleNext}
      onBack={handleBack}
      canGoNext={canGoNext()}
      canGoBack={true}
      nextLabel={currentCategory === 'servingSize' ? "Continue" : "Next"}
      backLabel={currentCategory === 'difficulty' ? "Back" : "Previous"}
    >
      <div className="max-w-2xl mx-auto">
        {/* Category Icon */}
        <div className="text-center mb-8">
          {stepInfo.icon}
        </div>

        {/* Progress Dots for Sub-steps */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {(['difficulty', 'cookTime', 'servingSize'] as const).map((category, index) => (
              <div
                key={category}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  currentCategory === category
                    ? 'bg-primary scale-125'
                    : selectedChefPreferences[category]
                    ? 'bg-primary/60'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Selection Buttons */}
        <ButtonSelection
          options={stepInfo.options}
          selectedOptions={stepInfo.selected ? [stepInfo.selected] : []}
          onSelectionChange={(selected) => handleSelectionChange(currentCategory, selected[0] || '')}
          multiSelect={false}
          columns={1}
        />

        {/* Step Indicator */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Step {stepInfo.subStep} of 5c
          </p>
        </div>
      </div>
    </OnboardingStep>
  );
} 