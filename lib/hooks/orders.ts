"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { merchantPage } from "@/lib/merchant-resource";
import { buildOrderPayload } from "@/lib/merchant-commerce";
import type { MerchantOrder, MerchantOrderStatus, CustomerResource } from "@/types/commerce";
import type { Paginated, ProductResource } from "@/types";

export interface OrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: MerchantOrderStatus;
  payment_status?: MerchantOrder["payment_status"];
  customer_id?: number;
  date_from?: string;
  date_to?: string;
}

export function useOrders(params: OrderFilters) {
  return useQuery({
    queryKey: ["merchant", "orders", params],
    queryFn: async () => merchantPage((await api.get<Paginated<MerchantOrder>>("/api/v1/orders", { params })).data),
    placeholderData: keepPreviousData,
  });
}

export function useOrderSummary(params: Pick<OrderFilters, "search" | "date_from" | "date_to">) {
  return useQuery({
    queryKey: ["merchant", "orders", "summary", params],
    queryFn: async () => {
      const statuses: MerchantOrderStatus[] = ["pending", "processing", "out_for_delivery", "completed", "cancelled"];
      const entries = await Promise.all(statuses.map(async (status) => {
        const response = await api.get<Paginated<MerchantOrder>>("/api/v1/orders", {
          params: { ...params, status, page: 1, per_page: 1 },
        });
        return [status, merchantPage(response.data).meta.total] as const;
      }));
      const counts = Object.fromEntries(entries) as Record<MerchantOrderStatus, number>;
      return { ...counts, total: statuses.reduce((sum, status) => sum + counts[status], 0) };
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["merchant", "orders", "detail", id],
    queryFn: async () => (await api.get<{ data: MerchantOrder }>(`/api/v1/orders/${id}`)).data.data,
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useOrderCustomers() {
  return useQuery({
    queryKey: ["merchant", "customers", "order-options"],
    queryFn: async () => {
      const customers: CustomerResource[] = [];
      for (let page = 1; ; page++) {
        const result = merchantPage((await api.get<Paginated<CustomerResource>>("/api/v1/customers", { params: { page, per_page: 100 } })).data);
        customers.push(...result.data);
        if (page >= result.meta.last_page) return customers;
      }
    },
  });
}

export function useOrderProducts() {
  return useQuery({
    queryKey: ["merchant", "products", "order-options"],
    queryFn: async () => {
      const products: ProductResource[] = [];
      for (let page = 1; ; page++) {
        const result = merchantPage((await api.get<Paginated<ProductResource>>("/api/v1/products", { params: { page, per_page: 100, status: "active" } })).data);
        products.push(...result.data);
        if (page >= result.meta.last_page) return products;
      }
    },
  });
}

function useCommerceInvalidation() {
  const client = useQueryClient();
  return async () => {
    for (const resource of ["orders", "return-requests", "products", "inventory", "inventory/logs", "refunds", "payments"]) {
      await client.invalidateQueries({ queryKey: ["merchant", resource] });
    }
  };
}
export { useCommerceInvalidation };

export function useCreateOrder() {
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: async (values: Parameters<typeof buildOrderPayload>) =>
      (await api.post<{ data: MerchantOrder }>("/api/v1/orders", buildOrderPayload(...values))).data.data,
    onSuccess: invalidate,
  });
}

export function useChangeOrderStatus(id: number) {
  const invalidate = useCommerceInvalidation();
  return useMutation({
    mutationFn: async (status: MerchantOrderStatus) =>
      (await api.patch<{ data: MerchantOrder }>(`/api/v1/orders/${id}/status`, { status })).data.data,
    onSuccess: invalidate,
  });
}
