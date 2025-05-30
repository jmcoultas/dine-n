import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-user";

import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import MealPlan from "./pages/MealPlan";
import WeeklyPlanner from "./pages/WeeklyPlanner";
import AuthPage from "./pages/AuthPage";
import UserProfile from "./pages/UserProfile";
import IngredientRecipes from "./pages/IngredientRecipes";
import Welcome from "./pages/Welcome";
import Header from "./components/Header";
import RecipeView from "./pages/RecipeView";
import EmailVerification from "./components/EmailVerification";
import CompleteSignup from "./components/CompleteSignup";
import FirebaseDiagnostic from "./pages/FirebaseDiagnostic";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function VerificationRouter() {
  const [, setLocation] = useLocation();
  const search = window.location.search; // Direct access to window location
  const pathname = window.location.pathname;
  const params = new URLSearchParams(search);
  const hasOobCode = params.has('oobCode');
  const mode = params.get('mode');
  const apiKey = params.get('apiKey'); // Firebase sometimes uses this parameter
  const { data: user, isLoading } = useUser();
  
  useEffect(() => {
    // Don't do any redirects while the user data is still loading
    if (isLoading) {
      console.log("User data is still loading, deferring verification checks");
      return;
    }
    
    // Skip any redirect logic if we're at the root path with no search params
    // This prevents unwanted redirects after registration completion
    if (pathname === '/' && !search) {
      console.log("At root path with no search params, skipping verification checks");
      return;
    }
    
    // Skip redirection for paths that are already in the verification flow
    if (pathname.includes('/auth/verify-email') || pathname.includes('/auth/complete-signup')) {
      return;
    }
    
    // Skip redirection if the user is already logged in - this prevents the redirect back to verification after registration
    if (user) {
      console.log("User is logged in, skipping verification redirect");
      return;
    }
    
    // Check for registration timestamp to add additional grace period
    const registrationTimestamp = localStorage.getItem('registrationTimestamp');
    if (registrationTimestamp) {
      const timestamp = parseInt(registrationTimestamp, 10);
      const currentTime = Date.now();
      const timeDifference = currentTime - timestamp;
      
      // If registration was completed less than 10 seconds ago, skip redirect
      if (timeDifference < 10000) { // 10 seconds grace period
        console.log(`Recent registration detected (${timeDifference}ms ago), skipping verification redirect`);
        return;
      } else {
        // Clean up old timestamp
        localStorage.removeItem('registrationTimestamp');
      }
    }
    
    // If localStorage has 'registrationCompleted' flag, don't redirect
    if (localStorage.getItem('registrationCompleted') === 'true') {
      console.log("Registration was previously completed, clearing any leftover verification state");
      localStorage.removeItem('registrationCompleted');
      return;
    }
    
    // Handle Firebase's default redirect URLs (like /auth?apiKey=...&mode=verifyEmail&oobCode=...)
    // This is a fallback for when Firebase doesn't use our custom actionCodeSettings.url
    if ((hasOobCode || apiKey) && (mode === 'verifyEmail' || mode === null)) {
      console.log("Firebase verification parameters detected, redirecting to verification page");
      console.log("Original URL:", window.location.href);
      
      // Extract email from URL params or localStorage
      let email = params.get('email');
      if (!email) {
        email = localStorage.getItem('emailForSignup');
      }
      
      // Build the correct verification URL
      const verificationUrl = email 
        ? `/auth/verify-email${search}&email=${encodeURIComponent(email)}`
        : `/auth/verify-email${search}`;
      
      console.log("Redirecting to:", verificationUrl);
      setLocation(verificationUrl);
      return;
    }
    
    // If this looks like a verification link, redirect to the verification component
    if (hasOobCode && (mode === 'verifyEmail' || mode === null)) {
      console.log("Verification parameters detected, redirecting to verification page");
      setLocation(`/auth/verify-email${search}`);
    }
  }, [hasOobCode, mode, search, setLocation, pathname, user, isLoading, apiKey]);
  
  return <AuthPage />;
}

function Router() {
  const { data: user, isLoading } = useUser();
  const [isRegistrationComplete, setIsRegistrationComplete] = useState(false);
  const [isLoadingComplete, setIsLoadingComplete] = useState(false);
  
  // Check for the registration completed flag and handle post-registration state
  useEffect(() => {
    if (localStorage.getItem('registrationCompleted') === 'true') {
      console.log("Registration completed flag found, setting registration complete state");
      setIsRegistrationComplete(true);
      
      // Keep this state for a short time to ensure we avoid redirect flashes
      const timer = setTimeout(() => {
        console.log("Registration completion grace period ended");
        setIsRegistrationComplete(false);
        localStorage.removeItem('registrationCompleted');
      }, 5000); // 5 second grace period
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Add a small delay before showing content to ensure auth state is stable
  useEffect(() => {
    if (!isLoading) {
      // Only start the timer once the initial loading is done
      const timer = setTimeout(() => {
        setIsLoadingComplete(true);
      }, 300); // Short delay to ensure auth state is stable
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show a consistent loading state during initial load or right after registration
  if (isLoading || !isLoadingComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/welcome">
          <>
            <Header />
            <Welcome />
          </>
        </Route>
        <Route path="/auth/verify-email">
          <EmailVerification />
        </Route>
        <Route path="/auth/complete-signup">
          <CompleteSignup />
        </Route>
        <Route path="/firebase-diagnostic">
          <FirebaseDiagnostic />
        </Route>
        <Route path="/auth">
          {/* Skip the verification router if registration was just completed */}
          <>
            <Header />
            <main className="container mx-auto px-4 py-8">
              {isRegistrationComplete ? <AuthPage /> : <VerificationRouter />}
            </main>
          </>
        </Route>
        <Route>
          <>
            <Header />
            <main className="container mx-auto px-4 py-8">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/recipes" component={Recipes} />
                <Route path="/recipe/:id" component={RecipeView} />
                <Route 
                  path="/meal-plan" 
                  component={() => <ProtectedRoute component={MealPlan} />} 
                />
                <Route 
                  path="/weekly-planner" 
                  component={() => <ProtectedRoute component={WeeklyPlanner} />} 
                />
                <Route 
                  path="/ingredient-recipes" 
                  component={() => <ProtectedRoute component={IngredientRecipes} />} 
                />
                <Route 
                  path="/profile" 
                  component={() => <ProtectedRoute component={UserProfile} />} 
                />
                <Route>404 Page Not Found</Route>
              </Switch>
            </main>
          </>
        </Route>
      </Switch>
      <Toaster />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  </StrictMode>,
);
