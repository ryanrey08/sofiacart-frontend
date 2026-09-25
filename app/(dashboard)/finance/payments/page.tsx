"use client";
import { ResourcePage } from "@/components/resource-page";
import { StatusBadge } from "@/components/status-badge";
import { usePayments } from "@/lib/hooks/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Payment } from "@/types";

export default function PaymentsPage() {
  const { data } = usePayments();
  return (
    <ResourcePage<Payment>
      title="Payments"
      description="Monitor successful, pending, and failed merchant payment attempts."
      data={data}
      searchKeys={["paymentId", "customer", "method", "status"]}
      columns={[
        { key: "paymentId", header: "Payment ID", sortable: true },
        { key: "customer", header: "Customer", sortable: true },
        { key: "method", header: "Method", sortable: true },
        { key: "amount", header: "Amount", sortable: true, render: (payment) => formatCurrency(payment.amount) },
        { key: "paidAt", header: "Paid At", sortable: true, render: (payment) => formatDate(payment.paidAt) },
        { key: "status", header: "Status", render: (payment) => <StatusBadge status={payment.status} /> },
      ]}
    />
  );
}
