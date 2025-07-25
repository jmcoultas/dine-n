import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStepProps {
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onBack?: () => void;
  canGoNext?: boolean;
  canGoBack?: boolean;
  nextLabel?: string;
  backLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function OnboardingStep({
  title,
  description,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  canGoNext = true,
  canGoBack = true,
  nextLabel = "Continue",
  backLabel = "Back",
  children,
  className
}: OnboardingStepProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Progress Bar */}
      <div className="w-full bg-muted/30">
        <div 
          className="h-2 bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Counter */}
      <div className="text-center py-4 border-b border-border/50">
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className={cn("flex-1 container mx-auto px-4 py-8 max-w-4xl", className)}>
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          {/* Step Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-6 max-w-4xl">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={onBack}
                disabled={!canGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>

              <Button
                onClick={onNext}
                disabled={!canGoNext}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90"
              >
                {nextLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 