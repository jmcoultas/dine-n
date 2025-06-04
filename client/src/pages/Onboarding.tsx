import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { ChefHat, UtensilsCrossed, BookOpen, Search, Heart, Clock, CookingPot } from "lucide-react";
import { SubscriptionModal } from "@/components/SubscriptionModal";
import Footer from "@/components/Footer";
import PreferenceSheet from "@/components/PreferenceSheet";
import { PreferenceSchema, type Preferences } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { celebrateOnboarding } from "@/lib/confetti";

const defaultPreferences: Preferences = {
  dietary: [],
  allergies: [],
  cuisine: [],
  meatTypes: [],
  chefPreferences: {
    difficulty: 'Moderate',
    cookTime: '30-60 minutes',
    servingSize: '4'
  }
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: isUserLoading } = useUser();
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState("Meal plan generation");
  const [showPreferences, setShowPreferences] = useState(true); // Auto-open for onboarding
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  // Initialize preferences from user account if available
  useEffect(() => {
    if (user?.preferences) {
      try {
        const validatedPreferences = PreferenceSchema.parse(user.preferences);
        setPreferences(validatedPreferences);
      } catch (error) {
        console.error('Invalid user preferences, using defaults:', error);
        setPreferences(defaultPreferences);
      }
    }
  }, [user]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isUserLoading, setLocation]);

  const handlePreferencesComplete = async (updatedPreferences: Preferences) => {
    try {
      // Save preferences to user account
      if (user) {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            preferences: updatedPreferences
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save preferences to account');
        }
      }

      setPreferences(updatedPreferences);
      setShowPreferences(false);
      
      // Trigger confetti celebration!
      celebrateOnboarding();
      
      toast({
        title: "🎉 Welcome to your culinary adventure!",
        description: "Your taste preferences are locked and loaded. Time to discover some amazing meals!"
      });

      // Clear the onboarding flag and redirect to home after confetti
      localStorage.removeItem('registrationCompleted');
      setTimeout(() => {
        setLocation('/');
      }, 2000); // Increased delay to let confetti finish
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShowPreferences = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    setLocation("/weekly-planner");
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature={featureContext}
      />

      <PreferenceSheet
        open={showPreferences}
        onOpenChange={(open) => {
          if (!open) {
            // If they close without completing, redirect to home anyway
            setLocation('/');
          }
          setShowPreferences(open);
        }}
        preferences={preferences}
        onUpdatePreferences={handlePreferencesComplete}
        user={user ? {
          subscription_tier: user.subscription_tier,
          meal_plans_generated: user.meal_plans_generated
        } : undefined}
        skipToChefPreferences={false} // Always start from the beginning for onboarding
        hideGenerateOption={true} // Hide generate option during onboarding
        isOnboarding={true} // Enable onboarding mode with witty text
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <ChefHat className="w-16 h-16 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Welcome to Dine-N!
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                We're cooking up something special just for you! 👨‍🍳
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 w-full max-w-4xl mx-auto mt-16">
            <div className="animate-slideInLeft bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-primary/10">
              <UtensilsCrossed className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Personalized Recipes</h3>
              <p className="text-muted-foreground text-sm">
                AI-powered meal suggestions tailored to your taste buds and dietary needs.
              </p>
            </div>

            <div className="animate-slideInUp bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-primary/10">
              <Clock className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Smart Planning</h3>
              <p className="text-muted-foreground text-sm">
                Weekly meal plans that fit your schedule and cooking skill level.
              </p>
            </div>

            <div className="animate-slideInRight bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-primary/10">
              <BookOpen className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="text-lg font-semibold mb-2">Grocery Lists</h3>
              <p className="text-muted-foreground text-sm">
                Automatically generated shopping lists to make grocery runs a breeze.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-16 space-y-4">
            <p className="text-lg text-muted-foreground">
              Ready to dive in? Let's start with a quick taste test! 🍽️
            </p>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-lg px-8 py-3"
              onClick={() => setShowPreferences(true)}
            >
              <CookingPot className="mr-2 h-5 w-5" />
              Let's Get Cooking!
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
} 