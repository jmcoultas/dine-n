import { toast as sonnerToast } from "sonner";

export function useToast() {
  return {
    toast: ({
      title,
      description,
      variant = "default",
      onClick,
      className
    }: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive" | "instacart";
      onClick?: () => void;
      className?: string;
    }) => {
      const baseOptions = {
        description,
        onClick,
        className
      };

      if (variant === "destructive") {
        sonnerToast.error(title, baseOptions);
      } else if (variant === "instacart") {
        sonnerToast.success(title, {
          ...baseOptions,
          className: `${className || ''} !bg-instacart-dark-green !text-instacart-light-cream !border-instacart-green cursor-pointer hover:!bg-instacart-green transition-colors duration-200`,
          style: {
            backgroundColor: '#003D29',
            color: '#FAF1E5',
            border: '1px solid #0AAD0A',
            cursor: 'pointer'
          }
        });
      } else {
        sonnerToast(title, baseOptions);
      }
    }
  };
}