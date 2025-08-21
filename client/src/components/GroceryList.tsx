import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search, Leaf } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { createInstacartShoppingList } from "@/lib/api";
import { InstacartCTA } from "@/components/InstacartCTA";
import { useTheme } from "@/hooks/use-theme";

interface GroceryItem {
  name: string;
  amount: number;
  unit: string;
  recipeIngredient?: string;
  organic?: boolean;
}

interface GroceryListProps {
  items: GroceryItem[];
  mealPlanId?: number;
}

export default function GroceryList({ items, mealPlanId }: GroceryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [organicItems, setOrganicItems] = useState<Set<string>>(new Set());
  const [isCreatingInstacartList, setIsCreatingInstacartList] = useState(false);
  const { theme } = useTheme();
  
  // Helper function to resolve the actual theme
  const getResolvedTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  };
  const { toast } = useToast();
  
  // Define recipeName here
  const recipeName = items.length > 0 ? items[0].name : "Grocery List";

  // Normalize ingredient names by removing common prefixes and preparation instructions
  const normalizeIngredientName = (name: string) => {
    return name.toLowerCase()
      .replace(/^(fresh|dried|frozen|canned|diced|sliced|chopped|minced|ground)\s+/, '')
      .replace(/,.*$/, '')
      .trim();
  };

  // Convert common unit variations to standard form
  const standardizeUnit = (unit: string) => {
    const unitMap: Record<string, string> = {
      'g': 'grams',
      'gram': 'grams',
      'grams': 'grams',
      'kg': 'kilograms',
      'oz': 'ounces',
      'ounce': 'ounces',
      'ounces': 'ounces',
      'lb': 'pounds',
      'lbs': 'pounds',
      'pound': 'pounds',
      'pounds': 'pounds',
      'ml': 'milliliters',
      'milliliter': 'milliliters',
      'milliliters': 'milliliters',
      'l': 'liters',
      'liter': 'liters',
      'liters': 'liters',
      'tsp': 'teaspoons',
      'teaspoon': 'teaspoons',
      'teaspoons': 'teaspoons',
      'tbsp': 'tablespoons',
      'tablespoon': 'tablespoons',
      'tablespoons': 'tablespoons',
      'cup': 'cups',
      'cups': 'cups',
    };
    return unitMap[unit.toLowerCase()] || unit.toLowerCase();
  };

  // Aggregate ingredients with normalized names and standardized units
  const aggregatedItems = items.reduce((acc, item) => {
    const normalizedName = normalizeIngredientName(item.name);
    const standardUnit = standardizeUnit(item.unit);
    const key = `${normalizedName}-${standardUnit}`;

    if (!acc[key]) {
      acc[key] = {
        name: item.name,
        amount: item.amount,
        unit: standardUnit,
        organic: item.organic || false,
        recipeIngredient: `${item.amount} ${standardUnit} ${item.name}`
      };
    } else {
      acc[key].amount += item.amount;
      acc[key].recipeIngredient = `${acc[key].amount} ${standardUnit} ${acc[key].name}`;
    }
    return acc;
  }, {} as Record<string, GroceryItem>);

  const filteredItems = Object.values(aggregatedItems).filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheckItem = (itemName: string) => {
    const newCheckedItems = new Set(checkedItems);
    if (checkedItems.has(itemName)) {
      newCheckedItems.delete(itemName);
    } else {
      newCheckedItems.add(itemName);
    }
    setCheckedItems(newCheckedItems);
  };

  const handleToggleOrganic = (itemName: string) => {
    const newOrganicItems = new Set(organicItems);
    if (organicItems.has(itemName)) {
      newOrganicItems.delete(itemName);
    } else {
      newOrganicItems.add(itemName);
    }
    setOrganicItems(newOrganicItems);
  };

  const exportList = () => {
    const content = Object.values(aggregatedItems)
      .filter(item => !checkedItems.has(item.name))
      .map((item) => {
        const isOrganic = organicItems.has(item.name);
        return `${item.amount} ${item.unit} ${isOrganic ? 'Organic ' : ''}${item.name}`;
      })
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grocery-list.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShopWithInstacart = async () => {
    if (!mealPlanId) {
      toast({
        title: "Error",
        description: "No meal plan available for shopping",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInstacartList(true);
    try {
      const result = await createInstacartShoppingList(mealPlanId, "My Meal Plan Shopping List");
      
      // Try to open in new tab (works on most browsers/devices)
      const newWindow = window.open(result.instacart_url, '_blank');
      
      // Always show toast with clickable link as fallback
      toast({
        title: "Instacart Shopping List Ready!",
        description: `Shopping list created with ${result.ingredient_count} ingredients. Tap anywhere to open Instacart.`,
        variant: "default",
        onClick: () => {
          console.log('🔗 TOAST CLICKED: Opening Instacart URL');
          window.open(result.instacart_url, '_blank');
        }
      });
      
      // If window didn't open, the user can click the URL in the toast
      console.log('Instacart URL created:', result.instacart_url);
      
    } catch (error) {
      console.error('Error creating Instacart shopping list:', error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Instacart shopping list",
        variant: "destructive",
      });
    } finally {
      setIsCreatingInstacartList(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={exportList}>
          <Download className="h-4 w-4 mr-2" />
          Export List
        </Button>
        
        {mealPlanId && (
          <InstacartCTA
            contentType="grocery"
            theme={getResolvedTheme()}
            onClick={handleShopWithInstacart}
            disabled={isCreatingInstacartList}
          />
        )}
      </div>

      <ScrollArea className="h-[500px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="w-12">Organic</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Checkbox
                    checked={checkedItems.has(item.name)}
                    onCheckedChange={() => handleCheckItem(item.name)}
                  />
                </TableCell>
                <TableCell className={checkedItems.has(item.name) ? "line-through" : ""}>
                  {item.name}
                </TableCell>
                <TableCell>{item.amount}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleOrganic(item.name)}
                          className={organicItems.has(item.name) ? "text-green-600" : "text-muted-foreground"}
                        >
                          <Leaf className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {organicItems.has(item.name) ? "Remove organic" : "Make organic"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}