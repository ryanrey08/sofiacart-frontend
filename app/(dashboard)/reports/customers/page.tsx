"use client";
import { ReportPage } from "@/components/report-page";
import { StatusBadge } from "@/components/status-badge";
import { useCustomerReport } from "@/lib/hooks/reports";
import { mockReports } from "@/lib/mocks";
import type { CustomerReportRow } from "@/types";

export default function CustomerReportPage() {
  const { data } = useCustomerReport();
  const report = (data ?? mockReports.customers) as typeof mockReports.customers;
  return (
    <ReportPage<CustomerReportRow>
      title="Customer Reports"
      description="Understand growth, repeat purchase behaviour, and customer value."
      report={report}
      columns={[
        { key: "customer", header: "Customer" },
        { key: "orders", header: "Orders" },
        { key: "spent", header: "Spent" },
        { key: "status", header: "Status", render: (row) => <StatusBadge status={row.status} /> },
      ]}
    />
  );
}
