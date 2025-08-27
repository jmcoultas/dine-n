import { useState, useMemo, useCallback } from "react";
import { usePantry } from "@/hooks/use-pantry";
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
import { Search, Package, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PantryItem } from "@/lib/types";

interface PantryImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (selectedItems: string[]) => void;
  currentIngredients?: string[];
}

export default function PantryImportModal({
  open,
  onOpenChange,
  onImport,
  currentIngredients = []
}: PantryImportModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(true);
  
  const { data: pantryData, isLoading } = usePantry();
  const pantryItems = pantryData?.items || [];

  // Helper function to determine if item is urgent
  const isUrgentItem = useCallback((item: PantryItem) => {
    if (item.quantity_status === 'running_low') return true;
    
    const daysOld = Math.floor(
      (Date.now() - new Date(item.added_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // If item has estimated shelf life, use that for smart expiration detection
    if (item.estimated_shelf_life_days && item.estimated_shelf_life_days > 0) {
      // Consider urgent when item has used 70% of its shelf life
      const shelfLifeUsedPercentage = daysOld / item.estimated_shelf_life_days;
      return shelfLifeUsedPercentage >= 0.7;
    }
    
    // Fallback to 7-day rule for items without shelf life data
    return daysOld >= 7;
  }, []);

  // Filter and sort pantry items
  const filteredItems = useMemo(() => {
    let items = pantryItems.filter(item => {
      // Filter out empty items by default
      if (item.quantity_status === 'empty') return false;
      
      // Search filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Category filter
      const itemCategory = item.category || 'uncategorized';
      if (filterCategory !== 'all' && itemCategory !== filterCategory) {
        return false;
      }
      
      return true;
    });

    // Sort items - prioritize expiring/low items if enabled
    if (prioritizeExpiring) {
      items.sort((a, b) => {
        const aIsUrgent = isUrgentItem(a);
        const bIsUrgent = isUrgentItem(b);
        
        if (aIsUrgent && !bIsUrgent) return -1;
        if (!aIsUrgent && bIsUrgent) return 1;
        
        // Secondary sort by name
        return a.name.localeCompare(b.name);
      });
    } else {
      items.sort((a, b) => a.name.localeCompare(b.name));
    }

    return items;
  }, [pantryItems, searchQuery, filterCategory, prioritizeExpiring, isUrgentItem]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(pantryItems.map(item => item.category || 'uncategorized'));
    return Array.from(cats).sort();
  }, [pantryItems]);

  const handleItemToggle = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleImport = () => {
    const selectedIngredients = filteredItems
      .filter(item => selectedItems.has(item.id))
      .map(item => item.name);
    
    onImport(selectedIngredients);
    onOpenChange(false);
    setSelectedItems(new Set());
    setSearchQuery("");
  };

  const getItemStatusIcon = (item: PantryItem) => {
    if (item.quantity_status === 'running_low') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    if (isUrgentItem(item)) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <Package className="h-4 w-4 text-gray-400" />;
  };

  const getItemStatusText = (item: PantryItem) => {
    const daysOld = Math.floor(
      (Date.now() - new Date(item.added_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (item.quantity_status === 'running_low') {
      return `Running low • ${daysOld}d old`;
    }
    if (daysOld >= 7) {
      return `${daysOld}d old • Use soon`;
    }
    return `${daysOld}d old`;
  };

  const isItemAlreadyAdded = (itemName: string) => {
    return currentIngredients.some(ingredient => 
      ingredient.toLowerCase() === itemName.toLowerCase()
    );
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
            Import from Pantry
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Search and filters */}
          <div className="space-y-3 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pantry items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory('all')}
              >
                All
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={filterCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory(category || 'uncategorized')}
                  className="capitalize"
                >
                  {category || 'uncategorized'}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={prioritizeExpiring}
                  onCheckedChange={(checked) => setPrioritizeExpiring(!!checked)}
                />
                Prioritize expiring items
              </label>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.size === filteredItems.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
          </div>

          {/* Items list */}
          <div className="flex-1 min-h-0 border rounded-md">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {pantryItems.length === 0 
                    ? "No items in your pantry yet. Add some items to get started!"
                    : "No items match your current filters."
                  }
                </div>
              ) : (
                filteredItems.map(item => {
                  const isSelected = selectedItems.has(item.id);
                  const isAlreadyAdded = isItemAlreadyAdded(item.name);
                  const isUrgent = isUrgentItem(item);
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        isSelected && "bg-primary/10 border-primary/30 dark:bg-primary/20 dark:border-primary/40",
                        isAlreadyAdded && "opacity-50",
                        isUrgent && !isAlreadyAdded && "border-orange-200 bg-orange-50 dark:border-orange-400/30 dark:bg-orange-400/10"
                      )}
                      onClick={() => !isAlreadyAdded && handleItemToggle(item.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isAlreadyAdded}
                        onChange={() => {}} // Handled by parent onClick
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getItemStatusIcon(item)}
                          <span className={cn(
                            "font-medium",
                            isAlreadyAdded && "line-through"
                          )}>
                            {item.name}
                          </span>
                          {isAlreadyAdded && (
                            <Badge variant="secondary" className="text-xs">
                              Already added
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {getItemStatusText(item)}
                          </span>
                          
                          {item.quantity && item.unit && (
                            <Badge variant="outline" className="text-xs">
                              {item.quantity} {item.unit}
                            </Badge>
                          )}
                          
                          {item.category && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport}
                disabled={selectedItems.size === 0}
              >
                Import Selected
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
