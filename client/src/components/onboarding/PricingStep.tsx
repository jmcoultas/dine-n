import { OnboardingStep } from "./OnboardingStep";
import { PricingCard } from "../PricingCard";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface PricingStepProps {
  onSelectFree: () => void;
  onSelectPremium: () => void;
  onBack: () => void;
}

export function PricingStep({
  onSelectFree,
  onSelectPremium,
  onBack
}: PricingStepProps) {
  const { createCheckoutSession, isLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | null>(null);

  const handleUpgrade = async () => {
    setSelectedPlan('premium');
    // Call the parent's onSelectPremium which will save preferences AND handle Stripe
    onSelectPremium();
  };

  const handleSelectFree = () => {
    setSelectedPlan('free');
    onSelectFree();
  };

  return (
    <OnboardingStep
      title="Unlock Your Full Culinary Potential! 🍽️"
      description="You're all set up for success! Ready to supercharge your cooking journey with premium features, or continue exploring with our generous free plan?"
      currentStep={6}
      totalSteps={6}
      onBack={onBack}
      canGoBack={!isLoading}
      canGoNext={false} // No next button - user must choose a plan
      backLabel="Back"
    >
      <div className="max-w-2xl mx-auto">
        {/* Single Premium Card */}
        <div className={`mb-8 transition-all duration-200 ${selectedPlan === 'premium' ? 'ring-2 ring-primary/50 scale-[1.02]' : ''}`}>
          <PricingCard 
            plan="premium" 
            showGetStarted={false}
            onUpgrade={handleUpgrade}
          />
        </div>

        {/* Single Action Button */}
        <div className="text-center space-y-4">
          <button
            onClick={handleSelectFree}
            disabled={isLoading}
            className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 border-2 ${
              selectedPlan === 'free' 
                ? 'bg-primary/10 border-primary text-primary' 
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
          >
            {selectedPlan === 'free' && <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />}
            Continue with Free Plan
          </button>

          {/* Additional context */}
          <p className="text-sm text-muted-foreground">
            You can always upgrade later from your account settings
          </p>
        </div>
      </div>
    </OnboardingStep>
  );
} 