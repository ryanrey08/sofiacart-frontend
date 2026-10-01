"use client";
import { useMerchantList } from "@/lib/hooks/merchant-list";
import type { AdminTransaction } from "@/types/admin";
export function useTransactions(page: number) { return useMerchantList<AdminTransaction>("transactions", page); }
