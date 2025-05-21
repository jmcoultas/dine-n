import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface MissingRecipeCardProps {
  day: Date;
  meal: string;
  onRegenerate?: () => Promise<void>;
}

export default function MissingRecipeCard({ day, meal, onRegenerate }: MissingRecipeCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    
    try {
      setIsRegenerating(true);
      await onRegenerate();
      toast({
        title: "Success",
        description: "Recipe regenerated successfully",
      });
      // Refresh the meal plan data
      await queryClient.invalidateQueries({ queryKey: ['current-meal-plan'] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate recipe",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const formattedMeal = meal.charAt(0).toUpperCase() + meal.slice(1);

  return (
    <Card className="overflow-hidden border-dashed border-2 border-muted-foreground/30 bg-muted/30">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold text-muted-foreground">
            Missing Recipe
          </CardTitle>
        </div>
        <div className="text-sm text-muted-foreground">
          {day.toLocaleDateString()} - {formattedMeal}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            We couldn't generate a unique recipe for this meal slot.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRegenerate}
            disabled={isRegenerating || !onRegenerate}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 