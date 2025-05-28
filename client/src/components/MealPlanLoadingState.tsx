import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChefHat, Clock, Sparkles } from "lucide-react";

interface MealPlanLoadingStateProps {
  messages?: string[];
  baseMessage?: string;
}

const defaultMessages = [
  "Analyzing your preferences...",
  "Searching for perfect recipes...",
  "Calculating nutritional balance...",
  "Customizing your meal plan...",
  "Adding finishing touches..."
];

export function MealPlanLoadingState({ 
  messages = defaultMessages, 
  baseMessage = "Generating your personalized meal plan..."
}: MealPlanLoadingStateProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  // Cycle through messages
  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [messages.length]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const currentMessage = messages.length > 0 ? messages[currentMessageIndex] : baseMessage;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-8 text-center space-y-6">
          {/* Main icon with animation */}
          <div className="relative">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-primary" />
            </div>
            <div className="absolute -top-1 -right-1">
              <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
            </div>
          </div>

          {/* Main message */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              {baseMessage}
            </h3>
            <p className="text-sm text-muted-foreground">
              This may take a minute{dots}
            </p>
          </div>

          {/* Current step message */}
          <div className="min-h-[24px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-fade-in">
              {currentMessage}
            </p>
          </div>

          {/* Loading spinner */}
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 