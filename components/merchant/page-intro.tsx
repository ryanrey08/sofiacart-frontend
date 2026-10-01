import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

export function SampleDataBadge({ className, label = "Sample preview" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800", className)}>
      <FlaskConical aria-hidden="true" className="h-3 w-3" />
      {label}
    </span>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  badge,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">{eyebrow}</p> : null}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-[28px]">{title}</h1>
          {badge}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
