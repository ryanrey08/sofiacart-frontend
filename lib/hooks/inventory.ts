"use client";
import { mockInventory } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { InventoryItem } from "@/types";
export function useInventory() { return useResourceQuery<InventoryItem[]>(["inventory"], "/api/v1/inventory", mockInventory); }
