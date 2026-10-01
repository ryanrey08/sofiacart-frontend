"use client";
import { useState } from "react";
import { ResourcePage } from "@/components/resource-page";
import { StatusPill } from "@/components/admin/ui";
import { usePayments } from "@/lib/hooks/payments";
import { formatDateTime, formatMoney } from "@/lib/admin/format";
import type { AdminPayment } from "@/types/admin";

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const payments = usePayments(page);
  return (
    <ResourcePage<AdminPayment>
      title="Payments"
      description="Monitor successful, pending, and failed merchant payment attempts."
      data={payments.data?.data ?? []}
      loading={payments.isPending}
      error={payments.isError ? payments.error : null}
      onRetry={() => void payments.refetch()}
      meta={payments.data?.meta}
      currentPage={page}
      onPageChange={setPage}
      statusFilterEnabled={false}
      searchKeys={["reference", "gateway", "status"]}
      columns={[
        { key: "reference", header: "Reference", sortable: true },
        { key: "order_id", header: "Order", render: (payment) => payment.order_id ? `#${payment.order_id}` : "—" },
        { key: "gateway", header: "Gateway", sortable: true },
        { key: "amount", header: "Amount", render: (payment) => formatMoney(payment.amount) },
        { key: "paid_at", header: "Paid At", render: (payment) => formatDateTime(payment.paid_at) },
        { key: "status", header: "Status", render: (payment) => <StatusPill status={payment.status} /> },
      ]}
    />
  );
}
