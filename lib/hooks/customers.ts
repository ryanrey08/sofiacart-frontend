"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { customersApi } from "@/lib/api/customers";
import { merchantPage } from "@/lib/merchant-resource";
import { buildCustomerListParams, type CustomerListFilters, type CustomerPayload } from "@/lib/merchant-customers";
import type { CustomerResource, MerchantOrder } from "@/types/commerce";
import type { Paginated } from "@/types";

// Every customer key lives under ["merchant", "customers"], so one invalidation refreshes the list, the
// metrics, the open detail panel and the customer options used by /sales/orders/new.
export const CUSTOMERS_KEY = ["merchant", "customers"] as const;

export function useCustomerList(filters: CustomerListFilters) {
  const params = buildCustomerListParams(filters);
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, "list", params],
    queryFn: () => customersApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

// `/customers/summary` is optional: deployments without it fail here and the page falls back to the
// real list totals instead of inventing numbers.
export function useCustomerSummary() {
  return useQuery({ queryKey: [...CUSTOMERS_KEY, "summary"], queryFn: () => customersApi.summary(), staleTime: 0, retry: false });
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: [...CUSTOMERS_KEY, "detail", id],
    queryFn: () => customersApi.get(id as number),
    enabled: id !== null,
    staleTime: 0,
  });
}

/**
 * Real order history for one customer from `GET /api/v1/orders?customer_id=`. It is used when the
 * customer resource itself carries no `recent_orders`/`orders_count`, so nothing is ever fabricated.
 */
export function useCustomerOrders(id: number | null, perPage = 5, enabled = true) {
  return useQuery({
    queryKey: ["merchant", "orders", "by-customer", id, perPage],
    queryFn: async () =>
      merchantPage(
        (await api.get<Paginated<MerchantOrder>>("/api/v1/orders", { params: { customer_id: id, page: 1, per_page: perPage } })).data,
      ),
    enabled: id !== null && enabled,
    staleTime: 0,
  });
}

function useCustomerCacheSync() {
  const queryClient = useQueryClient();
  return async (customer?: CustomerResource) => {
    if (customer) queryClient.setQueryData([...CUSTOMERS_KEY, "detail", customer.id], customer);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY }),
      // Orders embed their customer, so order lists and detail views are refreshed too.
      queryClient.invalidateQueries({ queryKey: ["merchant", "orders"] }),
    ]);
  };
}

export function useCreateCustomer() {
  const sync = useCustomerCacheSync();
  return useMutation({
    mutationFn: (payload: CustomerPayload) => customersApi.create(payload),
    onSuccess: (customer) => sync(customer),
  });
}

export function useUpdateCustomer() {
  const sync = useCustomerCacheSync();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CustomerPayload }) => customersApi.update(id, payload),
    onSuccess: (customer) => sync(customer),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const sync = useCustomerCacheSync();
  return useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: [...CUSTOMERS_KEY, "detail", id] });
      await sync();
    },
  });
}
