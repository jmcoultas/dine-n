import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Share, ArrowDown, Plus } from "lucide-react";
import { shouldShowAddToHomeScreen } from "@/lib/utils";

interface AddToHomeScreenProps {
  // Number of days to wait before showing the prompt again after being dismissed
  daysToWait?: number;
  // If true, only show for logged-in users
  requireLogin?: boolean;
  // User is logged in
  isLoggedIn?: boolean;
}

export function AddToHomeScreen({ 
  daysToWait = 7, 
  requireLogin = true, 
  isLoggedIn = false 
}: AddToHomeScreenProps) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if we've dismissed the prompt recently
    const checkIfShouldShow = () => {
      // If login is required but user is not logged in, don't show
      if (requireLogin && !isLoggedIn) {
        return false;
      }
      
      const lastDismissed = localStorage.getItem("homeScreenPromptDismissed");
      if (lastDismissed) {
        const dismissedDate = new Date(lastDismissed);
        const daysSinceDismissed = Math.floor(
          (new Date().getTime() - dismissedDate.getTime()) / (1000 * 3600 * 24)
        );
        
        // Only show if the configured days have passed since last dismissal
        if (daysSinceDismissed < daysToWait) {
          return false;
        }
      }
      
      return shouldShowAddToHomeScreen();
    };

    // Wait a few seconds before showing the prompt to not interrupt immediate user interactions
    const timer = setTimeout(() => {
      setShowPrompt(checkIfShouldShow());
    }, 3000);

    return () => clearTimeout(timer);
  }, [daysToWait, requireLogin, isLoggedIn]);

  const handleDismiss = () => {
    localStorage.setItem("homeScreenPromptDismissed", new Date().toISOString());
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background p-4 shadow-lg border-t z-50 transition-all duration-300 transform translate-y-0 sm:rounded-t-xl max-w-3xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-lg">Add PantryPal to Home Screen</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Install this app on your home screen for quick and easy access when you're on the go.
          </p>
          
          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
            <div className="flex flex-col items-center text-center">
              <div className="bg-muted rounded-full p-2 mb-2">
                <Share className="h-5 w-5" />
              </div>
              <span className="text-xs sm:text-sm">1. Tap Share</span>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-muted rounded-full p-2 mb-2">
                <ArrowDown className="h-5 w-5" />
              </div>
              <span className="text-xs sm:text-sm">2. Find "Add to Home Screen"</span>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="bg-muted rounded-full p-2 mb-2">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-xs sm:text-sm">3. Tap "Add"</span>
            </div>
          </div>
          
          <div className="mt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleDismiss}
            >
              Got it
            </Button>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleDismiss}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 