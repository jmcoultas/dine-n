import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Preferences } from "@db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const defaultPreferences: Preferences = {
  dietary: [],
  allergies: [],
  cuisine: [],
  meatTypes: [],
  chefPreferences: undefined
};

export function getPreferences(preferences: Preferences | null | undefined): Preferences {
  if (!preferences) {
    return defaultPreferences;
  }
  return {
    dietary: preferences.dietary || [],
    allergies: preferences.allergies || [],
    cuisine: preferences.cuisine || [],
    meatTypes: preferences.meatTypes || [],
    chefPreferences: preferences.chefPreferences
  };
}
