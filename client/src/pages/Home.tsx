import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useSearch } from "wouter";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useSubscription } from "@/hooks/use-subscription";
import PreferenceModal from "@/components/PreferenceModal";
import { generateMealPlan } from "@/lib/api";
import { PreferenceSchema } from "@db/schema";
import type { Preferences } from "@db/schema";
import { RecipeResponseSchema } from "@/lib/types";
import { SubscriptionModal } from "@/components/SubscriptionModal";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a",
  "https://images.unsplash.com/photo-1470338950318-40320a722782",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
];

export default function Home() {
  const { user } = useUser();
  const { subscription } = useSubscription();
  const [showPreferences, setShowPreferences] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [featureContext, setFeatureContext] = useState("Meal plan generation");
  const [preferences, setPreferences] = useState<Preferences>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: [],
  });

  const handlePreferencesSave = (newPreferences: Preferences) => {
    const parsedPrefs = PreferenceSchema.safeParse(newPreferences);
    if (!parsedPrefs.success) {
      toast({
        title: "Error",
        description: "Invalid preferences format",
        variant: "destructive",
      });
      return;
    }
    setPreferences(parsedPrefs.data);
  };
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user?.preferences) {
      const parsedPrefs = PreferenceSchema.safeParse(user.preferences);
      if (parsedPrefs.success) {
        setPreferences(parsedPrefs.data);
      }
    }
  }, [user]);

  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async (prefs: Preferences) => {
      const cleanPreferences = {
        dietary: prefs.dietary.filter(Boolean),
        allergies: prefs.allergies.filter(Boolean),
        cuisine: prefs.cuisine.filter(Boolean),
        meatTypes: prefs.meatTypes.filter(Boolean)
      };
      console.log('Generating meal plan with preferences:', cleanPreferences);
      const response = await generateMealPlan(cleanPreferences, 2);
      console.log('Received response:', response);

      // Move the parsing after storing recipes
      if (Array.isArray(response.recipes)) {
        await localStorage.setItem('generatedRecipes', JSON.stringify(response.recipes));
      }

      const result = RecipeResponseSchema.safeParse(response);
      if (!result.success) {
        console.warn('Response format validation failed:', result.error);
        // Continue if we have recipes despite schema validation failure
        if (!Array.isArray(response.recipes)) {
          throw new Error('Invalid response format from server');
        }
      }

      return response;
    },
    onSuccess: async (data) => {
      if (Array.isArray(data.recipes)) {
        setShowPreferences(false);
        // Small delay to ensure state updates are processed
        setTimeout(() => {
          setLocation("/meal-plan");
          toast({
            title: "Success!",
            description: "Your meal plan has been generated.",
          });
        }, 100);
      } else {
        toast({
          title: "Error",
          description: "No recipes were generated",
          variant: "destructive",
        });
      }
    },
    onError: (error: unknown) => {
      const err = error as Error;

      if (err.message === 'FREE_PLAN_LIMIT_REACHED') {
        setShowPreferences(false);
        setFeatureContext("Meal plan generation");
        setShowSubscriptionModal(true);
        return;
      }

      // Only show error toast for non-subscription related errors
      if (!err.message?.includes('subscription')) {
        toast({
          title: "Error",
          description: err.message || "Failed to generate meal plan. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate(preferences);
  };

  return (
    <div className="space-y-16">
      <SubscriptionModal
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
        feature={featureContext}
      />
      <section
        className="relative h-[600px] rounded-lg overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${HERO_IMAGES[0]})`,
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-5xl font-bold mb-4">
            Dine-N
          </h1>
          <p className="text-xl mb-8 max-w-2xl">
            Generate personalized meal plans, discover new recipes, and simplify
            your grocery shopping with our intelligent cooking companion.
          </p>
          {user ? (
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setShowPreferences(true)}
            >
              Start Planning
            </Button>
          ) : (
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setLocation("/auth")}
            >
              Sign in to Start Planning
            </Button>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <img
            src="https://images.unsplash.com/photo-1660652379705-223db5a4e13f"
            alt="Fresh ingredients"
            className="rounded-lg h-48 w-full object-cover"
          />
          <h3 className="text-2xl font-semibold">Smart Recipe Suggestions</h3>
          <p className="text-muted-foreground">
            Get personalized recipe recommendations based on your preferences and
            dietary requirements.
          </p>
        </div>
        <div className="space-y-4">
          <img
            src="https://images.unsplash.com/photo-1722498257014-26efa8b75c7a"
            alt="Fresh ingredients"
            className="rounded-lg h-48 w-full object-cover"
          />
          <h3 className="text-2xl font-semibold">Automated Grocery Lists</h3>
          <p className="text-muted-foreground">
            Generate comprehensive shopping lists from your meal plans with one
            click.
          </p>
        </div>
        <div className="space-y-4">
          <img
            src="https://images.unsplash.com/photo-1660652377925-d615178531db"
            alt="Fresh ingredients"
            className="rounded-lg h-48 w-full object-cover"
          />
          <h3 className="text-2xl font-semibold">Flexible Meal Planning</h3>
          <p className="text-muted-foreground">
            Create, save, and modify meal plans that fit your schedule and taste.
          </p>
        </div>
      </section>

      <PreferenceModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onUpdatePreferences={handlePreferencesSave}
        isGenerating={generateMutation.isPending}
        onGenerate={handleGenerate}
        user={user ? {
          subscription_tier: user.subscription_tier,
          meal_plans_generated: user.meal_plans_generated
        } : undefined}
      />
    </div>
  );
}