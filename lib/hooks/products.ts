"use client";

import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { buildInventoryAdjustPayload, buildProductFormData } from "@/lib/merchant-products";
import { merchantPage } from "@/lib/merchant-resource";
import type { ValidatedInventoryAdjust, ValidatedProductForm } from "@/lib/validation/product";
import type {
  CategoryResource,
  InventoryAdjustResponse,
  InventoryLogResource,
  Paginated,
  ProductResource,
  ProductStatus,
  ProductStockStatus,
} from "@/types";

// Merchant catalog endpoints: sofiacart-backend routes/api.php `auth:sanctum` + `v1` group.
// The backend scopes every call to the token's merchant, so no merchant_id is sent.
const PRODUCTS_KEY = ["merchant", "products"] as const;

export interface ProductListParams {
  search?: string;
  status?: ProductStatus;
  category_id?: number;
  stock_status?: ProductStockStatus;
  page?: number;
  per_page?: number;
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, "list", params],
    queryFn: async () => (await api.get<Paginated<ProductResource>>("/api/v1/products", { params })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

const METRIC_FILTERS = [
  { key: "total", params: {} },
  { key: "active", params: { status: "active" } },
  { key: "low_stock", params: { stock_status: "low_stock" } },
  { key: "out_of_stock", params: { stock_status: "out_of_stock" } },
] as const satisfies ReadonlyArray<{ key: string; params: ProductListParams }>;

export interface ProductMetrics {
  total: number | null;
  active: number | null;
  low_stock: number | null;
  out_of_stock: number | null;
  isPending: boolean;
  isError: boolean;
}

// Summary metrics reuse the list endpoint's own filters so the counts always match the API.
export function useProductMetrics(): ProductMetrics {
  const results = useQueries({
    queries: METRIC_FILTERS.map(({ key, params }) => ({
      queryKey: [...PRODUCTS_KEY, "metrics", key],
      queryFn: async () =>
        (await api.get<Paginated<ProductResource>>("/api/v1/products", { params: { ...params, per_page: 1 } })).data.meta.total,
      staleTime: 0,
    })),
  });

  // Counts are keyed by METRIC_FILTERS entry so the order of the queries cannot mislabel them.
  const counts = Object.fromEntries(METRIC_FILTERS.map((filter, index) => [filter.key, results[index].data ?? null])) as Record<
    (typeof METRIC_FILTERS)[number]["key"],
    number | null
  >;

  return {
    ...counts,
    isPending: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
  };
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, "detail", id],
    queryFn: async () => (await api.get<{ data: ProductResource }>(`/api/v1/products/${id}`)).data.data,
    enabled: id !== null,
    staleTime: 0,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ["merchant", "categories", "options"],
    queryFn: async () => {
      const first = merchantPage((await api.get<Paginated<CategoryResource>>("/api/v1/categories", { params: { per_page: 100 } })).data);
      const data = [...first.data];
      for (let page = 2; page <= first.meta.last_page; page++) {
        const next = merchantPage((await api.get<Paginated<CategoryResource>>("/api/v1/categories", { params: { per_page: 100, page } })).data);
        data.push(...next.data);
      }
      return { ...first, data };
    },
    staleTime: 0,
  });
}

export function useProductInventoryLogs(productId: number | null) {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, "inventory-logs", productId],
    queryFn: async () =>
      (await api.get<Paginated<InventoryLogResource>>("/api/v1/inventory/logs", { params: { product_id: productId, per_page: 10 } })).data,
    enabled: productId !== null,
    staleTime: 0,
  });
}

function useProductCacheSync() {
  const queryClient = useQueryClient();
  return async (product?: ProductResource) => {
    if (product) queryClient.setQueryData([...PRODUCTS_KEY, "detail", product.id], product);
    await queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
  };
}

export function useCreateProduct() {
  const sync = useProductCacheSync();
  return useMutation({
    mutationFn: async (values: ValidatedProductForm) =>
      (await api.post<{ data: ProductResource }>("/api/v1/products", buildProductFormData(values))).data.data,
    onSuccess: (product) => sync(product),
  });
}

export function useUpdateProduct(id: number) {
  const sync = useProductCacheSync();
  return useMutation({
    mutationFn: async (values: ValidatedProductForm) =>
      (await api.post<{ data: ProductResource }>(`/api/v1/products/${id}`, buildProductFormData(values, { update: true }))).data.data,
    onSuccess: (product) => sync(product),
  });
}

export function useUpdateProductStatus() {
  const sync = useProductCacheSync();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ProductStatus }) =>
      (await api.patch<{ data: ProductResource }>(`/api/v1/products/${id}`, { status })).data.data,
    onSuccess: (product) => sync(product),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/v1/products/${id}`);
      return id;
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: [...PRODUCTS_KEY, "detail", id] });
      await queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY });
    },
  });
}

export function useAdjustInventory(productId: number) {
  const sync = useProductCacheSync();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (values: ValidatedInventoryAdjust) =>
      (await api.post<InventoryAdjustResponse>("/api/v1/inventory/adjust", buildInventoryAdjustPayload(productId, values))).data,
    onSuccess: async (response) => {
      await sync(response.product);
      await client.invalidateQueries({ queryKey: ["merchant", "inventory/logs"] });
    },
  });
}
