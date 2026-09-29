"use client";
import { mockPayments } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { Payment } from "@/types";
export function usePayments() { return useResourceQuery<Payment[]>(["payments"], "/api/v1/payments", mockPayments); }
