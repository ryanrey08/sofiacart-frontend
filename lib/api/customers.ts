import api from "@/lib/api/axios";
import { normalizeCustomerSummary, type CustomerListParams, type CustomerPayload } from "@/lib/merchant-customers";
import { merchantPage } from "@/lib/merchant-resource";
import type { CustomerResource, CustomerSummary } from "@/types/commerce";
import type { Paginated } from "@/types";

// Typed client for the merchant customer endpoints (sofiacart-backend `auth:sanctum` + `v1`).
// The backend scopes every call to the token's merchant, so `merchant_id` is never sent.
const BASE = "/api/v1/customers";

export const customersApi = {
  async list(params: CustomerListParams): Promise<Paginated<CustomerResource>> {
    return merchantPage((await api.get<Paginated<CustomerResource>>(BASE, { params })).data);
  },

  // Optional endpoint: older deployments answer 404 and the metrics fall back to real list totals.
  async summary(): Promise<CustomerSummary> {
    return normalizeCustomerSummary((await api.get(`${BASE}/summary`)).data);
  },

  async get(id: number): Promise<CustomerResource> {
    return (await api.get<{ data: CustomerResource }>(`${BASE}/${id}`)).data.data;
  },

  async create(payload: CustomerPayload): Promise<CustomerResource> {
    return (await api.post<{ data: CustomerResource }>(BASE, payload)).data.data;
  },

  async update(id: number, payload: CustomerPayload): Promise<CustomerResource> {
    return (await api.patch<{ data: CustomerResource }>(`${BASE}/${id}`, payload)).data.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};
