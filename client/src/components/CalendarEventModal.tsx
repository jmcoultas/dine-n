import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadCalendarEvent } from "@/lib/calendar";
type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeName: string;
  recipeDescription?: string;
  mealType: MealType;
  initialDate?: Date;
  recipeId?: number;
}

export function CalendarEventModal({
  isOpen,
  onClose,
  recipeName,
  recipeDescription = "",
  mealType,
  initialDate,
  recipeId
}: CalendarEventModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date());

  const handleAddToCalendar = async () => {
    if (!selectedDate) return;

    await downloadCalendarEvent({
      title: `Cook: ${recipeName}`,
      description: recipeDescription,
      date: selectedDate,
      mealType,
      recipeId
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Calendar</DialogTitle>
          <DialogDescription>
            Choose when you'd like to cook this {mealType.toLowerCase()}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAddToCalendar} disabled={!selectedDate}>
            Add to Calendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 