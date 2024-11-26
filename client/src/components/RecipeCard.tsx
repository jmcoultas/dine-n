import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Clock, Users } from "lucide-react";
import type { Recipe } from "@db/schema";

interface RecipeCardProps {
  recipe: Recipe;
  onClick?: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="p-0">
        <div className="aspect-video relative rounded-t-lg overflow-hidden">
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="object-cover w-full h-full"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-xl mb-2">{recipe.name}</CardTitle>
        <CardDescription className="mb-4">
          {recipe.description}
        </CardDescription>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {recipe.prepTime + recipe.cookTime} min
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {recipe.servings} servings
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
