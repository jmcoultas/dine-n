import { Link } from "wouter";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Utensils } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Utensils className="h-6 w-6 text-primary" />
          <span className="font-bold">MealMaster AI</span>
        </Link>
        <NavigationMenu className="ml-auto">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/recipes" className="block px-4 py-2 hover:bg-accent hover:text-accent-foreground">
                Recipes
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/meal-plan" className="block px-4 py-2 hover:bg-accent hover:text-accent-foreground">
                Meal Plan
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
