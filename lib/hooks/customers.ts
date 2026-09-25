"use client";
import { mockCustomers } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { Customer } from "@/types";
export function useCustomers() { return useResourceQuery<Customer[]>(["customers"], "/api/v1/customers", mockCustomers); }
