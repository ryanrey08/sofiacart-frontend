import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, hasError, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[120px] w-full rounded-xl border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200",
      hasError ? "border-red-400 focus:border-red-500 focus:ring-red-100" : "border-border",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
