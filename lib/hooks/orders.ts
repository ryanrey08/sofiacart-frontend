"use client";
import { useMerchantList } from "@/lib/hooks/merchant-list";
import type { AdminOrder } from "@/types/admin";
export function useOrders(page: number) { return useMerchantList<AdminOrder>("orders", page); }
