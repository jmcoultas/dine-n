import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChefHat, Clock, Sparkles, Lightbulb, Search, Brain } from "lucide-react";
import type { Preferences } from "@db/schema";

interface SuggestionLoadingStateProps {
  preferences: Preferences;
  selectedDays: number;
  suggestionsPerMealType: number;
}

const generateSuggestionMessages = (preferences: Preferences, selectedDays: number, suggestionsPerMealType: number): string[] => {
  const messages: string[] = [];
  const totalSuggestions = suggestionsPerMealType * 3; // 3 meal types

  // Add preference-based messages
  if (preferences.dietary?.length) {
    preferences.dietary.forEach(diet => {
      messages.push(`Finding ${diet} recipe options...`);
    });
  }

  if (preferences.allergies?.length) {
    preferences.allergies.forEach(allergy => {
      messages.push(`Filtering out ${allergy} ingredients...`);
    });
  }

  if (preferences.cuisine?.length) {
    preferences.cuisine.forEach(cuisine => {
      messages.push(`Exploring ${cuisine} cuisine recipes...`);
    });
  }

  if (preferences.meatTypes?.length) {
    messages.push(`Including your preferred protein choices...`);
  }

  // Add general suggestion generation messages
  messages.push(
    `Analyzing thousands of recipes for your preferences...`,
    `Generating ${totalSuggestions} unique recipe suggestions...`,
    `Ensuring variety across breakfast, lunch, and dinner...`,
    `Calculating difficulty levels and cooking times...`,
    `Adding cuisine types and dietary tags...`,
    `Finalizing your personalized suggestions...`
  );

  return messages;
};

export function SuggestionLoadingState({ 
  preferences, 
  selectedDays, 
  suggestionsPerMealType 
}: SuggestionLoadingStateProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dots, setDots] = useState("");
  const [progress, setProgress] = useState(0);

  const messages = generateSuggestionMessages(preferences, selectedDays, suggestionsPerMealType);
  const totalSuggestions = suggestionsPerMealType * 3;

  // Cycle through messages
  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000); // Slightly slower for better readability

    return () => clearInterval(interval);
  }, [messages.length]);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  // Simulate progress (since we don't have real progress from the API)
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) return prev; // Cap at 85% until completion
        return prev + Math.random() * 3;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentMessage = messages.length > 0 ? messages[currentMessageIndex] : "Generating suggestions...";

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-8 text-center space-y-6">
          {/* Main icon with animation */}
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
              <Brain className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Lightbulb className="w-6 h-6 text-yellow-500 animate-bounce" />
            </div>
            <div className="absolute -bottom-1 -left-1">
              <Search className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>
          </div>

          {/* Main message */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-foreground">
              Generating Recipe Suggestions
            </h3>
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
              <p className="text-sm font-medium text-primary mb-1">
                ⏱️ This typically takes 30-60 seconds
              </p>
              <p className="text-xs text-muted-foreground">
                Creating {totalSuggestions} personalized suggestions for your {selectedDays}-day plan
              </p>
            </div>
          </div>

          {/* Current step message */}
          <div className="min-h-[32px] flex items-center justify-center bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <p className="text-sm text-foreground font-medium animate-fade-in">
                {currentMessage}
              </p>
            </div>
          </div>

          {/* Loading spinner and progress */}
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% complete
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(progress, 85)}%` }}
              />
            </div>
          </div>

          {/* Fun fact or tip */}
          <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary/50">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Did you know?</strong> Our AI analyzes your preferences against thousands of recipes to find the perfect matches for your taste and dietary needs{dots}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 