import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import PreferenceModal from "@/components/PreferenceModal";
import { generateMealPlan } from "@/lib/api";
import { PreferenceSchema } from "@db/schema";
import type { Preferences } from "@db/schema";
import { RecipeResponseSchema, type Recipe } from "@/lib/types";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a",
  "https://images.unsplash.com/photo-1470338950318-40320a722782",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
];

export default function Home() {
  const { user } = useUser();
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: [],
  });
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

      const result = RecipeResponseSchema.safeParse(response);
      if (!result.success) {
        throw new Error('Invalid response format from server');
      }

      return result.data;
    },
    onSuccess: (data) => {
      setShowPreferences(false);
      if (Array.isArray(data.recipes)) {
        localStorage.setItem('generatedRecipes', JSON.stringify(data.recipes));
      }
      setLocation("/meal-plan");
      toast({
        title: "Success!",
        description: "Your meal plan has been generated.",
      });
    },
    onError: (error: unknown) => {
      const err = error as Error & {
        response?: {
          data?: {
            type?: string;
            error?: string;
            message?: string;
            details?: string;
            debug?: {
              code?: string;
              status?: number;
              message?: string;
            }
          }
        }
      };

      const errorData = err.response?.data;
      const errorMessage = errorData?.error ||
                        errorData?.message ||
                        err.message ||
                        "Failed to generate meal plan. Please try again.";
      const errorDetails = errorData?.details || '';
      const debugInfo = errorData?.debug ? `\nDebug: ${JSON.stringify(errorData.debug)}` : '';

      toast({
        title: "Error",
        description: `${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}${import.meta.env.DEV ? debugInfo : ''}`,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate(preferences);
  };

  return (
    <div className="space-y-16">
      <section
        className="relative h-[600px] rounded-lg overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage: `url(${HERO_IMAGES[0]})`,
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-4">
          <h1 className="text-5xl font-bold mb-4">
            Your AI-Powered Meal Planning Assistant
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
        onUpdatePreferences={setPreferences}
        isGenerating={generateMutation.isPending}
        onGenerate={handleGenerate}
      />
    </div>
  );
}