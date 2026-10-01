"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/axios";
import { merchantPage } from "@/lib/merchant-resource";
import type { Paginated } from "@/types";

export function useMerchantList<T>(resource: string, page: number) {
  return useQuery({
    queryKey: ["merchant", resource, page],
    queryFn: async () => merchantPage((await api.get<Paginated<T>>(`/api/v1/${resource}`, { params: { page, per_page: 15 } })).data),
  });
}
