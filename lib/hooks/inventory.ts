"use client";
import { useMerchantList } from "@/lib/hooks/merchant-list";
import type { InventoryLogResource } from "@/types";
export function useInventory(page: number) { return useMerchantList<InventoryLogResource>("inventory/logs", page); }
