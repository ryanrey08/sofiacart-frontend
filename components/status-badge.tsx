import { Badge } from "@/components/ui/badge";
import type { StatusTone } from "@/types";

const variantMap: Record<StatusTone, "success" | "warning" | "destructive" | "info" | "muted" | "default"> = {
  completed: "success",
  paid: "success",
  processing: "warning",
  pending: "warning",
  failed: "destructive",
  cancelled: "destructive",
  rejected: "destructive",
  shipped: "info",
  active: "success",
  inactive: "muted",
  draft: "default",
  low: "warning",
  "in-stock": "success",
};

export function StatusBadge({ status }: { status: StatusTone }) {
  return <Badge variant={variantMap[status]} className="capitalize">{status.replace("-", " ")}</Badge>;
}
