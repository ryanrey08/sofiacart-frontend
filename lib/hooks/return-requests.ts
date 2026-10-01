"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { buildReturnFormData } from "@/lib/merchant-commerce";
import { merchantPage } from "@/lib/merchant-resource";
import { useCommerceInvalidation } from "@/lib/hooks/orders";
import type { Paginated } from "@/types";
import type { AdminRefund } from "@/types/admin";
import type { ReturnRequestResource, ReturnStatus } from "@/types/commerce";

export function useReturnRequests(params: { page?: number; per_page?: number; order_id?: number; status?: ReturnStatus }) {
  return useQuery({
    queryKey: ["merchant", "return-requests", params],
    queryFn: async () => merchantPage((await api.get<Paginated<ReturnRequestResource>>("/api/v1/return-requests", { params })).data),
    placeholderData: keepPreviousData,
  });
}
export function useReturnRequest(id: number) {
  return useQuery({
    queryKey: ["merchant", "return-requests", "detail", id],
    queryFn: async () => (await api.get<{ data: ReturnRequestResource }>(`/api/v1/return-requests/${id}`)).data.data,
    enabled: Number.isInteger(id) && id > 0,
  });
}
export function useOrderReturns(orderId: number) {
  return useQuery({
    queryKey: ["merchant", "return-requests", "order", orderId],
    enabled: Number.isInteger(orderId) && orderId > 0,
    queryFn: async () => {
      const requests: ReturnRequestResource[] = [];
      for (let page = 1; ; page++) {
        const result = merchantPage((await api.get<Paginated<ReturnRequestResource>>("/api/v1/return-requests", {
          params: { order_id: orderId, page, per_page: 100 },
        })).data);
        requests.push(...result.data);
        if (page >= result.meta.last_page) return requests;
      }
    },
  });
}
export function useProcessedOrderRefunds(orderId: number) {
  return useQuery({
    queryKey: ["merchant", "refunds", "processed", orderId],
    enabled: Number.isInteger(orderId) && orderId > 0,
    queryFn: async () => {
      const refunds: AdminRefund[] = [];
      for (let page = 1; ; page++) {
        const result = merchantPage((await api.get<Paginated<AdminRefund>>("/api/v1/refunds", {
          params: { order_id: orderId, status: "processed", page, per_page: 100 },
        })).data);
        refunds.push(...result.data);
        if (page >= result.meta.last_page) return refunds;
      }
    },
  });
}
export function useCreateReturn() {
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: async (values: Parameters<typeof buildReturnFormData>[0]) =>
      (await api.post<{ data: ReturnRequestResource }>("/api/v1/return-requests", buildReturnFormData(values))).data.data,
    onSuccess: invalidate,
  });
}
export function useChangeReturnStatus(id: number) {
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: async (values: { status: ReturnStatus; refund_id?: number }) =>
      (await api.patch<{ data: ReturnRequestResource }>(`/api/v1/return-requests/${id}`, values)).data.data,
    onSuccess: invalidate,
  });
}
