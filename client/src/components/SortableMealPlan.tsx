import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { GripVertical } from "lucide-react";
import type { MealPlan } from "@db/schema";

interface Props {
  mealPlan: MealPlan;
  onOverride: () => Promise<void>;
}

export default function SortableMealPlan({ mealPlan, onOverride }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mealPlan.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="relative">
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <CardHeader className="pl-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{mealPlan.name}</h3>
              <p className="text-sm text-muted-foreground">
                Created by User {mealPlan.userId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOverride()}
              >
                Override Hold
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pl-10">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Start Date:</span>{" "}
              {new Date(mealPlan.startDate).toLocaleDateString()}
            </div>
            <div>
              <span className="text-muted-foreground">End Date:</span>{" "}
              {new Date(mealPlan.endDate).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
