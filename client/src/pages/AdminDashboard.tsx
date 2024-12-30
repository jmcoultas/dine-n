import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import SortableMealPlan from "@/components/SortableMealPlan";
import type { MealPlan } from "@db/schema";

export default function AdminDashboard() {
  const { user } = useUser();
  const { toast } = useToast();
  const [activeMealPlans, setActiveMealPlans] = useState<MealPlan[]>([]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch all active meal plans
  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ["admin", "mealPlans"],
    queryFn: async () => {
      const response = await fetch("/api/admin/meal-plans", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch meal plans");
      }
      return response.json();
    },
    enabled: user?.isAdmin,
  });

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setActiveMealPlans((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and override meal plans
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Active Meal Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeMealPlans}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {mealPlans?.map((mealPlan: MealPlan) => (
                    <SortableMealPlan
                      key={mealPlan.id}
                      mealPlan={mealPlan}
                      onOverride={async () => {
                        try {
                          const response = await fetch(
                            `/api/admin/meal-plans/${mealPlan.id}/override`,
                            {
                              method: "POST",
                              credentials: "include",
                            }
                          );

                          if (!response.ok) {
                            throw new Error("Failed to override meal plan");
                          }

                          toast({
                            title: "Success",
                            description: "Meal plan override successful",
                          });
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to override meal plan",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
