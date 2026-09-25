"use client";
import { ReportPage } from "@/components/report-page";
import { StatusBadge } from "@/components/status-badge";
import { useProductReport } from "@/lib/hooks/reports";

export default function ProductReportPage() {
  const { data } = useProductReport();
  return (
    <ReportPage
      title="Product Reports"
      description="Compare category performance, sell-through, and product velocity."
      report={data}
      columns={[
        { key: "product", header: "Product" },
        { key: "sales", header: "Sales" },
        { key: "stock", header: "Stock" },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status as never} /> },
      ]}
    />
  );
}
