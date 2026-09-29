"use client";
import { mockReports } from "@/lib/mocks";
import { useResourceQuery } from "@/lib/hooks/use-resource-query";
import type { CustomerReportRow, InventoryReportRow, ProductReportRow, ReportData, SalesReportRow } from "@/types";

export function useSalesReport() {
  return useResourceQuery<ReportData<SalesReportRow>>(["reports", "sales"], "/api/v1/reports/sales", mockReports.sales);
}

export function useCustomerReport() {
  return useResourceQuery<ReportData<CustomerReportRow>>(
    ["reports", "customers"],
    "/api/v1/reports/customers",
    mockReports.customers,
  );
}

export function useProductReport() {
  return useResourceQuery<ReportData<ProductReportRow>>(
    ["reports", "products"],
    "/api/v1/reports/products",
    mockReports.products,
  );
}

export function useInventoryReport() {
  return useResourceQuery<ReportData<InventoryReportRow>>(
    ["reports", "inventory"],
    "/api/v1/reports/inventory",
    mockReports.inventory,
  );
}
