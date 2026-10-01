import type { MerchantOrder, MerchantOrderStatus, ReturnRequestResource, ReturnStatus } from "../types/commerce";

export const orderTransitions: Record<MerchantOrderStatus, MerchantOrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
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

export function validateEvidence(files: File[]) {
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
  data.append("notes", values.notes ?? "");
  values.items.forEach((item, index) => {
    data.append(`items[${index}][order_item_id]`, String(item.order_item_id));
    data.append(`items[${index}][quantity]`, String(item.quantity));
  });
  values.evidence?.forEach((file) => data.append("evidence[]", file));
  return data;
}
