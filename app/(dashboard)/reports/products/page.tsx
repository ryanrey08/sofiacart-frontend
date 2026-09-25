"use client";
import { ReportPage } from "@/components/report-page";
import { StatusBadge } from "@/components/status-badge";
import { useProductReport } from "@/lib/hooks/reports";
import { mockReports } from "@/lib/mocks";
import type { ProductReportRow } from "@/types";

export default function ProductReportPage() {
  const { data } = useProductReport();
  const report = (data ?? mockReports.products) as typeof mockReports.products;
  return (
    <ReportPage<ProductReportRow>
      title="Product Reports"
      description="Compare category performance, sell-through, and product velocity."
      report={report}
      columns={[
        { key: "product", header: "Product" },
        { key: "sales", header: "Sales" },
        { key: "stock", header: "Stock" },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
      ]}
    />
  );
}
