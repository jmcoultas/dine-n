import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PreferenceSchema, type Preferences } from "@db/schema";

// Use values from schema to ensure compatibility
const DIETARY_OPTIONS = [
  "No Preference",
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Keto",
  "Paleo",
  "Mediterranean Diet",
  "Protein Heavy",
  "Organic"
] as const;

const ALLERGY_OPTIONS = [
  "Dairy",
  "Eggs",
  "Tree Nuts",
  "Peanuts",
  "Shellfish",
  "Wheat",
  "Soy"
] as const;

interface RecipePreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPreferences?: Preferences | null;
  onGenerate: (preferences: { dietary: string[]; allergies: string[] }) => void;
  isGenerating?: boolean;
}

export default function RecipePreferencesModal({
  open,
  onOpenChange,
  userPreferences,
  onGenerate,
  isGenerating = false,
}: RecipePreferencesModalProps) {
  const [useDefaultPreferences, setUseDefaultPreferences] = useState(true);
  const [selectedDietary, setSelectedDietary] = useState<string[]>(
    userPreferences?.dietary || []
  );
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(
    userPreferences?.allergies || []
  );

  // Update state when user preferences change
  useEffect(() => {
    if (userPreferences) {
      setSelectedDietary(userPreferences.dietary || []);
      setSelectedAllergies(userPreferences.allergies || []);
    }
  }, [userPreferences]);

  const handleGenerate = () => {
    // Always include user allergies for safety
    const allergies = useDefaultPreferences 
      ? (userPreferences?.allergies || []) 
      : [...selectedAllergies];
    
    // If user has allergies set in their account but they're not using default preferences,
    // make sure their account allergies are still included for safety
    if (!useDefaultPreferences && userPreferences?.allergies) {
      userPreferences.allergies.forEach(allergy => {
        if (!allergies.includes(allergy)) {
          allergies.push(allergy);
        }
      });
    }
    
    onGenerate({
      dietary: useDefaultPreferences ? (userPreferences?.dietary || []) : selectedDietary,
      allergies: allergies,
    });
  };

  const toggleDietary = (diet: string) => {
    setSelectedDietary(prev =>
      prev.includes(diet)
        ? prev.filter(d => d !== diet)
        : [...prev, diet]
    );
  };

  const toggleAllergy = (allergy: string) => {
    // If it's a user-set allergy from their profile, don't allow removing it
    if (userPreferences?.allergies && userPreferences.allergies.some(a => a === allergy)) {
      // Show a notification that this allergy cannot be removed (you would need to add this UI)
      return;
    }
    
    setSelectedAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Recipe Preferences</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose your dietary preferences and allergies for recipe suggestions.
            <br />
            <strong>Note:</strong> Your account allergies will always be respected for safety.
          </p>

          {userPreferences && (Object.keys(userPreferences.dietary || []).length > 0 || Object.keys(userPreferences.allergies || []).length > 0) && (
            <div className="flex items-center gap-4">
              <Button
                variant={useDefaultPreferences ? "default" : "outline"}
                onClick={() => setUseDefaultPreferences(true)}
                size="sm"
              >
                Use My Preferences
              </Button>
              <Button
                variant={!useDefaultPreferences ? "default" : "outline"}
                onClick={() => setUseDefaultPreferences(false)}
                size="sm"
              >
                Set Temporary Preferences
              </Button>
            </div>
          )}

          {(!userPreferences || !useDefaultPreferences) && (
            <Tabs defaultValue="dietary" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="dietary" className="flex-1">Dietary Restrictions</TabsTrigger>
                <TabsTrigger value="allergies" className="flex-1">Allergies</TabsTrigger>
              </TabsList>

              <TabsContent value="dietary">
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  <div className="flex flex-wrap gap-2">
                    {DIETARY_OPTIONS.map((diet) => (
                      <Badge
                        key={diet}
                        variant={selectedDietary.includes(diet) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleDietary(diet)}
                      >
                        {diet}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="allergies">
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  <div className="flex flex-wrap gap-2">
                    {ALLERGY_OPTIONS.map((allergy) => (
                      <Badge
                        key={allergy}
                        variant={
                          userPreferences?.allergies?.includes(allergy) 
                            ? "destructive" 
                            : selectedAllergies.includes(allergy) 
                              ? "default" 
                              : "outline"
                        }
                        className={`cursor-pointer ${userPreferences?.allergies?.includes(allergy) ? 'relative' : ''}`}
                        onClick={() => toggleAllergy(allergy)}
                      >
                        {allergy}
                        {userPreferences?.allergies?.includes(allergy) && (
                          <span className="ml-1 text-[10px]">★</span>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {userPreferences?.allergies && userPreferences.allergies.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ★ Allergies marked from your profile will always be included
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {userPreferences && useDefaultPreferences && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Your Dietary Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {userPreferences.dietary?.length ? (
                    userPreferences.dietary.map((diet) => (
                      <Badge key={diet} variant="secondary">{diet}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No dietary preferences set</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Your Allergy Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {userPreferences.allergies?.length ? (
                    userPreferences.allergies.map((allergy) => (
                      <Badge key={allergy} variant="destructive">{allergy}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No allergy preferences set</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={isGenerating} size="sm">
              {isGenerating ? "Generating..." : "Generate Recipes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 