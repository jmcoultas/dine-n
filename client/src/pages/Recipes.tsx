import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRecipes } from "@/lib/api";
import RecipeCard from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { Recipe } from "@db/schema";

export default function Recipes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: fetchRecipes,
  });

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-bold">Recipe Collection</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onClick={() => setSelectedRecipe(recipe)}
          />
        ))}
      </div>

      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-3xl">
          {selectedRecipe && (
            <div className="space-y-4">
              <div className="aspect-video relative rounded-lg overflow-hidden">
                <img
                  src={selectedRecipe.imageUrl}
                  alt={selectedRecipe.name}
                  className="object-cover w-full h-full"
                />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{selectedRecipe.name}</h2>
                <p className="text-muted-foreground">{selectedRecipe.description}</p>
                
                <div className="flex gap-2 flex-wrap">
                  {selectedRecipe.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Ingredients</h3>
                  <ScrollArea className="h-48">
                    <ul className="space-y-2">
                      {selectedRecipe.ingredients?.map((ingredient, i) => (
                        <li key={i}>
                          {ingredient.amount} {ingredient.unit} {ingredient.name}
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Instructions</h3>
                  <ScrollArea className="h-48">
                    <ol className="list-decimal list-inside space-y-2">
                      {selectedRecipe.instructions?.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </ScrollArea>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="font-bold">{selectedRecipe.nutrition?.calories}</div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div>
                  <div className="font-bold">{selectedRecipe.nutrition?.protein}g</div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div>
                  <div className="font-bold">{selectedRecipe.nutrition?.carbs}g</div>
                  <div className="text-sm text-muted-foreground">Carbs</div>
                </div>
                <div>
                  <div className="font-bold">{selectedRecipe.nutrition?.fat}g</div>
                  <div className="text-sm text-muted-foreground">Fat</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
