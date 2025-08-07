import { OnboardingStep } from "./OnboardingStep";
import { PricingCard } from "../PricingCard";
import { useSubscription } from "@/hooks/use-subscription";
import { Loader2, Tag } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);

  const handleUpgrade = async () => {
    setSelectedPlan('premium');
    try {
      await createCheckoutSession(couponCode || undefined);
      // Call the parent's onSelectPremium to save preferences
      onSelectPremium();
    } catch (error) {
      console.error('Stripe checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
      setSelectedPlan(null);
    }
  };

  const handleSelectFree = () => {
    setSelectedPlan('free');
    onSelectFree();
  };

  return (
    <OnboardingStep
      title="Unlock Your Full Culinary Potential! 🍽️"
      description="You're all set up for success! Ready to supercharge your cooking journey with premium features, or continue exploring with our generous free plan?"
      currentStep={7}
      totalSteps={7}
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

        {/* Coupon Code Section */}
        <div className="mb-6 text-center">
          {!showCouponInput ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCouponInput(true)}
              className="text-sm text-muted-foreground hover:text-primary"
              disabled={isLoading}
            >
              <Tag className="mr-2 h-4 w-4" />
              Have a coupon code?
            </Button>
          ) : (
            <div className="max-w-sm mx-auto space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCouponInput(false);
                    setCouponCode('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
              {couponCode && (
                <p className="text-xs text-muted-foreground">
                  Coupon will be applied at checkout
                </p>
              )}
            </div>
          )}
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