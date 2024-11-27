import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import PreferenceModal from "@/components/PreferenceModal";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1494859802809-d069c3b71a8a",
  "https://images.unsplash.com/photo-1470338950318-40320a722782",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
];

export default function Home() {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    dietary: [] as string[],
    allergies: [] as string[],
    cuisine: [] as string[],
    meatTypes: [] as string[],
  });
  const [, setLocation] = useLocation();

  const handlePreferencesSubmit = (newPreferences: typeof preferences) => {
    setPreferences(newPreferences);
    setShowPreferences(false);
    setLocation("/meal-plan");
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
        onUpdatePreferences={handlePreferencesSubmit}
      />
    </div>
  );
}
