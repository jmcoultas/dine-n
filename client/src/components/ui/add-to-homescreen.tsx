import { useState, useEffect } from "react";
import { X, Download, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function AddToHomeScreen() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showTips, setShowTips] = useState(false);
  
  useEffect(() => {
    // Check if it's an iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if already installed as PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone;
    
    // Get local storage to check if prompt was dismissed
    const promptDismissed = localStorage.getItem('homeScreenPromptDismissed');
    
    // Only show prompt for iOS users who haven't installed as PWA or dismissed the prompt
    setIsIOS(iOS);
    setIsStandalone(standalone);
    setShowPrompt(iOS && !standalone && promptDismissed !== 'true');
  }, []);
  
  const dismissPrompt = () => {
    localStorage.setItem('homeScreenPromptDismissed', 'true');
    setShowPrompt(false);
  };
  
  const resetPromptState = () => {
    localStorage.removeItem('homeScreenPromptDismissed');
  };
  
  if (!showPrompt) return null;
  
  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 p-4 bg-card shadow-lg border-t border-border",
      "transform transition-transform duration-300",
      !showPrompt && "translate-y-full"
    )}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-semibold">Install Dine-N on your iPhone</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Get a better experience by adding this app to your Home Screen
          </p>
          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center">1. Tap <span className="mx-2 rounded-md border border-border bg-muted p-1">Share</span> in your browser</p>
            <p className="flex items-center">2. Select <span className="mx-2 rounded-md border border-border bg-muted p-1">Add to Home Screen</span></p>
          </div>
          
          <div className="mt-4">
            <button 
              onClick={() => setShowTips(!showTips)}
              className="text-xs flex items-center text-primary"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> 
              {showTips ? "Hide troubleshooting tips" : "Icon not showing? Tap for help"}
            </button>
            
            {showTips && (
              <div className="mt-2 text-xs text-muted-foreground border-l-2 border-primary/30 pl-2 py-1">
                <p>If our icon doesn't appear correctly:</p>
                <ol className="list-decimal pl-5 mt-1 space-y-1">
                  <li>Clear Safari history (Settings → Safari → Clear History)</li>
                  <li>Close all Safari tabs and restart Safari</li>
                  <li>Try again to add to Home Screen</li>
                </ol>
              </div>
            )}
          </div>
        </div>
        <button 
          onClick={dismissPrompt}
          className="flex-shrink-0 rounded-full h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
} 