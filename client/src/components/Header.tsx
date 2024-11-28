import { Link } from "wouter";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import RiveAnimation from "@/components/RiveAnimation";

export default function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <Utensils className="h-6 w-6 text-primary" />
          <span className="font-bold">Dine-N</span>
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
        <Button
          variant="ghost"
          size="icon"
          className="ml-4 p-0 h-10 w-10"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          <div className="w-6 h-6">
            {theme === 'dark' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-full h-full"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-full h-full"
              >
                <circle cx="12" cy="12" r="5" strokeWidth={2} />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                />
              </svg>
            )}
          </div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
