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

/**
 * Checks if the current user is on iOS using Safari and not in standalone mode
 * Returns true if the app should show the "Add to Home Screen" prompt
 */
export function shouldShowAddToHomeScreen(): boolean {
  // Only run this check in the browser
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check if running on iOS (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Check if using Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // Check if not already in standalone mode (not already added to home screen)
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
  
  // Fallback check for Safari on iOS which uses a different property
  const isIOSStandalone = 'standalone' in navigator && (navigator as any).standalone === true;
  
  return isIOS && isSafari && !isInStandaloneMode && !isIOSStandalone;
}
