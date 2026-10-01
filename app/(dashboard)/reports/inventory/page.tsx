"use client";
import { ReportPage } from "@/components/report-page";
import { StatusBadge } from "@/components/status-badge";
import { useInventoryReport } from "@/lib/hooks/reports";
import { mockReports } from "@/lib/mocks";
import type { InventoryReportRow } from "@/types";

export default function InventoryReportPage() {
  const { data } = useInventoryReport();
  const report = (data ?? mockReports.inventory) as typeof mockReports.inventory;
  return (
    <ReportPage<InventoryReportRow>
      title="Inventory Reports"
      description="Keep tabs on low-stock alerts, out-of-stock SKUs, and replenishment health."
      report={report}
      isSample={report === mockReports.inventory}
      columns={[
        { key: "product", header: "Product" },
        { key: "stock", header: "Stock" },
        { key: "threshold", header: "Threshold" },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
      ]}
    />
  );
}
