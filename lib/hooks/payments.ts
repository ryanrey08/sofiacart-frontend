"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import type {
  MerchantPaymentStatus,
  OrderPaymentBalance,
  PaymentDetailResponse,
  PaymentMethod,
  PaymentResource,
  PaymentSort,
  PaymentSummary,
} from "@/types/payments";
import type { Paginated } from "@/types";

// Merchant payment endpoints: sofiacart-backend routes/api.php `auth:sanctum` + `v1` group.
// Every call is scoped to the token's merchant, so no merchant_id is sent.
const PAYMENTS_KEY = ["merchant", "payments"] as const;

export interface PaymentListParams {
  search?: string;
  status?: MerchantPaymentStatus;
  method?: PaymentMethod;
  order_id?: number;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
  sort?: PaymentSort;
  page?: number;
  per_page?: number;
}

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, "list", params],
    queryFn: async () => (await api.get<Paginated<PaymentResource>>("/api/v1/payments", { params })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function usePaymentSummary(params: { date_from?: string; date_to?: string } = {}) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, "summary", params],
    queryFn: async () => (await api.get<{ data: PaymentSummary }>("/api/v1/payments/summary", { params })).data.data,
    staleTime: 0,
  });
}

export function usePayment(id: number | null) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, "detail", id],
    queryFn: async () => (await api.get<PaymentDetailResponse>(`/api/v1/payments/${id}`)).data,
    enabled: id !== null,
    staleTime: 0,
  });
}

export function useOrderPaymentBalance(orderId: number | null) {
  return useQuery({
    queryKey: ["merchant", "orders", "payment-balance", orderId],
    queryFn: async () => (await api.get<{ data: OrderPaymentBalance }>(`/api/v1/orders/${orderId}/payment-balance`)).data.data,
    enabled: orderId !== null,
    staleTime: 0,
  });
}

function useInvalidatePayments() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    // Payments change the order ledger and transactions, so refresh those too.
    await queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] });
    await queryClient.invalidateQueries({ queryKey: ["merchant", "transactions"] });
  };
}

// PATCH /api/v1/payments/{id}/status — verify (completed), fail or cancel a pending payment.
export interface PaymentStatusChange {
  status: "completed" | "failed" | "cancelled";
  reason?: string;
  gateway_reference?: string;
  paid_at?: string;
  notes?: string;
}

export function useUpdatePaymentStatus(id: number) {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: async (payload: PaymentStatusChange) =>
      (await api.patch<PaymentDetailResponse>(`/api/v1/payments/${id}/status`, payload)).data.data,
    onSuccess: invalidate,
  });
}

// POST /api/v1/payments — record a payment (pending by default, or completed when received).
export interface RecordPaymentPayload {
  order_id?: number;
  method: PaymentMethod;
  amount: number;
  status?: "pending" | "completed";
  reference?: string;
  gateway_reference?: string;
  paid_at?: string;
  notes?: string;
}

export function useRecordPayment() {
  const invalidate = useInvalidatePayments();
  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload) =>
      (await api.post<PaymentDetailResponse>("/api/v1/payments", payload)).data.data,
    onSuccess: invalidate,
  });
}
