"use client";
import { useState } from "react";
import { ResourcePage } from "@/components/resource-page";
import { StatusPill } from "@/components/admin/ui";
import { useRefunds } from "@/lib/hooks/refunds";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import type { AdminRefund } from "@/types/admin";

export default function RefundsPage() {
  const [page, setPage] = useState(1);
  const refunds = useRefunds(page);
  return (
    <ResourcePage<AdminRefund>
      title="Refunds"
      description="Track your store's refund requests and processing status."
      data={refunds.data?.data ?? []}
      loading={refunds.isPending}
      error={refunds.isError ? refunds.error : null}
      onRetry={() => void refunds.refetch()}
      meta={refunds.data?.meta}
      currentPage={page}
      onPageChange={setPage}
      statusFilterEnabled={false}
      searchKeys={["reference", "reason", "status"]}
      columns={[
        { key: "reference", header: "Reference", sortable: true },
        { key: "order_id", header: "Order", render: (refund) => refund.order_id ? `#${refund.order_id}` : "—" },
        { key: "payment_id", header: "Payment", render: (refund) => `#${refund.payment_id}` },
        { key: "reason", header: "Reason" },
        { key: "amount", header: "Amount", render: (refund) => formatMoney(refund.amount) },
        { key: "created_at", header: "Requested", render: (refund) => formatDateTime(refund.created_at) },
        { key: "status", header: "Status", render: (refund) => <StatusPill status={refund.status} /> },
      ]}
    />
  );
}
