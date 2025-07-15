import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { ChefHat, UtensilsCrossed, BookOpen, Search, Heart, Clock } from "lucide-react";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import Footer from "@/components/Footer";

export default function Home() {
  const [, setLocation] = useLocation();
  const userQuery = useUser();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState("Meal plan generation");

  const handleShowPreferences = () => {
    if (!userQuery.data) {
      setLocation("/auth");
      return;
    }
    setLocation("/weekly-planner");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <SubscriptionModal
          open={showSubscriptionModal}
          onOpenChange={setShowSubscriptionModal}
          feature={featureContext}
        />

        {/* Logo and Title */}
        <div className="text-center mb-12 animate-fadeIn">
          <div className="w-32 h-32 mx-auto mb-4 pt-4">
            <ChefHat className="w-full h-full text-primary animate-bounce" />
          </div>
          <h1 className="text-5xl font-bold mb-4 text-primary">
            Dine-N
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your culinary adventure
          </p>
        </div>

        {/* Adventure Choices */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl mb-16">
          {/* Generate Meal Plan Path */}
          <div className="animate-slideInLeft relative group">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 h-full border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] flex flex-col items-center text-center">
              <ChefHat className="w-16 h-16 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-4">Generate Weekly Meal Plans</h2>
              <p className="text-muted-foreground mb-6">
                Let our AI chef craft a personalized meal plan tailored to your preferences and dietary needs.
              </p>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleShowPreferences}
              >
                {userQuery.data ? "Start Planning" : "Sign in to Start"}
              </Button>
            </div>
            <div className="absolute inset-0 bg-primary/5 rounded-xl -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300" />
          </div>

          {/* Find Recipes Path */}
          <div className="animate-slideInRight relative group">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-8 h-full border-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] flex flex-col items-center text-center">
              <UtensilsCrossed className="w-16 h-16 text-primary mb-4" />
              <h2 className="text-2xl font-bold mb-4">Find Recipes by Ingredients</h2>
              <p className="text-muted-foreground mb-6">
                Transform your available ingredients into delicious meals with our smart recipe finder.
              </p>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => setLocation("/ingredient-recipes")}
              >
                Discover Recipes
              </Button>
            </div>
            <div className="absolute inset-0 bg-primary/5 rounded-xl -z-10 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300" />
          </div>
        </div>

        {/* Recipe Features Section */}
        <div className="w-full max-w-5xl animate-fadeIn">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4">
              <BookOpen className="w-full h-full text-primary animate-pulse" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Discover Our Recipe Features</h2>
            <p className="text-muted-foreground">
              Explore a world of culinary possibilities with our smart recipe system
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-6 border border-primary/10">
              <Search className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Search</h3>
              <p className="text-muted-foreground">
                Find recipes by ingredients, cuisine type, or dietary preferences
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-6 border border-primary/10">
              <Heart className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Save Favorites</h3>
              <p className="text-muted-foreground">
                Build your personal collection of go-to recipes
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-lg p-6 border border-primary/10">
              <Clock className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Quick Access</h3>
              <p className="text-muted-foreground">
                View cooking times, servings, and nutrition info at a glance
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setLocation("/recipes")}
            >
              <BookOpen className="w-5 h-5 mr-2" />
              View My Recipes
            </Button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div 
          className="absolute inset-0 pointer-events-none animate-fadeIn opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 20%, var(--primary) 1px, transparent 1px),
                             radial-gradient(circle at 80% 80%, var(--secondary) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      <Footer />
    </div>
  );
}