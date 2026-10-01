import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, hasError, ...props }, ref) => (
  <input
    ref={ref}
    aria-invalid={hasError || undefined}
    className={cn(
      "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50",
      hasError ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-slate-200",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
