"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import type { PaymentMethod } from "@/types/payments";
import type {
  TransactionDetailResponse,
  TransactionResource,
  TransactionSort,
  TransactionStatus,
  TransactionSummary,
  TransactionType,
} from "@/types/transactions";
import type { Paginated } from "@/types";

// Merchant transaction endpoints: sofiacart-backend routes/api.php `auth:sanctum` + `v1` group.
// The ledger is service-written and immutable; the merchant UI is read-only.
// Every call is scoped to the token's merchant, so no merchant_id is sent.
const TRANSACTIONS_KEY = ["merchant", "transactions"] as const;

export interface TransactionListParams {
  search?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  payment_method?: PaymentMethod;
  customer_id?: number;
  order_id?: number;
  payment_id?: number;
  refund_id?: number;
  date_from?: string;
  date_to?: string;
  sort?: TransactionSort;
  page?: number;
  per_page?: number;
}

export function useTransactions(params: TransactionListParams) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, "list", params],
    queryFn: async () => (await api.get<Paginated<TransactionResource>>("/api/v1/transactions", { params })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useTransactionSummary(params: { date_from?: string; date_to?: string } = {}) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, "summary", params],
    queryFn: async () => (await api.get<{ data: TransactionSummary }>("/api/v1/transactions/summary", { params })).data.data,
    staleTime: 0,
  });
}

export function useTransaction(id: number | null) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, "detail", id],
    queryFn: async () => (await api.get<TransactionDetailResponse>(`/api/v1/transactions/${id}`)).data,
    enabled: id !== null,
    staleTime: 0,
  });
}
