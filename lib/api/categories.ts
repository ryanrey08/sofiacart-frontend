import api from "@/lib/api/axios";
import { buildCategoryImageFormData, normalizeCategoryStats, type CategoryListParams, type CategoryPayload } from "@/lib/merchant-categories";
import { merchantPage } from "@/lib/merchant-resource";
import type { CategoryBulkAction, CategoryResource, CategoryStats, Paginated } from "@/types";

// Typed client for the merchant category endpoints (sofiacart-backend routes/api.php, `auth:sanctum` + `v1`).
// The backend scopes every call to the token's merchant, so `merchant_id` is never sent.
const BASE = "/api/v1/categories";

export const categoriesApi = {
  async list(params: CategoryListParams): Promise<Paginated<CategoryResource>> {
    return merchantPage((await api.get<Paginated<CategoryResource>>(BASE, { params })).data);
  },

  async stats(): Promise<CategoryStats> {
    return normalizeCategoryStats((await api.get(`${BASE}/stats`)).data);
  },

  async get(id: number): Promise<CategoryResource> {
    return (await api.get<{ data: CategoryResource }>(`${BASE}/${id}`)).data.data;
  },

  async create(payload: CategoryPayload): Promise<CategoryResource> {
    return (await api.post<{ data: CategoryResource }>(BASE, payload)).data.data;
  },

  async update(id: number, payload: CategoryPayload): Promise<CategoryResource> {
    return (await api.put<{ data: CategoryResource }>(`${BASE}/${id}`, payload)).data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },

  async uploadImage(id: number, file: File): Promise<CategoryResource> {
    return (await api.post<{ data: CategoryResource }>(`${BASE}/${id}/image`, buildCategoryImageFormData(file))).data.data;
  },

  async setStatus(id: number, isActive: boolean): Promise<CategoryResource> {
    return (await api.patch<{ data: CategoryResource }>(`${BASE}/${id}/status`, { is_active: isActive })).data.data;
  },

  async bulk(action: CategoryBulkAction, ids: number[]): Promise<void> {
    await api.post(`${BASE}/bulk`, { action, ids });
  },
};
