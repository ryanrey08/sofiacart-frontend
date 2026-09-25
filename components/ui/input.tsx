import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, hasError, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200",
      hasError ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-border",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
