import { OnboardingStep } from "./OnboardingStep";
import { ButtonSelection } from "./ButtonSelection";
import { PREDEFINED_ALLERGENS } from "@db/schema";

interface AllergiesStepProps {
  selectedAllergies: string[];
  onAllergiesChange: (allergies: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const ALLERGY_OPTIONS = PREDEFINED_ALLERGENS;

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
      currentStep={3}
      totalSteps={7}
      onNext={onNext}
      onBack={onBack}
      canGoNext={true}
      canGoBack={true}
      nextLabel="Continue"
    >
      <div className="max-w-3xl mx-auto">
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