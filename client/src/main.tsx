import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";

import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import MealPlan from "./pages/MealPlan";
import Header from "./components/Header";

interface ProtectedRouteProps {
  component: React.ComponentType;
}

const ProtectedRoute = ({ component: Component }: ProtectedRouteProps) => {
  const [, setLocation] = useLocation();
  
  // We'll move the auth check to the component itself
  return <Component />;
};

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/recipes" component={Recipes} />
          <Route path="/meal-plan">
            {() => <ProtectedRoute component={MealPlan} />}
          </Route>
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
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
