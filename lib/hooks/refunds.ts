"use client";
import { mockRefunds } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { Refund } from "@/types";
export function useRefunds() { return useResourceQuery<Refund[]>(["refunds"], "/api/v1/refunds", mockRefunds); }
