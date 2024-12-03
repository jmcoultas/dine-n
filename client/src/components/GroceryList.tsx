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
import { Download, Search } from "lucide-react";

interface GroceryItem {
  name: string;
  amount: number;
  unit: string;
}

interface GroceryListProps {
  items: GroceryItem[];
}

export default function GroceryList({ items }: GroceryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Aggregate ingredients with the same name and unit
  const aggregatedItems = items.reduce((acc, item) => {
    const key = `${item.name.toLowerCase()}-${item.unit.toLowerCase()}`;
    if (!acc[key]) {
      acc[key] = {
        name: item.name,
        amount: item.amount,
        unit: item.unit
      };
    } else {
      acc[key].amount += item.amount;
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
    const content = items
      .map((item) => `${item.amount} ${item.unit} ${item.name}`)
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportList}>
            <Download className="h-4 w-4 mr-2" />
            Export List
          </Button>
          <Button 
            variant="default" 
            className="bg-[#F36D00] hover:bg-[#F36D00]/90 text-white instacart-button"
            onClick={() => {
              // Format items for Instacart widget
              const items = Object.values(aggregatedItems).map(item => ({
                quantity: item.amount,
                unit: item.unit,
                product: item.name
              }));

              // Check if Instacart is loaded
              const checkInstacartLoading = () => {
                // @ts-ignore - Instacart widget types
                if (window.instacart && window.instacart.shoppingList) {
                  // @ts-ignore - Instacart widget types
                  window.instacart.shoppingList.open({
                    affiliate_id: 'tastemakers',
                    affiliate_platform: 'recipe',
                    items: items
                  });
                } else if ((window as any).instacartLoaded) {
                  // Widget script is loaded but not initialized yet
                  setTimeout(checkInstacartLoading, 100);
                } else {
                  console.error('Instacart widget not loaded');
                  alert('Unable to open Instacart at the moment. Please try again in a few seconds.');
                }
              };
              
              checkInstacartLoading();
            }}
          >
            <img 
              src="https://www.instacart.com/assets/beetstrap/brand/2022/carrot-white-small-a574cd88cbafaa4d46d058565ef84ce4a7bec19345493aa2582c83151e0c06c3.png" 
              alt="Instacart"
              className="h-4 w-4 mr-2"
            />
            Shop on Instacart
          </Button>
        </div>
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
