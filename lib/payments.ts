import type { MerchantPaymentStatus, PaymentMethod } from "@/types/payments";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Credit / Debit Card",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank Transfer",
  cod: "Cash on Delivery",
  cash: "Cash",
  paypal: "PayPal",
  other: "Other",
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

// Methods a merchant can select when recording a payment received outside a gateway.
export const RECORDABLE_PAYMENT_METHODS: PaymentMethod[] = ["card", "gcash", "maya", "bank_transfer", "cod", "cash", "paypal", "other"];

export function paymentMethodLabel(method: PaymentMethod | null | undefined): string {
  return method ? PAYMENT_METHOD_LABELS[method] : "—";
}

export const PAYMENT_STATUS_META: Record<MerchantPaymentStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-800" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
  expired: { label: "Expired", className: "bg-slate-100 text-slate-600" },
  partially_refunded: { label: "Partially Refunded", className: "bg-orange-50 text-orange-700" },
  refunded: { label: "Refunded", className: "bg-blue-50 text-blue-700" },
};

export const PAYMENT_STATUSES = Object.keys(PAYMENT_STATUS_META) as MerchantPaymentStatus[];
