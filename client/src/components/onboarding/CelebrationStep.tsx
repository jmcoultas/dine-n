import { useEffect } from "react";
import { ChefHat, Sparkles } from "lucide-react";
import { celebrateOnboarding } from "@/lib/confetti";
import { useLocation } from "wouter";

interface CelebrationStepProps {
  selectedPlan: 'free' | 'premium';
}

export function CelebrationStep({ selectedPlan }: CelebrationStepProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Trigger confetti immediately
    celebrateOnboarding();

    // Redirect to dashboard after celebration
    const timer = setTimeout(() => {
      setLocation('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center">
      <div className="text-center space-y-8 max-w-2xl mx-auto px-4">
        {/* Animated Icon */}
        <div className="relative">
          <div className="bg-primary/10 p-8 rounded-full animate-pulse">
            <ChefHat className="w-24 h-24 text-primary animate-bounce" />
          </div>
          <div className="absolute -top-2 -right-2">
            <Sparkles className="w-8 h-8 text-yellow-500 animate-spin" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            🎉 Welcome to Dine-N!
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            {selectedPlan === 'premium' 
              ? "Premium powers activated! Your culinary adventure begins now." 
              : "Your taste preferences are locked and loaded. Time to discover some amazing meals!"
            }
          </p>
        </div>

        {/* Plan Confirmation */}
        <div className="p-6 bg-card rounded-xl border border-primary/20 shadow-lg">
          <h3 className="text-lg font-semibold mb-2">
            {selectedPlan === 'premium' ? '✨ Premium Plan Active' : '🌟 Free Plan Active'}
          </h3>
          <p className="text-muted-foreground">
            {selectedPlan === 'premium' 
              ? "You now have access to all premium features including AI ingredient zapping, advanced meal planning, and more!" 
              : "You're all set to start exploring personalized meal plans and recipes. Upgrade anytime to unlock premium features."
            }
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>

        <p className="text-sm text-muted-foreground">
          Taking you to your dashboard...
        </p>
      </div>
    </div>
  );
} 