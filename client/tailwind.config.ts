import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "bounce-ingredient-1": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(-5px, -15px) rotate(45deg)" },
        },
        "bounce-ingredient-2": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(5px, -12px) rotate(-45deg)" },
        },
        "bounce-ingredient-3": {
          "0%, 100%": { transform: "translate(0, 0) rotate(0deg)" },
          "50%": { transform: "translate(-8px, -10px) rotate(30deg)" },
        },
        "steam-1": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "50%": { transform: "translateY(-10px) scale(1.2)", opacity: "0.7" },
          "100%": { transform: "translateY(-20px) scale(1)", opacity: "0" },
        },
        "steam-2": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "50%": { transform: "translateY(-8px) scale(1.1)", opacity: "0.7" },
          "100%": { transform: "translateY(-16px) scale(1)", opacity: "0" },
        },
        "steam-3": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "0" },
          "50%": { transform: "translateY(-12px) scale(1.3)", opacity: "0.7" },
          "100%": { transform: "translateY(-24px) scale(1)", opacity: "0" },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "spin-slow": "spin-slow 8s linear infinite",
        "bounce-ingredient-1": "bounce-ingredient-1 2s ease-in-out infinite",
        "bounce-ingredient-2": "bounce-ingredient-2 2.5s ease-in-out infinite",
        "bounce-ingredient-3": "bounce-ingredient-3 1.8s ease-in-out infinite",
        "steam-1": "steam-1 2s ease-in-out infinite",
        "steam-2": "steam-2 2.2s ease-in-out infinite",
        "steam-3": "steam-3 1.8s ease-in-out infinite"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;