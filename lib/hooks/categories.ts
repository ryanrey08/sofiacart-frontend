"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi } from "@/lib/api/categories";
import { buildCategoryListParams, type CategoryListFilters, type CategoryPayload } from "@/lib/merchant-categories";
import type { CategoryBulkAction, CategoryResource } from "@/types";

// Every category key lives under ["merchant", "categories"] so one invalidation refreshes lists, stats,
// details and the product form's category options (useProductCategories).
export const CATEGORIES_KEY = ["merchant", "categories"] as const;

export { useProductCategories as useCategoryOptions } from "@/lib/hooks/products";

export function useCategoryList(filters: CategoryListFilters) {
  const params = buildCategoryListParams(filters);
  return useQuery({
    queryKey: [...CATEGORIES_KEY, "list", params],
    queryFn: () => categoriesApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
}

export function useCategoryStats() {
  return useQuery({ queryKey: [...CATEGORIES_KEY, "stats"], queryFn: () => categoriesApi.stats(), staleTime: 0 });
}

export function useCategory(id: number | null) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, "detail", id],
    queryFn: () => categoriesApi.get(id as number),
    enabled: id !== null,
    staleTime: 0,
  });
}

function useCategoryCacheSync() {
  const queryClient = useQueryClient();
  return async (category?: CategoryResource) => {
    if (category) queryClient.setQueryData([...CATEGORIES_KEY, "detail", category.id], category);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY }),
      // Product rows embed their category, so they are refreshed too.
      queryClient.invalidateQueries({ queryKey: ["merchant", "products"] }),
    ]);
  };
}

export function useCreateCategory() {
  const sync = useCategoryCacheSync();
  return useMutation({
    mutationFn: (payload: CategoryPayload) => categoriesApi.create(payload),
    onSuccess: (category) => sync(category),
  });
}

export function useUpdateCategory() {
  const sync = useCategoryCacheSync();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategoryPayload }) => categoriesApi.update(id, payload),
    onSuccess: (category) => sync(category),
  });
}

export function useUploadCategoryImage() {
  const sync = useCategoryCacheSync();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => categoriesApi.uploadImage(id, file),
    onSuccess: (category) => sync(category),
  });
}

export function useUpdateCategoryStatus() {
  const sync = useCategoryCacheSync();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => categoriesApi.setStatus(id, isActive),
    onSuccess: (category) => sync(category),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const sync = useCategoryCacheSync();
  return useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: async (_, id) => {
      queryClient.removeQueries({ queryKey: [...CATEGORIES_KEY, "detail", id] });
      await sync();
    },
  });
}

export function useBulkCategoryAction() {
  const sync = useCategoryCacheSync();
  return useMutation({
    mutationFn: ({ action, ids }: { action: CategoryBulkAction; ids: number[] }) => categoriesApi.bulk(action, ids),
    onSuccess: () => sync(),
  });
}
