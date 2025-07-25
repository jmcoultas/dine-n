import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ButtonSelectionProps {
  options: readonly string[];
  selectedOptions: string[];
  onSelectionChange: (selected: string[]) => void;
  multiSelect?: boolean;
  className?: string;
  columns?: number;
}

export function ButtonSelection({
  options,
  selectedOptions,
  onSelectionChange,
  multiSelect = true,
  className,
  columns = 3
}: ButtonSelectionProps) {
  const handleOptionClick = (option: string) => {
    if (multiSelect) {
      if (selectedOptions.includes(option)) {
        onSelectionChange(selectedOptions.filter(item => item !== option));
      } else {
        onSelectionChange([...selectedOptions, option]);
      }
    } else {
      onSelectionChange([option]);
    }
  };

  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };

  return (
    <div className={cn("grid gap-3", gridCols[columns as keyof typeof gridCols] || gridCols[3], className)}>
      {options.map((option) => {
        const isSelected = selectedOptions.includes(option);
        
        return (
          <Button
            key={option}
            variant={isSelected ? "default" : "outline"}
            onClick={() => handleOptionClick(option)}
            className={cn(
              "h-auto p-4 text-left justify-start relative transition-all duration-200",
              "hover:scale-[1.02] hover:shadow-md",
              isSelected && "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20"
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                isSelected 
                  ? "bg-primary-foreground border-primary-foreground" 
                  : "border-muted-foreground/40"
              )}>
                {isSelected && (
                  <Check className="w-3 h-3 text-primary" />
                )}
              </div>
              <span className="font-medium">{option}</span>
            </div>
          </Button>
        );
      })}
    </div>
  );
} 