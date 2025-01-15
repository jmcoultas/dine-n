import { useEffect, useState } from "react";

interface LoadingAnimationProps {
  messages?: string[];
  baseMessage?: string;
}

// Declare the custom element type for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        url?: string;
      };
    }
  }
}

export function LoadingAnimation({ 
  messages = [], 
  baseMessage = "Cooking up your meal plan..." 
}: LoadingAnimationProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (messages.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsTransitioning(false);
      }, 300); // Wait for fade out before changing message
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    // Add event listener for when the Spline viewer is loaded
    const handleSplineLoad = () => {
      setIsLoading(false);
    };

    const splineViewer = document.querySelector('spline-viewer');
    if (splineViewer) {
      splineViewer.addEventListener('load', handleSplineLoad);
    }

    return () => {
      if (splineViewer) {
        splineViewer.removeEventListener('load', handleSplineLoad);
      }
    };
  }, []);

  const currentMessage = messages.length > 0 
    ? messages[currentMessageIndex]
    : baseMessage;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col bg-card rounded-lg shadow-lg w-full max-w-2xl mx-auto overflow-hidden relative">
        <div className="w-full" style={{ height: '500px' }}>
          <spline-viewer
            url="https://prod.spline.design/hkyaYzf0pdmsGpcH/scene.splinecode"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-background/90 to-background/0">
          <div className="h-16 flex items-center justify-center">
            <p 
              key={currentMessageIndex} 
              className={`text-lg font-medium text-foreground transition-all duration-300 ${
                isTransitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              {currentMessage}
            </p>
          </div>
          <div className="text-sm text-muted-foreground text-center">
            This might take a moment...
          </div>
        </div>
      </div>
    </div>
  );
}