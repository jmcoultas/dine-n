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
}

interface GroceryListProps {
  items: GroceryItem[];
}

export default function GroceryList({ items }: GroceryListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

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
        <Button variant="outline" onClick={exportList}>
          <Download className="h-4 w-4 mr-2" />
          Export List
        </Button>
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
      
      <div className="mt-8 p-4 border rounded-lg bg-muted">
        <h3 className="text-lg font-semibold mb-4">Shop Ingredients with Instacart</h3>
        <div 
          id="shop-with-instacart-v1" 
          data-affiliate_id="5333" 
          data-source_origin="affiliate_hub" 
          data-affiliate_platform="recipe_widget"
        />
      </div>
    </div>
  );
}
