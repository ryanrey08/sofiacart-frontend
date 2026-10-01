"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { useMerchantList } from "@/lib/hooks/merchant-list";
import type { CategoryResource } from "@/types";

export function useCategories(page: number) { return useMerchantList<CategoryResource>("categories", page); }

export type CategoryValues = Pick<CategoryResource, "name" | "slug" | "description">;

export function useSaveCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: number; values: CategoryValues }) =>
      (id
        ? await api.patch<{ data: CategoryResource }>(`/api/v1/categories/${id}`, values)
        : await api.post<{ data: CategoryResource }>("/api/v1/categories", values)).data.data,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["merchant", "categories"] }),
        client.invalidateQueries({ queryKey: ["merchant", "products"] }),
      ]);
    },
  });
}

export function useDeleteCategory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => { await api.delete(`/api/v1/categories/${id}`); },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["merchant", "categories"] }),
        client.invalidateQueries({ queryKey: ["merchant", "products"] }),
      ]);
    },
  });
}
