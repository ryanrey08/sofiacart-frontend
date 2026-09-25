"use client";
import { ReportPage } from "@/components/report-page";
import { StatusBadge } from "@/components/status-badge";
import { useSalesReport } from "@/lib/hooks/reports";

export default function SalesReportPage() {
  const { data } = useSalesReport();
  return (
    <ReportPage
      title="Sales Reports"
      description="Monitor revenue trends, average order value, and refund rate at a glance."
      report={data}
      columns={[
        { key: "order", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "total", header: "Total" },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status as never} /> },
      ]}
    />
  );
}
