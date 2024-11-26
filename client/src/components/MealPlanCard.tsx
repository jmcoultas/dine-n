import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { format } from "date-fns";
import type { Recipe } from "@db/schema";

interface MealPlanCardProps {
  recipe: Recipe;
  day: Date;
  meal: "breakfast" | "lunch" | "dinner";
}

export default function MealPlanCard({ recipe, day, meal }: MealPlanCardProps) {
  const mealColors = {
    breakfast: "bg-yellow-100",
    lunch: "bg-green-100",
    dinner: "bg-blue-100",
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div
        className="aspect-video relative"
        style={{
          backgroundImage: `url(${recipe.imageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute top-2 left-2">
          <span
            className={`${
              mealColors[meal]
            } px-2 py-1 rounded-full text-sm font-medium capitalize`}
          >
            {meal}
          </span>
        </div>
      </div>
      <CardHeader className="p-4">
        <div className="text-sm text-muted-foreground">
          {format(day, "EEEE, MMM do")}
        </div>
        <div className="font-semibold">{recipe.name}</div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{recipe.prepTime + recipe.cookTime} min</span>
          <span>{recipe.servings} servings</span>
        </div>
      </CardContent>
    </Card>
  );
}
