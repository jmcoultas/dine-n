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

/**
 * Checks if the current user is on a mobile device
 * Mobile devices often have popup blocking issues, so we'll use the safer approach
 */
export function isMobileDevice(): boolean {
  // Only run this check in the browser
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent;
  
  // Check for mobile devices (iOS, Android, etc.)
  const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Debug logging - remove this after testing
  console.log('Mobile Device Detection:', {
    userAgent,
    isMobile
  });
  
  return isMobile;
}

/**
 * Checks if the current user is on iOS Safari (including standalone mode)
 * Used for implementing iOS Safari specific workarounds
 */
export function isIOSSafari(): boolean {
  // Only run this check in the browser
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent;
  
  // Check if running on iOS (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  
  // More comprehensive Safari detection
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(userAgent);
  
  // Also check for PWA mode
  const isStandalone = 'standalone' in navigator && (navigator as any).standalone === true;
  
  const result = isIOS && (isSafari || isStandalone);
  
  // Debug logging - remove this after testing
  console.log('iOS Safari Detection:', {
    userAgent,
    isIOS,
    isSafari,
    isStandalone,
    result
  });
  
  return result;
}

/**
 * Navigate to URL in a way that bypasses iOS Safari's strict popup blocking
 * Uses programmatic anchor click which Safari treats as genuine user interaction
 */
export function navigateToURL(url: string, target: '_blank' | '_self' = '_self'): boolean {
  try {
    // Create a temporary anchor element
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = target;
    anchor.rel = 'noopener noreferrer';
    
    // Add to DOM, click it, then remove it
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    return true;
  } catch (error) {
    console.error('Failed to navigate to URL:', error);
    return false;
  }
}

/**
 * Detects if a popup was blocked by checking if window.open returned null or if the window is closed
 */
export function detectPopupBlocked(windowRef: Window | null): boolean {
  if (!windowRef) {
    return true;
  }
  
  try {
    // Check if window was closed immediately (blocked)
    return windowRef.closed;
  } catch (error) {
    // If we can't access the window, it was likely blocked
    return true;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
