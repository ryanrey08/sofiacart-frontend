import type { MerchantOrder, MerchantOrderStatus, OrderItemResource, ReturnRequestResource, ReturnStatus } from "../types/commerce";

/** Presets offered by the return wizard. "Other" switches the form to a free-text reason. */
export const returnReasons = [
  "Defective / Not Working",
  "Wrong Item",
  "Wrong Size",
  "Changed Mind",
  "Too Small",
  "Other",
] as const;

// Mirrors OrdersController::ensureValidStatusTransition in sofiacart-backend.
export const orderTransitions: Record<MerchantOrderStatus, MerchantOrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["completed"],
  completed: [],
  cancelled: [],
};
export const returnTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["processed"],
  rejected: [],
  processed: [],
};

export function allowedOrderTransitions(order: MerchantOrder) {
  return orderTransitions[order.status].filter((status) =>
    status === "completed" ? order.payment_status === "paid" :
      status === "cancelled" ? order.payment_status === "unpaid" : true,
  );
}

export function returnStateEligible(order: MerchantOrder) {
  return order.status === "completed" && ["paid", "partially_refunded"].includes(order.payment_status) &&
    !!order.ordered_at && !!order.customer_id;
}

export function returnEligible(order: MerchantOrder, windowDays = 30, now = new Date()) {
  if (!returnStateEligible(order) || !order.ordered_at) return false;
  const age = now.getTime() - new Date(order.ordered_at).getTime();
  return Number.isFinite(age) && age >= 0 && age <= Math.max(0, windowDays) * 86400000;
}

export function remainingReturnQuantity(orderItemId: number, ordered: number, requests: ReturnRequestResource[]) {
  return Math.max(0, ordered - requests.filter((request) => request.status !== "rejected")
    .flatMap((request) => request.items).filter((item) => item.order_item_id === orderItemId)
    .reduce((sum, item) => sum + item.quantity, 0));
}

/** Keeps a typed return quantity a whole number inside `[0, max]`. */
export function clampReturnQuantity(value: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(0, Math.floor(value)), Math.max(0, Math.floor(max)));
}

/**
 * Client-side preview only: the backend recalculates the authoritative return amount from the stored
 * order item totals, so this is derived from the line total to stay consistent with order discounts.
 */
export function estimatedReturnAmount(item: Pick<OrderItemResource, "quantity" | "total_price">, quantity: number) {
  const total = Number(item.total_price);
  if (!Number.isFinite(total) || item.quantity <= 0) return 0;
  return Math.round((total / item.quantity) * quantity * 100) / 100;
}

export type TimelineState = "done" | "current" | "upcoming" | "cancelled";

/**
 * The order resource only timestamps `ordered_at`, so later milestones are derived from the current
 * status/payment status and intentionally render without an invented timestamp.
 */
export function orderTimeline(order: MerchantOrder): Array<{ key: string; label: string; state: TimelineState; at: string | null }> {
  if (order.status === "cancelled") {
    return [
      { key: "placed", label: "Order placed", state: "done", at: order.ordered_at },
      { key: "cancelled", label: "Order cancelled", state: "cancelled", at: null },
    ];
  }
  const paid = ["paid", "partially_refunded", "refunded"].includes(order.payment_status);
  const processing = ["processing", "out_for_delivery", "completed"].includes(order.status);
  const outForDelivery = order.status === "out_for_delivery" || order.status === "completed";
  const completed = order.status === "completed";
  const steps: Array<{ key: string; label: string; done: boolean; at: string | null }> = [
    { key: "placed", label: "Order placed", done: true, at: order.ordered_at },
    { key: "paid", label: "Payment confirmed", done: paid, at: null },
    { key: "processing", label: "Order processing", done: processing, at: null },
    { key: "out_for_delivery", label: "Out for delivery", done: outForDelivery, at: null },
    { key: "completed", label: "Completed", done: completed, at: null },
  ];
  const current = steps.findIndex((step) => !step.done);
  return steps.map((step, index) => ({
    key: step.key, label: step.label, at: step.at,
    state: step.done ? "done" : index === current ? "current" : "upcoming",
  }));
}

export function validateEvidence(files: File[], required = false) {
  if (required && !files.length) return "Upload at least one evidence photo.";
  if (files.length > 5) return "Select no more than five evidence files.";
  if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) return "Evidence must be JPG, PNG or WebP.";
  if (files.some((file) => file.size > 5120 * 1024)) return "Each evidence file must be at most 5 MB.";
  return null;
}

export function buildOrderPayload(customerId: number, items: Array<{ product_id: number; product_variant_id?: number; quantity: number }>, notes?: string) {
  return { customer_id: customerId, items: items.map(({ product_id, product_variant_id, quantity }) => ({
    product_id, ...(product_variant_id ? { product_variant_id } : {}), quantity,
  })), ...(notes ? { notes } : {}) };
}

export function buildReturnFormData(values: {
  order_id: number; customer_id: number; reason: string; notes?: string;
  items: Array<{ order_item_id: number; quantity: number }>; evidence?: File[];
}) {
  const data = new FormData();
  data.append("order_id", String(values.order_id));
  data.append("customer_id", String(values.customer_id));
  data.append("reason", values.reason);
  data.append("notes", values.notes?.trim() || values.reason.trim());
  values.items.forEach((item, index) => {
    data.append(`items[${index}][order_item_id]`, String(item.order_item_id));
    data.append(`items[${index}][quantity]`, String(item.quantity));
  });
  values.evidence?.forEach((file) => data.append("evidence[]", file));
  return data;
}
