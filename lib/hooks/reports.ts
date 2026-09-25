"use client";
import { mockReports } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { ReportData } from "@/types";
export function useSalesReport() { return useResourceQuery<ReportData>(["reports", "sales"], "/api/v1/reports/sales", mockReports.sales); }
export function useCustomerReport() { return useResourceQuery<ReportData>(["reports", "customers"], "/api/v1/reports/customers", mockReports.customers); }
export function useProductReport() { return useResourceQuery<ReportData>(["reports", "products"], "/api/v1/reports/products", mockReports.products); }
export function useInventoryReport() { return useResourceQuery<ReportData>(["reports", "inventory"], "/api/v1/reports/inventory", mockReports.inventory); }
