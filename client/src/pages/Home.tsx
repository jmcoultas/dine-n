import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import PreferenceModal from "@/components/PreferenceModal";
import { generateMealPlan } from "@/lib/api";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a",
  "https://images.unsplash.com/photo-1470338950318-40320a722782",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
];

export default function Home() {
  const [showPreferences, setShowPreferences] = useState(false);
  type PreferenceType = "No Preference" | "Vegetarian" | "Vegan" | "Gluten-Free" | "Keto" | "Paleo" | "Mediterranean";
  type AllergyType = "Dairy" | "Eggs" | "Tree Nuts" | "Peanuts" | "Shellfish" | "Wheat" | "Soy";
  type CuisineType = "Italian" | "Mexican" | "Chinese" | "Japanese" | "Indian" | "Thai" | "Mediterranean" | "American" | "French";
  type MeatType = "Chicken" | "Beef" | "Pork" | "Fish" | "Lamb" | "Turkey" | "None";

  interface Preferences {
    dietary: Array<PreferenceType>;
    allergies: Array<AllergyType>;
    cuisine: Array<CuisineType>;
    meatTypes: Array<MeatType>;
  }

  const [preferences, setPreferences] = useState<Preferences>({
    dietary: [],
    allergies: [],
    cuisine: [],
    meatTypes: [],
  });
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  interface Recipe {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
    ingredients?: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
    instructions?: string[];
    tags?: string[];
    nutrition?: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    complexity: 1 | 2 | 3;
  }

  const generateMutation = useMutation<
    { recipes: Recipe[]; status: 'success' | 'partial' },
    Error & { 
      response?: { 
        data?: { 
          type?: string;
          message?: string; 
        } 
      } 
    },
    Preferences
  >({
    mutationFn: async (prefs: Preferences) => {
      const response = await generateMealPlan(prefs, 2);
      return {
        recipes: response.recipes.map(recipe => ({
          ...recipe,
          description: recipe.description ?? undefined,
          imageUrl: recipe.imageUrl ?? undefined,
          prepTime: recipe.prepTime ?? undefined,
          cookTime: recipe.cookTime ?? undefined,
          servings: recipe.servings ?? undefined,
          ingredients: recipe.ingredients ? JSON.parse(JSON.stringify(recipe.ingredients)) : undefined,
          instructions: recipe.instructions ? JSON.parse(recipe.instructions) : undefined,
          tags: recipe.tags ? JSON.parse(recipe.tags) : undefined,
          nutrition: recipe.nutrition ? JSON.parse(JSON.stringify(recipe.nutrition)) : undefined,
          complexity: recipe.complexity as 1 | 2 | 3,
        })),
        status: response.status
      };
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
          } 
        } 
      };
      
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || 
                          errorData?.message || 
                          err.message || 
                          "Failed to generate meal plan. Please try again.";
      const errorDetails = errorData?.details || '';
      
      toast({
        title: "Error",
        description: `${errorMessage}${errorDetails ? `\n${errorDetails}` : ''}`,
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
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowPreferences(true)}
          >
            Start Planning
          </Button>
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
