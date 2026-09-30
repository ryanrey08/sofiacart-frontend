"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { buildInventoryAdjustPayload, buildProductFormData } from "@/lib/merchant-products";
import type { ValidatedInventoryAdjust, ValidatedProductForm } from "@/lib/validation/product";
import type { CategoryResource, InventoryAdjustResponse, InventoryLogResource, Paginated, ProductResource, ProductStatus } from "@/types";

// Merchant catalog endpoints: sofiacart-backend routes/api.php `auth:sanctum` + `v1` group.
// The backend scopes every call to the token's merchant, so no merchant_id is sent.
const PRODUCTS_KEY = ["merchant", "products"] as const;

export interface ProductListParams {
  search?: string;
  status?: ProductStatus;
  category_id?: number;
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
    queryFn: async () =>
      (await api.get<Paginated<CategoryResource>>("/api/v1/categories", { params: { per_page: 100 } })).data,
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
  return useMutation({
    mutationFn: async (values: ValidatedInventoryAdjust) =>
      (await api.post<InventoryAdjustResponse>("/api/v1/inventory/adjust", buildInventoryAdjustPayload(productId, values))).data,
    onSuccess: (response) => sync(response.product),
  });
}
