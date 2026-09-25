"use client";
import { mockOrders } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { Order } from "@/types";
export function useOrders() { return useResourceQuery<Order[]>(["orders"], "/api/v1/orders", mockOrders); }
