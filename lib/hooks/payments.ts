"use client";
import { useMerchantList } from "@/lib/hooks/merchant-list";
import type { AdminPayment } from "@/types/admin";
export function usePayments(page: number) { return useMerchantList<AdminPayment>("payments", page); }
