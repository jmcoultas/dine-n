import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";

interface InstacartRedirectModalProps {
  isOpen: boolean;
  onClose: () => void;
  instacartUrl: string;
  recipeName?: string;
  ingredientCount?: number;
  isShoppingList?: boolean;
}

export function InstacartRedirectModal({
  isOpen,
  onClose,
  instacartUrl,
  recipeName,
  ingredientCount,
  isShoppingList = false
}: InstacartRedirectModalProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (isOpen && instacartUrl) {
      setIsRedirecting(true);
      setShowFallback(false);

      // Try to open in new window immediately
      console.log('🔗 Attempting to open Instacart URL:', instacartUrl);
      const newWindow = window.open(instacartUrl, '_blank');
      
      // Check if popup was blocked after a short delay
      setTimeout(() => {
        if (!newWindow || newWindow.closed) {
          console.log('🚫 Popup appears to be blocked, showing fallback');
          setShowFallback(true);
        } else {
          console.log('✅ Popup opened successfully');
        }
        setIsRedirecting(false);
      }, 1000);

      // Auto-close modal after 4 seconds if popup worked
      const autoCloseTimer = setTimeout(() => {
        if (!showFallback) {
          onClose();
        }
      }, 4000);

      return () => clearTimeout(autoCloseTimer);
    }
  }, [isOpen, instacartUrl, onClose, showFallback]);

  const handleManualOpen = () => {
    console.log('🔗 Manual open clicked');
    window.open(instacartUrl, '_blank');
    onClose();
  };

  const title = isShoppingList ? "Opening Instacart Shopping List..." : "Opening Instacart Recipe...";
  const description = isShoppingList 
    ? `Shopping list with ${ingredientCount} ingredients`
    : `Recipe: ${recipeName} (${ingredientCount} ingredients)`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-6 h-6 bg-instacart-dark-green rounded flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-instacart-light-cream" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {description}
          </p>

          {isRedirecting && !showFallback && (
            <div className="flex items-center justify-center py-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-instacart-dark-green" />
                <span className="text-sm">Taking you to Instacart...</span>
              </div>
            </div>
          )}

          {showFallback && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  It looks like your browser blocked the popup. Click the button below to open Instacart manually.
                </p>
              </div>
              
              <Button 
                onClick={handleManualOpen}
                className="w-full bg-instacart-dark-green hover:bg-instacart-green text-instacart-light-cream"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Instacart
              </Button>
            </div>
          )}

          {!isRedirecting && !showFallback && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-2">
                <span className="text-sm text-green-600">✓ Instacart should open in a new tab</span>
              </div>
              
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={handleManualOpen}
                  className="text-sm"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Didn't open? Click here
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="ghost" onClick={onClose} size="sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
