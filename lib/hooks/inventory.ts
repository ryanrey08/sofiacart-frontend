"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import type { ValidatedStockUpdate } from "@/lib/validation/inventory";
import type {
  InventoryAdjustResponse,
  InventoryItemResource,
  InventoryLogResource,
  InventoryProductDetails,
  InventorySummary,
  Paginated,
  ProductStockStatus,
} from "@/types";

// Merchant inventory endpoints: sofiacart-backend routes/api.php `auth:sanctum` + `v1` group.
// Every call is scoped to the token's merchant, so no merchant_id is sent.
const INVENTORY_KEY = ["merchant", "inventory"] as const;

export type InventoryItemSort =
  | "name_asc"
  | "name_desc"
  | "sku_asc"
  | "sku_desc"
  | "stock_asc"
  | "stock_desc"
  | "available_asc"
  | "available_desc"
  | "reserved_asc"
  | "reserved_desc"
  | "updated_asc"
  | "updated_desc";

export interface InventoryItemsParams {
  search?: string;
  category_id?: number;
  product_id?: number;
  stock_status?: ProductStockStatus;
  type?: "product" | "variant";
  sort?: InventoryItemSort;
  page?: number;
  per_page?: number;
}

export function useInventoryItems(params: InventoryItemsParams) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, "items", params],
    queryFn: async () => (await api.get<Paginated<InventoryItemResource>>("/api/v1/inventory", { params })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useInventorySummary() {
  return useQuery({
    queryKey: [...INVENTORY_KEY, "summary"],
    queryFn: async () => (await api.get<{ data: InventorySummary }>("/api/v1/inventory/summary")).data.data,
    staleTime: 0,
  });
}

export interface InventoryLogsParams {
  search?: string;
  product_id?: number;
  product_variant_id?: number;
  type?: string;
  reference_type?: string;
  reason?: string;
  date_from?: string;
  date_to?: string;
  sort?: "newest" | "oldest";
  page?: number;
  per_page?: number;
}

export function useInventoryLogs(params: InventoryLogsParams = {}) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, "logs", params],
    queryFn: async () => (await api.get<Paginated<InventoryLogResource>>("/api/v1/inventory/logs", { params })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useInventoryProduct(productId: number | null) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, "product", productId],
    queryFn: async () => (await api.get<{ data: InventoryProductDetails }>(`/api/v1/inventory/products/${productId}`)).data.data,
    enabled: productId !== null,
    staleTime: 0,
  });
}

// POST /api/v1/inventory/adjust with the Update Stock payload (adjustment_type + quantity).
export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, values }: { productId: number; values: ValidatedStockUpdate }) => {
      const payload = {
        product_id: productId,
        ...(values.productVariantId ? { product_variant_id: Number(values.productVariantId) } : {}),
        adjustment_type: values.adjustmentType,
        quantity: Number(values.quantity),
        ...(values.reason ? { reason: values.reason } : {}),
        ...(values.referenceType ? { reference_type: values.referenceType } : {}),
        ...(values.referenceNumber ? { reference_number: values.referenceNumber } : {}),
        ...(values.supplier ? { supplier: values.supplier } : {}),
        ...(values.referenceDate ? { reference_date: values.referenceDate } : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      };
      return (await api.post<InventoryAdjustResponse>("/api/v1/inventory/adjust", payload)).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
      await queryClient.invalidateQueries({ queryKey: ["merchant", "products"] });
    },
  });
}
