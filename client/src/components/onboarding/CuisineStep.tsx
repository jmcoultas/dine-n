import { OnboardingStep } from "./OnboardingStep";
import { ButtonSelection } from "./ButtonSelection";
import { PreferenceSchema } from "@db/schema";

interface CuisineStepProps {
  selectedCuisine: string[];
  onCuisineChange: (cuisine: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const CUISINE_OPTIONS = PreferenceSchema.shape.cuisine.element.options;

export function CuisineStep({
  selectedCuisine,
  onCuisineChange,
  onNext,
  onBack
}: CuisineStepProps) {
  return (
    <OnboardingStep
      title="Around the World in 80 Bites 🌍"
      description="Passport not required! Which cuisines make your taste buds do a happy dance? From spicy Thai to comforting Italian - the world is your oyster (unless you're allergic to shellfish)."
      currentStep={4}
      totalSteps={7}
      onNext={onNext}
      onBack={onBack}
      canGoNext={selectedCuisine.length > 0}
      canGoBack={true}
      nextLabel="Continue"
    >
      <div className="max-w-3xl mx-auto">
        <ButtonSelection
          options={CUISINE_OPTIONS}
          selectedOptions={selectedCuisine}
          onSelectionChange={onCuisineChange}
          multiSelect={true}
          columns={3}
        />
        
        {selectedCuisine.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Please select at least one cuisine type to help us personalize your meal suggestions!
            </p>
          </div>
        )}

        {selectedCuisine.length > 0 && (
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Great choices! We'll focus on these cuisines for your meal suggestions.
            </p>
          </div>
        )}
      </div>
    </OnboardingStep>
  );
} 