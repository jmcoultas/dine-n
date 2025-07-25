import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { type Preferences } from "@db/schema";
import { useToast } from "@/hooks/use-toast";
import { DietaryPreferencesStep } from "@/components/onboarding/DietaryPreferencesStep";
import { AllergiesStep } from "@/components/onboarding/AllergiesStep";
import { CuisineStep } from "@/components/onboarding/CuisineStep";
import { MeatTypesStep } from "@/components/onboarding/MeatTypesStep";
import { ChefPreferencesStep } from "@/components/onboarding/ChefPreferencesStep";
import { PricingStep } from "@/components/onboarding/PricingStep";
import { CelebrationStep } from "@/components/onboarding/CelebrationStep";

type OnboardingStep = 'dietary' | 'allergies' | 'cuisine' | 'meatTypes' | 'chefPreferences' | 'pricing' | 'celebration';

const defaultPreferences: Preferences = {
  dietary: [],
  allergies: [],
  cuisine: [],
  meatTypes: [], // We'll set this to include all meat types by default unless they select vegetarian/vegan
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
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('dietary');
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('free');

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isUserLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isUserLoading, setLocation]);

  // Initialize preferences from user account if available
  useEffect(() => {
    if (user?.preferences) {
      try {
        setPreferences(user.preferences as Preferences);
      } catch (error) {
        console.error('Invalid user preferences, using defaults:', error);
        setPreferences(defaultPreferences);
      }
    }
  }, [user]);

  // Step navigation handlers
  const handleNext = () => {
    switch (currentStep) {
      case 'dietary':
        setCurrentStep('allergies');
        break;
      case 'allergies':
        setCurrentStep('cuisine');
        break;
      case 'cuisine':
        if (preferences.cuisine.length > 0) {
          setCurrentStep('meatTypes');
        }
        break;
      case 'meatTypes':
        setCurrentStep('chefPreferences');
        break;
      case 'chefPreferences':
        setCurrentStep('pricing');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'allergies':
        setCurrentStep('dietary');
        break;
      case 'cuisine':
        setCurrentStep('allergies');
        break;
      case 'meatTypes':
        setCurrentStep('cuisine');
        break;
      case 'chefPreferences':
        setCurrentStep('meatTypes');
        break;
      case 'pricing':
        setCurrentStep('chefPreferences');
        break;
    }
  };

  // Preference update handlers
  const handleDietaryChange = (dietary: string[]) => {
    setPreferences(prev => ({ ...prev, dietary: dietary as any }));
  };

  const handleAllergiesChange = (allergies: string[]) => {
    setPreferences(prev => ({ ...prev, allergies: allergies as any }));
  };

  const handleCuisineChange = (cuisine: string[]) => {
    setPreferences(prev => ({ ...prev, cuisine: cuisine as any }));
  };

  const handleMeatTypesChange = (meatTypes: string[]) => {
    setPreferences(prev => ({ ...prev, meatTypes: meatTypes as any }));
  };

  const handleChefPreferencesChange = (chefPreferences: any) => {
    setPreferences(prev => ({ ...prev, chefPreferences }));
  };

  // Pricing step handlers
  const handleSelectFree = async () => {
    setSelectedPlan('free');
    await savePreferencesAndProceed();
  };

  const handleSelectPremium = async () => {
    setSelectedPlan('premium');
    await savePreferencesAndProceed();
  };

  const savePreferencesAndProceed = async () => {
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
            preferences: preferences
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save preferences to account');
        }
      }

      // Clear the onboarding flag
      localStorage.removeItem('registrationCompleted');
      
      // Move to celebration step
      setCurrentStep('celebration');
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    }
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

  // Render the appropriate step
  switch (currentStep) {
    case 'dietary':
      return (
        <DietaryPreferencesStep
          selectedDietary={preferences.dietary}
          onDietaryChange={handleDietaryChange}
          onNext={handleNext}
          onBack={handleBack}
          canGoBack={false} // First step
        />
      );

    case 'allergies':
      return (
        <AllergiesStep
          selectedAllergies={preferences.allergies}
          onAllergiesChange={handleAllergiesChange}
          onNext={handleNext}
          onBack={handleBack}
        />
      );

    case 'cuisine':
      return (
        <CuisineStep
          selectedCuisine={preferences.cuisine}
          onCuisineChange={handleCuisineChange}
          onNext={handleNext}
          onBack={handleBack}
        />
      );

    case 'meatTypes':
      return (
        <MeatTypesStep
          selectedMeatTypes={preferences.meatTypes}
          onMeatTypesChange={handleMeatTypesChange}
          onNext={handleNext}
          onBack={handleBack}
        />
      );

    case 'chefPreferences':
      return (
        <ChefPreferencesStep
          selectedChefPreferences={preferences.chefPreferences || {
            difficulty: 'Moderate',
            cookTime: '30-60 minutes',
            servingSize: '4'
          }}
          onChefPreferencesChange={handleChefPreferencesChange}
          onNext={handleNext}
          onBack={handleBack}
        />
      );

    case 'pricing':
      return (
        <PricingStep
          onSelectFree={handleSelectFree}
          onBack={handleBack}
        />
      );

    case 'celebration':
      return (
        <CelebrationStep selectedPlan={selectedPlan} />
      );

    default:
      return null;
  }
} 