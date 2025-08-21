import { toast as sonnerToast } from "sonner";

export function useToast() {
  return {
    toast: ({
      title,
      description,
      variant = "default",
      action,
      onClick
    }: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
      action?: any;
      onClick?: () => void;
    }) => {
      const options: any = {
        description
      };

      // Add action or onClick if provided
      if (action) {
        options.action = action;
      }
      if (onClick) {
        options.onClick = onClick;
      }

      if (variant === "destructive") {
        sonnerToast.error(title, options);
      } else {
        sonnerToast(title, options);
      }
    }
  };
}