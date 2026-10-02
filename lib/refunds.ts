import type { RefundStatus } from "@/types/refunds";

export const REFUND_STATUS_META: Record<RefundStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-800" },
  approved: { label: "Approved", className: "bg-blue-50 text-blue-700" },
  processing: { label: "Processing", className: "bg-indigo-50 text-indigo-700" },
  processed: { label: "Processed", className: "bg-green-50 text-green-700" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700" },
  rejected: { label: "Rejected", className: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
};

export const REFUND_STATUSES = Object.keys(REFUND_STATUS_META) as RefundStatus[];

// Mirrors sofiacart-backend App\Enums\RefundStatus::allowedTransitions(). Terminal statuses map to [].
export const REFUND_ALLOWED_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  pending: ["approved", "rejected", "cancelled", "processing", "processed"],
  approved: ["processing", "processed", "rejected", "cancelled"],
  processing: ["processed", "failed"],
  failed: ["processing", "processed", "cancelled"],
  rejected: [],
  processed: [],
  cancelled: [],
};

// Reason presets from the Canva design (free text is still accepted by the backend).
export const REFUND_REASONS = ["Defective Item", "Wrong Item", "Changed Mind", "Not as Described", "Damaged on Delivery"] as const;
