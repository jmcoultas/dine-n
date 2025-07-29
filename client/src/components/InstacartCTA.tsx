import * as React from "react";
import { cn } from "@/lib/utils";

interface InstacartCTAProps {
  /**
   * The type of content being displayed
   * - 'recipe': Shows "Get Recipe Ingredients" text (A/B tested best performer)
   * - 'grocery': Shows "Get Ingredients" text
   */
  contentType: 'recipe' | 'grocery';
  
  /**
   * Theme mode for the button
   * - 'light': Light background with dark text and stroke
   * - 'dark': Dark background with light text
   */
  theme: 'light' | 'dark';
  
  /**
   * Click handler for the CTA button
   */
  onClick?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
}

export function InstacartCTA({ 
  contentType, 
  theme, 
  onClick, 
  className,
  disabled = false 
}: InstacartCTAProps) {
  const buttonText = contentType === 'recipe' 
    ? 'Get Recipe Ingredients' 
    : 'Get Ingredients';

  const themeClasses = theme === 'light' 
    ? 'bg-[#FAF1E5] text-[#003D29] border-[#EFE9E1] border-[0.5px]'
    : 'bg-[#003D29] text-[#FAF1E5]';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base styles matching Instacart requirements
        "inline-flex items-center justify-center gap-3",
        "h-[46px] px-[18px] py-[16px]",
        "rounded-md font-medium text-sm",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        // Theme-specific styles
        themeClasses,
        // Hover effects
        theme === 'light' 
          ? "hover:bg-[#F0E7DA] focus-visible:ring-[#003D29]" 
          : "hover:bg-[#004A32] focus-visible:ring-[#FAF1E5]",
        className
      )}
      type="button"
    >
      {/* Instacart Carrot Logo */}
      <img 
        src="/Instacart_Carrot.png" 
        alt="Instacart" 
        className="w-[22px] h-[22px] flex-shrink-0"
        style={{ 
          // Ensure full color logo shows properly in both themes
          filter: 'none'
        }}
      />
      
      {/* Button Text */}
      <span className="whitespace-nowrap">
        {buttonText}
      </span>
    </button>
  );
} 