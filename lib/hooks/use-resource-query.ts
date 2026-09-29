"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/axios";

export function useResourceQuery<T>(queryKey: string[], path: string, fallbackData: T) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const response = await api.get(path);
        const payload = response.data;

        if (payload && typeof payload === "object" && "data" in payload) {
          return payload.data as T;
        }

        return payload as T;
      } catch {
        return fallbackData;
      }
    },
    initialData: fallbackData,
  });
}
