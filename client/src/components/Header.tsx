import { Link } from "wouter";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Utensils, User, BookOpen, UtensilsCrossed, Calendar, Shield, ChefHat, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import { getCurrentMealPlan } from "@/lib/api";
import { cn } from "@/lib/utils";
import { logoUrl } from "@/lib/constants";

export default function Header() {
  const { data: user } = useUser();
  
  // Query to check if user has an active meal plan
  const { data: currentMealPlan } = useQuery({
    queryKey: ['current-meal-plan'],
    queryFn: getCurrentMealPlan,
    enabled: !!user, // Only run query if user is logged in
  });

  // Check if user has an active (non-expired) meal plan
  const hasActiveMealPlan = currentMealPlan && !currentMealPlan.is_expired;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center">
          <img src={logoUrl} alt="Dine-N" className="h-8" />
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
            {/* Only show Meal Plan nav item if user has an active meal plan */}
            {hasActiveMealPlan && (
              <NavigationMenuItem>
                <Link href="/meal-plan" className="block">
                  <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[130px] hover:bg-accent rounded-md transition-all duration-200">
                    <ChefHat className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1" />
                    <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                      Meal Plan
                    </span>
                  </div>
                </Link>
              </NavigationMenuItem>
            )}
            <NavigationMenuItem>
              <Link href="/weekly-planner" className="block">
                <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[170px] hover:bg-accent rounded-md transition-all duration-200">
                  <Calendar className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1" />
                  <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                    Weekly Planner
                  </span>
                </div>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/ingredient-recipes" className="block">
                <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[170px] hover:bg-accent rounded-md transition-all duration-200">
                  <UtensilsCrossed className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1" />
                  <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                    PantryPal
                  </span>
                </div>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/pantry" className="block">
                <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[130px] hover:bg-accent rounded-md transition-all duration-200">
                  <Package className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1" />
                  <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                    MyPantry
                  </span>
                </div>
              </Link>
            </NavigationMenuItem>
            {/* Admin navigation - only show for admin users */}
            {user?.is_admin && (
              <NavigationMenuItem>
                <Link href="/admin" className="block">
                  <div className="relative flex items-center px-3 py-2 w-[42px] hover:w-[130px] hover:bg-accent rounded-md transition-all duration-200">
                    <Shield className="h-6 w-6 transition-transform duration-200 hover:-translate-x-1 text-orange-600" />
                    <span className="absolute left-[46px] whitespace-nowrap opacity-0 transition-all duration-200 hover:opacity-100 pointer-events-none [div:hover>&]:opacity-100">
                      Admin
                    </span>
                  </div>
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
        <Button
          variant="ghost"
          size="icon"
          className="ml-4"
          asChild
        >
          <Link href={user ? "/profile" : "/auth"}>
            <User className="h-6 w-6" />
            <span className="sr-only">{user ? "User Profile" : "Sign In"}</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
