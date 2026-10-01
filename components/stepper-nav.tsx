import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepItem {
  id: number;
  title: string;
  description: string;
}

type StepState = "completed" | "active" | "upcoming";

function stepState(stepId: number, currentStep: number): StepState {
  return stepId < currentStep ? "completed" : stepId === currentStep ? "active" : "upcoming";
}

const stateLabel: Record<StepState, string> = {
  completed: "completed",
  active: "current step",
  upcoming: "not started",
};

/**
 * `tracker` is the horizontal desktop progress bar shown above the form; `rail` is the vertical list
 * used on the dark onboarding rail. Both expose the current step via `aria-current="step"`.
 */
export function StepperNav({ steps, currentStep, variant = "tracker", className }: { steps: StepItem[]; currentStep: number; variant?: "tracker" | "rail"; className?: string }) {
  if (variant === "rail") {
    return (
      <ol className={cn("relative space-y-1", className)}>
        {steps.map((step, index) => {
          const state = stepState(step.id, currentStep);
          return (
            <li key={step.id} aria-current={state === "active" ? "step" : undefined} className={cn("relative flex gap-3 rounded-2xl p-3", state === "active" && "bg-white/10")}>
              {index < steps.length - 1 ? (
                <span aria-hidden="true" className={cn("absolute left-[1.95rem] top-[3.1rem] h-[calc(100%-2.6rem)] w-px", state === "completed" ? "bg-sunset-300" : "bg-white/15")} />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  state === "completed" && "bg-sunset-500 text-white",
                  state === "active" && "bg-white text-brand-700 ring-4 ring-white/20",
                  state === "upcoming" && "border border-white/25 text-white/60",
                )}
              >
                {state === "completed" ? <Check className="h-4 w-4" /> : step.id}
              </span>
              <span className="min-w-0">
                <span className={cn("block text-sm font-semibold", state === "upcoming" ? "text-white/70" : "text-white")}>{step.title}</span>
                <span className="block text-xs text-white/60">{step.description}</span>
                <span className="sr-only">, {stateLabel[state]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("flex items-start", className)}>
      {steps.map((step, index) => {
        const state = stepState(step.id, currentStep);
        return (
          <li key={step.id} aria-current={state === "active" ? "step" : undefined} className="relative flex flex-1 flex-col items-center text-center">
            {index > 0 ? (
              <span aria-hidden="true" className={cn("absolute right-1/2 top-[1.05rem] h-0.5 w-[calc(100%-2.75rem)] -translate-x-[1.375rem] rounded-full", state === "upcoming" ? "bg-slate-200" : "bg-brand-600")} />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition",
                state === "completed" && "bg-brand-600 text-white",
                state === "active" && "bg-sunset-500 text-white ring-4 ring-sunset-100",
                state === "upcoming" && "border-2 border-slate-200 bg-white text-slate-400",
              )}
            >
              {state === "completed" ? <Check className="h-4 w-4" /> : step.id}
            </span>
            <span className={cn("mt-2 px-1 text-xs font-semibold", state === "upcoming" ? "text-slate-400" : "text-navy-900")}>{step.title}</span>
            <span className="sr-only">, {stateLabel[state]}</span>
          </li>
        );
      })}
    </ol>
  );
}
