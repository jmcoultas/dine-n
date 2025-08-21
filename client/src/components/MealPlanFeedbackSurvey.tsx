import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MealPlanFeedbackSurveyProps {
  mealPlanId: number;
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (rating: string, feedback?: string) => Promise<void>;
}

type Rating = 'love_it' | 'its_ok' | 'not_great';

const ratingOptions = [
  { value: 'love_it' as Rating, emoji: '😍', label: 'Love it' },
  { value: 'its_ok' as Rating, emoji: '😐', label: "It's OK" },
  { value: 'not_great' as Rating, emoji: '😢', label: 'Not great' }
];

export function MealPlanFeedbackSurvey({ 
  mealPlanId, 
  isVisible, 
  onClose, 
  onSubmit 
}: MealPlanFeedbackSurveyProps) {
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      onClose();
    }, 15000);

    return () => clearTimeout(timer);
  }, [isVisible, onClose]);

  const handleSubmit = async () => {
    if (!selectedRating) return;

    setIsSubmitting(true);
    try {
      await onSubmit(selectedRating);
      toast({
        title: "Thank you!",
        description: "Your feedback helps us improve meal recommendations.",
        variant: "default",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const SurveyContent = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          How do these meals look?
        </h3>
        <p className="text-sm text-muted-foreground">
          Your feedback helps us create better meal plans
        </p>
      </div>

      <div className="flex justify-center space-x-6">
        {ratingOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedRating(option.value)}
            className={`flex flex-col items-center p-4 rounded-lg transition-all duration-200 ${
              selectedRating === option.value
                ? 'bg-primary/10 border-2 border-primary'
                : 'bg-muted border-2 border-transparent hover:bg-muted/80'
            }`}
          >
            <span className="text-3xl mb-2">{option.emoji}</span>
            <span className="text-sm font-medium text-foreground">
              {option.label}
            </span>
          </button>
        ))}
      </div>



      <div className="flex space-x-3">
        <Button
          onClick={handleSubmit}
          disabled={!selectedRating || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
        <Button
          onClick={handleSkip}
          variant="outline"
          disabled={isSubmitting}
        >
          Skip
        </Button>
      </div>
    </div>
  );

  if (!isVisible) return null;

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <Sheet open={isVisible} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh]">
          <SheetHeader>
            <SheetTitle className="sr-only">Meal Plan Feedback</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <SurveyContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Toast-style notification in bottom-right
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md">
      <Card className="shadow-lg border">
        <CardContent className="p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
          <SurveyContent />
        </CardContent>
      </Card>
    </div>
  );
}

export default MealPlanFeedbackSurvey;
