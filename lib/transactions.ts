import type { TransactionStatus, TransactionType } from "@/types/transactions";

// Ledger movement types written by the backend PaymentService / RefundService.
// credit/debit are legacy-only but kept readable. See sofiacart-backend TRANSACTION_API_STATUS.md.
export const TRANSACTION_TYPE_META: Record<TransactionType, { label: string; className: string; direction: "in" | "out" }> = {
  payment: { label: "Payment", className: "bg-green-50 text-green-700", direction: "in" },
  refund: { label: "Refund", className: "bg-orange-50 text-orange-700", direction: "out" },
  credit: { label: "Credit", className: "bg-blue-50 text-blue-700", direction: "in" },
  debit: { label: "Debit", className: "bg-slate-100 text-slate-600", direction: "out" },
};

export const TRANSACTION_TYPES = Object.keys(TRANSACTION_TYPE_META) as TransactionType[];

export function transactionTypeMeta(type: TransactionType | null | undefined) {
  return (type && TRANSACTION_TYPE_META[type]) || { label: "—", className: "bg-slate-100 text-slate-600", direction: "in" as const };
}

export const TRANSACTION_STATUS_META: Record<TransactionStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-800" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700" },
};

export const TRANSACTION_STATUSES = Object.keys(TRANSACTION_STATUS_META) as TransactionStatus[];

// true when the money leaves the merchant (shown with a minus sign and red tint in the ledger).
export function isOutflow(type: TransactionType | null | undefined): boolean {
  return type === "refund" || type === "debit";
}
