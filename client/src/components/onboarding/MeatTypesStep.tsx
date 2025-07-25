import { OnboardingStep } from "./OnboardingStep";
import { ButtonSelection } from "./ButtonSelection";
import { PreferenceSchema } from "@db/schema";
import { Beef, Fish, Drumstick } from "lucide-react";

interface MeatTypesStepProps {
  selectedMeatTypes: string[];
  onMeatTypesChange: (meatTypes: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const MEAT_TYPE_OPTIONS = PreferenceSchema.shape.meatTypes.element.options;

export function MeatTypesStep({
  selectedMeatTypes,
  onMeatTypesChange,
  onNext,
  onBack
}: MeatTypesStepProps) {
  return (
    <OnboardingStep
      title="The Protein Plot Thickens 🥩"
      description="Let's talk about the main event! What proteins are you excited to see on your plate? Or maybe you're team plants-only? We've got options for every appetite."
      currentStep={4}
      totalSteps={6}
      onNext={onNext}
      onBack={onBack}
      canGoNext={true} // Allow proceeding even with no selections (for vegetarians)
      canGoBack={true}
      nextLabel="Continue"
    >
      <div className="max-w-3xl mx-auto">
        <ButtonSelection
          options={MEAT_TYPE_OPTIONS}
          selectedOptions={selectedMeatTypes}
          onSelectionChange={onMeatTypesChange}
          multiSelect={true}
          columns={3}
        />
        
        {selectedMeatTypes.includes("None") && selectedMeatTypes.length > 1 && (
          <div className="text-center mt-8 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              💡 Heads up! You've selected "None" along with other meat types. If you're vegetarian, you might want to just select "None".
            </p>
          </div>
        )}

        {selectedMeatTypes.length === 0 && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              No preferences? No problem! We'll suggest recipes with a variety of protein options.
            </p>
          </div>
        )}

        {selectedMeatTypes.includes("None") && selectedMeatTypes.length === 1 && (
          <div className="text-center mt-8 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-center gap-2 text-green-800 dark:text-green-200">
              <span className="text-lg">🌱</span>
              <span className="font-medium">Plant-Powered!</span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              We'll focus on delicious vegetarian recipes for you.
            </p>
          </div>
        )}
      </div>
    </OnboardingStep>
  );
} 