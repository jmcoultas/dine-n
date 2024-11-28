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
  recipe: {
    id: number;
    name: string;
    description?: string;
    imageUrl?: string;
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  };
  onClick?: () => void;
}

export default function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  // Add null checks for optional properties
  const imageUrl = recipe.imageUrl ?? '';
  const description = recipe.description ?? '';
  const prepTime = recipe.prepTime ?? 0;
  const cookTime = recipe.cookTime ?? 0;
  const servings = recipe.servings ?? 2;

  return (
    <Card
      className="hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="p-0">
        <div className="aspect-video relative rounded-t-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={recipe.name}
            className="object-cover w-full h-full"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-xl mb-2">{recipe.name}</CardTitle>
        <CardDescription className="mb-4">
          {description}
        </CardDescription>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {prepTime + cookTime} min
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {servings} servings
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
