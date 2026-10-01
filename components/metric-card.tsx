import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const iconTones = [
  "bg-brand-50 text-brand-700",
  "bg-sunset-100 text-sunset-700",
  "bg-sky-50 text-sky-700",
  "bg-emerald-50 text-emerald-700",
];

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
  tone = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
  tone?: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconTones[tone % iconTones.length])}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-bold text-navy-900">{value}</p>
          <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-semibold", trendDirection === "up" ? "text-emerald-600" : "text-amber-600")}>
            {trendDirection === "up" ? <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /> : <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5" />}
            <span>{trend}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
