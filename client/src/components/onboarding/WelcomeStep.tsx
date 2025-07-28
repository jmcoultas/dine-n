import { OnboardingStep } from "./OnboardingStep";
import { ChefHat, Sparkles, Heart } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <OnboardingStep
      title="Welcome to the Dine-N Family! 🎉"
      description="You've just unlocked the secret to never asking 'what's for dinner?' ever again. Let's get you set up for culinary greatness!"
      currentStep={1}
      totalSteps={7}
      onNext={onNext}
      canGoNext={true}
      canGoBack={false}
      nextLabel="Let's Get Cooking!"
    >
      <div className="max-w-3xl mx-auto text-center">
        {/* Main welcome content */}
        <div className="mb-8">
          
          <div className="space-y-6 text-lg leading-relaxed">
            
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
              <p className="text-foreground font-medium mb-3">
                Here's what makes you special now:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Personalized meal magic ✨</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>No more "what's for dinner?" panic 😅</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Recipes that actually match your taste 🎯</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span>Your kitchen confidence, boosted 🚀</span>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground">
              We're about to ask you a few fun questions to create your <span className="font-semibold text-primary">culinary profile</span>. Think of it as your food personality test – but way more delicious and slightly less existential.
            </p>
           
          </div>
        </div>
      </div>
    </OnboardingStep>
  );
} 