import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface LoadingAnimationProps {
  message?: string;
}

export function LoadingAnimation({ message = "Cooking up your meal plan..." }: LoadingAnimationProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6 p-6 bg-card rounded-lg shadow-lg max-w-sm mx-auto text-center">
        <div className="relative">
          {/* Plate */}
          <div className="w-24 h-24 rounded-full bg-muted border-4 border-primary animate-spin-slow relative">
            {/* Food items bouncing around the plate */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-500 rounded-full animate-bounce-ingredient-1" /> {/* Lettuce */}
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-bounce-ingredient-2" /> {/* Tomato */}
            <div className="absolute top-1/2 -right-2 w-4 h-4 bg-yellow-500 rounded-full animate-bounce-ingredient-3" /> {/* Lemon */}
          </div>
          {/* Steam effect */}
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="space-y-2">
              <div className="w-1 h-2 bg-muted-foreground rounded-full animate-steam-1 opacity-70" />
              <div className="w-1 h-2 bg-muted-foreground rounded-full animate-steam-2 opacity-70 delay-300" />
              <div className="w-1 h-2 bg-muted-foreground rounded-full animate-steam-3 opacity-70 delay-500" />
            </div>
          </div>
        </div>
        <p className="text-lg font-medium text-foreground">{message}</p>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  );
}
