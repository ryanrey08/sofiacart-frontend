// Mirrors sofiacart-backend App\Http\Resources\RefundResource and the refund controller
// list/summary/detail/status responses. Merchant endpoints live under /api/v1, scoped to the
// token's merchant. See sofiacart-backend REFUND_API_STATUS.md.
import type { PaymentCustomerSummary, PaymentMethod, PaymentOrder, PaymentRefundStatus } from "./payments";
import type { TransactionResource } from "./transactions";

// The seven refund statuses (PaymentRefundStatus already enumerates them).
export type RefundStatus = PaymentRefundStatus;

export type RefundSort = "newest" | "oldest" | "amount_desc" | "amount_asc";

export interface RefundItem {
  id: number;
  order_item_id: number;
  product_name: string;
  sku: string | null;
  unit_price: string | number;
  quantity: number;
  amount: string | number;
}

export interface RefundPayment {
  id: number;
  reference: string;
  gateway: string | null;
  method: PaymentMethod | null;
  amount: string | number;
  currency: string;
  status: string;
}

export interface RefundReturnEvidence {
  index: number;
  name: string | null;
  mime: string | null;
}

export interface RefundReturnRequest {
  id: number;
  status: string;
  reason: string | null;
  notes: string | null;
  evidence: RefundReturnEvidence[];
}

export interface RefundStatusHistoryEntry {
  from_status: RefundStatus | null;
  to_status: RefundStatus;
  notes: string | null;
  user: { id: number; name: string } | null;
  created_at: string | null;
}

// List rows carry the core fields plus order + payment; details add items, return, ledger and history.
export interface RefundResource {
  id: number;
  merchant_id: number;
  payment_id: number | null;
  order_id: number | null;
  return_request_id: number | null;
  reference: string;
  payout_reference: string | null;
  amount: string | number;
  currency: string;
  reason: string | null;
  notes: string | null;
  failure_reason: string | null;
  status: RefundStatus;
  cancel_order: boolean;
  refunded_at: string | null;
  reviewed_at: string | null;
  requested_by?: { id: number; name: string } | null;
  reviewed_by?: { id: number; name: string } | null;
  items?: RefundItem[];
  payment?: RefundPayment | null;
  order?: (PaymentOrder & { customer?: PaymentCustomerSummary | null }) | null;
  return_request?: RefundReturnRequest | null;
  transactions?: TransactionResource[];
  history?: RefundStatusHistoryEntry[];
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

// GET /api/v1/refunds/{id} → { data: RefundResource }.
export interface RefundDetailResponse {
  data: RefundResource;
}

// GET /api/v1/refunds/summary.
export interface RefundSummary {
  date_from: string;
  date_to: string;
  total_refunds: number;
  by_status: Record<RefundStatus, number>;
  refunded_amount: string;
  previous_refunded_amount: string;
  refunded_change_percent: number | null;
  currency: string;
}

// PATCH /api/v1/refunds/{id}/status payload.
export interface RefundStatusChange {
  status: RefundStatus;
  payout_reference?: string;
  failure_reason?: string;
  refunded_at?: string;
  notes?: string;
  cancel_order?: boolean;
}
