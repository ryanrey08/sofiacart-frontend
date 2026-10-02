// Mirrors sofiacart-backend App\Http\Resources\TransactionResource and the transaction
// controller summary/detail. Merchant endpoints live under /api/v1, scoped to the token's merchant.
import type { MerchantPaymentStatus, PaymentMethod, PaymentRefundStatus } from "./payments";

export type TransactionType = "credit" | "debit" | "payment" | "refund";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface TransactionCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface TransactionPayment {
  id: number;
  reference: string;
  gateway: string | null;
  gateway_reference: string | null;
  method: PaymentMethod | null;
  status: MerchantPaymentStatus;
  amount: string | number;
  paid_at: string | null;
}

export interface TransactionRefund {
  id: number;
  reference: string;
  status: PaymentRefundStatus;
  reason: string | null;
  amount: string | number;
  refunded_at: string | null;
}

export interface TransactionOrder {
  id: number;
  order_number: string;
  status: string | null;
  payment_status: string | null;
  total_amount: string | number;
  ordered_at: string | null;
}

export interface TransactionResource {
  id: number;
  merchant_id: number;
  payment_id: number | null;
  refund_id: number | null;
  order_id: number | null;
  reference: string;
  type: TransactionType | null;
  status: TransactionStatus;
  amount: string | number;
  currency: string;
  payment_method?: PaymentMethod | null;
  description: string | null;
  transacted_at: string | null;
  payment?: TransactionPayment | null;
  refund?: TransactionRefund | null;
  order?: TransactionOrder | null;
  customer?: TransactionCustomer | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TransactionTimelineEvent {
  event: string;
  title: string;
  description: string;
  occurred_at: string | null;
  transaction_id: number | null;
}

// GET /api/v1/transactions/{id} → { data, meta: { history, timeline } }.
export interface TransactionDetailResponse {
  data: TransactionResource;
  meta: {
    history: TransactionResource[];
    timeline: TransactionTimelineEvent[];
  };
}

// GET /api/v1/transactions/summary.
export interface TransactionSummary {
  date_from: string;
  date_to: string;
  total_transactions: number;
  previous_total_transactions: number;
  total_change_percent: number | null;
  sales_orders: number;
  by_type: Record<TransactionType, number>;
  by_status: Record<TransactionStatus, number>;
  collected_amount: string;
  refunded_amount: string;
  net_amount: string;
  currency: string;
}

export type TransactionSort = "newest" | "oldest" | "amount_desc" | "amount_asc";
