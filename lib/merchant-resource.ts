import type { Paginated } from "../types/admin";

export function merchantPage<T>(payload: Paginated<T>): Paginated<T> {
  if (!payload || !Array.isArray(payload.data) || !payload.meta ||
      typeof payload.meta.current_page !== "number" || typeof payload.meta.last_page !== "number" ||
      typeof payload.meta.total !== "number") {
    throw new Error("The API returned an invalid paginated response.");
  }
  return payload;
}
