import { Link } from "wouter";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Utensils, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useUser } from "@/hooks/use-user";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { data: user } = useUser();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center">
          <img src="/Dine-N Logo2.png" alt="Dine-N" className="h-8" />
        </Link>
        <NavigationMenu className="ml-auto">
          <NavigationMenuList className="space-x-2">
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
        {user && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-4"
            asChild
          >
            <Link href="/profile">
              <User className="h-5 w-5" />
              <span className="sr-only">User Profile</span>
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-2"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
