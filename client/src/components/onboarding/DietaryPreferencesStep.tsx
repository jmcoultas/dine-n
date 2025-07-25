import { OnboardingStep } from "./OnboardingStep";
import { ButtonSelection } from "./ButtonSelection";
import { PreferenceSchema } from "@db/schema";

interface DietaryPreferencesStepProps {
  selectedDietary: string[];
  onDietaryChange: (dietary: string[]) => void;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
}

const DIETARY_OPTIONS = PreferenceSchema.shape.dietary.element.options;

export function DietaryPreferencesStep({
  selectedDietary,
  onDietaryChange,
  onNext,
  onBack,
  canGoBack
}: DietaryPreferencesStepProps) {
  return (
    <OnboardingStep
      title="First Things First - What's Your Vibe? 🌱"
      description="Time for a quick taste test! Are you team keto, going green with vegetarian, or just here for the good vibes? Don't worry, we won't judge your midnight pizza cravings."
      currentStep={1}
      totalSteps={6}
      onNext={onNext}
      onBack={onBack}
      canGoNext={true} // Allow proceeding even with no selections
      canGoBack={canGoBack}
      nextLabel="Continue"
    >
      <div className="max-w-3xl mx-auto">
        <ButtonSelection
          options={DIETARY_OPTIONS}
          selectedOptions={selectedDietary}
          onSelectionChange={onDietaryChange}
          multiSelect={true}
          columns={3}
        />
        
        {selectedDietary.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              No worries if none of these apply to you - you can always skip this step!
            </p>
          </div>
        )}
      </div>
    </OnboardingStep>
  );
} 