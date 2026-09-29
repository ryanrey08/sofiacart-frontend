import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: number;
  title: string;
  description: string;
}

export function StepperNav({ steps, currentStep, orientation = "horizontal" }: { steps: StepItem[]; currentStep: number; orientation?: "horizontal" | "vertical"; }) {
  const isVertical = orientation === "vertical";

  return (
    <div className={cn("flex gap-4", isVertical ? "flex-col" : "flex-col lg:flex-row lg:items-center lg:justify-between") }>
      {steps.map((step) => {
        const state = step.id < currentStep ? "completed" : step.id === currentStep ? "active" : "upcoming";
        return (
          <div key={step.id} className={cn("block place-items-center gap-3", isVertical ? "items-start" : "items-center") }>
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                state === "completed" && "border-brand-600 bg-brand-600 text-white",
                state === "active" && "border-brand-600 bg-[#5d24da] text-white",
                state === "upcoming" && "border-border bg-white text-muted-foreground",
              )}
            >
              {state === "completed" ? <Check className="h-5 w-5" /> : step.id}
            </div>
            <div className="flex flex-col">
              <p className={cn("font-semibold text-slate-900", step.id === currentStep && "text-[#6422d0]")}>{step.title}</p>
              {/* <p className="text-sm text-muted-foreground">{step.description}</p> */}
            </div>
          </div>
        );
      })}
    </div>
  );
}
