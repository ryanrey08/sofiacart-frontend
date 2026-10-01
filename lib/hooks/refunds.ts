"use client";
import { useMerchantList } from "@/lib/hooks/merchant-list";
import type { AdminRefund } from "@/types/admin";
export function useRefunds(page: number) { return useMerchantList<AdminRefund>("refunds", page); }
