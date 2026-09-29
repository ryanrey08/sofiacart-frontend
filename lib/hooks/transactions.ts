"use client";
import { mockTransactions } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { Transaction } from "@/types";
export function useTransactions() { return useResourceQuery<Transaction[]>(["transactions"], "/api/v1/transactions", mockTransactions); }
