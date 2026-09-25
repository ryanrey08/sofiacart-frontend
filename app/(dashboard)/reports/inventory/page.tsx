"use client";
import { ReportPage } from "@/components/report-page";
import { StatusBadge } from "@/components/status-badge";
import { useInventoryReport } from "@/lib/hooks/reports";
import { mockReports } from "@/lib/mocks";

export default function InventoryReportPage() {
  const { data } = useInventoryReport();
  return (
    <ReportPage
      title="Inventory Reports"
      description="Keep tabs on low-stock alerts, out-of-stock SKUs, and replenishment health."
      report={data ?? mockReports.inventory}
      columns={[
        { key: "product", header: "Product" },
        { key: "stock", header: "Stock" },
        { key: "threshold", header: "Threshold" },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status as never} /> },
      ]}
    />
  );
}
