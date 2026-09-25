import { ArrowDownRight, ArrowUpRight, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  trendDirection,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down";
}) {
  return (
    <Card className="border-none bg-white/90">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          <div className={cn("mt-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold", trendDirection === "up" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
            {trendDirection === "up" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>{trend}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-brand-50 p-3 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
