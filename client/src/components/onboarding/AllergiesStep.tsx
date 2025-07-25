import { OnboardingStep } from "./OnboardingStep";
import { ButtonSelection } from "./ButtonSelection";
import { PreferenceSchema } from "@db/schema";
import { AlertTriangle } from "lucide-react";

interface AllergiesStepProps {
  selectedAllergies: string[];
  onAllergiesChange: (allergies: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const ALLERGY_OPTIONS = PreferenceSchema.shape.allergies.element.options;

export function AllergiesStep({
  selectedAllergies,
  onAllergiesChange,
  onNext,
  onBack
}: AllergiesStepProps) {
  return (
    <OnboardingStep
      title="Let's Keep You Safe & Sound 🛡️"
      description="Nobody wants a surprise ingredient ruining the party! Tell us about any food allergies or things that don't play nice with your system."
      currentStep={2}
      totalSteps={6}
      onNext={onNext}
      onBack={onBack}
      canGoNext={true}
      canGoBack={true}
      nextLabel="Continue"
    >
      <div className="max-w-3xl mx-auto">
        {selectedAllergies.length > 0 && (
          <div className="mb-8 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Safety First!</span>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
              We'll make sure to avoid these ingredients in all your meal suggestions.
            </p>
          </div>
        )}

        <ButtonSelection
          options={ALLERGY_OPTIONS}
          selectedOptions={selectedAllergies}
          onSelectionChange={onAllergiesChange}
          multiSelect={true}
          columns={3}
        />
        
        {selectedAllergies.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Lucky you! No food allergies? You can skip this step and explore all the flavors.
            </p>
          </div>
        )}
      </div>
    </OnboardingStep>
  );
} 