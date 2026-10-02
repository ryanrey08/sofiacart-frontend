// Mirrors sofiacart-backend App\Http\Resources\PaymentResource and the payment/refund/transaction
// enums. Merchant endpoints live under /api/v1 and are scoped to the token's merchant.
import type { OrderItemResource } from "./commerce";

export type MerchantPaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired"
  | "partially_refunded"
  | "refunded";

export type PaymentMethod = "card" | "gcash" | "maya" | "bank_transfer" | "cod" | "cash" | "paypal" | "other";

export type PaymentTransactionStatus = "pending" | "completed" | "failed";
export type PaymentRefundStatus = "pending" | "approved" | "rejected" | "processing" | "processed" | "failed" | "cancelled";

export interface PaymentCustomerSummary {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

// The order shape embedded in payment responses (OrderResource with customer + items when loaded).
export interface PaymentOrder {
  id: number;
  order_number: string;
  status: string | null;
  payment_status: string | null;
  total_amount: string | number;
  subtotal: string | number;
  discount_amount: string | number;
  shipping_amount: string | number;
  ordered_at: string | null;
  customer?: PaymentCustomerSummary | null;
  items?: OrderItemResource[];
}

export interface PaymentAttachment {
  index: number;
  name: string | null;
  mime: string | null;
  size: number | null;
}

// A row from GET /api/v1/payments (index loads order.customer).
export interface PaymentResource {
  id: number;
  merchant_id: number;
  order_id: number | null;
  reference: string;
  gateway_reference: string | null;
  gateway: string | null;
  method: PaymentMethod | null;
  status: MerchantPaymentStatus;
  amount: string | number;
  currency: string;
  paid_at: string | null;
  expires_at: string | null;
  failure_reason: string | null;
  notes: string | null;
  attachments: PaymentAttachment[];
  order?: PaymentOrder | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PaymentTransactionSummary {
  id: number;
  reference: string;
  type: string | null;
  status: PaymentTransactionStatus;
  amount: string | number;
  transacted_at: string | null;
}

export interface PaymentRefundSummary {
  id: number;
  reference: string;
  status: PaymentRefundStatus;
  amount: string | number;
  reason: string | null;
  refunded_at: string | null;
}

export interface PaymentOrderBalance {
  total_amount: string;
  amount_paid: string;
  amount_refunded: string;
  net_paid: string;
  pending_amount: string;
  outstanding_balance: string;
}

// GET /api/v1/payments/{id} — detail loads order.customer, order.items, transactions, refunds, verifier.
export interface PaymentDetail extends PaymentResource {
  verified_by?: { id: number; name: string } | null;
  transactions?: PaymentTransactionSummary[];
  refunds?: PaymentRefundSummary[];
}

export interface PaymentDetailResponse {
  data: PaymentDetail;
  meta: { order_balance: PaymentOrderBalance | null };
}

// GET /api/v1/payments/summary.
export interface PaymentSummary {
  date_from: string;
  date_to: string;
  total_payments: number;
  completed_payments: number;
  by_status: Record<MerchantPaymentStatus, number>;
  collected_amount: string;
  previous_collected_amount: string;
  collected_change_percent: number | null;
  refunded_amount: string;
  currency: string;
}

// GET /api/v1/orders/{order}/payment-balance.
export interface OrderPaymentBalance extends PaymentOrderBalance {
  order_id: number;
  order_number: string;
  order_status: string | null;
  payment_status: string | null;
  currency: string;
  payments: PaymentResource[];
}

export type PaymentSort = "newest" | "oldest" | "amount_desc" | "amount_asc" | "paid_at_desc" | "paid_at_asc";
