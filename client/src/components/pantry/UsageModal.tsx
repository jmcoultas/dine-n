import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import type { PantryItem, UsePantryItemRequest } from '@/lib/types';

interface UsageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PantryItem | null;
  onUse: (data: UsePantryItemRequest) => void;
}

interface Recipe {
  id: number;
  name: string;
}

export function UsageModal({ open, onOpenChange, item, onUse }: UsageModalProps) {
  const [quantityUsed, setQuantityUsed] = useState<string>('');
  const [recipeId, setRecipeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [useAll, setUseAll] = useState(false);

  // Fetch user's recent recipes for the dropdown
  const { data: recipes } = useQuery<Recipe[]>({
    queryKey: ['recent-recipes'],
    queryFn: async () => {
      const response = await fetch('/api/recipes/recent?limit=10');
      if (!response.ok) return [];
      const data = await response.json();
      return data.recipes || [];
    },
    enabled: open,
  });

  // Reset form when modal opens/closes or item changes
  useEffect(() => {
    if (open && item) {
      setQuantityUsed('');
      setRecipeId('none');
      setNotes('');
      setUseAll(false);
    }
  }, [open, item]);

  if (!item) return null;

  const currentQuantity = item.quantity || 0;
  const unit = item.unit || 'units';

  const handleQuickAmount = (amount: number | 'all') => {
    if (amount === 'all') {
      setUseAll(true);
      setQuantityUsed(currentQuantity.toString());
    } else {
      setUseAll(false);
      setQuantityUsed(amount.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const usageData: UsePantryItemRequest = {
      quantityUsed: useAll ? currentQuantity : (quantityUsed ? parseFloat(quantityUsed) : undefined),
      recipeId: recipeId && recipeId !== 'none' ? parseInt(recipeId) : undefined,
      notes: notes.trim() || undefined,
      useAll,
    };

    onUse(usageData);
    onOpenChange(false);
  };

  const remainingAfterUse = useAll ? 0 : Math.max(0, currentQuantity - (parseFloat(quantityUsed) || 0));
  const isValidAmount = useAll || (!quantityUsed || (parseFloat(quantityUsed) > 0 && parseFloat(quantityUsed) <= currentQuantity));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How much {item.name} did you use?</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Quantity Display */}
          <div className="bg-muted p-3 rounded-md">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">You have:</span>
              <Badge variant="outline" className="text-sm">
                {currentQuantity} {unit}
              </Badge>
            </div>
          </div>

          {/* Amount Used Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount used</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.25"
                min="0"
                max={currentQuantity}
                value={quantityUsed}
                onChange={(e) => {
                  setQuantityUsed(e.target.value);
                  setUseAll(false);
                }}
                placeholder="0"
                className="flex-1"
                disabled={useAll}
              />
              <div className="flex items-center px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground min-w-[60px]">
                {unit}
              </div>
            </div>
            
            {quantityUsed && !useAll && (
              <div className="text-xs text-muted-foreground">
                Remaining: {remainingAfterUse.toFixed(2)} {unit}
              </div>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label className="text-sm">Quick amounts:</Label>
            <div className="flex flex-wrap gap-2">
              {[0.25, 0.5, 1, 2].map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount(amount)}
                  disabled={amount > currentQuantity}
                  className="text-xs"
                >
                  {amount} {unit}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount('all')}
                className="text-xs"
              >
                All of it
              </Button>
            </div>
          </div>

          {/* Recipe Selection */}
          <div className="space-y-2">
            <Label htmlFor="recipe">Used in recipe (optional)</Label>
            <Select value={recipeId} onValueChange={setRecipeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a recipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No recipe / Other</SelectItem>
                {recipes?.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id.toString()}>
                    {recipe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!isValidAmount}
            >
              {useAll ? 'Use All' : 'Mark as Used'}
            </Button>
          </div>

          {/* Validation Message */}
          {!isValidAmount && quantityUsed && (
            <p className="text-xs text-destructive">
              Amount must be between 0 and {currentQuantity} {unit}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
