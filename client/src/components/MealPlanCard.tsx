import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ChefHat } from "lucide-react";
import { useState } from "react";
import type { Recipe } from "@db/schema";

interface MealPlanCardProps {
  recipe: Recipe;
  day: Date;
  meal: "breakfast" | "lunch" | "dinner";
}

export default function MealPlanCard({ recipe, day, meal }: MealPlanCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const mealColors = {
    breakfast: "bg-yellow-100",
    lunch: "bg-green-100",
    dinner: "bg-blue-100",
  };

  const complexityNames = {
    1: "Easy",
    2: "Medium",
    3: "Hard",
  };

  return (
    <>
      <Card 
        className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
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
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm flex items-center gap-1">
              <ChefHat className="w-4 h-4" />
              {complexityNames[recipe.complexity as keyof typeof complexityNames]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{recipe.prepTime + recipe.cookTime} min</span>
            <span>{recipe.servings} servings</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{recipe.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="aspect-video relative rounded-lg overflow-hidden">
              <img
                src={recipe.imageUrl}
                alt={recipe.name}
                className="object-cover w-full h-full"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                {complexityNames[recipe.complexity as keyof typeof complexityNames]}
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                {recipe.prepTime + recipe.cookTime} min
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
                {recipe.servings} servings
              </span>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{recipe.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Ingredients</h3>
                <ul className="list-disc list-inside space-y-1">
                  {recipe.ingredients?.map((ingredient, i) => (
                    <li key={i}>
                      {ingredient.amount} {ingredient.unit} {ingredient.name}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Instructions</h3>
                <ol className="list-decimal list-inside space-y-1">
                  {recipe.instructions?.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Nutrition</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{recipe.nutrition?.calories ?? 0}</div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{recipe.nutrition?.protein ?? 0}g</div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{recipe.nutrition?.carbs ?? 0}g</div>
                  <div className="text-sm text-muted-foreground">Carbs</div>
                </div>
                <div className="bg-muted rounded-lg p-2">
                  <div className="font-semibold">{recipe.nutrition?.fat ?? 0}g</div>
                  <div className="text-sm text-muted-foreground">Fat</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
