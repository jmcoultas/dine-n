import { Link } from "wouter";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Utensils, User, BookOpen, CookingPot, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

export default function Header() {
  const { data: user } = useUser();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center">
          <img src="/transparent-logo.png" alt="Dine-N" className="h-8" />
        </Link>
        <NavigationMenu className="ml-auto">
          <NavigationMenuList className="space-x-2">
            <NavigationMenuItem>
              <Link href="/recipes" className="block">
                <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[130px] hover:bg-accent rounded-md transition-all duration-200">
                  <BookOpen className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1" />
                  <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                    Recipes
                  </span>
                </div>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/meal-plan" className="block">
                <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[130px] hover:bg-accent rounded-md transition-all duration-200">
                  <CookingPot className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1" />
                  <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                    Meal Plan
                  </span>
                </div>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/ingredient-recipes" className="block">
                <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[170px] hover:bg-accent rounded-md transition-all duration-200">
                  <UtensilsCrossed className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1" />
                  <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                    Ingredient Explorer
                  </span>
                </div>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        {user && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-4"
            asChild
          >
            <Link href="/profile">
              <User className="h-6 w-6" />
              <span className="sr-only">User Profile</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
