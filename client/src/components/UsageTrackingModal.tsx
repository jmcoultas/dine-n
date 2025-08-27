import { useState, useMemo } from "react";
import { usePantry, useUsePantryItem } from "@/hooks/use-pantry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { Package, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PantryItem } from "@/lib/types";

interface UsageTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: string[];
  recipeName?: string;
}

interface IngredientUsage {
  pantryItemId: number;
  ingredientName: string;
  quantityUsed: number;
  unit: string;
  maxQuantity: number;
}

export default function UsageTrackingModal({
  open,
  onOpenChange,
  ingredients,
  recipeName
}: UsageTrackingModalProps) {
  const [selectedUsages, setSelectedUsages] = useState<IngredientUsage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: pantryData, isLoading } = usePantry();
  const pantryItems = pantryData?.items || [];
  const usePantryItemMutation = useUsePantryItem();

  // Match ingredients to pantry items
  const matchedIngredients = useMemo(() => {
    return ingredients.map(ingredient => {
      const matchedItem = pantryItems.find(item => 
        item.name.toLowerCase().includes(ingredient.toLowerCase()) ||
        ingredient.toLowerCase().includes(item.name.toLowerCase())
      );
      
      return {
        ingredientName: ingredient,
        pantryItem: matchedItem,
        isMatched: !!matchedItem
      };
    });
  }, [ingredients, pantryItems]);

  const handleQuantityChange = (ingredientName: string, pantryItemId: number, quantity: number, unit: string, maxQuantity: number) => {
    setSelectedUsages(prev => {
      const existing = prev.find(u => u.pantryItemId === pantryItemId);
      if (existing) {
        return prev.map(u => 
          u.pantryItemId === pantryItemId 
            ? { ...u, quantityUsed: quantity }
            : u
        );
      } else {
        return [...prev, {
          pantryItemId,
          ingredientName,
          quantityUsed: quantity,
          unit,
          maxQuantity
        }];
      }
    });
  };

  const handleToggleUsage = (ingredientName: string, pantryItem: PantryItem) => {
    const existingUsage = selectedUsages.find(u => u.pantryItemId === pantryItem.id);
    
    if (existingUsage) {
      setSelectedUsages(prev => prev.filter(u => u.pantryItemId !== pantryItem.id));
    } else {
      // Add with default quantity
      const defaultQuantity = pantryItem.quantity ? Math.min(1, pantryItem.quantity) : 1;
      setSelectedUsages(prev => [...prev, {
        pantryItemId: pantryItem.id,
        ingredientName,
        quantityUsed: defaultQuantity,
        unit: pantryItem.unit || 'unit',
        maxQuantity: pantryItem.quantity || 1
      }]);
    }
  };

  const handleSubmitUsages = async () => {
    if (selectedUsages.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Process each usage
      for (const usage of selectedUsages) {
        await usePantryItemMutation.mutateAsync({
          id: usage.pantryItemId,
          data: {
            quantityUsed: usage.quantityUsed,
            useAll: usage.quantityUsed >= usage.maxQuantity,
            notes: recipeName ? `Used in recipe: ${recipeName}` : 'Used in PantryPal recipe'
          }
        });
      }
      
      // Close modal and reset
      onOpenChange(false);
      setSelectedUsages([]);
    } catch (error) {
      console.error('Error tracking usage:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getUsageForItem = (pantryItemId: number) => {
    return selectedUsages.find(u => u.pantryItemId === pantryItemId);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <LoadingAnimation />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Track Ingredient Usage
            {recipeName && <Badge variant="outline" className="ml-2">{recipeName}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 border rounded-md">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
              {matchedIngredients.map((item, index) => {
                const usage = item.pantryItem ? getUsageForItem(item.pantryItem.id) : null;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border",
                      item.isMatched ? "border-green-200 bg-green-50 dark:border-green-400/30 dark:bg-green-400/10" : "border-border bg-muted/50"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{item.ingredientName}</span>
                        {item.isMatched ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-400/20 dark:text-green-400">
                            Found in pantry
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Not in pantry
                          </Badge>
                        )}
                      </div>
                      
                      {item.pantryItem && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={!!usage}
                              onCheckedChange={() => handleToggleUsage(item.ingredientName, item.pantryItem!)}
                            />
                            <span className="text-sm text-muted-foreground">
                              Mark as used from: {item.pantryItem.name}
                            </span>
                          </div>
                          
                          {usage && (
                            <div className="flex items-center gap-2 ml-6">
                              <span className="text-sm">Quantity used:</span>
                              <Input
                                type="number"
                                min="0"
                                max={usage.maxQuantity}
                                step="0.1"
                                value={usage.quantityUsed}
                                onChange={(e) => handleQuantityChange(
                                  item.ingredientName,
                                  item.pantryItem!.id,
                                  parseFloat(e.target.value) || 0,
                                  usage.unit,
                                  usage.maxQuantity
                                )}
                                className="w-20 h-8 text-sm"
                              />
                              <span className="text-sm text-muted-foreground">
                                {usage.unit} (max: {usage.maxQuantity})
                              </span>
                            </div>
                          )}
                          
                          <div className="text-xs text-muted-foreground ml-6">
                            Available: {item.pantryItem.quantity || 0} {item.pantryItem.unit || 'units'} • 
                            Status: {item.pantryItem.quantity_status}
                          </div>
                        </div>
                      )}
                      
                      {!item.isMatched && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="h-4 w-4" />
                          This ingredient wasn't found in your pantry
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {matchedIngredients.filter(i => i.isMatched).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No ingredients from this recipe were found in your pantry.</p>
                  <p className="text-sm mt-1">Add ingredients to your pantry to track usage.</p>
                </div>
              )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {selectedUsages.length} ingredient{selectedUsages.length !== 1 ? 's' : ''} selected for tracking
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitUsages}
                disabled={selectedUsages.length === 0 || isProcessing}
              >
                {isProcessing ? "Processing..." : "Track Usage"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
