"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { useRefunds } from "@/lib/hooks/refunds";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Refund } from "@/types";

export default function RefundsPage() {
  const { data } = useRefunds();
  return (
    <ResourcePage<Refund>
      title="Refunds"
      description="Track refund requests, reasons, and approval outcomes in real time."
      data={data}
      searchKeys={["refundId", "orderNumber", "customer", "status"]}
      columns={[
        { key: "refundId", header: "Refund ID", sortable: true },
        { key: "orderNumber", header: "Order #", sortable: true },
        { key: "customer", header: "Customer", sortable: true },
        { key: "amount", header: "Amount", sortable: true, render: (refund) => formatCurrency(refund.amount) },
        { key: "requestedAt", header: "Requested", sortable: true, render: (refund) => formatDate(refund.requestedAt) },
        { key: "status", header: "Status", render: (refund) => <StatusBadge status={refund.status} /> },
      ]}
    />
  );
}
