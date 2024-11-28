import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

function getSystemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    function updateTheme() {
      const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
      
      // Add transition class for smooth theme switching
      root.classList.add('transition-colors', 'duration-200');
      
      // Update CSS variables based on theme
      if (effectiveTheme === 'dark') {
        root.style.setProperty('--background', 'hsl(240, 10%, 4%)');
        root.style.setProperty('--foreground', 'hsl(0, 0%, 98%)');
        root.style.setProperty('--muted', 'hsl(240, 4%, 16%)');
        root.style.setProperty('--muted-foreground', 'hsl(240, 5%, 65%)');
        root.style.setProperty('--card', 'hsl(240, 10%, 6%)');
        root.style.setProperty('--card-foreground', 'hsl(0, 0%, 98%)');
        root.style.setProperty('--border', 'hsl(240, 4%, 16%)');
        root.style.setProperty('--primary', 'hsl(24, 80%, 50%)');
        root.style.setProperty('--primary-foreground', 'hsl(0, 0%, 98%)');
        root.style.setProperty('--accent', 'hsl(240, 4%, 16%)');
        root.style.setProperty('--accent-foreground', 'hsl(0, 0%, 98%)');
        root.style.setProperty('--popover', 'hsl(240, 10%, 4%)');
        root.style.setProperty('--popover-foreground', 'hsl(0, 0%, 98%)');
      } else {
        root.style.setProperty('--background', 'hsl(0, 0%, 100%)');
        root.style.setProperty('--foreground', 'hsl(240, 10%, 4%)');
        root.style.setProperty('--muted', 'hsl(240, 5%, 96%)');
        root.style.setProperty('--muted-foreground', 'hsl(240, 4%, 46%)');
        root.style.setProperty('--card', 'hsl(0, 0%, 100%)');
        root.style.setProperty('--card-foreground', 'hsl(240, 10%, 4%)');
        root.style.setProperty('--border', 'hsl(240, 5%, 90%)');
        root.style.setProperty('--primary', 'hsl(24, 80%, 50%)');
        root.style.setProperty('--primary-foreground', 'hsl(0, 0%, 100%)');
        root.style.setProperty('--accent', 'hsl(240, 5%, 96%)');
        root.style.setProperty('--accent-foreground', 'hsl(240, 10%, 4%)');
        root.style.setProperty('--popover', 'hsl(0, 0%, 100%)');
        root.style.setProperty('--popover-foreground', 'hsl(240, 10%, 4%)');
      }
    }
    
    updateTheme();
    localStorage.setItem("theme", theme);

    // Watch for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateTheme();
      }
    };
    
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return { theme, setTheme };
}
