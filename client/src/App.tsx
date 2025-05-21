import { Switch, Route } from "wouter";
import { SubscriptionSuccess } from "./components/SubscriptionSuccess";
import { SubscriptionCanceled } from "./components/SubscriptionCanceled";
import { Toaster } from "./components/Toaster";
import { AddToHomeScreen } from "./components/AddToHomeScreen";
import { useEffect, useState } from "react";
import { logoUrl } from "./lib/constants";
import { useUser } from "./hooks/use-user";

// ... rest of the imports

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const { data: user } = useUser();
  
  useEffect(() => {
    // Check if running in standalone mode (launched from home screen)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone;
    
    setIsStandalone(standalone);
    
    if (standalone) {
      // Show brief loading state when launched from home screen
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800); // Just enough time for a smooth transition
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // ... existing code

  // Simple loading screen for when launched from home screen
  if (isLoading && isStandalone) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <img 
          src={logoUrl} 
          alt="Dine-N" 
          className="w-24 h-24 object-contain animate-pulse" 
        />
      </div>
    );
  }

  return (
    <>
      <Switch>
        {/* Add subscription result routes */}
        <Route path="/subscription/success" component={SubscriptionSuccess} />
        <Route path="/subscription/canceled" component={SubscriptionCanceled} />
        {/* ... other existing routes */}
      </Switch>
      <Toaster />
      <AddToHomeScreen isLoggedIn={!!user} />
    </>
  );
}

export default App;
