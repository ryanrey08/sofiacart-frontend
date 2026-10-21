"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import type { MerchantDashboard } from "@/types/commerce";

export interface DashboardFilters {
  date_from?: string;
  date_to?: string;
}

// Live store overview for the signed-in merchant. No mock fallback: fetch errors surface so the
// page can show an error state instead of fabricated figures. keepPreviousData avoids flicker when
// filters change, and React Query keys results per range so a slow response can never overwrite a
// newer one.
export function useMerchantDashboard(params: DashboardFilters = {}) {
  return useQuery({
    queryKey: ["merchant", "dashboard", params],
    queryFn: async () => (await api.get<{ data: MerchantDashboard }>("/api/v1/merchant/dashboard", { params })).data.data,
    placeholderData: keepPreviousData,
  });
}
