import { useState, useEffect } from "react";
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
import { Download, Search } from "lucide-react";

interface GroceryItem {
  name: string;
  amount: number;
  unit: string;
  recipeIngredient?: string;
}

interface GroceryListProps {
  items: GroceryItem[];
}

export default function GroceryList({ items }: GroceryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    return () => {
      // Cleanup WebGL context when component unmounts
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const gl = canvas.getContext('webgl');
        if (gl) {
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
      }
    };
  }, []);

  useEffect(() => {
    // Add Instacart script
    const script = document.createElement('script');
    script.innerHTML = `
      (function (d, s, id, a) { 
        var js, fjs = d.getElementsByTagName(s)[0];
        if (d.getElementById(id)) { return; } 
        js = d.createElement(s); 
        js.id = id;
        js.src = "https://widgets.instacart.com/widget-bundle-v2.js"; 
        js.async = true;
        js.dataset.source_origin = "affiliate_hub"; 
        fjs.parentNode.insertBefore(js, fjs); 
      })(document, "script", "standard-instacart-widget-v1");
    `;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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

  const exportList = () => {
    const content = Object.values(aggregatedItems)
      .filter(item => !checkedItems.has(item.name))
      .map((item) => item.recipeIngredient)
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
        <div 
          id="shop-with-instacart-v1" 
          data-affiliate_id="5333" 
          data-source_origin="affiliate_hub" 
          data-affiliate_platform="recipe_widget"
          data-partner_name="mealplanner"
          data-referrer={window.location.origin}
          data-recipe={(() => {
            const recipeData = {
              "@context": "https://schema.org",
              "@type": "Recipe",
              name: "Grocery List",
              recipeIngredient: Array.isArray(items) ? items
                .filter(item => !checkedItems.has(item.name))
                .map(item => `${item.amount} ${item.unit} ${item.name}`) : []
            };
            console.log('Instacart Recipe Data:', recipeData);
            return JSON.stringify(recipeData);
          })()}
          className="inline-flex h-10 items-center"
        />
      </div>

      <ScrollArea className="h-[500px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Unit</TableHead>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}