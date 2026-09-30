import React from "react";
import { Check } from "lucide-react";
import {
  SofiaCartPromoCard,
  SofiaCartPromoCardProps,
} from "./registration-card";

export interface StepItem {
  id: number;
  title: string;
  description: string;
}

interface VerticalStepperProps {
  steps: StepItem[];
  currentStep: number;
  /** Pass custom props to the Promo Card or pass a full Promo Card object */
  promoCardProps?: SofiaCartPromoCardProps;
  /** Or pass custom bottom content directly */
  bottomContent?: React.ReactNode;
}

export function VerticalStepper({
  steps,
  currentStep,
  promoCardProps,
  bottomContent,
}: VerticalStepperProps) {
  return (
    <div className="flex flex-col justify-between h-full w-full max-w-md space-y-8">
      {/* Stepper Section */}
      <div className="relative flex flex-col space-y-3">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="relative">
              <div
                className={`relative flex items-center gap-4 rounded-2xl p-4 transition-all duration-300 ${
                  isActive
                    ? "bg-white/15 backdrop-blur-md border border-white/20 shadow-lg"
                    : "bg-transparent"
                }`}
              >
                {/* Indicator Circle & Line */}
                <div className="relative flex flex-col items-center">
                  {!isLast && (
                    <div
                      className={`absolute top-10 h-10 w-[2px] transition-colors duration-300 ${
                        step.id < currentStep ? "bg-white/70" : "bg-white/30"
                      }`}
                    />
                  )}

                  <div
                    className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-base transition-all duration-300 ${
                      isCompleted
                        ? "bg-[#5B3DF5] text-white shadow-md"
                        : isActive
                        ? "bg-[#5B3DF5] text-white shadow-lg ring-4 ring-white/20"
                        : "bg-white/25 text-purple-950/80 backdrop-blur-sm"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5 stroke-[3]" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                </div>

                {/* Step Labels */}
                <div className="flex flex-col">
                  <h4
                    className={`text-base font-bold leading-tight ${
                      isActive || isCompleted ? "text-white" : "text-white/80"
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p
                    className={`text-xs leading-snug mt-0.5 ${
                      isActive || isCompleted
                        ? "text-white/90"
                        : "text-white/60"
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reusable Bottom Promo Card Component */}
      {bottomContent ? (
        bottomContent
      ) : (
        <SofiaCartPromoCard {...promoCardProps} />
      )}
    </div>
  );
}