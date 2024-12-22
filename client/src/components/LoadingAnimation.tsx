import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface LoadingAnimationProps {
  message?: string;
}

export function LoadingAnimation({ message = "Cooking up your meal plan..." }: LoadingAnimationProps) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6 p-8 bg-card rounded-lg shadow-lg max-w-sm mx-auto text-center">
        <div className="relative">
          {/* Plate */}
          <div className="w-32 h-32 rounded-full bg-muted border-4 border-primary animate-spin-slow relative">
            {/* Food items bouncing around the plate */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-green-500 rounded-full animate-bounce-ingredient-1" /> {/* Lettuce */}
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-bounce-ingredient-2" /> {/* Tomato */}
            <div className="absolute top-1/2 -right-2 w-6 h-6 bg-yellow-500 rounded-full animate-bounce-ingredient-3" /> {/* Lemon */}
          </div>
          {/* Steam effect */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
            <div className="w-1.5 h-3 bg-muted-foreground/40 rounded-full animate-steam-1" />
            <div className="w-1.5 h-3 bg-muted-foreground/40 rounded-full animate-steam-2" />
            <div className="w-1.5 h-3 bg-muted-foreground/40 rounded-full animate-steam-3" />
          </div>
        </div>
        <p className="text-lg font-medium text-foreground">{message}</p>
        <div className="text-sm text-muted-foreground">
          This might take a moment...
        </div>
      </div>
    </div>
  );
}