"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import type { PaymentMethod } from "@/types/payments";
import type {
  RefundDetailResponse,
  RefundResource,
  RefundSort,
  RefundStatus,
  RefundStatusChange,
  RefundSummary,
} from "@/types/refunds";
import type { Paginated } from "@/types";

// Merchant refund endpoints: sofiacart-backend routes/api.php `auth:sanctum` + `v1` group.
// Every call is scoped to the token's merchant, so no merchant_id is sent.
const REFUNDS_KEY = ["merchant", "refunds"] as const;

export interface RefundListParams {
  search?: string;
  status?: RefundStatus;
  reason?: string;
  customer_id?: number;
  order_id?: number;
  payment_id?: number;
  return_request_id?: number;
  payment_method?: PaymentMethod;
  date_from?: string;
  date_to?: string;
  sort?: RefundSort;
  page?: number;
  per_page?: number;
}

export function useRefunds(params: RefundListParams) {
  return useQuery({
    queryKey: [...REFUNDS_KEY, "list", params],
    queryFn: async () => (await api.get<Paginated<RefundResource>>("/api/v1/refunds", { params })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useRefundSummary(params: { date_from?: string; date_to?: string } = {}) {
  return useQuery({
    queryKey: [...REFUNDS_KEY, "summary", params],
    queryFn: async () => (await api.get<{ data: RefundSummary }>("/api/v1/refunds/summary", { params })).data.data,
    staleTime: 0,
  });
}

export function useRefund(id: number | null) {
  return useQuery({
    queryKey: [...REFUNDS_KEY, "detail", id],
    queryFn: async () => (await api.get<RefundDetailResponse>(`/api/v1/refunds/${id}`)).data.data,
    enabled: id !== null,
    staleTime: 0,
  });
}

// PATCH /api/v1/refunds/{id}/status — approve, reject, process, complete, fail or cancel.
// A completed refund cascades to the payment, order, transaction ledger and (for returns) inventory,
// so refresh those caches too.
export function useUpdateRefundStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RefundStatusChange) =>
      (await api.patch<RefundDetailResponse>(`/api/v1/refunds/${id}/status`, payload)).data.data,
    onSuccess: async () => {
      for (const resource of ["refunds", "payments", "transactions", "orders", "return-requests", "inventory"]) {
        await queryClient.invalidateQueries({ queryKey: ["merchant", resource] });
      }
    },
  });
}
