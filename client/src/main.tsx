import { StrictMode, useEffect } from "react";
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
import AuthPage from "./pages/AuthPage";
import UserProfile from "./pages/UserProfile";
import AdminDashboard from "./pages/AdminDashboard";
import Header from "./components/Header";

function ProtectedRoute({ 
  component: Component, 
  requireAdmin = false 
}: { 
  component: React.ComponentType;
  requireAdmin?: boolean;
}) {
  const { user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/auth");
      } else if (requireAdmin && !user.isAdmin) {
        setLocation("/");
      }
    }
  }, [user, isLoading, setLocation, requireAdmin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user || (requireAdmin && !user.isAdmin)) {
    return null;
  }

  return <Component />;
}

function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/recipes" component={Recipes} />
          <Route 
            path="/meal-plan" 
            component={() => <ProtectedRoute component={MealPlan} />} 
          />
          <Route 
            path="/profile" 
            component={() => <ProtectedRoute component={UserProfile} />} 
          />
          <Route 
            path="/admin" 
            component={() => <ProtectedRoute component={AdminDashboard} requireAdmin={true} />} 
          />
          <Route>404 Page Not Found</Route>
        </Switch>
      </main>
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