import { useEffect, useState } from "react";
import Spline from '@splinetool/react-spline';

interface LoadingAnimationProps {
  messages?: string[];
  baseMessage?: string;
}

export function LoadingAnimation({ 
  messages = [], 
  baseMessage = "Cooking up your meal plan..." 
}: LoadingAnimationProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [splineError, setSplineError] = useState(false);

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

  const currentMessage = messages.length > 0 
    ? messages[currentMessageIndex]
    : baseMessage;

  const handleSplineError = () => {
    console.warn("Failed to load Spline animation");
    setSplineError(true);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6 p-8 bg-card rounded-lg shadow-lg max-w-sm mx-auto text-center">
        <div className="relative w-[300px] h-[300px]">
          {!splineError ? (
            <Spline 
              scene="https://prod.spline.design/particles-ccd1c2aa4bc993ddbed3f641e178bd25/scene.splinecode"
              onError={handleSplineError}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            // Fallback loading indicator
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
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
        <div className="text-sm text-muted-foreground">
          This might take a moment...
        </div>
      </div>
    </div>
  );
}